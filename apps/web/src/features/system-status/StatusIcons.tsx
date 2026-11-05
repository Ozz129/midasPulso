const common = {
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  focusable: 'false',
  'aria-hidden': true,
} as const;

export function CheckIcon() {
  return (
    <svg {...common}>
      <circle cx="8" cy="8" r="6.5" />
      <path d="m5.2 8.2 1.9 1.9 3.7-4" />
    </svg>
  );
}

export function AlertIcon() {
  return (
    <svg {...common}>
      <circle cx="8" cy="8" r="6.5" />
      <path d="M8 4.8v3.6M8 11.2h.01" />
    </svg>
  );
}

export function PendingIcon({ className }: { className?: string }) {
  return (
    <svg {...common} className={className}>
      <path d="M14.5 8A6.5 6.5 0 1 1 8 1.5" />
    </svg>
  );
}

export function RetryIcon() {
  return (
    <svg {...common}>
      <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9" />
      <path d="M13.5 2.5v3h-3" />
    </svg>
  );
}
