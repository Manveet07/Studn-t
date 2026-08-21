/* ============================================================
   loading.js — Loading Screen Module
   Shows blue bouncing loader with shooting star/glitter bg,
   user name, and redirect.
   ============================================================ */

export function showLoadingScreen(userName, redirectUrl, duration = 2500) {
  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'pd-loading-overlay';
  overlay.innerHTML = `
    <canvas class="pd-loading-canvas"></canvas>
    <div class="pd-loading-loader"></div>
    <div class="pd-loading-name">Hi, ${userName}!</div>
    <div class="pd-loading-subtitle">Locking you in...</div>
  `;
  document.body.appendChild(overlay);

  // Init shooting stars on the canvas
  const canvas = overlay.querySelector('.pd-loading-canvas');
  initShootingStars(canvas);

  // Redirect after duration
  setTimeout(() => {
    overlay.classList.add('pd-loading-overlay--exit');
    setTimeout(() => {
      window.location.href = redirectUrl;
    }, 500);
  }, duration);
}

function initShootingStars(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.scale(dpr, dpr);

  const w = window.innerWidth;
  const h = window.innerHeight;

  // Static stars
  const stars = [];
  for (let i = 0; i < 80; i++) {
    stars.push({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0.5 + Math.random() * 1.2,
      phase: Math.random() * Math.PI * 2,
      speed: 0.5 + Math.random() * 1.5,
    });
  }

  // Shooting stars
  const shootingStars = [];
  function spawnShootingStar() {
    shootingStars.push({
      x: Math.random() * w * 0.8,
      y: Math.random() * h * 0.3,
      length: 60 + Math.random() * 80,
      speed: 3 + Math.random() * 4,
      angle: Math.PI / 4 + (Math.random() - 0.5) * 0.3,
      life: 1,
      decay: 0.015 + Math.random() * 0.01,
    });
  }

  // Glitter particles
  const glitters = [];
  for (let i = 0; i < 30; i++) {
    glitters.push({
      x: Math.random() * w,
      y: Math.random() * h,
      size: 0.5 + Math.random() * 1.5,
      phase: Math.random() * Math.PI * 2,
      speed: 0.3 + Math.random() * 0.8,
    });
  }

  let frame;
  let spawnTimer = 0;

  function animate(time) {
    const t = time * 0.001;
    ctx.clearRect(0, 0, w, h);

    // Stars
    stars.forEach((s) => {
      const alpha = 0.2 + Math.sin(t * s.speed + s.phase) * 0.3 + 0.3;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180, 210, 255, ${Math.max(0, alpha)})`;
      ctx.fill();
    });

    // Spawn shooting stars
    spawnTimer += 16;
    if (spawnTimer > 600 + Math.random() * 400) {
      spawnShootingStar();
      spawnTimer = 0;
    }

    // Draw shooting stars
    for (let i = shootingStars.length - 1; i >= 0; i--) {
      const ss = shootingStars[i];
      ss.x += Math.cos(ss.angle) * ss.speed;
      ss.y += Math.sin(ss.angle) * ss.speed;
      ss.life -= ss.decay;

      if (ss.life <= 0) {
        shootingStars.splice(i, 1);
        continue;
      }

      const endX = ss.x - Math.cos(ss.angle) * ss.length;
      const endY = ss.y - Math.sin(ss.angle) * ss.length;

      const grad = ctx.createLinearGradient(ss.x, ss.y, endX, endY);
      grad.addColorStop(0, `rgba(180, 220, 255, ${ss.life * 0.8})`);
      grad.addColorStop(0.3, `rgba(100, 170, 240, ${ss.life * 0.4})`);
      grad.addColorStop(1, `rgba(37, 99, 160, 0)`);

      ctx.beginPath();
      ctx.moveTo(ss.x, ss.y);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Head glow
      ctx.beginPath();
      ctx.arc(ss.x, ss.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220, 240, 255, ${ss.life})`;
      ctx.fill();
    }

    // Glitters
    glitters.forEach((g) => {
      const alpha = 0.3 + Math.sin(t * g.speed * 3 + g.phase) * 0.4 + 0.3;
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(100, 180, 255, ${Math.max(0, alpha * 0.6)})`;
      ctx.fill();
    });

    frame = requestAnimationFrame(animate);
  }

  frame = requestAnimationFrame(animate);

  // Cleanup after overlay is removed
  const observer = new MutationObserver(() => {
    if (!document.contains(overlay)) {
      cancelAnimationFrame(frame);
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true });
}
