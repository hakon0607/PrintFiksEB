'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';

export default function NyttPassordSide() {
  const router = useRouter();
  const supabase = getBrowserClient();
  const [navn, setNavn] = useState('');
  const [passord, setPassord] = useState('');
  const [gjenta, setGjenta] = useState('');
  const [feil, setFeil] = useState('');
  const [jobber, setJobber] = useState(false);
  const [klar, setKlar] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setKlar(!!data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) setKlar(true);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  async function lagre(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    if (passord.length < 8) {
      setFeil('Passordet må ha minst 8 tegn.');
      return;
    }
    if (passord !== gjenta) {
      setFeil('De to passordene er ikke like.');
      return;
    }
    setJobber(true);
    setFeil('');

    const { error } = await supabase.auth.updateUser({
      password: passord,
      ...(navn.trim() ? { data: { name: navn.trim() } } : {}),
    });

    if (error) {
      setFeil('Klarte ikke å lagre passordet. Be om en ny lenke og prøv igjen.');
      setJobber(false);
      return;
    }

    const { data } = await supabase.auth.getUser();
    if (data.user && navn.trim()) {
      await supabase.from('profiles').update({ name: navn.trim() }).eq('id', data.user.id);
    }

    router.push('/admin');
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-[420px] rounded-[2rem] border border-ink-100 bg-white p-8 shadow-lift">
        <div className="relative mx-auto h-12 w-12 overflow-hidden rounded-2xl">
          <Image src="/logo-mark.png" alt="" fill sizes="48px" className="object-contain" />
        </div>
        <h1 className="mt-5 text-center text-2xl font-bold">Lag ditt passord</h1>
        <p className="mt-2 text-center text-sm leading-relaxed text-ink-500">
          Velg et passord du husker. Du bruker det sammen med e-posten din når du logger inn.
        </p>

        {!klar ? (
          <p className="mt-6 rounded-2xl bg-amber-50 px-4 py-4 text-sm text-amber-800">
            Åpne denne siden via lenken du fikk på e-post. Hvis lenken er gammel, be om en ny under
            «Glemt passord».
          </p>
        ) : (
          <form onSubmit={lagre} className="mt-6 space-y-4">
            <div>
              <label className="label" htmlFor="navn">
                Navnet ditt
              </label>
              <input
                id="navn"
                value={navn}
                onChange={(e) => setNavn(e.target.value)}
                className="field"
                placeholder="Fornavn Etternavn"
              />
            </div>
            <div>
              <label className="label" htmlFor="pw">
                Nytt passord
              </label>
              <input
                id="pw"
                type="password"
                required
                value={passord}
                onChange={(e) => setPassord(e.target.value)}
                className="field"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="label" htmlFor="pw2">
                Gjenta passordet
              </label>
              <input
                id="pw2"
                type="password"
                required
                value={gjenta}
                onChange={(e) => setGjenta(e.target.value)}
                className="field"
                autoComplete="new-password"
              />
            </div>
            {feil && (
              <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{feil}</p>
            )}
            <button type="submit" disabled={jobber} className="btn-primary w-full">
              {jobber ? 'Lagrer…' : 'Lagre og logg inn'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
