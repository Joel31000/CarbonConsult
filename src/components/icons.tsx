import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M11 20A7 7 0 0 1 7 6V5h2v1a5 5 0 0 0 1.5 3.5A5 5 0 0 0 17 8h0a5 5 0 0 0 4-4V3h-2v1a3 3 0 0 1-3 3h-1a3 3 0 0 1-3-3V5H7V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v1a2 2 0 0 0 2 2h1v1a7 7 0 0 1-4 6.3V20a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-1a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3.2A7 7 0 0 1 11 20z" />
    </svg>
  );
}

export function Construction(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path d="M10 12h4" />
      <path d="M12 10v4" />
      <path d="M2 10h.01" />
      <path d="M2 14h.01" />
      <path d="M22 10h-.01" />
      <path d="M22 14h-.01" />
      <path d="M6 18V6" />
      <path d="M18 18V6" />
    </svg>
  );
}

export function FileSpreadsheet(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M15 13v6" />
      <path d="M12 19h6" />
      <path d="M9 13v6" />
      <path d="M6 19h6" />
    </svg>
  );
}
