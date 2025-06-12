// Enhanced particle system
class ParticleSystem {
    constructor() {
        this.canvas = document.getElementById('particle-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.mouse = { x: null, y: null, radius: 150 };
        this.animationId = null;
        this.particleCount = 100; // Default density
        this.init();
    }
    
    init() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        document.body.addEventListener('mousemove', (e) => {
            this.mouse.x = e.x;
            this.mouse.y = e.y;
        });
        document.body.addEventListener('mouseleave', () => {
            this.mouse.x = null;
            this.mouse.y = null;
        });
        this.createParticles();
    }
    
    setDensity(density) {
        this.particleCount = Math.floor(density * 20);
        this.createParticles();
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.createParticles();
    }
    
    createParticles() {
        this.particles = [];
        const particleCount = this.particleCount;
        
        for (let i = 0; i < particleCount; i++) {
            const size = Math.random() * 3 + 1;
            const x = Math.random() * (this.canvas.width - size * 2) + size;
            const y = Math.random() * (this.canvas.height - size * 2) + size;
            const directionX = (Math.random() - 0.5) * 0.5;
            const directionY = (Math.random() - 0.5) * 0.5;
            
            this.particles.push({
                x, y, size,
                directionX, directionY,
                color: `rgba(255, 255, 255, ${Math.random() * 0.5 + 0.3})`
            });
        }
    }
    
    drawParticle(particle) {
        this.ctx.beginPath();
        this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        this.ctx.closePath();
        this.ctx.fillStyle = particle.color;
        this.ctx.fill();
    }
    
    updateParticle(particle) {
        // Boundary collision with dampening
        if (particle.x + particle.size > this.canvas.width || particle.x - particle.size < 0) {
            particle.directionX = -particle.directionX * 0.8;
        }
        if (particle.y + particle.size > this.canvas.height || particle.y - particle.size < 0) {
            particle.directionY = -particle.directionY * 0.8;
        }
        
        // Mouse interaction
        if (this.mouse.x !== null && this.mouse.y !== null) {
            const dx = this.mouse.x - particle.x;
            const dy = this.mouse.y - particle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < this.mouse.radius) {
                const force = (this.mouse.radius - distance) / this.mouse.radius;
                const angle = Math.atan2(dy, dx);
                const tx = particle.x + Math.cos(angle + Math.PI) * force * 10;
                const ty = particle.y + Math.sin(angle + Math.PI) * force * 10;
                
                particle.directionX += (tx - particle.x) * 0.01;
                particle.directionY += (ty - particle.y) * 0.01;
            }
        }
        
        // Apply velocity with friction
        particle.x += particle.directionX;
        particle.y += particle.directionY;
        particle.directionX *= 0.98;
        particle.directionY *= 0.98;
    }
    
    connectParticles() {
        const maxDistance = 100;
        
        for (let a = 0; a < this.particles.length; a++) {
            for (let b = a; b < this.particles.length; b++) {
                const dx = this.particles[a].x - this.particles[b].x;
                const dy = this.particles[a].y - this.particles[b].y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < maxDistance) {
                    const opacity = 1 - distance / maxDistance;
                    this.ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.2})`;
                    this.ctx.lineWidth = 1;
                    this.ctx.beginPath();
                    this.ctx.moveTo(this.particles[a].x, this.particles[a].y);
                    this.ctx.lineTo(this.particles[b].x, this.particles[b].y);
                    this.ctx.stroke();
                }
            }
        }
    }
    
    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        for (let particle of this.particles) {
            this.updateParticle(particle);
            this.drawParticle(particle);
        }
        
        this.connectParticles();
        
        this.animationId = requestAnimationFrame(() => this.animate());
    }
    
    start() {
        if (!this.animationId) {
            this.animate();
        }
    }
    
    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
}