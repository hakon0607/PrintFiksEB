export function Blobs({ variant = 'hero' }: { variant?: 'hero' | 'soft' }) {
  if (variant === 'soft') {
    return (
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-brand-200/40 blur-3xl animate-drift" />
        <div className="absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-brand-100/60 blur-3xl animate-drift [animation-delay:-6s]" />
      </div>
    );
  }
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute left-[8%] top-[-6rem] h-[26rem] w-[26rem] rounded-full bg-brand-300/35 blur-[90px] animate-drift" />
      <div className="absolute right-[4%] top-[2rem] h-[22rem] w-[22rem] rounded-full bg-brand-200/45 blur-[80px] animate-drift [animation-delay:-8s]" />
      <div className="absolute left-[40%] top-[14rem] h-[18rem] w-[18rem] rounded-full bg-sky-200/40 blur-[70px] animate-drift [animation-delay:-14s]" />
      <div
        className="absolute inset-0 opacity-[0.55]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(37,89,199,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(37,89,199,0.07) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(70% 55% at 50% 30%, black, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(70% 55% at 50% 30%, black, transparent 80%)',
        }}
      />
    </div>
  );
}
