/**
 * Procedural Cosmic Fire ("النار الكونية") & Geometric Dissolve Visuals
 * Runs 100% locally offline at 60fps with zero external textures.
 */

function pseudoNoise(x: number, y: number, t: number): number {
  const n1 = Math.sin(x * 1.7 + t * 2.4) * Math.cos(y * 1.3 - t * 1.9);
  const n2 = Math.sin((x + y) * 2.9 - t * 3.1) * 0.5;
  const n3 = Math.cos((x - y) * 4.3 + t * 4.2) * 0.25;
  return (n1 + n2 + n3) / 1.75; // -1..1
}

/**
 * Draws swirling cosmic fire plasma tongues + glowing embers behind the Phase 5 Neon Title.
 */
export function drawCosmicFire(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  intensity: number,
  timeSec: number
): void {
  if (intensity <= 0.01) return;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = Math.min(1, intensity);

  // 1. Deep cosmic violet-magenta nebula aura
  const outerR = Math.max(width, height) * 0.56;
  const nebula = ctx.createRadialGradient(
    centerX,
    centerY,
    outerR * 0.05,
    centerX,
    centerY,
    outerR
  );
  nebula.addColorStop(0, 'rgba(255, 46, 147, 0.72)');
  nebula.addColorStop(0.28, 'rgba(186, 24, 154, 0.46)');
  nebula.addColorStop(0.6, 'rgba(92, 18, 168, 0.22)');
  nebula.addColorStop(1, 'rgba(10, 0, 24, 0)');
  ctx.fillStyle = nebula;
  ctx.fillRect(centerX - outerR, centerY - outerR, outerR * 2, outerR * 2);

  // 2. Swirling plasma fire tongues rising & orbiting behind title
  const tongueCount = 14;
  for (let i = 0; i < tongueCount; i++) {
    const seed = i * 1.618;
    const wave = pseudoNoise(seed, i * 0.7, timeSec);
    const spreadX = (i / (tongueCount - 1) - 0.5) * width * 0.72 + wave * width * 0.06;
    const baseRise = Math.sin(timeSec * 4.5 + seed * 3) * height * 0.06;
    const flameW = width * (0.12 + 0.05 * Math.sin(seed + timeSec * 3.2));
    const flameH = height * (0.28 + 0.14 * (0.5 + 0.5 * wave));

    const fx = centerX + spreadX;
    const fy = centerY - flameH * 0.25 + baseRise;

    const grad = ctx.createRadialGradient(fx, fy + flameH * 0.12, flameW * 0.08, fx, fy, flameH * 0.75);
    if (i % 3 === 0) {
      // Cosmic violet-pink plasma
      grad.addColorStop(0, 'rgba(255, 220, 245, 0.78)');
      grad.addColorStop(0.25, 'rgba(255, 20, 147, 0.65)');
      grad.addColorStop(0.62, 'rgba(138, 43, 226, 0.34)');
      grad.addColorStop(1, 'rgba(40, 0, 90, 0)');
    } else if (i % 3 === 1) {
      // Solar orange-crimson fire core
      grad.addColorStop(0, 'rgba(255, 244, 210, 0.85)');
      grad.addColorStop(0.24, 'rgba(255, 98, 36, 0.62)');
      grad.addColorStop(0.58, 'rgba(220, 16, 108, 0.32)');
      grad.addColorStop(1, 'rgba(60, 0, 30, 0)');
    } else {
      // Electric magenta-cyan cosmic arc
      grad.addColorStop(0, 'rgba(255, 195, 235, 0.68)');
      grad.addColorStop(0.3, 'rgba(255, 0, 128, 0.52)');
      grad.addColorStop(0.65, 'rgba(90, 60, 255, 0.24)');
      grad.addColorStop(1, 'rgba(10, 10, 40, 0)');
    }

    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(wave * 0.45);
    ctx.scale(1, flameH / Math.max(1, flameW));
    ctx.beginPath();
    ctx.arc(0, 0, flameW * 0.58, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
  }

  // 3. Rising cosmic ember sparks
  const sparkCount = 26;
  for (let s = 0; s < sparkCount; s++) {
    const ph = ((timeSec * 0.85 + s * 0.137) % 1 + 1) % 1;
    const angle = s * 2.39996 + timeSec * 0.9;
    const radius = (0.1 + ph * 0.38) * Math.min(width, height);
    const sx = centerX + Math.cos(angle) * radius * 1.15;
    const sy = centerY + Math.sin(angle) * radius * 0.62 - ph * height * 0.18;
    const alpha = Math.sin(ph * Math.PI) * 0.9;
    const r = (1.6 + (s % 3) * 1.3) * (1 - ph * 0.45);

    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fillStyle = s % 2 === 0
      ? `rgba(255, 224, 150, ${alpha})`
      : `rgba(255, 105, 195, ${alpha})`;
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Draws Alight-Motion-style Geometric Dissolve facets (diamonds, triangles, diagonal glass shards)
 * during Phase 2 slide & partial dissolve.
 */
export function drawGeometricDissolve(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  amount: number,
  progress01: number
): void {
  if (amount <= 0.01) return;

  ctx.save();
  const cols = 4;
  const rows = 6;
  const cellW = w / cols;
  const cellH = h / rows;

  // 1. Subtle dark geometric cutout tiles giving the "partially dissolved" look
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const wave = Math.sin(idx * 1.73 + progress01 * Math.PI * 3.0);
      if (wave < 0.05) continue;

      const cx = (c + 0.5) * cellW + Math.sin(progress01 * 5 + idx) * cellW * 0.12;
      const cy = (r + 0.5) * cellH - progress01 * h * 0.05;
      const size = Math.min(cellW, cellH) * (0.42 + 0.25 * wave) * amount;
      const rot = (idx % 2 === 0 ? 1 : -1) * (Math.PI * 0.25 + progress01 * 0.8);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);

      // Semi-transparent dark cutout creating geometric fragmentation
      ctx.fillStyle = `rgba(8, 6, 14, ${0.34 * amount * wave})`;
      ctx.beginPath();
      if (idx % 3 === 0) {
        // Diamond shard
        ctx.moveTo(0, -size);
        ctx.lineTo(size * 0.78, 0);
        ctx.lineTo(0, size);
        ctx.lineTo(-size * 0.78, 0);
      } else if (idx % 3 === 1) {
        // Sharp triangle prism
        ctx.moveTo(0, -size * 0.9);
        ctx.lineTo(size * 0.86, size * 0.65);
        ctx.lineTo(-size * 0.86, size * 0.65);
      } else {
        // Hexagon facet
        for (let k = 0; k < 6; k++) {
          const a = (k * Math.PI) / 3;
          const px = Math.cos(a) * size * 0.72;
          const py = Math.sin(a) * size * 0.72;
          if (k === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
      }
      ctx.closePath();
      ctx.fill();

      // Luminous prism edge highlight
      ctx.globalCompositeOperation = 'screen';
      ctx.strokeStyle =
        idx % 2 === 0
          ? `rgba(255, 198, 130, ${0.42 * amount * wave})`
          : `rgba(255, 70, 165, ${0.38 * amount * wave})`;
      ctx.lineWidth = Math.max(1.5, Math.min(w, h) * 0.003);
      ctx.stroke();

      ctx.restore();
    }
  }

  ctx.restore();
}
