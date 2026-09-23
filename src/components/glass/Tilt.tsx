'use client';

import { useRef } from 'react';

/** Kort som vipper litt i 3D etter musa. */
export function Tilt({
  children,
  className,
  max = 8,
  lift = 6,
}: {
  children: React.ReactNode;
  className?: string;
  max?: number;
  lift?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      className={className}
      style={{ transition: 'transform .35s cubic-bezier(.22,1,.36,1)', transformStyle: 'preserve-3d' }}
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse' || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        ref.current.style.setProperty('--mx', `${(x + 0.5) * 100}%`);
        ref.current.style.setProperty('--my', `${(y + 0.5) * 100}%`);
        ref.current.style.transform = `perspective(1000px) translateY(-${lift}px) rotateY(${x * max}deg) rotateX(${-y * max}deg)`;
      }}
      onPointerLeave={() => {
        if (ref.current) ref.current.style.transform = '';
      }}
    >
      {children}
    </div>
  );
}
