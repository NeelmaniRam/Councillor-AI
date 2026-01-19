import type { SVGProps } from 'react';

export function IvyLogo(props: SVGProps<SVGSVGElement>) {
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
      <path d="M12 22c-5-5-5-15 0-20" />
      <path d="M12 2c5 5 5 15 0 20" />
      <path d="M5.5 16.5c8-8 8-8 8-8" />
      <path d="M18.5 7.5c-8 8-8 8-8 8" />
    </svg>
  );
}
