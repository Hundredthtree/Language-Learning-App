"use client";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";

interface LottieAnimationProps {
  src: string;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
  style?: React.CSSProperties;
  backgroundColor?: string;
}

export function LottieAnimation({
  src,
  loop = true,
  autoplay = true,
  className = "",
  style,
  backgroundColor = "transparent",
}: LottieAnimationProps) {
  return (
    <DotLottieReact
      src={src}
      loop={loop}
      autoplay={autoplay}
      className={className}
      style={style}
      backgroundColor={backgroundColor}
    />
  );
}
