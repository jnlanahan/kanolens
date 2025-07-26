import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReactNode } from "react";

interface StandardHeaderProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  showBeta?: boolean;
  variant?: 'default' | 'glass';
}

export default function StandardHeader({ 
  title = "kanolens",
  subtitle,
  actions,
  showBeta = true,
  variant = 'default'
}: StandardHeaderProps) {
  const headerClass = variant === 'glass' 
    ? "border-b border-white/20 dark:border-slate-700/50 glass-card shadow-lg backdrop-blur-md"
    : "border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm";

  return (
    <header className={headerClass}>
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Lens-shaped logo */}
          <div className="kano-lens-logo">
            <div className="inner"></div>
            <div className="core"></div>
          </div>
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-mono-heading font-semibold text-gray-900 dark:text-white">
              {title}
            </h1>
            {subtitle && (
              <>
                <span className="text-sm text-gray-400">•</span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {subtitle}
                </span>
              </>
            )}
          </div>
          {showBeta && (
            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              BETA
            </Badge>
          )}
        </div>
        
        {actions && (
          <div className="flex items-center space-x-4">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}