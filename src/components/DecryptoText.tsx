"use client";

import { useEffect, useState, useCallback } from "react";

interface DecryptoTextProps {
  textA: string;
  textB: string;
  className?: string;
  /** Time to hold each text before switching (ms) */
  holdDuration?: number;
  /** Time for the full scramble animation (ms) */
  scrambleDuration?: number;
}

// Use narrower characters to prevent width overflow during scrambling
const CHARS_CYRILLIC = "абвгдеийклмнопрстуфхцчшэюя";
const CHARS_LATIN = "abcdefghijklmnopqrstuvwxyz";
const CHARS_ALL = CHARS_CYRILLIC + CHARS_LATIN + "0123456789";

export function DecryptoText({
  textA,
  textB,
  className = "",
  holdDuration = 3000,
  scrambleDuration = 1500,
}: DecryptoTextProps) {
  const [displayText, setDisplayText] = useState(textA);
  const [isAnimating, setIsAnimating] = useState(false);

  const getRandomChar = useCallback(() => {
    return CHARS_ALL[Math.floor(Math.random() * CHARS_ALL.length)];
  }, []);

  const scrambleToTarget = useCallback(
    (from: string, to: string, onComplete: () => void) => {
      setIsAnimating(true);
      
      // Normalize lengths - pad shorter string with spaces
      const maxLen = Math.max(from.length, to.length);
      const paddedFrom = from.padEnd(maxLen, " ");
      const paddedTo = to.padEnd(maxLen, " ");
      
      const chars = paddedFrom.split("");
      const targetChars = paddedTo.split("");
      const resolved = new Array(maxLen).fill(false);
      
      // Each character will resolve at a staggered time
      const charDelay = scrambleDuration / maxLen;
      const scrambleInterval = 40; // How fast characters cycle
      
      let frame = 0;
      const maxFrames = Math.ceil(scrambleDuration / scrambleInterval) + maxLen;
      
      const interval = setInterval(() => {
        frame++;
        
        // Determine which characters should be resolved by now
        const resolveUpTo = Math.floor((frame * scrambleInterval) / charDelay);
        
        for (let i = 0; i < maxLen; i++) {
          if (i < resolveUpTo && !resolved[i]) {
            // This character should now show its final value
            resolved[i] = true;
            chars[i] = targetChars[i];
          } else if (!resolved[i]) {
            // Still scrambling - show random character (unless it's a space in target)
            if (targetChars[i] === " " && paddedFrom[i] === " ") {
              chars[i] = " ";
            } else {
              chars[i] = getRandomChar();
            }
          }
        }
        
        setDisplayText(chars.join("").trimEnd());
        
        // Check if all characters are resolved
        if (resolved.every(Boolean) || frame >= maxFrames) {
          clearInterval(interval);
          setDisplayText(to);
          setIsAnimating(false);
          onComplete();
        }
      }, scrambleInterval);
      
      return () => clearInterval(interval);
    },
    [scrambleDuration, getRandomChar]
  );

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let timeoutId: NodeJS.Timeout;
    let isForward = true; // true = A→B, false = B→A

    const runAnimation = () => {
      if (isForward) {
        cleanup = scrambleToTarget(textA, textB, () => {
          timeoutId = setTimeout(() => {
            isForward = false;
            runAnimation();
          }, holdDuration);
        });
      } else {
        cleanup = scrambleToTarget(textB, textA, () => {
          timeoutId = setTimeout(() => {
            isForward = true;
            runAnimation();
          }, holdDuration);
        });
      }
    };

    // Initial hold before first animation
    timeoutId = setTimeout(runAnimation, holdDuration);

    return () => {
      cleanup?.();
      clearTimeout(timeoutId);
    };
  }, [textA, textB, holdDuration, scrambleToTarget]);

  // Use the longer text to determine width
  const longerText = textA.length >= textB.length ? textA : textB;

  return (
    <span className={`relative inline-block ${className} bg-clip-text text-transparent`}>
      {/* Invisible spacer to reserve width for longer text */}
      <span className="invisible" aria-hidden="true">{longerText}</span>
      {/* Actual display text positioned on top */}
      <span className={`absolute left-0 top-0 ${className} bg-clip-text text-transparent`}>{displayText}</span>
    </span>
  );
}

