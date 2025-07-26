import { ReactNode } from 'react';

interface PageLayoutProps {
  children: ReactNode;
  variant?: 'default' | 'landing' | 'dashboard';
  className?: string;
}

export default function PageLayout({ 
  children, 
  variant = 'default',
  className = '' 
}: PageLayoutProps) {
  // Landing page style background
  const landingBg = "min-h-screen bg-gradient-to-br from-blue-50 via-white to-violet-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900";
  
  // Standard page style background
  const defaultBg = "min-h-screen bg-gradient-to-br from-blue-50 via-white to-violet-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900";
  
  // Dashboard style background (slightly different for working environment)
  const dashboardBg = "min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900";

  const backgroundClass = variant === 'landing' ? landingBg : 
                         variant === 'dashboard' ? dashboardBg : 
                         defaultBg;

  return (
    <div className={`${backgroundClass} ${className}`}>
      {children}
    </div>
  );
}