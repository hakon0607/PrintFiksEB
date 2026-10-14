/**
 * Stor «Nyhet»-seksjon høyt oppe på siden. Enten ett produkt, eller et helt
 * tema (Halloween / Jul) med scene og de første modellene.
 */
import Image from 'next/image';
import Link from 'next/link';
import { kr } from '@/lib/settings';
import type { Nyhet } from '@/lib/nyhet';
import { erDekselProdukt } from '@/lib/deksel/produkt';
import { Reveal } from '@/components/Reveal';
import { ProductCard } from '@/components/ProductCard';
import { HalloweenScene, JulScene, Nett, Snofall } from '@/components/TemaPynt';

function Merke({ tekst, mork }: { tekst: string; mork?: boolean }) {
  return (
    <span
      className={`inline-flex w-fit items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] ${
        mork ? 'bg-white/15 text-white ring-1 ring-white/25' : 'bg-brand-600 text-white shadow-[0_8px_20px_-8px_rgba(37,89,199,.8)]'
      }`}
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/80" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
      </span>
      {tekst}
    </span>
  );
}

const pil = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M5 12h14m0 0-5.5-5.5M19 12l-5.5 5.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function NyhetBanner({
  nyhet,
  currency = 'kr',
  className = '',
  iContainer = true,
}: {
  nyhet: Nyhet;
  currency?: string;
  className?: string;
  /** false når siden allerede har container-x rundt */
  iContainer?: boolean;
}) {
  const boks = iContainer ? 'container-x' : '';
  if (nyhet.type === 'produkt') {
    const p = nyhet.produkt;
    const deksel = erDekselProdukt(p);
    const bilde = p.image_url || p.images?.[0] || '';
    const href = `/galleri/${encodeURIComponent(p.code || p.id)}`;
    return (
      <section aria-label={`${nyhet.etikett}: ${nyhet.tittel}`} className={`relative ${className}`}>
        <div className={boks}>
          <Reveal>
            <div className="nyhet-ramme relative overflow-hidden rounded-[2rem] p-[2px]">
              <div className="relative grid overflow-hidden rounded-[calc(2rem-2px)] bg-white lg:grid-cols-[1.1fr_1fr]">
                <Link href={href} className="group relative block aspect-[4/3] overflow-hidden bg-gradient-to-br from-brand-50 to-brand-100 lg:aspect-auto lg:min-h-[360px]">
                  {bilde && (
                    <Image src={bilde} alt={p.name} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.04]" priority />
                  )}
                  <div className="absolute left-4 top-4"><Merke tekst={nyhet.etikett} /></div>
                </Link>
                <div className="relative flex flex-col justify-center gap-4 p-6 sm:p-10">
                  <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-brand-100/70 blur-3xl" />
                  <h2 className="relative text-balance text-3xl font-bold leading-tight sm:text-4xl">{nyhet.tittel}</h2>
                  {nyhet.tekst && <p className="relative max-w-md text-[16px] leading-relaxed text-ink-600">{nyhet.tekst}</p>}
                  <p className="relative text-2xl font-bold text-brand-700">
                    {deksel ? `fra ${kr(Number(p.price) || 0, currency)}` : kr(Number(p.price) || 0, currency)}
                  </p>
                  <div className="relative flex flex-wrap gap-3">
                    <Link href={deksel ? `${href}/lag` : href} className="btn-primary px-6 py-3 text-base">
                      {deksel ? 'Design ditt deksel' : 'Se produktet'} {pil}
                    </Link>
                    {deksel && <Link href={href} className="btn-ghost">Les mer</Link>}
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    );
  }

  // tema
  const { tema } = nyhet;
  const href = nyhet.kategori ? `/galleri?kategori=${encodeURIComponent(nyhet.kategori)}` : '/galleri';
  const vis = nyhet.produkter.slice(0, 3);
  return (
    <section aria-label={`${nyhet.etikett}: ${nyhet.tittel}`} className={`relative ${className}`}>
      <div className={boks}>
        <Reveal>
          <div className={`tema-seksjon relative overflow-hidden rounded-[2rem] ${tema.seksjon}`}>
            {tema.id === 'jul' && <Snofall />}
            {tema.id === 'halloween' && <Nett className="pointer-events-none absolute -left-1 -top-1 h-28 w-28 sm:h-36 sm:w-36" />}
            <div className="relative h-80 sm:h-72">
              {tema.id === 'halloween' ? <HalloweenScene /> : <JulScene />}
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/25 to-transparent sm:bg-gradient-to-r sm:from-black/50 sm:via-black/10" />
              <div className="relative z-10 flex h-full max-w-[32rem] flex-col justify-start gap-3 px-6 pt-7 sm:justify-center sm:px-10 sm:pt-0">
                <Merke tekst={nyhet.etikett} mork />
                <h2 className={`text-4xl font-bold tracking-tight sm:text-5xl ${tema.tittelFarge}`}>{nyhet.tittel}</h2>
                <p className={`max-w-sm text-[15px] leading-relaxed ${tema.tekstFarge}`}>{nyhet.tekst}</p>
                <Link href={href} className={`mt-1 inline-flex w-fit items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-colors ${tema.knapp}`}>
                  Se {nyhet.produkter.length > 0 ? `alle ${nyhet.produkter.length}` : 'modellene'} {pil}
                </Link>
              </div>
            </div>
            {vis.length > 0 && (
              <div className="relative grid gap-4 px-3 pb-5 pt-2 sm:grid-cols-2 sm:px-7 sm:pb-8 lg:grid-cols-3">
                {vis.map((p) => (
                  <ProductCard key={p.id} product={p} currency={currency} temaId={tema.id} />
                ))}
              </div>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
