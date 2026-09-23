import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { getSiteData } from '@/lib/data';
import { text } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const site = await getSiteData();
  return (
    <>
      <a
        href="#innhold"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Hopp til innhold
      </a>
      <Nav businessName={text(site.settings, 'bedrift_navn', 'PrintFiksEB')} />
      <main id="innhold">{children}</main>
      <Footer settings={site.settings} />
    </>
  );
}
