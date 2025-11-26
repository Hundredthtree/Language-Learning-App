import React from 'react';

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  withText?: boolean;
}

export function Logo({ className = "", size = "md", withText = false }: LogoProps) {
  const sizeMap = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
    xl: "h-16 w-16"
  };

  const textSizeMap = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-xl",
    xl: "text-2xl"
  };

  const icon = (
    <div className={`flex shrink-0 items-center justify-center rounded-xl overflow-hidden shadow-lg shadow-slate-500/10 ${sizeMap[size]} ${className}`}>
      <svg
        viewBox="0 0 3 2"
        className="w-full h-full"
        preserveAspectRatio="none"
      >
        {/* Russian Flag - White, Blue, Red horizontal stripes */}
        <rect x="0" y="0" width="3" height="0.667" fill="#FFFFFF" />
        <rect x="0" y="0.667" width="3" height="0.667" fill="#0039A6" />
        <rect x="0" y="1.333" width="3" height="0.667" fill="#D52B1E" />
      </svg>
    </div>
  );

  if (withText) {
    return (
      <div className="flex items-center gap-3">
        {icon}
        <span className={`font-semibold tracking-tight text-[var(--foreground)] ${textSizeMap[size]}`}>
          Ksenia&apos;s Russian School
        </span>
      </div>
    );
  }

  return icon;
}
