import React, { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  twinkleSpeed: number;
  color: string;
}

interface FallingStar {
  x: number;
  y: number;
  length: number;
  speed: number;
  opacity: number;
  angle: number;
  color: string;
}

export const StarBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let stars: Star[] = [];
    let fallingStars: FallingStar[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initStars();
    };

    const initStars = () => {
      stars = [];
      const count = Math.floor((canvas.width * canvas.height) / 4500);
      const colors = ['#ffffff', '#ffffff', '#ffffff', '#a855f7', '#fb923c'];

      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 1.2,
          opacity: Math.random() * 0.4, // Lower starting opacity
          twinkleSpeed: 0.002 + Math.random() * 0.008, // Slower twinkling
          color: colors[Math.floor(Math.random() * colors.length)]
        });
      }
    };

    const createFallingStar = () => {
      const colors = ['#ffffff', '#a855f7', '#fb923c'];
      fallingStars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * (canvas.height / 2),
        length: 10 + Math.random() * 20,
        speed: 8 + Math.random() * 12,
        opacity: 0.6, // Toned down falling stars
        angle: Math.PI / 4 + (Math.random() * 0.2),
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw background stars
      stars.forEach(star => {
        star.opacity += star.twinkleSpeed;
        // Cap max opacity to 0.4 for a "toned down" feel
        if (star.opacity > 0.4 || star.opacity < 0.05) {
          star.twinkleSpeed = -star.twinkleSpeed;
        }

        ctx.globalAlpha = star.opacity;
        ctx.fillStyle = star.color;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
        
        star.x += 0.03; // Slower drift
        if (star.x > canvas.width) star.x = 0;
      });

      // Handle Falling Stars
      if (Math.random() < 0.005) { // Lower frequency
        createFallingStar();
      }

      fallingStars = fallingStars.filter(fs => fs.opacity > 0);
      fallingStars.forEach(fs => {
        ctx.globalAlpha = fs.opacity;
        ctx.strokeStyle = fs.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(fs.x, fs.y);
        ctx.lineTo(
          fs.x - Math.cos(fs.angle) * fs.length,
          fs.y - Math.sin(fs.angle) * fs.length
        );
        ctx.stroke();

        fs.x += Math.cos(fs.angle) * fs.speed;
        fs.y += Math.sin(fs.angle) * fs.speed;
        fs.opacity -= 0.015;
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', resize);
    resize();
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ background: '#000000' }}
    />
  );
};