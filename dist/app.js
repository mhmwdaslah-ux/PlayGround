(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const hudSpeed = document.getElementById('hudSpeed');
  const hudDrift = document.getElementById('hudDrift');
  const hudDamage = document.getElementById('hudDamage');
  const dmgFill = document.getElementById('dmgFill');
  const hudCash = document.getElementById('hudCash');
  const gameMsg = document.getElementById('gameMsg');
  const carSelectEl = document.getElementById('carSelect');
  const mapSelectEl = document.getElementById('mapSelect');

  const CARS = [
    { id: 'camry08', name: 'Camry 08 كوامري', color: '#e8e8e8', top: 205, accel: 165, grip: 2.6, lock: 1.0 },
    { id: 'camry22', name: 'Camry 22 قراندي', color: '#1a1a1a', top: 225, accel: 185, grip: 2.9, lock: 1.0 },
    { id: 'cadenza', name: 'Cadenza كادينزا', color: '#7a0d0d', top: 235, accel: 175, grip: 3.2, lock: 0.85 },
    { id: 'sunny', name: 'Sunny صني', color: '#2b6cb0', top: 185, accel: 150, grip: 2.2, lock: 1.25 },
    { id: 'taurus', name: 'Taurus تورس', color: '#c0c5ce', top: 245, accel: 200, grip: 3.0, lock: 0.9 },
    { id: 'accent', name: 'Accent اكسنت', color: '#f6e05e', top: 195, accel: 160, grip: 2.4, lock: 1.15 },
  ];

  const MAPS = {
    khat: { name: 'Khat خط', traffic: 6, roadW: 340, sand: '#c9a86a', road: '#2d3748', maxTrafficSpeed: 90 },
    city: { name: 'City تطعيس', traffic: 13, roadW: 460, sand: '#4a5568', road: '#1a202c', maxTrafficSpeed: 70 },
    mataar: { name: 'Mataar مطار', traffic: 0, roadW: 700, sand: '#718096', road: '#4a5568', maxTrafficSpeed: 0 },
  };

  let curCar = 0, curMap = 'khat';
  let paint = '#e8e8e8', tint = 30, susp = -2, turbo = false;
  let cash = 500, driftPts = 0, combo = 1, comboTimer = 0;

  const P = { x: 450, y: 400, angle: -Math.PI / 2, vx: 0, vy: 0, speed: 0, damage: 0, w: 44, h: 78 };
  const keys = { up: false, down: false, left: false, right: false, handbrake: false };

  // Object pools: traffic + smoke + skids (zero per-frame alloc)
  const traffic = [];
  for (let i = 0; i < 20; i++) traffic.push({ active: false, x: 0, y: 0, speed: 0, color: '#fff', w: 42, h: 76, passed: false });
  const smokes = [];
  for (let i = 0; i < 120; i++) smokes.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0 });
  const skids = [];
  let roadOffset = 0, coneOffset = 0, msgTimer = 0;

  function say(t) { gameMsg.textContent = t; msgTimer = 4; }

  // Car + map buttons
  CARS.forEach((c, i) => {
    const b = document.createElement('button');
    b.textContent = c.name;
    if (i === 0) b.classList.add('active');
    b.onclick = () => {
      curCar = i; paint = c.color;
      document.getElementById('paintColor').value = c.color;
      [...carSelectEl.children].forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      say('🔥 ' + c.name + ' جاهزة — ادعس!');
    };
    carSelectEl.appendChild(b);
  });
  mapSelectEl.querySelectorAll('button').forEach(b => {
    b.onclick = () => {
      curMap = b.dataset.map;
      mapSelectEl.querySelectorAll('button').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      resetTraffic();
      say('📍 ' + MAPS[curMap].name + ' — خط جديد!');
    };
  });

  document.getElementById('paintColor').oninput = e => paint = e.target.value;
  document.getElementById('tintRange').oninput = e => { tint = +e.target.value; document.getElementById('tintVal').textContent = tint + '%'; };
  document.getElementById('suspRange').oninput = e => { susp = +e.target.value; document.getElementById('suspVal').textContent = susp; };
  document.getElementById('turboCheck').onchange = e => { turbo = e.target.checked; say(turbo ? '🔥 تيربو ركب! قوة +30 حصان' : 'تيربو انفك'); };
  document.getElementById('repairBtn').onclick = () => {
    if (cash >= 200 && P.damage > 0) { cash -= 200; P.damage = 0; say('🔧 تم الإصلاح — السيارة وكالة!'); }
    else if (P.damage <= 0) say('السيارة سليمة ما تحتاج إصلاح');
    else say('ما عندك فلوس!فحط نظيف عشان تكسب');
  };
  document.getElementById('resetBtn').onclick = () => { driftPts = 0; combo = 1; say('تصفرت النقاط — ابدأ من جديد'); };

  const oldStart = document.getElementById('startBtn');
  if (oldStart) oldStart.onclick = () => {
    document.getElementById('play').scrollIntoView({ behavior: 'smooth' });
    say('🏁 ادعس! SPACE جلنط للتفحيط');
    initAudio();
  };

  // Keyboard
  const keyMap = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', Space: 'handbrake' };
  addEventListener('keydown', e => { const k = keyMap[e.code]; if (k) { keys[k] = true; e.preventDefault(); initAudio(); } });
  addEventListener('keyup', e => { const k = keyMap[e.code]; if (k) { keys[k] = false; e.preventDefault(); } });

  // Touch
  document.querySelectorAll('.touch-controls button').forEach(b => {
    const k = b.dataset.k;
    const on = e => { e.preventDefault(); keys[k] = true; initAudio(); };
    const off = e => { e.preventDefault(); keys[k] = false; };
    b.addEventListener('pointerdown', on);
    b.addEventListener('pointerup', off);
    b.addEventListener('pointerleave', off);
  });

  // Engine sound (tiny oscillator, no assets)
  let AC = null, osc = null, oscGain = null;
  function initAudio() {
    if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      osc = AC.createOscillator(); oscGain = AC.createGain();
      osc.type = 'sawtooth'; osc.frequency.value = 60;
      oscGain.gain.value = 0.03;
      osc.connect(oscGain); oscGain.connect(AC.destination); osc.start();
    } catch (e) { /* audio not available */ }
  }

  function resetTraffic() { traffic.forEach(t => t.active = false); }

  function spawnTraffic() {
    const m = MAPS[curMap];
    const cx = canvas.width / 2, left = cx - m.roadW / 2 + 30, right = cx + m.roadW / 2 - 30;
    for (const t of traffic) {
      if (t.active) continue;
      const activeCount = traffic.filter(x => x.active).length;
      if (activeCount >= m.traffic) return;
      if (Math.random() < 0.03) {
        t.active = true; t.passed = false;
        t.x = left + Math.random() * (right - left);
        t.y = -100 - Math.random() * 300;
        t.speed = (40 + Math.random() * m.maxTrafficSpeed) / 3.6;
        const cols = ['#fff', '#cbd5e0', '#f6e05e', '#2b6cb0', '#000', '#9b2c2c'];
        t.color = cols[(Math.random() * cols.length) | 0];
        return;
      }
    }
  }

  function spawnSmoke(x, y, big) {
    for (const s of smokes) {
      if (s.active) continue;
      s.active = true; s.x = x; s.y = y;
      s.vx = (Math.random() - 0.5) * 60; s.vy = (Math.random() - 0.5) * 60 - 20;
      s.life = big ? 1.2 : 0.6;
      return;
    }
  }

  let last = performance.now();
  function loop(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    update(dt);
    render(dt);
    requestAnimationFrame(loop);
  }

  function update(dt) {
    const car = CARS[curCar];
    const topMs = (car.top + (turbo ? 35 : 0)) * (1 - P.damage / 250) / 3.6;
    const accel = car.accel + (turbo ? 60 : 0);

    // Steering (lock scales with speed + car lock kit + suspension)
    const spdKmh = Math.hypot(P.vx, P.vy) * 3.6;
    const steerPower = 2.6 * car.lock * (spdKmh < 30 ? 1 : Math.max(0.45, 1 - spdKmh / 400));
    if (keys.left) P.angle -= steerPower * dt * (spdKmh > 5 ? 1 : 0);
    if (keys.right) P.angle += steerPower * dt * (spdKmh > 5 ? 1 : 0);

    // Throttle / brake (arcade-sim)
    const fx = Math.sin(P.angle + Math.PI) * -1, fy = Math.cos(P.angle + Math.PI) * -1;
    // forward vector: angle -PI/2 = up
    const fwdX = Math.cos(P.angle + Math.PI / 2), fwdY = Math.sin(P.angle + Math.PI / 2);
    if (keys.up) { P.vx += fwdX * accel * dt; P.vy += fwdY * accel * dt; }
    if (keys.down) { P.vx -= fwdX * accel * 0.7 * dt; P.vy -= fwdY * accel * 0.7 * dt; P.vx *= (1 - 0.8 * dt); P.vy *= (1 - 0.8 * dt); }
    // drag + rolling
    P.vx *= (1 - 0.25 * dt); P.vy *= (1 - 0.25 * dt);

    // Grip: velocity lerps toward heading. Handbrake drops rear grip -> drift (تفحيط)
    let grip = car.grip + susp * 0.08; // تهبيط يزيد ثبات، ترفيع يخفف
    if (keys.handbrake) grip = 0.9;
    const sp = Math.hypot(P.vx, P.vy);
    if (sp > 0.5) {
      const dirX = P.vx / sp, dirY = P.vy / sp;
      const dot = dirX * fwdX + dirY * fwdY;
      const slip = 1 - Math.abs(dot); // 0 straight, ~1 sideways
      const k = Math.min(1, grip * dt * (keys.handbrake ? 1.4 : 3));
      const nx = dirX + (fwdX * Math.sign(dot || 1) - dirX) * k;
      const ny = dirY + (fwdY * Math.sign(dot || 1) - dirY) * k;
      const nsp = Math.min(sp, topMs + (keys.handbrake ? 8 : 0));
      P.vx = nx * nsp; P.vy = ny * nsp;

      // Drift scoring (نطل/شطف): sideways + fast
      if (slip > 0.18 && spdKmh > 60) {
        const gain = slip * spdKmh * dt * 2 * combo;
        driftPts += gain; cash += gain * 0.02;
        comboTimer = 2.5;
        // smoke + skids
        if (Math.random() < 0.7) {
          spawnSmoke(P.x - fwdX * 30 + (Math.random() - 0.5) * 20, P.y - fwdY * 30 + (Math.random() - 0.5) * 20, false);
          if (skids.length > 400) skids.shift();
          skids.push({ x: P.x, y: P.y, a: P.angle, life: 6 });
        }
        if (combo < 10 && Math.random() < 0.01) { combo += 1; say('🔥 كومبو x' + combo + ' — نطل مجنون!'); }
      }
    }

    if (comboTimer > 0) { comboTimer -= dt; if (comboTimer <= 0) combo = 1; }
    if (msgTimer > 0) msgTimer -= dt;

    P.x += P.vx * dt * 3; P.y += P.vy * dt * 3;
    P.speed = Math.hypot(P.vx, P.vy) * 3.6;

    // World scroll illusion: keep player near center vertically
    if (P.y < 140) { P.y = 140; roadOffset += sp * dt * 3; coneOffset += sp * dt * 3; }
    if (P.y > 470) P.y = 470;
    const m = MAPS[curMap];
    const cx = canvas.width / 2;
    if (P.x < cx - m.roadW / 2 + 15) { P.x = cx - m.roadW / 2 + 15; crash(Math.abs(P.vx) * 3.6); P.vx *= -0.4; }
    if (P.x > cx + m.roadW / 2 - 15) { P.x = cx + m.roadW / 2 - 15; crash(Math.abs(P.vx) * 3.6); P.vx *= -0.4; }

    // Traffic update (pooled)
    spawnTraffic();
    for (const t of traffic) {
      if (!t.active) continue;
      t.y += (t.speed + sp * 1.2) * dt * 3;
      if (t.y > canvas.height + 120) { t.active = false; continue; }
      // collision with player
      const dx = Math.abs(P.x - t.x), dy = Math.abs(P.y - t.y);
      if (dx < 42 && dy < 72) {
        const impact = Math.max(10, spdKmh * 0.5);
        crash(impact);
        P.vx *= -0.3; P.vy *= -0.3; t.y += 40;
        for (let i = 0; i < 6; i++) spawnSmoke(P.x, P.y, true);
      } else if (!t.passed && t.y > P.y + 60 && dx < 70 && dx > 40 && spdKmh > 100) {
        t.passed = true; // near-miss تطعيس bonus
        const bonus = 50 * combo;
        driftPts += bonus; cash += 5;
        say('😱 تطعيس! +' + Math.round(bonus) + ' قريب من الصدام');
      }
    }

    // Mataar cones: drift gates give points
    if (curMap === 'mataar' && Math.random() < dt * 0.8 && P.speed > 80) {
      const bonus = 30 * combo; driftPts += bonus;
    }

    // smoke aging
    for (const s of smokes) {
      if (!s.active) continue;
      s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt;
      if (s.life <= 0) s.active = false;
    }
    for (let i = skids.length - 1; i >= 0; i--) { skids[i].life -= dt; if (skids[i].life <= 0) skids.splice(i, 1); }

    // HUD
    hudSpeed.textContent = Math.round(P.speed);
    hudDrift.textContent = Math.round(driftPts);
    hudDamage.textContent = Math.round(P.damage) + '%';
    dmgFill.style.width = Math.min(100, P.damage) + '%';
    hudCash.textContent = Math.round(cash);

    if (AC && osc) osc.frequency.value = 50 + P.speed * 1.1 + (turbo ? 20 : 0);
  }

  function crash(impactKmh) {
    if (impactKmh < 8) return;
    const dmg = Math.min(25, impactKmh * 0.35);
    P.damage = Math.min(100, P.damage + dmg);
    combo = 1;
    if (impactKmh > 20) say(P.damage >= 100 ? '💥 تحطمت! اضغط إصلاح 🔧' : '💥 صدمة! تعفط ' + Math.round(P.damage) + '% — هدي!');
    if (P.damage >= 100) { P.vx *= 0.3; P.vy *= 0.3; }
  }

  function drawCar(x, y, angle, color, isPlayer, damage, tintV) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle + Math.PI / 2);
    const w = 44, h = 78;
    const dent = isPlayer ? damage / 100 : 0;
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.fillRect(-w / 2 + 3, -h / 2 + 6, w, h);
    // body with deformation: squash front by dent
    ctx.fillStyle = color;
    const crush = dent * 14;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2 + crush, w, h - crush, 10);
    ctx.fill();
    ctx.strokeStyle = dent > 0.4 ? '#333' : 'rgba(0,0,0,.4)';
    ctx.lineWidth = 2; ctx.stroke();
    // dents (تعفط): dark patches scale with damage
    if (dent > 0.05) {
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      const n = Math.min(6, Math.floor(dent * 8));
      for (let i = 0; i < n; i++) {
        const px = (Math.sin(i * 12.9 + damage) * 0.5 + 0.5 - 0.5) * w * 0.6;
        const py = -h / 2 + crush + 8 + i * (h / 7);
        ctx.beginPath(); ctx.ellipse(px, py, 6 + dent * 8, 4 + dent * 5, 0.4 * i, 0, 7); ctx.fill();
      }
      if (dent > 0.6) { // cracked windshield
        ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-12, -8); ctx.lineTo(12, -4); ctx.moveTo(0, -18); ctx.lineTo(2, 6); ctx.stroke();
      }
    }
    // windshield with tint (تظليل)
    ctx.fillStyle = 'rgba(20,30,50,' + (0.45 + tintV / 150) + ')';
    ctx.beginPath(); ctx.roundRect(-w / 2 + 7, -h / 2 + crush + 14, w - 14, 18, 4); ctx.fill();
    ctx.fillStyle = 'rgba(20,30,50,.85)';
    ctx.beginPath(); ctx.roundRect(-w / 2 + 7, h / 2 - 26, w - 14, 14, 4); ctx.fill();
    // headlights
    ctx.fillStyle = '#fff9c4';
    ctx.fillRect(-w / 2 + 4, -h / 2 + crush + 2, 10, 5);
    ctx.fillRect(w / 2 - 14, -h / 2 + crush + 2, 10, 5);
    // wheels (suspension visual: تهبيط lowers)
    ctx.fillStyle = '#111';
    const wy = isPlayer ? susp : 0;
    ctx.fillRect(-w / 2 - 4, -h / 4 + wy, 8, 20); ctx.fillRect(w / 2 - 4, -h / 4 + wy, 8, 20);
    ctx.fillRect(-w / 2 - 4, h / 4 + wy, 8, 20); ctx.fillRect(w / 2 - 4, h / 4 + wy, 8, 20);
    ctx.restore();
  }

  function render(dt) {
    const m = MAPS[curMap];
    const cx = canvas.width / 2, W = canvas.width, H = canvas.height;
    // bg
    ctx.fillStyle = m.sand; ctx.fillRect(0, 0, W, H);
    // road
    const rx = cx - m.roadW / 2;
    ctx.fillStyle = m.road; ctx.fillRect(rx, 0, m.roadW, H);
    // lane dashes scroll with speed
    roadOffset = (roadOffset + P.speed * dt * 1.5) % 60;
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    const lanes = curMap === 'mataar' ? 4 : 2;
    for (let l = 1; l <= lanes; l++) {
      const lx = rx + (m.roadW / (lanes + 1)) * l;
      for (let y = -60; y < H + 60; y += 60) ctx.fillRect(lx - 3, y + roadOffset, 6, 30);
    }
    // mataar cones
    if (curMap === 'mataar') {
      coneOffset = (coneOffset + P.speed * dt * 1.5) % 160;
      ctx.fillStyle = '#fb5607';
      for (let y = -160; y < H + 160; y += 160) {
        ctx.beginPath(); ctx.moveTo(cx - 120, y + coneOffset); ctx.lineTo(cx - 108, y + coneOffset); ctx.lineTo(cx - 114, y + coneOffset - 18); ctx.fill();
        ctx.beginPath(); ctx.moveTo(cx + 120, y + coneOffset); ctx.lineTo(cx + 132, y + coneOffset); ctx.lineTo(cx + 126, y + coneOffset - 18); ctx.fill();
      }
    } else {
      // desert props: dunes + signs
      ctx.fillStyle = 'rgba(0,0,0,.12)';
      for (let i = 0; i < 5; i++) {
        const py = ((i * 173 + roadOffset * 0.5) % (H + 100)) - 50;
        ctx.beginPath(); ctx.ellipse(40, py, 50, 18, 0.3, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.ellipse(W - 40, (py + 90) % H, 55, 20, -0.3, 0, 7); ctx.fill();
      }
    }
    // skids (pooled, capped)
    ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 5;
    for (const s of skids) { ctx.globalAlpha = Math.min(1, s.life / 6); ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - Math.cos(s.a) * 8, s.y - Math.sin(s.a) * 8); ctx.stroke(); }
    ctx.globalAlpha = 1;
    // traffic
    for (const t of traffic) if (t.active) drawCar(t.x, t.y, Math.PI, t.color, false, 0, 20);
    // smoke
    for (const s of smokes) {
      if (!s.active) continue;
      ctx.fillStyle = 'rgba(230,230,230,' + (s.life * 0.5) + ')';
      ctx.beginPath(); ctx.arc(s.x, s.y, 14 + (1 - s.life) * 14, 0, 7); ctx.fill();
    }
    // player (deformation visible تتعفط/تتكسر)
    drawCar(P.x, P.y, P.angle, paint, true, P.damage, tint);
    // damage overlay text
    if (P.damage >= 100) {
      ctx.fillStyle = 'rgba(180,0,0,.85)'; ctx.font = 'bold 26px system-ui';
      ctx.textAlign = 'center'; ctx.fillText('💥 تحطمت — اضغط إصلاح 🔧', cx, 60);
    }
  }

  resetTraffic();
  say('🚗 اختر سيارتك وادعس — WASD + SPACE جلنط');
  requestAnimationFrame(loop);
  console.log('HAJWALA playable loaded');
})();
