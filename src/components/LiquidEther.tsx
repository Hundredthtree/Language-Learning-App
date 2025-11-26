"use client";

import { useEffect, useRef } from "react";

export function LiquidEther() {
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

    // Color palette - Russian flag inspired with brand colors
    const colors = [
      { r: 0, g: 87, b: 183 },    // Blue
      { r: 213, g: 43, b: 30 },   // Red
      { r: 236, g: 72, b: 153 },  // Pink (brand)
      { r: 244, g: 63, b: 94 },   // Rose (brand)
      { r: 56, g: 189, b: 248 },  // Sky blue
      { r: 167, g: 139, b: 250 }, // Purple
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

    const animate = () => {
      time += 0.008;

      // Clear canvas completely each frame with base color
      ctx.fillStyle = "#f8fafc";
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

        // Draw blob with gradient - increased opacity
        const pulsingRadius = blob.radius * (1 + Math.sin(time * 2 + blob.phase) * 0.15);
        
        const gradient = ctx.createRadialGradient(
          blob.x,
          blob.y,
          0,
          blob.x,
          blob.y,
          pulsingRadius
        );

        gradient.addColorStop(0, `rgba(${blob.color.r}, ${blob.color.g}, ${blob.color.b}, 0.6)`);
        gradient.addColorStop(0.4, `rgba(${blob.color.r}, ${blob.color.g}, ${blob.color.b}, 0.3)`);
        gradient.addColorStop(0.7, `rgba(${blob.color.r}, ${blob.color.g}, ${blob.color.b}, 0.1)`);
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
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
