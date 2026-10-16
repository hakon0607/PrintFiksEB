#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PrintFiksEB – live kamera
=========================
Kjører på en Raspberry Pi (eller en annen Linux-maskin) på samme nettverk som
Bambu Lab P1S-printeren. Programmet

  * henter bilder fra kameraet inne i printeren (port 6000, TLS),
  * leser status fra printeren (MQTT, port 8883) – fremdrift, tid igjen, lag, temperaturer, lys,
  * laster opp bildene til nettsiden og melder status,
  * henter innstillinger og kommandoer fra admin → Live kamera,
  * lager timelapse av hver print.

Tilgangskoden til printeren blir bare her på Pi-en. Nettsiden får aldri vite den.

Oppsett:  /etc/printfiks-kamera.env  (lages av installer.sh)
Logg:     journalctl -u printfiks-kamera -f
Test:     sudo python3 /opt/printfiks-kamera/printfiks_kamera.py --test
"""

import datetime as dt
import io
import json
import logging
import os
import shutil
import signal
import socket
import ssl
import struct
import subprocess
import sys
import threading
import time
from zoneinfo import ZoneInfo

VERSJON = "1.0.0"
ENV_FIL = "/etc/printfiks-kamera.env"
TIDSSONE = ZoneInfo("Europe/Oslo")

try:
    import requests
except ImportError:  # pragma: no cover
    print("Mangler python3-requests. Kjør installer.sh på nytt.", file=sys.stderr)
    sys.exit(1)

try:
    from PIL import Image, ImageEnhance, ImageOps
except ImportError:  # pragma: no cover
    print("Mangler python3-pil. Kjør installer.sh på nytt.", file=sys.stderr)
    sys.exit(1)

try:
    import paho.mqtt.client as mqtt
except ImportError:  # pragma: no cover
    mqtt = None

log = logging.getLogger("printfiks-kamera")


# ---------------------------------------------------------------------------
# Oppsett
# ---------------------------------------------------------------------------

PAKREVD = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "KAMERA_NOKKEL", "PRINTER_IP", "PRINTER_TILGANGSKODE"]


def les_oppsett(sti=ENV_FIL):
    """Leser KEY=VERDI fra fila, og lar miljøvariabler (fra systemd) gå foran."""
    verdier = {}
    if all(os.environ.get(k) for k in PAKREVD):
        sti = None  # alt kom fra systemd – trenger ikke lese fila
    try:
        if sti is None:
            raise FileNotFoundError
        with open(sti, encoding="utf-8") as f:
            for linje in f:
                linje = linje.strip()
                if not linje or linje.startswith("#") or "=" not in linje:
                    continue
                k, v = linje.split("=", 1)
                verdier[k.strip()] = v.strip().strip('"').strip("'")
    except FileNotFoundError:
        pass
    except PermissionError:
        log.warning("Har ikke lov til å lese %s – bruker bare miljøvariabler.", sti)
    for k in list(verdier) + [
        "SIDE_URL", "SUPABASE_URL", "SUPABASE_ANON_KEY", "KAMERA_NOKKEL",
        "PRINTER_IP", "PRINTER_TILGANGSKODE", "PRINTER_SERIENUMMER", "DATAMAPPE",
    ]:
        if os.environ.get(k):
            verdier[k] = os.environ[k]
    verdier.setdefault("DATAMAPPE", os.environ.get("STATE_DIRECTORY") or "/var/lib/printfiks-kamera")
    verdier["SIDE_URL"] = (verdier.get("SIDE_URL") or "https://www.printfiks.org").rstrip("/")
    verdier["SUPABASE_URL"] = (verdier.get("SUPABASE_URL") or "").rstrip("/")
    return verdier



# ---------------------------------------------------------------------------
# Innstillinger fra admin (samme regler som src/lib/kamera.ts på nettsiden)
# ---------------------------------------------------------------------------

STANDARD = {
    "kamera_pa": "auto", "vent_etter_print_min": 5, "tidsplan_aktiv": False, "tidsplan_fra": "08:00",
    "tidsplan_til": "16:00", "tidsplan_dager": [1, 2, 3, 4, 5], "oppdatering_sek": 3, "kvalitet": 80,
    "maks_bredde": 1280, "roter": 0, "speil": False, "zoom": 1.0, "utsnitt_x": 50, "utsnitt_y": 50,
    "lysstyrke": 0, "kontrast": 0, "metning": 0, "skarphet": 0, "lys": "auto", "print_navn": "",
    "timelapse_pa": True, "timelapse_intervall_sek": 10, "timelapse_fps": 25,
}


def _tall(v, lav, hoy, std):
    try:
        if isinstance(v, bool):
            return std
        n = float(v)
    except (TypeError, ValueError):
        return std
    if n != n:  # NaN
        return std
    return min(hoy, max(lav, n))


def _klokke(v, std):
    if isinstance(v, str) and len(v) == 5 and v[2] == ":":
        try:
            t, m = int(v[:2]), int(v[3:])
            if 0 <= t <= 23 and 0 <= m <= 59:
                return v
        except ValueError:
            pass
    return std


def les_innstillinger(raa):
    r = raa if isinstance(raa, dict) else {}
    S = STANDARD
    dager = r.get("tidsplan_dager")
    if isinstance(dager, list):
        dager = sorted({int(d) for d in dager if isinstance(d, (int, float)) and not isinstance(d, bool) and 1 <= int(d) <= 7})
    else:
        dager = S["tidsplan_dager"]
    return {
        "kamera_pa": r.get("kamera_pa") if r.get("kamera_pa") in ("auto", "pa", "av") else S["kamera_pa"],
        "vent_etter_print_min": round(_tall(r.get("vent_etter_print_min"), 0, 120, S["vent_etter_print_min"])),
        "tidsplan_aktiv": r["tidsplan_aktiv"] if isinstance(r.get("tidsplan_aktiv"), bool) else S["tidsplan_aktiv"],
        "tidsplan_fra": _klokke(r.get("tidsplan_fra"), S["tidsplan_fra"]),
        "tidsplan_til": _klokke(r.get("tidsplan_til"), S["tidsplan_til"]),
        "tidsplan_dager": dager,
        "oppdatering_sek": round(_tall(r.get("oppdatering_sek"), 1, 30, S["oppdatering_sek"])),
        "kvalitet": round(_tall(r.get("kvalitet"), 40, 95, S["kvalitet"])),
        "maks_bredde": int(r.get("maks_bredde")) if r.get("maks_bredde") in (640, 960, 1280) else S["maks_bredde"],
        "roter": int(r.get("roter")) if r.get("roter") in (0, 90, 180, 270) else S["roter"],
        "speil": r["speil"] if isinstance(r.get("speil"), bool) else S["speil"],
        "zoom": round(_tall(r.get("zoom"), 1, 3, S["zoom"]), 1),
        "utsnitt_x": _tall(r.get("utsnitt_x"), 0, 100, S["utsnitt_x"]),
        "utsnitt_y": _tall(r.get("utsnitt_y"), 0, 100, S["utsnitt_y"]),
        "lysstyrke": _tall(r.get("lysstyrke"), -50, 50, S["lysstyrke"]),
        "kontrast": _tall(r.get("kontrast"), -50, 50, S["kontrast"]),
        "metning": _tall(r.get("metning"), -50, 50, S["metning"]),
        "skarphet": _tall(r.get("skarphet"), 0, 100, S["skarphet"]),
        "lys": r.get("lys") if r.get("lys") in ("auto", "pa", "av") else S["lys"],
        "print_navn": r.get("print_navn") if isinstance(r.get("print_navn"), str) else "",
        "timelapse_pa": r["timelapse_pa"] if isinstance(r.get("timelapse_pa"), bool) else S["timelapse_pa"],
        "timelapse_intervall_sek": round(_tall(r.get("timelapse_intervall_sek"), 2, 120, S["timelapse_intervall_sek"])),
        "timelapse_fps": round(_tall(r.get("timelapse_fps"), 10, 60, S["timelapse_fps"])),
    }


def innenfor_tidsplan(innst, naa=None):
    if not innst["tidsplan_aktiv"]:
        return True
    naa = naa or dt.datetime.now(TIDSSONE)
    if naa.isoweekday() not in innst["tidsplan_dager"]:
        return False
    hm = naa.strftime("%H:%M")
    fra, til = innst["tidsplan_fra"], innst["tidsplan_til"]
    if fra == til:
        return True
    if fra < til:
        return fra <= hm < til
    return hm >= fra or hm < til  # over midnatt


# ---------------------------------------------------------------------------
# Bildebehandling
# ---------------------------------------------------------------------------

def behandle_bilde(jpeg, innst, maks_bredde=None, kvalitet=None):
    im = Image.open(io.BytesIO(jpeg))
    im = im.convert("RGB")
    if innst["speil"]:
        im = ImageOps.mirror(im)
    roter = innst["roter"]
    if roter == 90:
        im = im.transpose(Image.Transpose.ROTATE_270)  # 90° med klokka
    elif roter == 180:
        im = im.transpose(Image.Transpose.ROTATE_180)
    elif roter == 270:
        im = im.transpose(Image.Transpose.ROTATE_90)
    zoom = innst["zoom"]
    if zoom > 1.0:
        w, h = im.size
        cw, ch = int(w / zoom), int(h / zoom)
        x = int((w - cw) * innst["utsnitt_x"] / 100)
        y = int((h - ch) * innst["utsnitt_y"] / 100)
        im = im.crop((x, y, x + cw, y + ch))
    if innst["lysstyrke"]:
        im = ImageEnhance.Brightness(im).enhance(1 + innst["lysstyrke"] / 100)
    if innst["kontrast"]:
        im = ImageEnhance.Contrast(im).enhance(1 + innst["kontrast"] / 100)
    if innst["metning"]:
        im = ImageEnhance.Color(im).enhance(1 + innst["metning"] / 100)
    if innst["skarphet"]:
        im = ImageEnhance.Sharpness(im).enhance(1 + innst["skarphet"] / 50)
    bredde = maks_bredde or innst["maks_bredde"]
    if im.width > bredde:
        im = im.resize((bredde, max(1, round(im.height * bredde / im.width))), Image.Resampling.LANCZOS)
    ut = io.BytesIO()
    im.save(ut, "JPEG", quality=int(kvalitet or innst["kvalitet"]), optimize=True, progressive=True)
    return ut.getvalue()


# ---------------------------------------------------------------------------
# Kameraet i printeren (P1-serien: JPEG-bilder over TLS på port 6000)
# ---------------------------------------------------------------------------

class Kamera(threading.Thread):
    PORT = 6000

    def __init__(self, ip, tilgangskode):
        super().__init__(daemon=True, name="kamera")
        self.ip = ip
        self.kode = tilgangskode
        self._las = threading.Lock()
        self._bilde = None
        self._bilde_tid = 0.0
        self._behov_til = 0.0
        self.tilkoblet = False
        self.feil = ""
        self._stopp = threading.Event()

    def trengs(self, sekunder):
        """Hold forbindelsen åpen minst så lenge (kalles hele tiden mens noe trenger bilder)."""
        self._behov_til = max(self._behov_til, time.time() + sekunder)

    def siste(self):
        with self._las:
            return self._bilde, self._bilde_tid

    def stopp(self):
        self._stopp.set()

    def _les_noyaktig(self, s, n):
        buf = bytearray()
        while len(buf) < n:
            del_ = s.recv(n - len(buf))
            if not del_:
                raise ConnectionError("Printeren lukket kameraforbindelsen – sjekk tilgangskoden og at Pi-en er på samme nett")
            buf += del_
        return bytes(buf)

    def run(self):
        vent = 2
        while not self._stopp.is_set():
            if time.time() > self._behov_til:
                self.tilkoblet = False
                self._stopp.wait(0.5)
                continue
            try:
                self._strom()
                vent = 2
            except Exception as e:  # noqa: BLE001
                self.tilkoblet = False
                self.feil = f"Kamera: {e}"
                log.warning("Kameraforbindelsen feilet: %s (prøver igjen om %s s)", e, vent)
                self._stopp.wait(vent)
                vent = min(60, vent * 2)

    def _strom(self):
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        with socket.create_connection((self.ip, self.PORT), timeout=10) as raa:
            with ctx.wrap_socket(raa, server_hostname=self.ip) as s:
                s.settimeout(20)
                auth = struct.pack("<IIII", 0x40, 0x3000, 0, 0)
                auth += b"bblp".ljust(32, b"\x00")
                auth += self.kode.encode("utf-8")[:32].ljust(32, b"\x00")
                s.sendall(auth)
                log.info("Koblet til kameraet i printeren (%s:%s)", self.ip, self.PORT)
                self.tilkoblet = True
                self.feil = ""
                while not self._stopp.is_set() and time.time() <= self._behov_til:
                    hode = self._les_noyaktig(s, 16)
                    storrelse = struct.unpack("<I", hode[0:4])[0]
                    if storrelse <= 0 or storrelse > 8 * 1024 * 1024:
                        raise ValueError(f"Rart bilde fra printeren ({storrelse} byte) – feil tilgangskode?")
                    data = self._les_noyaktig(s, storrelse)
                    if data[:2] == b"\xff\xd8" and data[-2:] == b"\xff\xd9":
                        with self._las:
                            self._bilde = data
                            self._bilde_tid = time.time()
        self.tilkoblet = False


# ---------------------------------------------------------------------------
# Status fra printeren (MQTT)
# ---------------------------------------------------------------------------

def _sla_sammen(mal, ny):
    for k, v in ny.items():
        if isinstance(v, dict) and isinstance(mal.get(k), dict):
            _sla_sammen(mal[k], v)
        else:
            mal[k] = v


class Printer:
    def __init__(self, ip, tilgangskode, serienummer):
        self.ip = ip
        self.kode = tilgangskode
        self.serie = (serienummer or "").strip()
        self.data = {}
        self.sist_melding = 0.0
        self.tilkoblet = False
        self.feil = ""
        self._seq = 0
        self._las = threading.Lock()
        self.klient = None

    @property
    def aktiv(self):
        return bool(self.serie) and mqtt is not None

    def start(self):
        if not self.aktiv:
            if not self.serie:
                log.warning("PRINTER_SERIENUMMER mangler – kan ikke lese status fra printeren (bare kamera).")
            if mqtt is None:
                log.warning("python3-paho-mqtt mangler – kan ikke lese status fra printeren.")
            return
        klient_id = f"printfiks-kamera-{os.getpid()}"
        if hasattr(mqtt, "CallbackAPIVersion"):
            self.klient = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=klient_id)
        else:
            self.klient = mqtt.Client(client_id=klient_id)
        self.klient.username_pw_set("bblp", self.kode)
        self.klient.tls_set(cert_reqs=ssl.CERT_NONE)
        self.klient.tls_insecure_set(True)
        self.klient.on_connect = self._tilkoblet
        self.klient.on_disconnect = self._frakoblet
        self.klient.on_message = self._melding
        self.klient.reconnect_delay_set(min_delay=2, max_delay=60)
        self.klient.connect_async(self.ip, 8883, keepalive=60)
        self.klient.loop_start()

    def stopp(self):
        if self.klient:
            try:
                self.klient.loop_stop()
                self.klient.disconnect()
            except Exception:  # noqa: BLE001
                pass

    def _tilkoblet(self, klient, _userdata, _flags, rc, *_rest):
        kode = getattr(rc, "value", rc)
        if kode == 0:
            self.tilkoblet = True
            self.feil = ""
            log.info("Koblet til printeren (MQTT)")
            klient.subscribe(f"device/{self.serie}/report")
            self.hent_alt()
        else:
            self.tilkoblet = False
            self.feil = f"Printeren avviste tilkoblingen (kode {kode}) – sjekk tilgangskode og serienummer"
            log.warning(self.feil)

    def _frakoblet(self, *_args):
        self.tilkoblet = False

    def _melding(self, _klient, _userdata, msg):
        try:
            data = json.loads(msg.payload.decode("utf-8", "replace"))
        except ValueError:
            return
        with self._las:
            _sla_sammen(self.data, data)
            self.sist_melding = time.time()

    def _send(self, nyttelast):
        if not (self.klient and self.tilkoblet):
            return False
        self._seq += 1
        for del_ in nyttelast.values():
            if isinstance(del_, dict):
                del_["sequence_id"] = str(self._seq)
        info = self.klient.publish(f"device/{self.serie}/request", json.dumps(nyttelast))
        return info.rc == 0

    def hent_alt(self):
        return self._send({"pushing": {"command": "pushall"}})

    def lys(self, pa):
        return self._send({"system": {
            "command": "ledctrl", "led_node": "chamber_light", "led_mode": "on" if pa else "off",
            "led_on_time": 500, "led_off_time": 500, "loop_times": 0, "interval_time": 0,
        }})

    def status(self):
        """Det vi melder til nettsiden. Filnavnet vises bare i admin."""
        with self._las:
            p = dict(self.data.get("print") or {})
        ut = {"tilkoblet": bool(self.tilkoblet and time.time() - self.sist_melding < 120)}
        if not p:
            return ut

        def tall(nokkel):
            v = p.get(nokkel)
            try:
                return round(float(v), 1) if v is not None and v != "" else None
            except (TypeError, ValueError):
                return None

        tilstand = p.get("gcode_state")
        if isinstance(tilstand, str):
            ut["tilstand"] = tilstand.upper()
        for ny, gammel in (("fremdrift", "mc_percent"), ("min_igjen", "mc_remaining_time"), ("lag", "layer_num"),
                           ("lag_totalt", "total_layer_num"), ("dyse_temp", "nozzle_temper"),
                           ("dyse_mal", "nozzle_target_temper"), ("plate_temp", "bed_temper"),
                           ("plate_mal", "bed_target_temper")):
            v = tall(gammel)
            if v is not None:
                ut[ny] = v
        navn = p.get("subtask_name") or p.get("gcode_file")
        if isinstance(navn, str) and navn:
            ut["fil"] = navn[:120]
        lys = p.get("lights_report")
        if isinstance(lys, list):
            for l in lys:
                if isinstance(l, dict) and l.get("node") == "chamber_light":
                    ut["kammer_lys"] = l.get("mode") == "on"
        wifi = p.get("wifi_signal")
        if isinstance(wifi, str) and wifi:
            ut["wifi"] = wifi
        return ut


# ---------------------------------------------------------------------------
# Nettsiden og databasen
# ---------------------------------------------------------------------------

class Nett:
    def __init__(self, cfg):
        self.cfg = cfg
        self.okt = requests.Session()
        self.okt.headers["User-Agent"] = f"printfiks-kamera/{VERSJON}"
        self._lenker = []
        self._lenker_hentet = 0.0

    # --- databasefunksjoner (Supabase) ---
    def rpc(self, navn, data, tidsavbrudd=15):
        url = f"{self.cfg['SUPABASE_URL']}/rest/v1/rpc/{navn}"
        anon = self.cfg["SUPABASE_ANON_KEY"]
        r = self.okt.post(url, json=data, timeout=tidsavbrudd, headers={
            "apikey": anon, "Authorization": f"Bearer {anon}", "Content-Type": "application/json",
        })
        if r.status_code >= 400:
            try:
                melding = r.json().get("message") or r.text
            except ValueError:
                melding = r.text
            raise RuntimeError(f"{navn}: {melding[:200]}")
        return r.json() if r.content else None

    def synk(self, status, siste_bilde=None):
        return self.rpc("kamera_enhet_synk", {
            "p_nokkel": self.cfg["KAMERA_NOKKEL"], "p_status": status, "p_siste_bilde": siste_bilde,
        })

    def kvitter(self, kommando_id, ok, melding=""):
        try:
            self.rpc("kamera_enhet_kvitter", {
                "p_nokkel": self.cfg["KAMERA_NOKKEL"], "p_id": kommando_id, "p_ok": bool(ok), "p_melding": melding[:300],
            })
        except Exception as e:  # noqa: BLE001
            log.warning("Klarte ikke å kvittere kommando %s: %s", kommando_id, e)

    # --- nettsiden (lager opplastingslenker) ---
    def side(self, data, tidsavbrudd=30):
        r = self.okt.post(f"{self.cfg['SIDE_URL']}/api/kamera/enhet", json=data, timeout=tidsavbrudd,
                          headers={"Authorization": f"Bearer {self.cfg['KAMERA_NOKKEL']}"})
        try:
            svar = r.json()
        except ValueError:
            svar = {}
        if r.status_code >= 400:
            raise RuntimeError(svar.get("error") or f"Nettsiden svarte {r.status_code}")
        return svar

    def last_opp_bilde(self, jpeg):
        # lenkene varer i 2 timer – hent nye i god tid
        if not self._lenker or time.time() - self._lenker_hentet > 100 * 60:
            svar = self.side({"handling": "opplasting", "antall": 60})
            self._lenker = list(svar.get("urls") or [])
            self._lenker_hentet = time.time()
            if not self._lenker:
                raise RuntimeError("Fikk ingen opplastingslenker fra nettsiden")
        lenke = self._lenker.pop(0)
        r = self.okt.put(lenke["url"], data=jpeg, timeout=30, headers={
            "Content-Type": "image/jpeg", "cache-control": "max-age=3600", "x-upsert": "false",
        })
        if r.status_code >= 400:
            self._lenker = []  # kanskje utløpt – hent nye neste gang
            raise RuntimeError(f"Opplasting feilet ({r.status_code}): {r.text[:120]}")
        return lenke["sti"]

    def last_opp_timelapse(self, fil, navn, sekunder, bilder):
        lenke = self.side({"handling": "timelapse"}, tidsavbrudd=60)
        storrelse = os.path.getsize(fil)
        with open(fil, "rb") as f:
            r = self.okt.put(lenke["url"], data=f, timeout=600, headers={
                "Content-Type": "video/mp4", "cache-control": "max-age=86400", "x-upsert": "false",
            })
        if r.status_code >= 400:
            raise RuntimeError(f"Opplasting av timelapse feilet ({r.status_code}): {r.text[:120]}")
        self.rpc("kamera_enhet_timelapse", {
            "p_nokkel": self.cfg["KAMERA_NOKKEL"], "p_sti": lenke["sti"], "p_navn": navn,
            "p_sekunder": int(sekunder), "p_bilder": int(bilder), "p_storrelse": int(storrelse),
        })
        return lenke["sti"]


# ---------------------------------------------------------------------------
# Timelapse
# ---------------------------------------------------------------------------

class Timelapse:
    def __init__(self, mappe):
        self.rot = os.path.join(mappe, "timelapse")
        os.makedirs(self.rot, exist_ok=True)
        self.mappe = None
        self.antall = 0
        self.sist = 0.0
        self.navn = ""
        self.manuell = False
        self.lager = False

    @property
    def pagar(self):
        return self.mappe is not None

    def start(self, navn="", manuell=False):
        if self.pagar:
            return
        stempel = dt.datetime.now(TIDSSONE).strftime("%Y%m%d-%H%M%S")
        self.mappe = os.path.join(self.rot, stempel)
        os.makedirs(self.mappe, exist_ok=True)
        self.antall = 0
        self.sist = 0.0
        self.navn = navn
        self.manuell = manuell
        log.info("Timelapse startet (%s)", "manuelt" if manuell else "printen startet")

    def legg_til(self, jpeg):
        sti = os.path.join(self.mappe, f"{self.antall:06d}.jpg")
        with open(sti, "wb") as f:
            f.write(jpeg)
        self.antall += 1

    def avslutt(self):
        """Gir tilbake (mappe, antall, navn) og nullstiller."""
        mappe, antall, navn = self.mappe, self.antall, self.navn
        self.mappe, self.antall, self.navn, self.manuell = None, 0, "", False
        return mappe, antall, navn

    def rydd_gamle(self):
        try:
            for d in os.listdir(self.rot):
                sti = os.path.join(self.rot, d)
                if sti != self.mappe and os.path.isdir(sti) and time.time() - os.path.getmtime(sti) > 2 * 86400:
                    shutil.rmtree(sti, ignore_errors=True)
        except OSError:
            pass


def lag_video(mappe, antall, fps):
    """Lager mp4 av bildene. Holder seg under 48 MB (grensen for lagringen er 50 MB)."""
    if not shutil.which("ffmpeg"):
        raise RuntimeError("ffmpeg mangler – kjør installer.sh på nytt")
    ut = os.path.join(mappe, "timelapse.mp4")
    for bredde, crf in ((1280, 26), (960, 30), (640, 33)):
        cmd = [
            "ffmpeg", "-y", "-loglevel", "error", "-framerate", str(fps), "-i", os.path.join(mappe, "%06d.jpg"),
            "-vf", f"scale='min({bredde},iw)':-2", "-c:v", "libx264", "-preset", "veryfast", "-crf", str(crf),
            "-pix_fmt", "yuv420p", "-movflags", "+faststart", ut,
        ]
        subprocess.run(cmd, check=True, timeout=1800)
        if os.path.getsize(ut) < 48 * 1024 * 1024:
            return ut
    raise RuntimeError("Timelapsen ble for stor selv i lav kvalitet")


# ---------------------------------------------------------------------------
# Pi-en selv
# ---------------------------------------------------------------------------

def pi_status(printer_ip, kamera_tilkoblet):
    ut = {"versjon": VERSJON, "kamera_tilkoblet": bool(kamera_tilkoblet)}
    try:
        with open("/sys/class/thermal/thermal_zone0/temp") as f:
            ut["temp"] = round(int(f.read().strip()) / 1000, 1)
    except (OSError, ValueError):
        pass
    try:
        with open("/proc/uptime") as f:
            ut["oppetid_min"] = int(float(f.read().split()[0]) / 60)
    except (OSError, ValueError):
        pass
    try:
        ut["disk_ledig_mb"] = int(shutil.disk_usage("/").free / 1024 / 1024)
    except OSError:
        pass
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect((printer_ip, 9))
            ut["ip"] = s.getsockname()[0]
    except OSError:
        pass
    return ut


# ---------------------------------------------------------------------------
# Hovedprogrammet
# ---------------------------------------------------------------------------

JOBBER = {"RUNNING", "PAUSE", "PREPARE", "SLICING"}


class Program:
    def __init__(self, cfg):
        self.cfg = cfg
        self.nett = Nett(cfg)
        self.kamera = Kamera(cfg["PRINTER_IP"], cfg["PRINTER_TILGANGSKODE"])
        self.printer = Printer(cfg["PRINTER_IP"], cfg["PRINTER_TILGANGSKODE"], cfg.get("PRINTER_SERIENUMMER", ""))
        self.timelapse = Timelapse(cfg["DATAMAPPE"])
        self.innst = les_innstillinger({})
        self.stopp = threading.Event()
        self.siste_opplastet = 0.0         # da vi sist lastet opp
        self.siste_bilde_tid = 0.0         # tidsstempelet på bildet vi sist lastet opp
        self.sist_synk = 0.0
        self.sist_jobbet = 0.0
        self.forrige_tilstand = None
        self.vi_slo_pa_lyset = False
        self.sist_lys_kommando = 0.0
        self.feil = ""
        self.print_ferdig = False
        self.ta_bilde_na = []              # kommando-id-er som venter på et bilde
        self.kamera_aktivt = False
        self.siste_navn = ""
        self._omstart = False

    # --- hjelpere ---
    def _sett_feil(self, tekst):
        if tekst and tekst != self.feil:
            log.warning(tekst)
        self.feil = tekst

    def tilstand(self):
        return (self.printer.status().get("tilstand") or "").upper()

    def skal_kamera_ga(self):
        innst = self.innst
        if not innenfor_tidsplan(innst):
            return False
        if innst["kamera_pa"] == "av":
            return False
        if innst["kamera_pa"] == "pa":
            return True
        # auto: når printeren jobber (og en stund etterpå)
        if not self.printer.aktiv:
            return True  # vi vet ikke hva printeren gjør – da er kameraet på
        if self.tilstand() in JOBBER:
            return True
        return time.time() - self.sist_jobbet < innst["vent_etter_print_min"] * 60

    # --- én runde ---
    def runde(self):
        naa = time.time()
        tilstand = self.tilstand()
        jobber = tilstand in JOBBER
        if jobber:
            self.sist_jobbet = naa
        if self.innst["print_navn"]:
            self.siste_navn = self.innst["print_navn"]

        # printen startet / sluttet
        if self.forrige_tilstand is not None and tilstand != self.forrige_tilstand:
            log.info("Printeren: %s → %s", self.forrige_tilstand or "?", tilstand or "?")
            if tilstand == "RUNNING" and self.forrige_tilstand not in JOBBER:
                self.siste_navn = self.innst["print_navn"]
                if self.innst["timelapse_pa"] and not self.timelapse.pagar:
                    self.timelapse.start(self.siste_navn)
            if self.forrige_tilstand in JOBBER and tilstand in ("FINISH", "FAILED", "IDLE"):
                self.print_ferdig = tilstand == "FINISH"
                if self.timelapse.pagar and not self.timelapse.manuell:
                    self.avslutt_timelapse(stoppet=tilstand != "FINISH")
        self.forrige_tilstand = tilstand

        self.kamera_aktivt = self.skal_kamera_ga()
        trenger_bilder = self.kamera_aktivt or self.timelapse.pagar or bool(self.ta_bilde_na)
        if trenger_bilder:
            self.kamera.trengs(20)

        bilde, bilde_tid = self.kamera.siste()
        lastet_opp = None

        # live-bilde
        if bilde and bilde_tid > self.siste_bilde_tid and (
            (self.kamera_aktivt and naa - self.siste_opplastet >= self.innst["oppdatering_sek"]) or self.ta_bilde_na
        ):
            try:
                lastet_opp = self.nett.last_opp_bilde(behandle_bilde(bilde, self.innst))
                self.siste_opplastet = naa
                self.siste_bilde_tid = bilde_tid
                for kid in self.ta_bilde_na:
                    self.nett.kvitter(kid, True, "Bilde lastet opp")
                self.ta_bilde_na = []
                if self.feil.startswith("Opplasting"):
                    self.feil = ""
            except Exception as e:  # noqa: BLE001
                self._sett_feil(f"Opplasting: {e}")

        # timelapse-bilde
        if self.timelapse.pagar and bilde and naa - self.timelapse.sist >= self.innst["timelapse_intervall_sek"]:
            try:
                if shutil.disk_usage(self.timelapse.rot).free > 400 * 1024 * 1024:
                    self.timelapse.legg_til(behandle_bilde(bilde, self.innst, maks_bredde=1280, kvalitet=85))
                    self.timelapse.sist = naa
                else:
                    self._sett_feil("Lite plass på Pi-en – timelapse står på pause")
            except Exception as e:  # noqa: BLE001
                self._sett_feil(f"Timelapse: {e}")

        # lyset i printeren
        self.styr_lys(naa)

        # meld status og hent innstillinger/kommandoer (oftere når vi laster opp)
        if lastet_opp or naa - self.sist_synk >= (2 if trenger_bilder else 5):
            self.synk(lastet_opp)

        # gi opp «ta bilde» hvis kameraet ikke svarer
        if self.ta_bilde_na and not self.kamera.tilkoblet and naa - self.siste_opplastet > 60 and self.kamera.feil:
            for kid in self.ta_bilde_na:
                self.nett.kvitter(kid, False, self.kamera.feil[:200])
            self.ta_bilde_na = []

    def styr_lys(self, naa):
        if not self.printer.aktiv or not self.printer.tilkoblet or naa - self.sist_lys_kommando < 30:
            return
        valg = self.innst["lys"]
        lyset = self.printer.status().get("kammer_lys")
        if lyset is None:
            return
        if valg == "pa" and not lyset:
            self.printer.lys(True)
            self.sist_lys_kommando = naa
        elif valg == "auto":
            if self.kamera_aktivt and not lyset:
                if self.printer.lys(True):
                    self.vi_slo_pa_lyset = True
                self.sist_lys_kommando = naa
            elif not self.kamera_aktivt and lyset and self.vi_slo_pa_lyset and self.tilstand() not in JOBBER:
                if self.printer.lys(False):
                    self.vi_slo_pa_lyset = False
                self.sist_lys_kommando = naa

    def synk(self, siste_bilde=None):
        status = {
            "kamera_aktivt": bool(self.kamera_aktivt and self.kamera.tilkoblet),
            "printer": self.printer.status(),
            "pi": pi_status(self.cfg["PRINTER_IP"], self.kamera.tilkoblet),
            "feil": self.feil or self.kamera.feil or self.printer.feil or "",
            "timelapse_pagar": self.timelapse.pagar,
        }
        if self.print_ferdig:
            status["print_ferdig"] = True
        try:
            svar = self.nett.synk(status, siste_bilde)
        except Exception as e:  # noqa: BLE001
            self._sett_feil(f"Kontakt med nettsiden: {e}")
            self.sist_synk = time.time()
            return
        self.sist_synk = time.time()
        if self.feil.startswith("Kontakt med nettsiden"):
            self.feil = ""
        self.print_ferdig = False
        if isinstance(svar, dict):
            self.innst = les_innstillinger(svar.get("innstillinger"))
            for k in svar.get("kommandoer") or []:
                self.utfor(k)

    def utfor(self, k):
        kid, navn = k.get("id"), k.get("kommando")
        log.info("Kommando fra admin: %s", navn)
        try:
            if navn == "ta_bilde":
                self.ta_bilde_na.append(kid)
                self.kamera.trengs(60)
                return  # kvitteres når bildet er lastet opp
            if navn in ("lys_pa", "lys_av"):
                if not self.printer.aktiv:
                    return self.nett.kvitter(kid, False, "Mangler serienummer – kan ikke styre lyset")
                ok = self.printer.lys(navn == "lys_pa")
                if ok and navn == "lys_av":
                    self.vi_slo_pa_lyset = False
                self.sist_lys_kommando = time.time() + 60  # la være å overstyre med en gang
                return self.nett.kvitter(kid, ok, "Lyset er slått " + ("på" if navn == "lys_pa" else "av") if ok else "Ikke kontakt med printeren")
            if navn == "start_timelapse":
                if self.timelapse.pagar:
                    return self.nett.kvitter(kid, True, "Timelapse var allerede i gang")
                self.timelapse.start(self.innst["print_navn"] or self.siste_navn, manuell=True)
                return self.nett.kvitter(kid, True, "Timelapse startet")
            if navn == "stopp_timelapse":
                if not self.timelapse.pagar:
                    return self.nett.kvitter(kid, False, "Ingen timelapse i gang")
                self.avslutt_timelapse()
                return self.nett.kvitter(kid, True, "Timelapse avsluttet – lastes opp")
            if navn == "oppdater_status":
                ok = self.printer.hent_alt()
                return self.nett.kvitter(kid, ok, "Ba printeren om full status" if ok else "Ikke kontakt med printeren")
            if navn == "omstart":
                self.nett.kvitter(kid, True, "Starter på nytt")
                log.info("Starter på nytt etter ønske fra admin")
                self.stopp.set()
                self._omstart = True
                return
            self.nett.kvitter(kid, False, f"Ukjent kommando: {navn}")
        except Exception as e:  # noqa: BLE001
            self.nett.kvitter(kid, False, str(e)[:200])

    def avslutt_timelapse(self, stoppet=False):
        mappe, antall, navn = self.timelapse.avslutt()
        if not mappe:
            return
        fps = self.innst["timelapse_fps"]
        if antall < 10:
            log.info("Timelapsen hadde bare %s bilder – hopper over", antall)
            shutil.rmtree(mappe, ignore_errors=True)
            return
        navn = navn or self.siste_navn or "Print"
        if stoppet:
            navn = f"{navn} (stoppet)"

        def jobb():
            try:
                fil = lag_video(mappe, antall, fps)
                self.nett.last_opp_timelapse(fil, navn, round(antall / fps), antall)
                log.info("Timelapse lastet opp: %s (%s bilder)", navn, antall)
            except Exception as e:  # noqa: BLE001
                self._sett_feil(f"Timelapse: {e}")
            finally:
                shutil.rmtree(mappe, ignore_errors=True)

        threading.Thread(target=jobb, daemon=True, name="timelapse").start()

    def kjor(self):
        self.kamera.start()
        self.printer.start()
        self.timelapse.rydd_gamle()
        log.info("PrintFiksEB live kamera v%s startet. Printer: %s", VERSJON, self.cfg["PRINTER_IP"])
        self.synk()
        while not self.stopp.is_set():
            try:
                self.runde()
            except Exception as e:  # noqa: BLE001
                log.exception("Uventet feil: %s", e)
                self._sett_feil(f"Uventet feil: {e}")
            self.stopp.wait(0.5)
        self.kamera.stopp()
        self.printer.stopp()
        return 3 if self._omstart else 0


# ---------------------------------------------------------------------------
# Test fra kommandolinja
# ---------------------------------------------------------------------------

def test(cfg):
    ok = True

    def linje(tekst, bra, detalj=""):
        nonlocal ok
        ok = ok and bra
        print(f"  {'✔' if bra else '✘'} {tekst}{(' – ' + detalj) if detalj else ''}")

    print("\nTester oppsettet …\n")
    mangler = [k for k in PAKREVD if not cfg.get(k)]
    linje("Oppsettfila er fylt ut", not mangler, ("mangler " + ", ".join(mangler)) if mangler else "")
    if mangler:
        return False
    nett = Nett(cfg)
    try:
        nett.side({"handling": "test"})
        linje("Nettsiden godtar koblingsnøkkelen", True)
    except Exception as e:  # noqa: BLE001
        linje("Nettsiden godtar koblingsnøkkelen", False, str(e))
    try:
        svar = nett.synk({"pi": pi_status(cfg["PRINTER_IP"], False)})
        linje("Databasen svarer", isinstance(svar, dict) and svar.get("ok") is True)
    except Exception as e:  # noqa: BLE001
        linje("Databasen svarer", False, str(e))

    kamera = Kamera(cfg["PRINTER_IP"], cfg["PRINTER_TILGANGSKODE"])
    kamera.trengs(25)
    kamera.start()
    frist = time.time() + 20
    while time.time() < frist and not kamera.siste()[0]:
        time.sleep(0.3)
    bilde = kamera.siste()[0]
    linje("Får bilde fra kameraet i printeren", bool(bilde),
          f"{len(bilde) // 1024} kB" if bilde else (kamera.feil or "ingen svar fra port 6000"))
    kamera.stopp()

    if cfg.get("PRINTER_SERIENUMMER"):
        printer = Printer(cfg["PRINTER_IP"], cfg["PRINTER_TILGANGSKODE"], cfg["PRINTER_SERIENUMMER"])
        printer.start()
        frist = time.time() + 15
        while time.time() < frist and not printer.data:
            time.sleep(0.3)
        st = printer.status()
        linje("Får status fra printeren", bool(printer.data),
              f"tilstand {st.get('tilstand', '?')}" if printer.data else (printer.feil or "ingen svar fra port 8883"))
        printer.stopp()
    else:
        linje("Serienummer er fylt ut (trengs for status og lys)", False, "PRINTER_SERIENUMMER mangler")

    linje("ffmpeg finnes (for timelapse)", bool(shutil.which("ffmpeg")))
    print("\n" + ("Alt ser bra ut!" if ok else "Noe må fikses – se over.") + "\n")
    return ok


def main():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s", datefmt="%H:%M:%S")
    cfg = les_oppsett()
    if "--test" in sys.argv:
        sys.exit(0 if test(cfg) else 1)
    if "--versjon" in sys.argv:
        print(VERSJON)
        return
    mangler = [k for k in PAKREVD if not cfg.get(k)]
    if mangler:
        log.error("Mangler i %s: %s. Kjør installer.sh på nytt.", ENV_FIL, ", ".join(mangler))
        time.sleep(30)  # så systemd ikke starter oss hundre ganger i minuttet
        sys.exit(1)
    os.makedirs(cfg["DATAMAPPE"], exist_ok=True)
    program = Program(cfg)
    signal.signal(signal.SIGTERM, lambda *_: program.stopp.set())
    signal.signal(signal.SIGINT, lambda *_: program.stopp.set())
    sys.exit(program.kjor())


if __name__ == "__main__":
    main()
