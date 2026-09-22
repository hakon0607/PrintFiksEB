import Link from 'next/link';
import Image from 'next/image';
import { formatPhone, telHref, text } from '@/lib/settings';

export function Footer({ settings }: { settings: Record<string, string> }) {
  const navn = text(settings, 'bedrift_navn', 'PrintFiksEB');
  const telefon = text(settings, 'kontakt_telefon', '41381608');
  const epost = text(settings, 'kontakt_epost');
  const skole = text(settings, 'bedrift_skole', 'Skranevatnet skole');
  const sted = text(settings, 'bedrift_sted', 'Sandsli, Bergen');
  const instagram = text(settings, 'sosial_instagram');
  const snapchat = text(settings, 'sosial_snapchat');
  const vippsNr = text(settings, 'vipps_nummer', telefon);
  const ringetid = text(settings, 'kontakt_ringetid');
  const meldingstid = text(settings, 'kontakt_meldingstid');
  const ringerTilbake = text(settings, 'kontakt_ringer_tilbake');

  return (
    <footer className="relative mt-24 overflow-hidden bg-ink-900 text-ink-200">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            'radial-gradient(60rem 22rem at 15% -10%, rgba(61,118,241,0.30), transparent 60%), radial-gradient(40rem 20rem at 95% 110%, rgba(37,89,199,0.28), transparent 60%)',
        }}
      />
      <div className="container-x relative grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <div className="relative h-12 w-12 overflow-hidden rounded-2xl bg-white/10 p-1">
            <Image src="/logo-mark.png" alt="" fill sizes="48px" className="object-contain" />
          </div>
          <p className="mt-4 text-sm leading-relaxed text-ink-300">
            {navn} er en elevbedrift på {skole}. Vi printer, fikser og designer i 3D for folk i
            nærmiljøet.
          </p>
          <p className="mt-3 text-xs uppercase tracking-[0.16em] text-brand-300">
            Ideer blir virkelighet
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white">Snarveier</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            {[
              { href: '/bestill', label: 'Bestill' },
              { href: '/galleri', label: 'Galleri' },
              { href: '/om-oss', label: 'Om oss og FAQ' },
            ].map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="link-underline text-ink-300 hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white">Kontakt</h3>
          <ul className="mt-4 space-y-2.5 text-sm text-ink-300">
            <li>
              <a href={telHref(telefon)} className="link-underline text-base font-semibold text-white">
                {formatPhone(telefon)}
              </a>
              <span className="mt-1 block text-xs leading-relaxed text-ink-400">
                <span className="font-semibold text-brand-300">Melding: hele døgnet.</span>{' '}
                {meldingstid}
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-ink-400">
                <span className="font-semibold text-brand-300">Telefon:</span> {ringetid}{' '}
                {ringerTilbake}
              </span>
            </li>
            {epost && (
              <li>
                <a href={`mailto:${epost}`} className="link-underline hover:text-white">
                  {epost}
                </a>
              </li>
            )}
            <li>{sted}</li>
            {(instagram || snapchat) && (
              <li className="flex flex-wrap gap-3 pt-1">
                {instagram && (
                  <a href={instagram} className="link-underline hover:text-white" rel="noreferrer">
                    Instagram
                  </a>
                )}
                {snapchat && <span>Snap: {snapchat}</span>}
              </li>
            )}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white">Betaling</h3>
          <p className="mt-4 text-sm text-ink-300">
            Vipps til <span className="font-semibold text-white">{formatPhone(vippsNr)}</span>, eller
            kontant hvis du sier fra på forhånd.
          </p>
          <Link href="/bestill" className="btn-primary btn-sm mt-5">
            Start en bestilling
          </Link>
        </div>
      </div>

      <div className="container-x relative flex flex-col gap-2 border-t border-white/10 py-6 text-xs text-ink-400 sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()} {navn} · Elevbedrift ved {skole}
        </p>
        <Link href="/admin" className="link-underline hover:text-white">
          For ansatte
        </Link>
      </div>
    </footer>
  );
}
