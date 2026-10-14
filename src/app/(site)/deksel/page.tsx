import { redirect } from 'next/navigation';
import { DEKSEL_KODE } from '@/lib/deksel/produkt';

/** Gammel adresse – dekselet ligger nå i galleriet som et vanlig produkt. */
export default function GammelDekselSide() {
  redirect(`/galleri/${DEKSEL_KODE}`);
}
