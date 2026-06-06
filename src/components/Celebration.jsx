import { useEffect, useRef } from 'react';

export default function Celebration({ active }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const particlesRef = useRef([]);

  useEffect(() => {
    if (!active) {
      particlesRef.current = [];
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      // Clear canvas if it exists
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();

    const colors = [
      '#6366f1', // Indigo
      '#10b981', // Emerald
      '#f59e0b', // Amber
      '#ec4899', // Pink
      '#8b5cf6', // Violet
      '#3b82f6', // Blue
      '#14b8a6', // Teal
      '#f43f5e', // Rose
    ];

    class Particle {
      constructor(x, y, angle, spread, speed) {
        this.x = x;
        this.y = y;
        const radAngle = (angle + (Math.random() - 0.5) * spread) * (Math.PI / 180);
        const velocity = speed * (0.6 + Math.random() * 0.8);
        this.vx = Math.cos(radAngle) * velocity;
        this.vy = Math.sin(radAngle) * velocity;
        this.gravity = 0.25;
        this.drag = 0.98;
        this.rotation = Math.random() * 360;
        this.rotationSpeed = (Math.random() - 0.5) * 8;
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.size = 5 + Math.random() * 10;
        this.alpha = 1;
        this.decay = 0.008 + Math.random() * 0.015;
        this.shape = Math.random() > 0.4 ? 'circle' : 'rect';
      }

      update() {
        this.vx *= this.drag;
        this.vy *= this.drag;
        this.vy += this.gravity;
        this.x += this.vx;
        this.y += this.vy;
        this.rotation += this.rotationSpeed;
        this.alpha -= this.decay;
      }

      draw(c) {
        c.save();
        c.translate(this.x, this.y);
        c.rotate(this.rotation * (Math.PI / 180));
        c.globalAlpha = this.alpha;
        c.fillStyle = this.color;

        if (this.shape === 'circle') {
          c.beginPath();
          c.arc(0, 0, this.size / 2, 0, Math.PI * 2);
          c.fill();
        } else {
          c.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        }
        c.restore();
      }
    }

    // Spawn initial bursts of particles
    const particles = [];
    const spawnBurst = (x, y, angle, spread, speed, count) => {
      for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y, angle, spread, speed));
      }
    };

    // Bursts from bottom corners shooting inwards/upwards
    spawnBurst(0, canvas.height, -45, 30, 22, 100);
    spawnBurst(canvas.width, canvas.height, -135, 30, 22, 100);
    // Extra central burst
    spawnBurst(canvas.width / 2, canvas.height + 20, -90, 45, 18, 80);

    particlesRef.current = particles;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const activeParticles = particlesRef.current.filter(p => p.alpha > 0);
      
      activeParticles.forEach(p => {
        p.update();
        p.draw(ctx);
      });

      particlesRef.current = activeParticles;

      if (activeParticles.length > 0) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        animationRef.current = null;
      }
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    />
  );
}
