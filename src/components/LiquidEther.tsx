"use client";

import { useEffect, useRef, useState } from "react";

export function LiquidEther() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Listen for theme changes
  useEffect(() => {
    const checkTheme = () => {
      const currentTheme = document.documentElement.getAttribute("data-theme") as "light" | "dark" | null;
      setTheme(currentTheme || "light");
    };

    // Initial check
    checkTheme();

    // Watch for attribute changes on documentElement
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "data-theme") {
          checkTheme();
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener("resize", resize);

    // Color palette - Russian flag colors only
    const colors = [
      { r: 0, g: 57, b: 166 },    // Russian Blue
      { r: 213, g: 43, b: 30 },   // Russian Red
      { r: 255, g: 255, b: 255 }, // White
      { r: 0, g: 57, b: 166 },    // Russian Blue
      { r: 213, g: 43, b: 30 },   // Russian Red
      { r: 255, g: 255, b: 255 }, // White
    ];

    const blobs: {
      x: number;
      y: number;
      radius: number;
      color: { r: number; g: number; b: number };
      vx: number;
      vy: number;
      phase: number;
    }[] = [];

    // Create more blobs with bigger radius
    for (let i = 0; i < 8; i++) {
      blobs.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: 200 + Math.random() * 300,
        color: colors[i % colors.length],
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        phase: Math.random() * Math.PI * 2,
      });
    }

    // Theme-based colors
    const bgColor = theme === "dark" ? "#0f172a" : "#f8fafc";
    const blobOpacity = theme === "dark" ? 0.5 : 0.6;

    const animate = () => {
      time += 0.008;

      // Clear canvas with theme-appropriate background
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw blobs
      blobs.forEach((blob) => {
        // Organic movement
        blob.x += blob.vx + Math.sin(time + blob.phase) * 0.5;
        blob.y += blob.vy + Math.cos(time + blob.phase * 1.3) * 0.5;

        // Wrap around edges
        if (blob.x < -blob.radius) blob.x = canvas.width + blob.radius;
        if (blob.x > canvas.width + blob.radius) blob.x = -blob.radius;
        if (blob.y < -blob.radius) blob.y = canvas.height + blob.radius;
        if (blob.y > canvas.height + blob.radius) blob.y = -blob.radius;

        // Draw blob with gradient
        const pulsingRadius = blob.radius * (1 + Math.sin(time * 2 + blob.phase) * 0.15);
        
        const gradient = ctx.createRadialGradient(
          blob.x,
          blob.y,
          0,
          blob.x,
          blob.y,
          pulsingRadius
        );

        gradient.addColorStop(0, `rgba(${blob.color.r}, ${blob.color.g}, ${blob.color.b}, ${blobOpacity})`);
        gradient.addColorStop(0.4, `rgba(${blob.color.r}, ${blob.color.g}, ${blob.color.b}, ${blobOpacity * 0.5})`);
        gradient.addColorStop(0.7, `rgba(${blob.color.r}, ${blob.color.g}, ${blob.color.b}, ${blobOpacity * 0.17})`);
        gradient.addColorStop(1, `rgba(${blob.color.r}, ${blob.color.g}, ${blob.color.b}, 0)`);

        ctx.beginPath();
        ctx.arc(blob.x, blob.y, pulsingRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
