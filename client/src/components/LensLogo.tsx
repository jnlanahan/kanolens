import React from 'react';

interface LensLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const LensLogo = React.memo(function LensLogo({ size = "md", className = "" }: LensLogoProps) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8", 
    lg: "w-12 h-12"
  };

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-violet-500 rounded-full opacity-80"></div>
      <div className="absolute inset-1 bg-gradient-to-br from-violet-500 to-blue-500 rounded-full opacity-60"></div>
      <div className="absolute inset-2 bg-white rounded-full"></div>
      <div className="absolute inset-3 bg-gradient-to-br from-blue-500 to-violet-500 rounded-full"></div>
    </div>
  );
});

export default LensLogo;
