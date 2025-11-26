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
    <div className={`flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 shadow-rose-500/20 ${sizeMap[size]} ${className}`}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-white w-3/5 h-3/5"
      >
        {/* Vertical line */}
        <path d="M6 4v16" />
        {/* Top arm */}
        <path d="M18 4l-12 9" />
        {/* Bottom leg */}
        <path d="M6 13l12 7" />
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

