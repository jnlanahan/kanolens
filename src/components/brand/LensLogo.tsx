import { cn } from "@/lib/utils";

interface LensLogoProps {
  size?: number;
  className?: string;
}

export function LensLogo({ size = 36, className }: LensLogoProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id="lens-outer" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(var(--brand-from))" stopOpacity="0.9" />
          <stop offset="100%" stopColor="hsl(var(--brand-to))" stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id="lens-core" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(var(--brand-to))" />
          <stop offset="100%" stopColor="hsl(var(--brand-from))" />
        </linearGradient>
      </defs>
      <circle cx="14" cy="20" r="12" fill="url(#lens-outer)" opacity="0.75" />
      <circle cx="26" cy="20" r="12" fill="url(#lens-core)" opacity="0.75" />
      <circle cx="20" cy="20" r="5" fill="white" opacity="0.95" />
    </svg>
  );
}
