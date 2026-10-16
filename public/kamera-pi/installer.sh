#!/usr/bin/env bash
# PrintFiksEB – live kamera: installasjon på Raspberry Pi (Raspberry Pi OS / Debian / Ubuntu)
#
#   curl -fsSL https://www.printfiks.org/kamera-pi/installer.sh | sudo bash
#
# Kjør den igjen når som helst for å oppdatere programmet. Oppsettet ditt beholdes.
# Vil du legge inn oppsettet på nytt:  ... | sudo bash -s -- --nytt-oppsett
set -euo pipefail

SIDE="${PRINTFIKS_SIDE:-https://www.printfiks.org}"
MAPPE=/opt/printfiks-kamera
ENV_FIL=/etc/printfiks-kamera.env
TJENESTE=printfiks-kamera
BRUKER=printfiks-kamera

blaa() { printf '\033[1;34m%s\033[0m\n' "$*"; }
gronn() { printf '\033[1;32m%s\033[0m\n' "$*"; }
rod() { printf '\033[1;31m%s\033[0m\n' "$*"; }

if [ "$(id -u)" -ne 0 ]; then
  rod "Kjør med sudo:  curl -fsSL $SIDE/kamera-pi/installer.sh | sudo bash"
  exit 1
fi
if [ ! -e /dev/tty ]; then
  rod "Fant ingen terminal å stille spørsmål i. Kjør kommandoen i Terminal på Pi-en eller over SSH."
  exit 1
fi

blaa "PrintFiksEB – live kamera"
echo "Installerer det som trengs (kan ta et par minutter første gang) …"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq python3 python3-requests python3-pil python3-paho-mqtt ffmpeg curl >/dev/null
gronn "✔ Programmer installert"

mkdir -p "$MAPPE"
curl -fsSL "$SIDE/kamera-pi/printfiks_kamera.py" -o "$MAPPE/printfiks_kamera.py.ny"
python3 -m py_compile "$MAPPE/printfiks_kamera.py.ny"
mv "$MAPPE/printfiks_kamera.py.ny" "$MAPPE/printfiks_kamera.py"
chmod 755 "$MAPPE/printfiks_kamera.py"
gronn "✔ Kameraprogrammet lastet ned (versjon $(python3 "$MAPPE/printfiks_kamera.py" --versjon))"

# --- oppsettet ---
hent() { grep -E "^$1=" "$ENV_FIL" 2>/dev/null | tail -n1 | cut -d= -f2- || true; }
sett() {
  local nokkel="$1" verdi="$2"
  if grep -qE "^$nokkel=" "$ENV_FIL"; then
    local tmp; tmp="$(mktemp)"
    awk -v k="$nokkel" -v v="$verdi" 'BEGIN{FS=OFS="="} $1==k{$0=k"="v} {print}' "$ENV_FIL" >"$tmp"
    cat "$tmp" >"$ENV_FIL"; rm -f "$tmp"
  else
    printf '%s=%s\n' "$nokkel" "$verdi" >>"$ENV_FIL"
  fi
}

if [ ! -s "$ENV_FIL" ] || [ -z "$(hent KAMERA_NOKKEL)" ] || [ "${1:-}" = "--nytt-oppsett" ]; then
  echo
  blaa "Steg 1: Lim inn oppsettet fra admin → Live kamera"
  echo "(Trykk «Lag koblingsnøkkel» i admin og kopier teksten.)"
  echo "Lim inn her, og trykk Enter og deretter Ctrl+D når du er ferdig:"
  umask 077
  cat </dev/tty >"$ENV_FIL.ny"
  if ! grep -qE '^KAMERA_NOKKEL=.+' "$ENV_FIL.ny"; then
    rm -f "$ENV_FIL.ny"
    rod "Fant ikke KAMERA_NOKKEL i teksten. Kopier hele oppsettet fra admin og prøv igjen."
    exit 1
  fi
  # behold printeropplysninger fra før hvis de ikke står i det nye
  if [ -s "$ENV_FIL" ]; then
    for k in PRINTER_IP PRINTER_TILGANGSKODE PRINTER_SERIENUMMER; do
      gammel="$(hent "$k")"
      if [ -n "$gammel" ] && ! grep -qE "^$k=.+" "$ENV_FIL.ny"; then
        grep -vE "^$k=" "$ENV_FIL.ny" >"$ENV_FIL.tmp" || true
        printf '%s=%s\n' "$k" "$gammel" >>"$ENV_FIL.tmp"
        mv "$ENV_FIL.tmp" "$ENV_FIL.ny"
      fi
    done
  fi
  mv "$ENV_FIL.ny" "$ENV_FIL"
  gronn "✔ Oppsettet er lagret"
fi
chmod 600 "$ENV_FIL"

echo
blaa "Steg 2: Printeren"
if [ -z "$(hent PRINTER_IP)" ]; then
  read -r -p "IP-adressen til printeren (står under nettverk/WLAN på printerens skjerm): " v </dev/tty
  sett PRINTER_IP "$(echo "$v" | tr -d '[:space:]')"
fi
if [ -z "$(hent PRINTER_TILGANGSKODE)" ]; then
  read -r -p "Tilgangskoden (Access Code, 8 tegn – samme sted): " v </dev/tty
  sett PRINTER_TILGANGSKODE "$(echo "$v" | tr -d '[:space:]')"
fi
if [ -z "$(hent PRINTER_SERIENUMMER)" ]; then
  read -r -p "Serienummeret (står under enhet/Device på printeren, eller i Bambu Studio): " v </dev/tty
  sett PRINTER_SERIENUMMER "$(echo "$v" | tr -d '[:space:]')"
fi
gronn "✔ Printer: $(hent PRINTER_IP)"

# --- tjenesten som starter av seg selv ---
if ! id "$BRUKER" >/dev/null 2>&1; then
  useradd --system --no-create-home --shell /usr/sbin/nologin "$BRUKER"
fi
cat >/etc/systemd/system/$TJENESTE.service <<EOF
[Unit]
Description=PrintFiksEB live kamera (Bambu Lab P1S)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$BRUKER
EnvironmentFile=$ENV_FIL
Environment=TZ=Europe/Oslo PYTHONUNBUFFERED=1
StateDirectory=$TJENESTE
ExecStart=/usr/bin/python3 $MAPPE/printfiks_kamera.py
Restart=always
RestartSec=5
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable "$TJENESTE" >/dev/null 2>&1

echo
blaa "Steg 3: Tester forbindelsene"
set +e
set -a; . "$ENV_FIL"; set +a
python3 "$MAPPE/printfiks_kamera.py" --test
TEST=$?
set -e

systemctl restart "$TJENESTE"
echo
if [ $TEST -eq 0 ]; then
  gronn "Ferdig! Kameraet kjører nå, og starter av seg selv når Pi-en skrus på."
else
  rod "Programmet er installert, men noe i testen feilet (se over)."
  echo "Rett opp, og kjør:  sudo systemctl restart $TJENESTE"
  echo "Feil printeropplysninger? Endre dem med:  sudo nano $ENV_FIL"
fi
echo "Se status i admin → Live kamera."
echo "Se loggen her:   journalctl -u $TJENESTE -f"
