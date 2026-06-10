export function BrandMark({ size = 38 }: { size?: number }) {
  return (
    <svg className="brand-mark" style={{ width: size, height: size }} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#7FA66A" />
      <rect x="41.5" y="15" width="5.5" height="10" rx="2" fill="#FFFAF0" />
      <path
        d="M14 30L29.9 16.6C31.1 15.6 32.9 15.6 34.1 16.6L50 30V46C50 49.314 47.314 52 44 52H20C16.686 52 14 49.314 14 46V30Z"
        fill="#FFFAF0"
      />
      <path
        d="M32 45.2C26.7 41.4 23.2 38.2 23.2 34.4C23.2 31.7 25.3 29.6 28 29.6C29.6 29.6 31.1 30.4 32 31.8C32.9 30.4 34.4 29.6 36 29.6C38.7 29.6 40.8 31.7 40.8 34.4C40.8 38.2 37.3 41.4 32 45.2Z"
        fill="#C9973D"
      />
    </svg>
  );
}

export function BrandLogo({ withTagline = false }: { withTagline?: boolean }) {
  return (
    <span className="brand" aria-label="Chorely">
      <BrandMark />
      <span className="brand-text">
        <span className="brand-name">Chorely</span>
        {withTagline ? <span className="brand-tagline">Building Responsibility, One Task at a Time</span> : null}
      </span>
    </span>
  );
}
