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
        <radialGradient id="lens-terracotta" cx="34%" cy="30%" r="70%">
          <stop offset="0%" stopColor="hsl(18 70% 60%)" />
          <stop offset="55%" stopColor="hsl(15 56% 44%)" />
          <stop offset="100%" stopColor="hsl(14 60% 34%)" />
        </radialGradient>
      </defs>
      <circle cx="20" cy="20" r="20" fill="url(#lens-terracotta)" />
      {/* specular highlight — inner ellipse, no CSS needed */}
      <ellipse cx="15" cy="13" rx="7" ry="5" fill="white" fillOpacity="0.82" />
    </svg>
  );
}
