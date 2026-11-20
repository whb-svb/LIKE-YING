const audio = document.getElementById('bg-audio');
  audio.loop = true;

  // 尝试自动播放（静音）
  audio.muted = true;
    audio.play().catch(() => {
      console.log('自动播放被阻止，请用户交互');
    });
    // 播放按钮
    document.getElementById('candleBtn').addEventListener('click', () => {
      audio.muted = false;
      audio.play();
    });

//  粒子生日蛋糕

(function() {
    const canvas = document.getElementById('cakeCanvas');
    const ctx = canvas.getContext('2d');

    let W, H;
    function resize() {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    //自动旋转
    let camDist = 320;
    let camYaw = 0;
    let camPitch = 0.5;
    let camTargetX = 0, camTargetY = 20, camTargetZ = 0;
    let autoRotate = true;
    const FOV = 500;

    // 吹蜡烛后：只隐藏蛋糕粒子，保留自动旋转的星空背景
    let hideCake = false;
    window.cakeSetHidden = function(v) { hideCake = v; };

    // 鼠标控制
    let isDragging = false, isPanning = false;
    let lastMX = 0, lastMY = 0;
    canvas.addEventListener('mousedown', e => {
      if (e.button === 0) isDragging = true;
      if (e.button === 2) isPanning = true;
      lastMX = e.clientX; lastMY = e.clientY;
    });
    window.addEventListener('mouseup', () => { isDragging = false; isPanning = false; });
    window.addEventListener('mousemove', e => {
      const dx = e.clientX - lastMX, dy = e.clientY - lastMY;
      if (isDragging) {
        camYaw -= dx * 0.008;
        camPitch -= dy * 0.008;
        camPitch = Math.max(-1.2, Math.min(1.3, camPitch));
      }
      if (isPanning) {
        const pan = camDist * 0.002;
        camTargetX -= dx * pan * Math.cos(camYaw);
        camTargetZ += dx * pan * Math.sin(camYaw);
        camTargetY += dy * pan;
      }
      lastMX = e.clientX; lastMY = e.clientY;
    });
    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      camDist += e.deltaY * 0.15;
      camDist = Math.max(100, Math.min(700, camDist));
    }, { passive: false });
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    function rotateY(x, y, z, a) {
      const c = Math.cos(a), s = Math.sin(a);
      return [x*c + z*s, y, -x*s + z*c];
    }
    function rotateX(x, y, z, a) {
      const c = Math.cos(a), s = Math.sin(a);
      return [x, y*c - z*s, y*s + z*c];
    }
    function project(x, y, z) {
      x -= camTargetX; y -= camTargetY; z -= camTargetZ;
      let p = rotateY(x, y, z, camYaw);
      p = rotateX(p[0], p[1], p[2], camPitch);
      const zc = p[2] + camDist;
      if (zc < 10) return null;
      const sc = FOV / zc;
      return { x: W/2 + p[0]*sc, y: H/2 - p[1]*sc, z: zc, scale: sc };
    }

    function hueShift(r, g, b, deg) {
      const rad = deg * Math.PI / 180;
      const c = Math.cos(rad), s = Math.sin(rad);
      let nr = r*(0.213 + c*0.787 - s*0.213) + g*(0.715 - c*0.715 - s*0.715) + b*(0.072 - c*0.072 + s*0.928);
      let ng = r*(0.213 - c*0.213 + s*0.143) + g*(0.715 + c*0.285 + s*0.140) + b*(0.072 - c*0.072 - s*0.283);
      let nb = r*(0.213 - c*0.213 - s*0.787) + g*(0.715 - c*0.715 + s*0.715) + b*(0.072 + c*0.928 + s*0.072);
      nr = nr < 0 ? 0 : (nr > 255 ? 255 : nr);
      ng = ng < 0 ? 0 : (ng > 255 ? 255 : ng);
      nb = nb < 0 ? 0 : (nb > 255 ? 255 : nb);
      return [nr|0, ng|0, nb|0];
    }
    
    class CakeParticle {
      constructor(tx, ty, tz, r, g, b, type) {
        this.tx = tx; this.ty = ty; this.tz = tz;
        this.x = tx + (Math.random()-0.5)*600;
        this.y = ty + (Math.random()-0.5)*600;
        this.z = tz + (Math.random()-0.5)*600;
        this.vx = 0; this.vy = 0; this.vz = 0;
        this.r = r; this.g = g; this.b = b;
        this.type = type;
        this.baseTx = tx; this.baseTy = ty; this.baseTz = tz;
      }
      update(time) {
        if (this.type === 2) {
          if (candlesLit) {
            this.tx = this.baseTx + Math.sin(time*3 + this.x) * 1.2;
            this.ty = this.baseTy + ((time*10 + this.z) % 14);
            this.tz = this.baseTz + Math.cos(time*2.5 + this.y) * 1.2;
          } else {
            this.ty += 0.3;
            this.tx += (Math.random()-0.5)*0.15;
            this.tz += (Math.random()-0.5)*0.15;
          }
        }
        this.vx += (this.tx - this.x) * 0.02;
        this.vy += (this.ty - this.y) * 0.02;
        this.vz += (this.tz - this.z) * 0.02;
        this.vx *= 0.9; this.vy *= 0.9; this.vz *= 0.9;
        this.x += this.vx; this.y += this.vy; this.z += this.vz;
      }
      explode() {
        this.vx = (Math.random()-0.5)*50;
        this.vy = (Math.random()-0.5)*50 + 15;
        this.vz = (Math.random()-0.5)*50;
      }
    }

    let particles = [];
    let candlesLit = true;
    let time = 0;

    function hexToRgb(hex) {
      return [parseInt(hex.slice(1,3),16)/255, parseInt(hex.slice(3,5),16)/255, parseInt(hex.slice(5,7),16)/255];
    }

    function buildCake() {
      particles = [];
      const layers = [
        { r: 45, h: 24, y: 0,   cTop: '#e6a8d7', cBot: '#ba68c8', border: '#8e24aa' },
        { r: 34, h: 22, y: 26,  cTop: '#ffe4b5', cBot: '#deb887', border: '#cd853f' },
        { r: 24, h: 20, y: 50,  cTop: '#ffb6c1', cBot: '#ff69b4', border: '#ff1493' },
      ];
      layers.forEach((layer, li) => {
        const ct = hexToRgb(layer.cTop), cb = hexToRgb(layer.cBot), bb = hexToRgb(layer.border);
        for (let r = 5; r <= layer.r; r += 5) {
          const count = Math.max(10, Math.floor(2*Math.PI*r/5));
          for (let i = 0; i < count; i++) {
            const angle = (i/count)*Math.PI*2;
            const x = Math.cos(angle)*r, z = Math.sin(angle)*r;
            for (let y = layer.y - layer.h/2 + 4; y < layer.y + layer.h/2; y += 5) {
              const t = (y - (layer.y - layer.h/2)) / layer.h;
              particles.push(new CakeParticle(x, y, z, ct[0]*(1-t)+cb[0]*t, ct[1]*(1-t)+cb[1]*t, ct[2]*(1-t)+cb[2]*t, 0));
            }
          }
        }
        for (let i = 0; i < 100; i++) {
          const angle = (i/100)*Math.PI*2;
          particles.push(new CakeParticle(Math.cos(angle)*layer.r, layer.y+layer.h/2, Math.sin(angle)*layer.r, bb[0],bb[1],bb[2], 0));
          particles.push(new CakeParticle(Math.cos(angle)*layer.r, layer.y-layer.h/2, Math.sin(angle)*layer.r, bb[0],bb[1],bb[2], 0));
        }
        if (li < 2) {
          for (let d = 0; d < 14; d++) {
            const angle = (d/14)*Math.PI*2 + 0.2;
            const dropLen = 4 + Math.sin(d*1.7)*3;
            for (let y = layer.y - layer.h/2; y > layer.y - layer.h/2 - dropLen; y -= 2) {
              particles.push(new CakeParticle(Math.cos(angle)*layer.r, y, Math.sin(angle)*layer.r, 1,1,1, 0));
            }
          }
        }
        const sc = ['#ff4081','#ffd740','#69f0ae','#40c4ff','#e040fb','#ff6e40'];
        for (let s = 0; s < 16; s++) {
          const angle = Math.random()*Math.PI*2;
          const r = layer.r*(0.3+Math.random()*0.6);
          const col = hexToRgb(sc[s%sc.length]);
          particles.push(new CakeParticle(Math.cos(angle)*r, layer.y+(Math.random()-0.5)*layer.h*0.5, Math.sin(angle)*r, col[0],col[1],col[2], 3));
        }
      });
      const plateR = 58;
      for (let r = 8; r <= plateR; r += 5) {
        const count = Math.max(12, Math.floor(2*Math.PI*r/5));
        for (let i = 0; i < count; i++) {
          const angle = (i/count)*Math.PI*2;
          const y = -16 + Math.sin((r/plateR)*Math.PI)*2.5;
          particles.push(new CakeParticle(Math.cos(angle)*r, y, Math.sin(angle)*r, 0.35,0.35,0.4, 4));
        }
      }
      for (let i = 0; i < 140; i++) {
        const angle = (i/140)*Math.PI*2;
        particles.push(new CakeParticle(Math.cos(angle)*plateR, -14, Math.sin(angle)*plateR, 0.5,0.5,0.55, 4));
      }
      const candleColors = ['#ff6b6b','#4ecdc4','#ffe66d','#a8e6cf','#c9b1ff'];
      const topY = layers[2].y + layers[2].h/2;
      const candleH = 18, candleY = topY + candleH/2;
      for (let i = 0; i < 5; i++) {
        const angle = (i/5)*Math.PI*2;
        const cx = Math.cos(angle)*11, cz = Math.sin(angle)*11;
        const cc = hexToRgb(candleColors[i]);
        for (let y = candleY - candleH/2; y <= candleY + candleH/2; y += 2.5) {
          for (let a = 0; a < 6; a++) {
            const ca = (a/6)*Math.PI*2;
            particles.push(new CakeParticle(cx+Math.cos(ca)*2.5, y, cz+Math.sin(ca)*2.5, cc[0],cc[1],cc[2], 1));
          }
        }
        particles.push(new CakeParticle(cx, candleY+candleH/2, cz, cc[0],cc[1],cc[2], 1));
        const fc = [hexToRgb('#ffeb3b'), hexToRgb('#ff9800'), hexToRgb('#ff5722')];
        for (let f = 0; f < 25; f++) {
          const col = fc[Math.floor(Math.random()*fc.length)];
          particles.push(new CakeParticle(cx+(Math.random()-0.5)*5, candleY+candleH/2+3+Math.random()*12, cz+(Math.random()-0.5)*5, col[0],col[1],col[2], 2));
        }
      }
    }

    const stars = [];
    for (let i = 0; i < 600; i++) {
      stars.push({ x:(Math.random()-0.5)*2000, y:(Math.random()-0.5)*2000, z:(Math.random()-0.5)*2000, size:Math.random()*1.5+0.3, twinkle:Math.random()*Math.PI*2 });
    }

    window.cakeExplode = function() { particles.forEach(p => p.explode()); };
    window.cakeToggleCandles = function() {
      candlesLit = !candlesLit;
      if (candlesLit) {
        particles.forEach(p => {
          if (p.type === 2) {
            p.tx = p.baseTx + (Math.random()-0.5)*5;
            p.ty = p.baseTy + Math.random()*12;
            p.tz = p.baseTz + (Math.random()-0.5)*5;
          }
        });
      } else {
        // 吹灭蜡烛 → 爱心 / 玫瑰 / 魔方 三屏 + 隐藏吹蜡烛按钮 + 隐藏环形相册
        showHeartLayer();
        document.getElementById('candleBtn').style.display = 'none';
      }
    };
    window.cakeToggleAutoRotate = function() { autoRotate = !autoRotate; };
    window.cakeResetCamera = function() {
      camDist = 320; camYaw = 0; camPitch = 0.5;
      camTargetX = 0; camTargetY = 20; camTargetZ = 0;
    };

    function animate() {
      requestAnimationFrame(animate);
      time += 0.016;
      if (autoRotate) camYaw += 0.005;

      ctx.fillStyle = 'rgba(5, 5, 16, 0.2)';
      ctx.fillRect(0, 0, W, H);

      stars.forEach(s => {
        const p = project(s.x, s.y, s.z);
        if (p && p.z > 0) {
          const alpha = 0.3 + Math.sin(time*1.5 + s.twinkle)*0.3;
          // 流光：色相沿空间位置 + 时间流动，形成彩色星雾扫过感
          const hue = (time*38 + (s.x + s.y + s.z)*0.06 + s.twinkle*40) % 360;
          const sat = 55 + Math.sin(time*1.2 + s.twinkle)*20;
          ctx.fillStyle = `hsla(${hue},${sat}%,78%,${alpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, s.size*1.3, 0, Math.PI*2);
          ctx.fill();
        }
      });

      // 吹蜡烛后不再绘制蛋糕粒子（星空保留、继续自动旋转）
      if (!hideCake) {
        particles.forEach(p => p.update(time));

        const sorted = particles.map(p => {
          const pr = project(p.x, p.y, p.z);
          return { p, pr };
        }).filter(item => item.pr !== null).sort((a, b) => b.pr.z - a.pr.z);

        sorted.forEach(item => {
          const { p, pr } = item;
          const size = Math.max(0.5, 2.2 * pr.scale * 0.15);
          const alpha = p.type === 2 ? (candlesLit ? 0.9 : 0.3) : 0.85;
          // 流光：蛋糕主体(type0)色相沿环绕角+高度随时间流动；火焰/蜡烛/盘子保持本色
          let cr = p.r*255, cg = p.g*255, cb = p.b*255;
          if (p.type === 0) {
            const shift = Math.sin(time*1.4 + Math.atan2(p.z, p.x)*1.5 + p.ty*0.08)*55
                        + Math.sin(time*0.6)*25;
            const hc = hueShift(cr, cg, cb, shift);
            cr = hc[0]; cg = hc[1]; cb = hc[2];
          }
          if (p.type === 2 && candlesLit) {
            const grad = ctx.createRadialGradient(pr.x, pr.y, 0, pr.x, pr.y, size*4);
            grad.addColorStop(0, `rgba(${p.r*255},${p.g*255},${p.b*255},0.5)`);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(pr.x, pr.y, size*4, 0, Math.PI*2);
            ctx.fill();
          }
          ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha})`;
          ctx.beginPath();
          ctx.arc(pr.x, pr.y, size, 0, Math.PI*2);
          ctx.fill();
        });
      }
    }

    buildCake();
    animate();
  })();



  //  粒子爱心

  (function() {
    const canvas = document.getElementById('heartCanvas');
    const ctx = canvas.getContext('2d');

    let W, H, CX, CY;
    function resize() {
      W = canvas.width = canvas.offsetWidth || Math.round(window.innerWidth/3);
      H = canvas.height = window.innerHeight;
      CX = W / 2;
      CY = H * 0.42;
    }
    resize();
    window.addEventListener('resize', resize);

    // 配色
    const colorSchemes = [
      { main: [255,255,255], glow: [180,200,255], accent: [120,160,255] },
      { main: [255,180,200], glow: [255,100,150], accent: [255,60,100] },
      { main: [200,230,255], glow: [100,180,255], accent: [50,130,255] },
      { main: [255,230,180], glow: [255,180,80], accent: [255,140,30] },
      { main: [220,200,255], glow: [170,130,255], accent: [130,80,255] },
    ];
    let colorIdx = 0;
    let colors = colorSchemes[0];
    let autoColorTimer = null;

    function heartPoint(t, scale) {
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = -(13*Math.cos(t) - 5*Math.cos(2*t) - 2*Math.cos(3*t) - Math.cos(4*t));
      return [x*scale, y*scale];
    }
    function insideHeart(x, y, scale) {
      const nx = x / (17*scale), ny = -y / (17*scale);
      return Math.pow(nx*nx + ny*ny - 1, 3) - nx*nx * ny*ny*ny <= 0;
    }

    class HeartParticle {
      constructor() { this.reset(true); }
      reset(initial = false) {
        this.x = CX + (Math.random()-0.5)*30;
        this.y = H*0.85 + Math.random()*20;
        this.px = this.x; this.py = this.y;
        const t = Math.random()*Math.PI*2;
        const scale = Math.min(W, H)*0.018;
        const [hx, hy] = heartPoint(t, scale);
        if (Math.random() < 0.4) {
          const rx = (Math.random()-0.5)*34*scale;
          const ry = (Math.random()-0.5)*34*scale;
          if (insideHeart(rx, ry, scale)) {
            this.targetX = CX + rx; this.targetY = CY + ry;
          } else {
            this.targetX = CX + hx; this.targetY = CY + hy;
          }
        } else {
          this.targetX = CX + hx; this.targetY = CY + hy;
        }
        const angle = -Math.PI/2 + (Math.random()-0.5)*1.2;
        const speed = 3 + Math.random()*6;
        this.vx = Math.cos(angle)*speed;
        this.vy = Math.sin(angle)*speed;
        this.life = 1;
        this.decay = 0.002 + Math.random()*0.004;
        this.size = 0.8 + Math.random()*2.2;
        this.trailLength = 8 + Math.random()*20;
        this.arrived = false;
        this.wobble = Math.random()*Math.PI*2;
        this.wobbleSpeed = 0.02 + Math.random()*0.03;
        if (initial) {
          const progress = Math.random();
          this.x = this.x + (this.targetX - this.x)*progress;
          this.y = this.y + (this.targetY - this.y)*progress;
          this.px = this.x; this.py = this.y;
          this.life = 0.5 + Math.random()*0.5;
        }
      }
      update(beatScale) {
        this.px = this.x; this.py = this.y;
        const tx = CX + (this.targetX - CX)*beatScale;
        const ty = CY + (this.targetY - CY)*beatScale;
        if (!this.arrived) {
          const dx = tx - this.x, dy = ty - this.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 4) {
            this.arrived = true; this.x = tx; this.y = ty;
          } else {
            const accel = 0.12;
            this.vx += (dx/dist)*accel;
            this.vy += (dy/dist)*accel;
            this.vx *= 0.94; this.vy *= 0.94;
            this.x += this.vx; this.y += this.vy;
          }
        } else {
          this.wobble += this.wobbleSpeed;
          this.x = tx + Math.sin(this.wobble)*1.5;
          this.y = ty + Math.cos(this.wobble*0.8)*1.5;
          this.life -= this.decay*0.3;
        }
        this.life -= this.decay*0.5;
        if (this.life <= 0) this.reset();
      }
      draw(ctx) {
        const alpha = Math.max(0, this.life);
        const [mr,mg,mb] = colors.main;
        const [gr,gg,gb] = colors.glow;
        const tailX = this.x - (this.x - this.px)*this.trailLength*0.3;
        const tailY = this.y - (this.y - this.py)*this.trailLength*0.3;
        const grad = ctx.createLinearGradient(tailX, tailY, this.x, this.y);
        grad.addColorStop(0, `rgba(${gr},${gg},${gb},0)`);
        grad.addColorStop(0.6, `rgba(${gr},${gg},${gb},${alpha*0.3})`);
        grad.addColorStop(1, `rgba(${mr},${mg},${mb},${alpha*0.8})`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = this.size*0.8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(this.x, this.y);
        ctx.stroke();
        const glowSize = this.size*4;
        const glow = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, glowSize);
        glow.addColorStop(0, `rgba(${mr},${mg},${mb},${alpha*0.9})`);
        glow.addColorStop(0.3, `rgba(${gr},${gg},${gb},${alpha*0.4})`);
        glow.addColorStop(1, `rgba(${gr},${gg},${gb},0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(this.x, this.y, glowSize, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size*0.5, 0, Math.PI*2);
        ctx.fill();
      }
    }

    class BeamParticle {
      constructor() { this.reset(); }
      reset() {
        this.x = CX + (Math.random()-0.5)*15;
        this.y = H*0.88;
        this.px = this.x; this.py = this.y;
        this.vx = (Math.random()-0.5)*1.5;
        this.vy = -(2 + Math.random()*5);
        this.life = 1;
        this.decay = 0.008 + Math.random()*0.015;
        this.size = 1 + Math.random()*2.5;
      }
      update() {
        this.px = this.x; this.py = this.y;
        this.x += this.vx; this.y += this.vy;
        this.vx += (Math.random()-0.5)*0.1;
        this.life -= this.decay;
        if (this.life <= 0 || this.y < CY - 100) this.reset();
      }
      draw(ctx) {
        const alpha = this.life;
        const [mr,mg,mb] = colors.main;
        const [gr,gg,gb] = colors.glow;
        const grad = ctx.createLinearGradient(this.px, this.py, this.x, this.y);
        grad.addColorStop(0, `rgba(${gr},${gg},${gb},0)`);
        grad.addColorStop(1, `rgba(${mr},${mg},${mb},${alpha*0.7})`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = this.size*0.6;
        ctx.beginPath();
        ctx.moveTo(this.px, this.py);
        ctx.lineTo(this.x, this.y);
        ctx.stroke();
        ctx.fillStyle = `rgba(255,255,255,${alpha*0.8})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size*0.4, 0, Math.PI*2);
        ctx.fill();
      }
    }

    class Bokeh {
      constructor() { this.reset(true); }
      reset(initial = false) {
        this.x = Math.random()*W;
        this.y = H*0.7 + Math.random()*H*0.3;
        this.size = 2 + Math.random()*12;
        this.speed = 0.1 + Math.random()*0.4;
        this.alpha = 0.05 + Math.random()*0.2;
        this.phase = Math.random()*Math.PI*2;
        if (initial) this.y = Math.random()*H;
      }
      update(time) {
        this.y -= this.speed;
        this.x += Math.sin(time*0.5 + this.phase)*0.3;
        if (this.y < -20) this.reset();
      }
      draw(ctx, time) {
        const pulse = 0.7 + Math.sin(time + this.phase)*0.3;
        const [gr,gg,gb] = colors.glow;
        const [ar,ag,ab] = colors.accent;
        const useAccent = Math.random() > 0.7;
        const r = useAccent ? ar : gr, g = useAccent ? ag : gg, b = useAccent ? ab : gb;
        const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
        grad.addColorStop(0, `rgba(${r},${g},${b},${this.alpha*pulse})`);
        grad.addColorStop(0.5, `rgba(${r},${g},${b},${this.alpha*pulse*0.3})`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI*2);
        ctx.fill();
      }
    }

    const PARTICLE_COUNT = 600;
    const BEAM_COUNT = 80;
    const BOKEH_COUNT = 50;

    let particles = [];
    let beams = [];
    let bokehs = [];

    function initParticles() {
      particles = []; beams = []; bokehs = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(new HeartParticle());
      for (let i = 0; i < BEAM_COUNT; i++) beams.push(new BeamParticle());
      for (let i = 0; i < BOKEH_COUNT; i++) bokehs.push(new Bokeh());
    }
    initParticles();

    let time = 0;
    let trailEnabled = true;
    let running = false;

    function changeColor() {
      colorIdx = (colorIdx + 1) % colorSchemes.length;
      colors = colorSchemes[colorIdx];
    }

    function animate() {
      if (!running) return;
      requestAnimationFrame(animate);
      time += 0.016;

      const bt = (time * 1.0) % 1;
      let beatScale = 1;
      if (bt < 0.1) beatScale = 1 + Math.sin(bt/0.1*Math.PI)*0.08;
      else if (bt > 0.15 && bt < 0.25) beatScale = 1 + Math.sin((bt-0.15)/0.1*Math.PI)*0.05;

      // 背景完全透明 → 下层自动旋转的星空透出，三屏共用同一背景
      ctx.clearRect(0, 0, W, H);

      // 底部发光
      const [gr,gg,gb] = colors.glow;
      const sourceGlow = ctx.createRadialGradient(CX, H*0.85, 0, CX, H*0.85, 120);
      sourceGlow.addColorStop(0, 'rgba(255,255,255,0.2)');
      sourceGlow.addColorStop(0.3, `rgba(${gr},${gg},${gb},0.06)`);
      sourceGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sourceGlow;
      ctx.fillRect(CX-150, H*0.85-150, 300, 300);

      bokehs.forEach(b => { b.update(time); b.draw(ctx, time); });

      ctx.globalCompositeOperation = 'lighter';
      beams.forEach(b => { b.update(); b.draw(ctx); });
      particles.forEach(p => { p.update(beatScale); p.draw(ctx); });

      const heartGlow = ctx.createRadialGradient(CX, CY, 0, CX, CY, 80);
      heartGlow.addColorStop(0, `rgba(255,255,255,${0.04 + Math.sin(time*2)*0.02})`);
      heartGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = heartGlow;
      ctx.fillRect(CX-100, CY-100, 200, 200);
      ctx.globalCompositeOperation = 'source-over';
    }

    window.showHeartLayer = function() {
      // 隐藏环形相册（与蛋糕层一起消失）
      document.getElementById('albumWrap').classList.add('hide');
      // 不显示 sceneBg：保留自动旋转的星空背景给三层共用
      if (window.cakeSetHidden) window.cakeSetHidden(true);
      // 爱心层（左 1/3）
      canvas.style.display = 'block';
      // 玫瑰花束层（右 1/3）
      const rose = document.getElementById('roseCanvas');
      rose.style.display = 'block';
      if (window.roseStart) window.roseStart();
      // 魔方层（中 1/3）
      document.getElementById('cubeWrap').classList.add('show');
      document.body.classList.add('show-heart');
      // 替换底部提示文字
      document.querySelector('.hint').textContent = '宝贝生日快乐';
      document.querySelector('.hint').style.color = 'rgba(255,200,220,0.6)';
      document.querySelector('.hint').style.fontSize = '0.9rem';
      document.querySelector('.hint').style.letterSpacing = '4px';
      // 重新计算爱心canvas尺寸
      resize();
      if (!running) {
        running = true;
        animate();
      }
      // 自动一直换色
      if (autoColorTimer) clearInterval(autoColorTimer);
      autoColorTimer = setInterval(changeColor, 2500);
    };
  })();



  // ============================================================
  //  3D 粒子玫瑰花束（右侧 1/3 屏）
  //  像爱心一样整体变色：每几秒整束花一起换一种颜色，颜色间柔和过渡
  // ============================================================
  (function() {
    const canvas = document.getElementById('roseCanvas');
    const ctx = canvas.getContext('2d');

    let W, H, CX, CY;
    function resize() {
      W = canvas.width = canvas.offsetWidth || Math.round(window.innerWidth/3);
      H = canvas.height = window.innerHeight;
      CX = W / 2;
      CY = H * 0.46;
    }
    resize();
    window.addEventListener('resize', resize);

    // 3D 相机（自动绕 Y 轴环绕，带俯视）
    let yaw = 0.4;
    let pitch = 0.34;
    const camDist = 340;
    const FOCAL = 1400;

    function project(x, y, z) {
      const c1 = Math.cos(yaw), s1 = Math.sin(yaw);
      let rx = x * c1 + z * s1;
      let rz = -x * s1 + z * c1;
      const c2 = Math.cos(pitch), s2 = Math.sin(pitch);
      const ry = y * c2 - rz * s2;
      const rz2 = y * s2 + rz * c2;
      const depth = rz2 + camDist;
      if (depth < 20) return null;
      const sc = FOCAL / depth;
      return { x: CX + rx * sc, y: CY - ry * sc, z: depth, scale: sc };
    }

    const parts = [];
    const TAU = Math.PI * 2;

    function lerp(a, b, t) {
      return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t];
    }
    function clamp255(v) { return v < 0 ? 0 : (v > 255 ? 255 : v); }

    // 整束花配色板（和爱心同款机制）：玫瑰红 / 玫粉 / 香槟金 / 星空蓝 / 紫罗兰 / 冰晶白
    const roseSchemes = [
      { deep:[156,14,48],   mid:[240,52,92],   light:[255,152,178], glow:[255,120,160], glow2:[255,205,130] },
      { deep:[170,26,110],  mid:[238,86,168],  light:[255,172,218], glow:[255,132,198], glow2:[255,224,150] },
      { deep:[176,112,18],  mid:[238,172,58],  light:[255,222,148], glow:[255,200,110], glow2:[255,162,120] },
      { deep:[28,72,152],   mid:[68,142,236],  light:[168,212,255], glow:[130,182,255], glow2:[190,232,255] },
      { deep:[92,40,162],   mid:[160,92,236],  light:[214,180,255], glow:[182,132,255], glow2:[255,192,232] },
      { deep:[104,110,132], mid:[214,222,244], light:[255,255,255], glow:[204,218,255], glow2:[178,238,255] }
    ];
    function blendScheme(A, B, t) {
      return {
        deep: lerp(A.deep, B.deep, t),
        mid: lerp(A.mid, B.mid, t),
        light: lerp(A.light, B.light, t),
        glow: lerp(A.glow, B.glow, t),
        glow2: lerp(A.glow2, B.glow2, t)
      };
    }
    let schemeIdx = 0;
    let schemeFrom = roseSchemes[0];
    let schemeTo = roseSchemes[0];
    let mixT = 1;
    let autoColorTimer = null;
    function changeColor() {
      schemeFrom = blendScheme(schemeFrom, schemeTo, mixT);
      schemeIdx = (schemeIdx + 1) % roseSchemes.length;
      schemeTo = roseSchemes[schemeIdx];
      mixT = 0;
    }

    // 一朵玫瑰：四层花瓣叠成的立体螺旋花朵（lv 记录深浅渐变位置，颜色跟随整束配色）
    function addRose(ox, oy, oz, s, seed) {
      const layers = [
        { N: 72, baseR: 4.0,  rangeR: 4.5,  topY: 13.5, drop: 2.6, turns: 2.4, phase: 0.0 },
        { N: 76, baseR: 8.0,  rangeR: 5.5,  topY: 11.0, drop: 4.2, turns: 3.0, phase: 1.6 },
        { N: 80, baseR: 12.5, rangeR: 6.0,  topY: 8.5,  drop: 6.5, turns: 3.6, phase: 3.1 },
        { N: 84, baseR: 17.5, rangeR: 6.5,  topY: 6.0,  drop: 9.0, turns: 4.2, phase: 4.7 }
      ];
      layers.forEach((L, k) => {
        for (let i = 0; i < L.N; i++) {
          const t = i / L.N;
          const theta = t * TAU * L.turns + L.phase + seed;
          const r = (L.baseR + L.rangeR * t) * (1 + 0.26 * Math.sin(theta * 5.2) * t);
          const px = Math.cos(theta) * r;
          const pz = Math.sin(theta) * r;
          const py = L.topY - L.drop * Math.sin(t * Math.PI)
                   + 1.3 * Math.sin(theta * 5.2 + 1.2) * t;
          let lv;
          if (k === 0) lv = 0.05 + t * 0.22;
          else if (k === 1) lv = 0.30 + t * 0.25;
          else if (k === 2) lv = 0.58 + t * 0.22;
          else lv = 0.82 + t * 0.20;
          const jitter = (Math.random() - 0.5) * 24;
          parts.push({
            x: ox + px * s, y: oy + py * s, z: oz + pz * s,
            lv: lv, jit: jitter,
            size: 0.52 + Math.random() * 0.5,
            ph: Math.random() * TAU, wp: theta * 0.55 + r * 0.18, kind: 0
          });
        }
      });
      // 花蕊：顶部一簇亮粒子
      for (let i = 0; i < 26; i++) {
        const a = Math.random() * TAU, r = Math.random() * 2.8;
        parts.push({
          x: ox + Math.cos(a) * r * s, y: oy + (13.5 + Math.random() * 2.5) * s, z: oz + Math.sin(a) * r * s,
          lv: 1.1, jit: 0, size: 0.55 + Math.random() * 0.45,
          ph: Math.random() * TAU, wp: a * 0.8 + 6.0, kind: 0
        });
      }
    }

    // 花茎：从花底弯到花束底部中心（保持绿色不变）
    function addStem(ox, oy, oz) {
      const N = 26;
      const ex = 0, ey = -86, ez = 0;
      const mx = ox * 0.55, my = (oy - 6 + ey) / 2, mz = oz * 0.55;
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        const x = (1-t)*(1-t)*ox + 2*(1-t)*t*mx + t*t*ex;
        const y = (1-t)*(1-t)*(oy - 7) + 2*(1-t)*t*my + t*t*ey;
        const z = (1-t)*(1-t)*oz + 2*(1-t)*t*mz + t*t*ez;
        const gcol = lerp([72, 148, 84], [26, 62, 46], t);
        parts.push({ x, y, z, r: gcol[0], g: gcol[1], b: gcol[2], size: 0.55, ph: Math.random()*TAU, wp: t * 3.2, kind: 1 });
      }
    }

    // 叶子：椭圆面片，带弯曲（保持绿色不变）
    function addLeaf(cx, cy, cz, dx, dz, s) {
      const N = 30;
      const px = -dz, pz = dx;
      for (let i = 0; i < N; i++) {
        const u = Math.random();
        const v = (Math.random() - 0.5) * 2;
        const halfW = Math.sin(u * Math.PI) * 4.6 * s;
        const along = u * 13 * s;
        const x = cx + dx * along + px * v * halfW;
        const z = cz + dz * along + pz * v * halfW;
        const y = cy + Math.sin(u * Math.PI) * 1.6 * s + Math.abs(v) * 0.6;
        const gcol = lerp([56, 138, 72], [30, 84, 52], Math.random());
        parts.push({ x, y, z, r: gcol[0], g: gcol[1], b: gcol[2], size: 0.5, ph: Math.random()*TAU, wp: u * 2.6, kind: 2 });
      }
    }

    // 组装花束
    function buildBouquet() {
      // 六朵玫瑰（高低错落、大小不一），花头更大更饱满
      addRose(-24, 8, -11, 1.00, 0.0);
      addRose( 23, 12, 8,  0.94, 1.7);
      addRose( -2, 20, -15, 0.86, 3.4);
      addRose( -10, 14, 12, 0.80, 2.5);
      addRose(  10, 24, -7, 0.76, 4.8);
      addRose(  15, 3, -16, 0.70, 5.9);
      // 花茎
      addStem(-24, 8, -11);
      addStem( 23, 12, 8);
      addStem( -2, 20, -15);
      addStem( -10, 14, 12);
      addStem(  10, 24, -7);
      addStem(  15, 3, -16);
      // 叶子
      addLeaf(-20, -22, -6,  -0.9, 0.4, 1.0);
      addLeaf(-26, -42, -8,   0.3, -1.0, 0.9);
      addLeaf( 18, -18, 6,    0.9, 0.3, 1.0);
      addLeaf( 24, -40, 4,   -0.2, -1.0, 0.9);
      addLeaf( -2, -26, -12,  0.85, 0.5, 1.0);
      addLeaf(  4, -46, -10, -0.4, 1.0, 0.85);
      addLeaf(-12, -32, 10,  -0.6, 0.8, 0.8);
      addLeaf( 10, -30, -4,   0.7, -0.5, 0.8);
      addLeaf(  0, -56, 6,    0.2, -1.0, 0.8);
      addLeaf(-16, -50, 2,   -0.8, -0.5, 0.75);
      // 花束周围漂浮光点（跟随整束配色）
      for (let i = 0; i < 80; i++) {
        const a = Math.random() * TAU;
        const rr = 26 + Math.random() * 60;
        const y = -70 + Math.random() * 100;
        const pick = Math.random();
        parts.push({
          x: Math.cos(a) * rr, y, z: Math.sin(a) * rr,
          pk: pick, size: 0.4 + Math.random() * 0.7,
          ph: Math.random() * TAU, wp: a, kind: 3
        });
      }
    }
    buildBouquet();

    let time = 0;
    let running = false;

    function animate() {
      if (!running) return;
      requestAnimationFrame(animate);
      time += 0.016;
      yaw += 0.0035;
      pitch = 0.34 + Math.sin(time * 0.25) * 0.04;
      // 换色柔和过渡（约 0.9 秒渐变到新一色）
      if (mixT < 1) mixT = Math.min(1, mixT + 0.016 / 0.9);

      const S = blendScheme(schemeFrom, schemeTo, mixT);

      // 透明背景 → 星空透出，三屏共用
      ctx.clearRect(0, 0, W, H);

      // 投影 + 深度排序
      const items = [];
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        const pr = project(p.x, p.y, p.z);
        if (pr) items.push({ p, pr });
      }
      items.sort((a, b) => b.pr.z - a.pr.z);

      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < items.length; i++) {
        const { p, pr } = items[i];
        const tw = 0.75 + Math.sin(time * 1.6 + p.ph) * 0.25; // 闪烁
        const size = Math.max(0.4, p.size * pr.scale * 0.55);
        let cr, cg, cb;
        if (p.kind === 0) {
          // 花瓣/花蕊：颜色由整束当前配色决定，全花一起换色
          const hl = 1 + 0.12 * Math.sin(time * 2.6 + p.wp * 2.4); // 轻微呼吸高光
          let col;
          if (p.lv > 1) col = lerp(S.light, [255, 255, 255], 0.55);
          else if (p.lv < 0.5) col = lerp(S.deep, S.mid, p.lv * 2);
          else col = lerp(S.mid, S.light, (p.lv - 0.5) * 2);
          cr = clamp255(col[0] * hl + p.jit);
          cg = clamp255(col[1] * hl + p.jit);
          cb = clamp255(col[2] * hl + p.jit);
        } else if (p.kind === 3) {
          // 漂浮光点：跟随当前配色
          const col = lerp(S.glow, S.glow2, p.pk);
          cr = col[0]; cg = col[1]; cb = col[2];
        } else {
          // 花茎与叶子：保持绿色
          cr = p.r; cg = p.g; cb = p.b;
        }
        // 光晕
        ctx.fillStyle = 'rgba(' + (cr|0) + ',' + (cg|0) + ',' + (cb|0) + ',' + (0.10 * tw).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, size * 3.4, 0, TAU);
        ctx.fill();
        // 核心
        const alpha = (p.kind === 3 ? 0.55 : 0.78) * tw;
        ctx.fillStyle = 'rgba(' + (cr|0) + ',' + (cg|0) + ',' + (cb|0) + ',' + alpha.toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, size, 0, TAU);
        ctx.fill();
      }
      // 花束整体柔光（跟随当前颜色）
      const glow = ctx.createRadialGradient(CX, CY - 10, 0, CX, CY - 10, Math.min(W, H) * 0.34);
      const lr = S.light[0] | 0, lg = S.light[1] | 0, lb = S.light[2] | 0;
      glow.addColorStop(0, 'rgba(' + lr + ',' + lg + ',' + lb + ',0.07)');
      glow.addColorStop(0.5, 'rgba(' + lr + ',' + lg + ',' + lb + ',0.03)');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
    }

    window.roseStart = function() {
      resize();
      if (!running) {
        running = true;
        animate();
      }
      // 和爱心一样自动一直换色：每 3 秒整束花一起变一种颜色
      if (autoColorTimer) clearInterval(autoColorTimer);
      autoColorTimer = setInterval(changeColor, 3000);
    };
  })();
