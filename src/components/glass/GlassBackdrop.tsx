/** Fargerik bakgrunn + SVG-filtrene som gir lysbrytning i glasset. */
export function GlassBackdrop() {
  return (
    <>
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
        <filter id="lg-refract" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.006 0.010" numOctaves={2} seed={7} result="n" />
          <feGaussianBlur in="n" stdDeviation="3" result="nb" />
          <feDisplacementMap in="SourceGraphic" in2="nb" scale="42" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="lg-refract-soft" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.004 0.007" numOctaves={1} seed={2} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="26" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="lg-lens" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves={1} seed={4} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="70" xChannelSelector="R" yChannelSelector="B" />
        </filter>
      </svg>
      <div className="aurora" aria-hidden>
        <i className="a1" />
        <i className="a2" />
        <i className="a3" />
        <i className="a4" />
        <i className="a5" />
        <div className="dots" />
      </div>
    </>
  );
}
