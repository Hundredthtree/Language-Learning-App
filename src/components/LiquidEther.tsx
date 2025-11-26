"use client";

import { useEffect, useRef } from "react";

interface LiquidEtherProps {
  className?: string;
}

export function LiquidEther({ className = "" }: LiquidEtherProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

    // Color palette - Russian flag inspired with soft pastels
    const colors = [
      { r: 255, g: 255, b: 255 }, // White
      { r: 0, g: 87, b: 183 },    // Blue
      { r: 213, g: 43, b: 30 },   // Red
      { r: 236, g: 72, b: 153 },  // Pink (brand)
      { r: 244, g: 63, b: 94 },   // Rose (brand)
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

    // Create blobs
    for (let i = 0; i < 6; i++) {
      blobs.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: 150 + Math.random() * 200,
        color: colors[i % colors.length],
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        phase: Math.random() * Math.PI * 2,
      });
    }

    const animate = () => {
      time += 0.005;

      // Clear with slight fade for trail effect
      ctx.fillStyle = "rgba(248, 250, 252, 0.1)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw blobs
      blobs.forEach((blob) => {
        // Organic movement
        blob.x += blob.vx + Math.sin(time + blob.phase) * 0.3;
        blob.y += blob.vy + Math.cos(time + blob.phase * 1.3) * 0.3;

        // Bounce off edges
        if (blob.x < -blob.radius) blob.x = canvas.width + blob.radius;
        if (blob.x > canvas.width + blob.radius) blob.x = -blob.radius;
        if (blob.y < -blob.radius) blob.y = canvas.height + blob.radius;
        if (blob.y > canvas.height + blob.radius) blob.y = -blob.radius;

        // Draw blob with gradient
        const gradient = ctx.createRadialGradient(
          blob.x,
          blob.y,
          0,
          blob.x,
          blob.y,
          blob.radius
        );

        const pulsingRadius = blob.radius * (1 + Math.sin(time * 2 + blob.phase) * 0.1);

        gradient.addColorStop(
          0,
          `rgba(${blob.color.r}, ${blob.color.g}, ${blob.color.b}, 0.4)`
        );
        gradient.addColorStop(
          0.5,
          `rgba(${blob.color.r}, ${blob.color.g}, ${blob.color.b}, 0.15)`
        );
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
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 -z-10 ${className}`}
      style={{ background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)" }}
    />
  );
}

