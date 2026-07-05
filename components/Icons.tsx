import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
};

export function LogoMark(props: IconProps) {
  return (
    <svg {...base} width="20" height="20" aria-hidden {...props}>
      <rect x="6" y="2.5" width="12" height="19" rx="3" />
      <path d="M12 6.5v6.5" />
      <path d="m9.25 10 2.75-3 2.75 3" />
      <path d="M10.5 18.5h3" />
    </svg>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <svg {...base} width="22" height="22" aria-hidden {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
    </svg>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <svg {...base} width="22" height="22" aria-hidden {...props}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19.5a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.2a3.2 3.2 0 0 1 0 5.9" />
      <path d="M17.5 14.4a5.5 5.5 0 0 1 3 5.1" />
    </svg>
  );
}

export function CameraIcon(props: IconProps) {
  return (
    <svg {...base} width="22" height="22" aria-hidden {...props}>
      <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2L8 5h8l1.5 2h2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z" />
      <circle cx="12" cy="13" r="3.2" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...base} width="22" height="22" strokeWidth={2.4} aria-hidden {...props}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <svg {...base} width="18" height="18" aria-hidden {...props}>
      <path d="M4 12h15" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

export function GithubIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden {...props}>
      <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.48v-1.7c-2.78.62-3.37-1.2-3.37-1.2-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.9 1.57 2.35 1.12 2.92.86.09-.67.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05a9.3 9.3 0 0 1 5 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.79-4.57 5.05.36.32.68.94.68 1.9v2.82c0 .27.18.59.69.48A10.26 10.26 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z" />
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <svg {...base} width="16" height="16" aria-hidden {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...base} width="16" height="16" aria-hidden {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function DeviceIcon(props: IconProps) {
  return (
    <svg {...base} width="22" height="22" aria-hidden {...props}>
      <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
      <path d="M10.5 18.5h3" />
    </svg>
  );
}
