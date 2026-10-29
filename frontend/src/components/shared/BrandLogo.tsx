import { useId } from 'react';

export function BrandLogo({ ink = false }: { ink?: boolean }) {
  const cutoutId = useId();
  return (
    <span className={`brand-lockup${ink ? ' brand-lockup-ink' : ''}`}>
      <svg viewBox="0 0 48 58" fill="none" aria-hidden="true" focusable="false">
        <defs>
          <mask
            id={cutoutId}
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="48"
            height="58"
          >
            <rect width="48" height="58" fill="white" />
            <path
              d="M10 24 8.5 47M37.5 24 39 47"
              stroke="black"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          </mask>
        </defs>
        <g mask={`url(#${cutoutId})`}>
          <path
            d="M9 18h29l4 32c.3 2.6-1.8 4.5-4.3 4.5H7.5c-2.5 0-4.3-2-4-4.5L6 21c.1-1.8 1.1-3 3-3Z"
            fill="#fff8eb"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path
            d="M35 18h5l4 31c.3 2-1.1 4-3.1 4.5L35 55V18Z"
            fill="#fff8eb"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M14 19h20v36H12l2-36Z"
            fill="#f6dfb9"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <path
            d="M15 28V13a9 9 0 0 1 18 0v15"
            stroke="#c7b69a"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M15 27V13a9 9 0 0 1 18 0v14"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
      </svg>
      <span>BagDaily</span>
    </span>
  );
}
