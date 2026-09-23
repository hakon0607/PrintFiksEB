'use client';

import { useEffect, useRef } from 'react';

const GLASS =
  '.glass,.card,.btn,.eyebrow,.glass-nav,.cta-glass,.bg-white.shadow-soft,.bg-white.shadow-lift';

/**
 * Oppførselen til Liquid Glass på hele nettsiden:
 * - slår på ekte lysbrytning i Chrome/Edge
 * - speilblink som følger musa på alt av glass
 * - magnetiske knapper ([data-mag])
 * - fremdriftslinje øverst
 */
export function GlassFx() {
  const rail = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const brands: { brand: string }[] =
      (navigator as unknown as { userAgentData?: { brands: { brand: string }[] } }).userAgentData?.brands ?? [];
    if (brands.some((b) => /Chromium|Google Chrome|Microsoft Edge/.test(b.brand))) {
      document.documentElement.classList.add('refract');
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let current: HTMLElement | null = null;
    let spec: HTMLElement | null = null;

    const getSpec = (el: HTMLElement) => {
      let s = el.querySelector<HTMLElement>(':scope > .spec');
      if (!s) {
        s = document.createElement('span');
        s.className = 'spec';
        s.setAttribute('aria-hidden', 'true');
        el.appendChild(s);
      }
      return s;
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const target = (e.target as HTMLElement | null)?.closest<HTMLElement>(GLASS) ?? null;
      if (target !== current) {
        spec?.classList.remove('on');
        current = target;
        spec = target ? getSpec(target) : null;
        if (spec) {
          spec.classList.add('on');
          spec.classList.remove('sheen');
          void spec.offsetWidth;
          spec.classList.add('sheen');
        }
      }
      if (current && spec) {
        const r = current.getBoundingClientRect();
        spec.style.setProperty('--sx', `${e.clientX - r.left}px`);
        spec.style.setProperty('--sy', `${e.clientY - r.top}px`);
      }
      // magnetiske knapper
      if (!reduce) {
        const mag = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-mag]');
        document.querySelectorAll<HTMLElement>('[data-mag].is-mag').forEach((m) => {
          if (m !== mag) {
            m.classList.remove('is-mag');
            m.style.transform = '';
          }
        });
        if (mag) {
          const r = mag.getBoundingClientRect();
          mag.classList.add('is-mag');
          mag.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.22}px,${(e.clientY - r.top - r.height / 2) * 0.3}px)`;
        }
      }
    };

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const h = document.documentElement.scrollHeight - window.innerHeight;
        if (rail.current) rail.current.style.transform = `scaleX(${h > 0 ? window.scrollY / h : 0})`;
      });
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <div ref={rail} className="scroll-rail" aria-hidden />;
}
