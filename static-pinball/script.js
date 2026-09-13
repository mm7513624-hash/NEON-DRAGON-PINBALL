"use strict";

/* ===================== AUDIO ===================== */

let actx = null;
let master = null;
let sfx = null;
let muted = false;

function ac() {
  if (typeof window === "undefined") return null;
  if (!actx) {
    actx = new (window.AudioContext || window.webkitAudioContext)();
    master = actx.createGain();
    sfx = actx.createGain();
    sfx.gain.value = 0.7;
    master.gain.value = 0.85;
    sfx.connect(master);
    master.connect(actx.destination);
  }
  return actx;
}

function unlockAudio() {
  const audio = ac();
  if (!audio) return;
  if (audio.state === "suspended") void audio.resume();
}

function setMuted(next) {
  muted = next;
  if (master && actx) {
    master.gain.setTargetAtTime(next ? 0 : 0.85, actx.currentTime, 0.03);
  }
}

function isMuted() {
  return muted;
}

function tone(freq, dur, type, gain = 0.12, slide = 0) {
  const audio = ac();
  if (!audio || !sfx || muted) return;
  const now = audio.currentTime;
  const osc = audio.createOscillator();
  const g = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), now + dur);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(gain, now + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.connect(g);
  g.connect(sfx);
  osc.start(now);
  osc.stop(now + dur + 0.02);
}

const sfxPlay = {
  bumper() {
    tone(420 + Math.random() * 80, 0.09, "square", 0.08, 180);
  },
  special() {
    tone(620, 0.14, "sawtooth", 0.1, 240);
    tone(930, 0.1, "triangle", 0.05);
  },
  flipper() {
    tone(180 + Math.random() * 40, 0.05, "square", 0.07);
  },
  launch() {
    tone(140, 0.22, "sawtooth", 0.11, 420);
  },
  kicker() {
    tone(280, 0.12, "square", 0.1, 500);
  },
  rollover() {
    tone(880, 0.08, "triangle", 0.07);
  },
  drain() {
    tone(240, 0.35, "sine", 0.1, -180);
  },
  extra() {
    tone(523, 0.12, "triangle", 0.08);
    tone(784, 0.16, "triangle", 0.07);
  },
  ability() {
    tone(392, 0.18, "sawtooth", 0.1, 200);
    tone(784, 0.22, "triangle", 0.08);
  },
  sling() {
    tone(200, 0.08, "square", 0.09, 260);
  },
};

/* ===================== ENGINE ===================== */

const W = 500;
const H = 860;

const SAVE_KEY = "neonDragonPinball";
const SAVE_VERSION = 1;
const STEP = 1 / 120;
const MAX_SPEED = 2800;
const CYAN = "#00f0fc";
const MAGENTA = "#ff4fd8";
const AMBER = "#ff9d1f";
const LIME = "#37ff8b";
const VIOLET = "#7f5fff";

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function loadRecord() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return 0;
    const data = JSON.parse(raw);
    return Number(data.record) || 0;
  } catch {
    return 0;
  }
}

function saveRecord(record) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, record }));
  } catch {
    /* private mode */
  }
}

const bumpers = [
  { x: 168, y: 150, r: 20, type: "normal", color: CYAN, core: MAGENTA, points: 100, hit: 0 },
  { x: 250, y: 118, r: 20, type: "normal", color: CYAN, core: MAGENTA, points: 100, hit: 0 },
  { x: 332, y: 150, r: 20, type: "normal", color: CYAN, core: MAGENTA, points: 100, hit: 0 },
  { x: 205, y: 200, r: 17, type: "normal", color: CYAN, core: MAGENTA, points: 100, hit: 0 },
  { x: 295, y: 200, r: 17, type: "normal", color: CYAN, core: MAGENTA, points: 100, hit: 0 },
  { x: 372, y: 178, r: 16, type: "normal", color: CYAN, core: MAGENTA, points: 100, hit: 0 },
  { x: 118, y: 268, r: 28, type: "x", color: VIOLET, core: VIOLET, points: 250, hit: 0 },
  { x: 198, y: 270, r: 16, type: "normal", color: CYAN, core: MAGENTA, points: 100, hit: 0 },
  { x: 328, y: 255, r: 16, type: "normal", color: CYAN, core: MAGENTA, points: 100, hit: 0 },
  { x: 378, y: 248, r: 15, type: "normal", color: CYAN, core: MAGENTA, points: 100, hit: 0 },
  { x: 248, y: 348, r: 28, type: "s", color: AMBER, core: AMBER, points: 250, hit: 0 },
  { x: 158, y: 365, r: 15, type: "normal", color: CYAN, core: MAGENTA, points: 100, hit: 0 },
  { x: 338, y: 328, r: 15, type: "normal", color: CYAN, core: MAGENTA, points: 100, hit: 0 },
  { x: 328, y: 428, r: 26, type: "bolt", color: LIME, core: LIME, points: 250, hit: 0 },
  { x: 128, y: 468, r: 17, type: "normal", color: CYAN, core: MAGENTA, points: 100, hit: 0 },
  { x: 205, y: 498, r: 15, type: "normal", color: CYAN, core: MAGENTA, points: 100, hit: 0 },
  { x: 175, y: 552, r: 17, type: "normal", color: CYAN, core: MAGENTA, points: 100, hit: 0 },
  { x: 248, y: 532, r: 17, type: "normal", color: CYAN, core: MAGENTA, points: 100, hit: 0 },
  { x: 322, y: 552, r: 17, type: "normal", color: CYAN, core: MAGENTA, points: 100, hit: 0 },
  { x: 210, y: 602, r: 15, type: "normal", color: CYAN, core: MAGENTA, points: 100, hit: 0 },
  { x: 286, y: 602, r: 15, type: "normal", color: CYAN, core: MAGENTA, points: 100, hit: 0 },
  { x: 158, y: 638, r: 14, type: "normal", color: CYAN, core: MAGENTA, points: 100, hit: 0 },
  { x: 248, y: 652, r: 15, type: "normal", color: CYAN, core: MAGENTA, points: 100, hit: 0 },
  { x: 342, y: 638, r: 14, type: "normal", color: CYAN, core: MAGENTA, points: 100, hit: 0 },
];

const posts = [
  { x: 58, y: 205, r: 11, hit: 0 },
  { x: 58, y: 385, r: 11, hit: 0 },
  { x: 58, y: 555, r: 11, hit: 0 },
  { x: 398, y: 205, r: 11, hit: 0 },
  { x: 398, y: 385, r: 11, hit: 0 },
  { x: 398, y: 515, r: 11, hit: 0 },
  { x: 102, y: 688, r: 10, hit: 0 },
  { x: 368, y: 688, r: 10, hit: 0 },
];

const topLanes = [
  { x: 78, y: 50, w: 68, h: 12, angle: -0.1, lit: false },
  { x: 162, y: 42, w: 68, h: 12, angle: 0.08, lit: false },
  { x: 250, y: 42, w: 68, h: 12, angle: -0.08, lit: false },
  { x: 336, y: 50, w: 64, h: 12, angle: 0.1, lit: false },
];

const walls = [
  { id: "left", x1: 28, y1: 790, x2: 28, y2: 118, kind: "wall" },
  { id: "left-top", x1: 28, y1: 118, x2: 88, y2: 28, kind: "wall" },
  { id: "top", x1: 88, y1: 28, x2: 412, y2: 28, kind: "wall" },
  { id: "right-top", x1: 412, y1: 28, x2: 472, y2: 112, kind: "wall" },
  { id: "lane-outer", x1: 472, y1: 112, x2: 472, y2: 838, kind: "lane" },
  { id: "left-out", x1: 28, y1: 790, x2: 132, y2: 712, kind: "wall" },
  { id: "right-out", x1: 422, y1: 790, x2: 340, y2: 712, kind: "wall" },
];

const laneWalls = [
  { id: "lane-left-low", x1: 428, y1: 838, x2: 428, y2: 575, kind: "lane" },
  { id: "lane-right", x1: 472, y1: 575, x2: 472, y2: 112, kind: "lane" },
  { id: "lane-floor", x1: 428, y1: 838, x2: 472, y2: 838, kind: "lane" },
];

const redGates = [
  { id: "red-l", x1: 92, y1: 430, x2: 92, y2: 498, kind: "red" },
  { id: "red-r", x1: 368, y1: 528, x2: 368, y2: 596, kind: "red" },
];

const slings = [
  {
    segs: [
      { id: "sl-a", x1: 42, y1: 718, x2: 128, y2: 728, kind: "sling" },
      { id: "sl-b", x1: 128, y1: 728, x2: 116, y2: 648, kind: "sling" },
      { id: "sl-c", x1: 116, y1: 648, x2: 42, y2: 718, kind: "sling" },
    ],
    kickx: 0.55,
    kicky: -0.84,
  },
  {
    segs: [
      { id: "sr-a", x1: 412, y1: 718, x2: 342, y2: 728, kind: "sling" },
      { id: "sr-b", x1: 342, y1: 728, x2: 354, y2: 648, kind: "sling" },
      { id: "sr-c", x1: 354, y1: 648, x2: 412, y2: 718, kind: "sling" },
    ],
    kickx: -0.55,
    kicky: -0.84,
  },
];

function ledPath() {
  const pts = [];
  for (let y = 780; y >= 120; y -= 16) pts.push({ x: 22, y });
  for (let t = 0; t <= 1; t += 0.08) pts.push({ x: 22 + (88 - 22) * t, y: 120 + (26 - 120) * t });
  for (let x = 88; x <= 412; x += 16) pts.push({ x, y: 22 });
  for (let t = 0; t <= 1; t += 0.08) pts.push({ x: 412 + (478 - 412) * t, y: 26 + (112 - 26) * t });
  for (let y = 112; y <= 830; y += 16) pts.push({ x: 478, y });
  return pts;
}

const LEDS = ledPath();

function makeFlipper(x, y, side) {
  const rest = side === "left" ? 0.38 : Math.PI - 0.38;
  const activeAngle = side === "left" ? -0.88 : Math.PI + 0.88;
  return { x, y, length: 84, side, rest, activeAngle, angle: rest, prev: rest, active: false };
}

class PinballGame {
  constructor(canvas, onHud) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No 2D context");
    this.ctx = ctx;
    this.onHud = onHud;
    this.raf = 0;
    this.acc = 0;
    this.last = 0;
    this.running = false;
    this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    this.dragon = new Image();
    this.dragon.crossOrigin = "anonymous";
    this.dragon.src = "playfield-dragon.jpg";

    this.ball = {
      x: 450,
      y: 800,
      prevX: 450,
      prevY: 800,
      vx: 0,
      vy: 0,
      r: 9,
      inPlay: false,
      launchPath: false,
      boosterLock: 0,
      flipperLock: 0,
    };

    this.left = makeFlipper(148, 755, "left");
    this.right = makeFlipper(342, 755, "right");

    this.kickers = [
      { x: 450, y: 605, r: 13, dirx: 0, diry: -1, power: 26, readyAt: 0, flash: 0, label: "1" },
      { x: 78, y: 448, r: 14, dirx: 0.72, diry: -0.7, power: 22, readyAt: 0, flash: 0, label: "2" },
    ];

    this.score = 0;
    this.balls = 3;
    this.record = loadRecord();
    this.multiplier = 1;
    this.combo = 0;
    this.comboTimer = 0;
    this.status = "TOCA PARA JUGAR";
    this.paused = false;
    this.gameOver = false;
    this.auto = false;
    this.speed = 1;
    this.started = false;
    this.plunger = 0;
    this.charging = false;
    this.nudges = 3;
    this.ability = null;
    this.abilityTimer = 0;
    this.abilityStep = 0;
    this.slowTimer = 0;
    this.superBounce = 0;
    this.ballSave = 0;
    this.trauma = 0;
    this.hitstop = 0;
    this.particles = [];
    this.floaters = [];
    this.leftHeld = false;
    this.rightHeld = false;
    this.time = 0;
    this.dpr = 1;

    this.resize();
    this.emit();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.dpr = dpr;
    this.canvas.width = Math.round(W * dpr);
    this.canvas.height = Math.round(H * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const loop = (now) => {
      if (!this.running) return;
      let dt = (now - this.last) / 1000;
      this.last = now;
      dt = Math.min(dt, 0.1);
      this.acc += dt;
      this.time = now / 1000;
      const steps = this.slowTimer > 0 ? Math.max(1, Math.ceil(this.speed * 0.45)) : this.speed;
      while (this.acc >= STEP) {
        for (let i = 0; i < steps; i++) this.fixed();
        this.acc -= STEP;
      }
      this.draw();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  beginPlay() {
    unlockAudio();
    this.started = true;
    if (!this.ball.inPlay && !this.gameOver) this.status = "ESPERANDO LANZAMIENTO";
    this.emit();
  }

  setLeft(v) {
    this.leftHeld = v;
    if (v && this.started) sfxPlay.flipper();
  }
  setRight(v) {
    this.rightHeld = v;
    if (v && this.started) sfxPlay.flipper();
  }

  beginCharge() {
    unlockAudio();
    this.started = true;
    if (this.gameOver) {
      this.restart();
      return;
    }
    if (this.ball.inPlay || this.charging || this.paused) return;
    this.charging = true;
    this.plunger = 0;
    this.status = "CARGANDO LANZADOR...";
    this.emit();
  }

  releaseCharge() {
    if (!this.charging || this.ball.inPlay) return;
    const force = clamp(9 + this.plunger * 22, 10, 34);
    this.ball.inPlay = true;
    this.ball.launchPath = true;
    this.ball.x = 450;
    this.ball.y = 790;
    this.ball.prevX = this.ball.x;
    this.ball.prevY = this.ball.y;
    this.ball.vx = 0;
    this.ball.vy = -force * 72;
    this.ballSave = 420;
    this.ball.boosterLock = 10;
    this.charging = false;
    this.plunger = 0;
    this.status = "EN VUELO";
    sfxPlay.launch();
    this.emit();
  }

  togglePause() {
    if (!this.started || this.gameOver) return;
    this.paused = !this.paused;
    this.status = this.paused ? "PAUSA" : "CONTINUAR";
    this.emit();
  }

  toggleAuto() {
    this.auto = !this.auto;
    this.status = this.auto ? "MODO AUTO" : "MODO MANUAL";
    this.emit();
  }

  cycleSpeed() {
    const vals = [1, 2, 3, 5];
    const i = vals.indexOf(this.speed);
    this.speed = vals[(i + 1) % vals.length];
    this.emit();
  }

  nudge() {
    if (!this.ball.inPlay || this.paused || this.nudges <= 0) return;
    this.nudges--;
    this.ball.vx += (Math.random() > 0.5 ? 1 : -1) * 180;
    this.ball.vy -= 80;
    this.trauma = Math.min(1, this.trauma + 0.35);
    this.status = this.nudges > 0 ? `EMPUJE (${this.nudges})` : "SIN EMPUJES";
    this.emit();
  }

  restart() {
    this.score = 0;
    this.balls = 3;
    this.gameOver = false;
    this.paused = false;
    this.multiplier = 1;
    this.combo = 0;
    this.comboTimer = 0;
    this.abilityStep = 0;
    this.ability = null;
    this.abilityTimer = 0;
    this.slowTimer = 0;
    this.superBounce = 0;
    this.nudges = 3;
    for (const b of bumpers) b.hit = 0;
    for (const l of topLanes) l.lit = false;
    for (const k of this.kickers) {
      k.readyAt = 0;
      k.flash = 0;
    }
    this.resetBall();
    this.status = "NUEVA PARTIDA";
    this.emit();
  }

  resetBall() {
    this.ball.x = 450;
    this.ball.y = 800;
    this.ball.prevX = 450;
    this.ball.prevY = 800;
    this.ball.vx = 0;
    this.ball.vy = 0;
    this.ball.inPlay = false;
    this.ball.launchPath = false;
    this.ball.boosterLock = 0;
    this.ball.flipperLock = 0;
    this.charging = false;
    this.plunger = 0;
    this.nudges = 3;
    this.status = this.gameOver ? "FIN DEL JUEGO" : "ESPERANDO LANZAMIENTO";
  }

  emit() {
    const state = {
      score: this.score,
      balls: this.balls,
      record: this.record,
      multiplier: this.multiplier,
      combo: this.combo,
      status: this.status,
      paused: this.paused,
      gameOver: this.gameOver,
      auto: this.auto,
      speed: this.speed,
      plunger: this.plunger,
      charging: this.charging,
      started: this.started,
      nudges: this.nudges,
      ability: this.abilityTimer > 0 ? this.ability : null,
      inPlay: this.ball.inPlay,
    };
    this.onHud(state);
    window.__pinball = state;
  }

  addScore(base, x, y, color = "#fff") {
    this.combo += 1;
    this.comboTimer = 180;
    const cm = Math.min(1 + this.combo * 0.1, 3);
    const gained = Math.round(base * this.multiplier * cm);
    this.score += gained;
    if (this.score > this.record) {
      this.record = this.score;
      saveRecord(this.record);
    }
    this.floaters.push({ x, y, text: `+${gained}`, life: 1, color });
    this.emit();
  }

  burst(x, y, color, n = 8) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 40 + Math.random() * 140;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0.45 + Math.random() * 0.3,
        color,
        r: 1.4 + Math.random() * 1.8,
      });
    }
  }

  autoPlay() {
    if (!this.auto) return;
    if (!this.ball.inPlay) {
      if (!this.charging) {
        this.charging = true;
        this.plunger = 1;
      } else if (this.plunger > 0.72) {
        this.releaseCharge();
      }
      return;
    }
    const px = this.ball.x + this.ball.vx * 0.18;
    const py = this.ball.y + this.ball.vy * 0.18;
    if (this.ball.y > 590 || py > 650) {
      this.left.active = px < W / 2;
      this.right.active = px >= W / 2;
    } else {
      this.left.active = this.ball.x < 215 && this.ball.y > 480;
      this.right.active = this.ball.x > 285 && this.ball.y > 480;
    }
  }

  fixed() {
    if (this.paused || this.gameOver || !this.started) {
      this.left.active = this.leftHeld;
      this.right.active = this.rightHeld;
      this.left.prev = this.left.angle;
      this.right.prev = this.right.angle;
      this.left.angle += ((this.left.active ? this.left.activeAngle : this.left.rest) - this.left.angle) * 0.4;
      this.right.angle += ((this.right.active ? this.right.activeAngle : this.right.rest) - this.right.angle) * 0.4;
      if (this.charging && !this.ball.inPlay) this.plunger = clamp(this.plunger + STEP * 1.15, 0, 1);
      return;
    }

    if (this.hitstop > 0) {
      this.hitstop--;
      return;
    }

    this.autoPlay();
    this.left.active = this.leftHeld || (this.auto && this.left.active);
    this.right.active = this.rightHeld || (this.auto && this.right.active);

    if (this.charging && !this.ball.inPlay) {
      this.plunger = clamp(this.plunger + STEP * 1.15, 0, 1);
    }

    this.left.prev = this.left.angle;
    this.right.prev = this.right.angle;
    this.left.angle += ((this.left.active ? this.left.activeAngle : this.left.rest) - this.left.angle) * 0.4;
    this.right.angle += ((this.right.active ? this.right.activeAngle : this.right.rest) - this.right.angle) * 0.4;

    if (this.ball.inPlay) this.integrate();

    if (this.ballSave > 0) this.ballSave--;
    if (this.comboTimer > 0) this.comboTimer--;
    else this.combo = 0;
    if (this.abilityTimer > 0) this.abilityTimer--;
    else this.ability = null;
    if (this.slowTimer > 0) this.slowTimer--;
    if (this.superBounce > 0) this.superBounce--;
    if (this.ball.boosterLock > 0) this.ball.boosterLock--;
    if (this.ball.flipperLock > 0) this.ball.flipperLock--;
    this.trauma = Math.max(0, this.trauma - STEP * 1.8);
    for (const b of bumpers) if (b.hit > 0) b.hit--;
    for (const p of posts) if (p.hit > 0) p.hit--;
    for (const k of this.kickers) if (k.flash > 0) k.flash--;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= STEP * 1.6;
      p.x += p.vx * STEP;
      p.y += p.vy * STEP;
      p.vy += 420 * STEP;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i];
      f.life -= STEP * 1.2;
      f.y -= 28 * STEP;
      if (f.life <= 0) this.floaters.splice(i, 1);
    }
  }

  integrate() {
    const b = this.ball;
    if (b.x > 428 && b.x < 472 && b.y > 112 && b.y < 575) {
      b.vx *= 0.72;
      if (b.launchPath) b.vx *= 0.4;
    }

    b.vy += 1280 * STEP;
    b.vx *= 0.998;
    b.vy *= 0.998;

    const spd = Math.hypot(b.vx, b.vy);
    if (spd > MAX_SPEED) {
      b.vx *= MAX_SPEED / spd;
      b.vy *= MAX_SPEED / spd;
    }

    const micros = clamp(Math.ceil((Math.hypot(b.vx, b.vy) * STEP) / 2.2), 1, 12);
    const sdt = STEP / micros;
    for (let m = 0; m < micros; m++) {
      if (!b.inPlay) break;
      b.prevX = b.x;
      b.prevY = b.y;
      b.x += b.vx * sdt;
      b.y += b.vy * sdt;
      this.collideAll();
      this.bounds();
    }
  }

  collideAll() {
    this.collideSegs(walls, "wall");
    this.collideSegs(laneWalls, "lane");
    this.collideSegs(redGates, "red");
    for (const sl of slings) this.collideSegs(sl.segs, "sling", sl.kickx, sl.kicky);
    this.collideTopSolid();
    this.collideCircles();
    this.collideKickers();
    this.collideTopTrigger();
    this.collideFlip(this.left);
    this.collideFlip(this.right);
  }

  collideSegs(segs, kind, kickx = 0, kicky = 0) {
    const b = this.ball;
    for (let pass = 0; pass < 2; pass++) {
      for (const s of segs) {
        const abx = s.x2 - s.x1;
        const aby = s.y2 - s.y1;
        const ab2 = abx * abx + aby * aby;
        if (ab2 < 1e-6) continue;
        let t = ((b.x - s.x1) * abx + (b.y - s.y1) * aby) / ab2;
        t = clamp(t, 0, 1);
        const px = s.x1 + abx * t;
        const py = s.y1 + aby * t;
        let dx = b.x - px;
        let dy = b.y - py;
        let d = Math.hypot(dx, dy);
        const rad = b.r + (kind === "sling" ? 3 : 3.5);
        if (d > rad) continue;
        if (d < 1e-4) {
          const len = Math.hypot(abx, aby);
          dx = -aby / len;
          dy = abx / len;
          d = 1e-4;
        } else {
          dx /= d;
          dy /= d;
        }
        const pen = rad - d;
        b.x += dx * (pen + 0.8);
        b.y += dy * (pen + 0.8);
        let vin = b.vx * dx + b.vy * dy;
        if (vin < -8) {
          let bounce = kind === "topLane" ? 1.18 : kind === "red" ? 1.12 : 1.14;
          if (this.superBounce > 0) bounce += 0.16;
          b.vx -= 2 * vin * dx;
          b.vy -= 2 * vin * dy;
          b.vx *= bounce;
          b.vy *= bounce;
          if (kind === "sling") {
            b.vx += kickx * 920;
            b.vy += kicky * 920;
            this.addScore(25, b.x, b.y, MAGENTA);
            this.burst(b.x, b.y, MAGENTA, 6);
            sfxPlay.sling();
            this.trauma = Math.min(1, this.trauma + 0.18);
          }
          if (kind === "red") {
            this.addScore(50, b.x, b.y, "#ff3b5f");
          }
        }
        vin = b.vx * dx + b.vy * dy;
        if (vin < 0) {
          b.vx -= vin * dx;
          b.vy -= vin * dy;
        }
        const speed = Math.hypot(b.vx, b.vy);
        if (speed < 90) {
          const tx = -dy;
          const ty = dx;
          b.vx += dx * 40 + tx * 20;
          b.vy += dy * 40 + ty * 20;
        }
        const cap = Math.hypot(b.vx, b.vy);
        if (cap > MAX_SPEED) {
          b.vx *= MAX_SPEED / cap;
          b.vy *= MAX_SPEED / cap;
        }
      }
    }
  }

  collideTopSolid() {
    for (const lane of topLanes) {
      const cx = lane.x + lane.w / 2;
      const cy = lane.y + lane.h / 2;
      const hw = lane.w / 2;
      const hh = lane.h / 2;
      const c = Math.cos(lane.angle);
      const s = Math.sin(lane.angle);
      const rot = (x, y) => ({ x: cx + x * c - y * s, y: cy + x * s + y * c });
      const p1 = rot(-hw, -hh);
      const p2 = rot(hw, -hh);
      const p3 = rot(hw, hh);
      const p4 = rot(-hw, hh);
      this.collideSegs(
        [
          { id: "t1", x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, kind: "topLane" },
          { id: "t2", x1: p2.x, y1: p2.y, x2: p3.x, y2: p3.y, kind: "topLane" },
          { id: "t3", x1: p3.x, y1: p3.y, x2: p4.x, y2: p4.y, kind: "topLane" },
          { id: "t4", x1: p4.x, y1: p4.y, x2: p1.x, y2: p1.y, kind: "topLane" },
        ],
        "topLane",
      );
    }
  }

  collideCircles() {
    const b = this.ball;
    for (const bump of bumpers) {
      const dx = b.x - bump.x;
      const dy = b.y - bump.y;
      const d = Math.hypot(dx, dy);
      const min = b.r + bump.r;
      if (d >= min) continue;
      const nx = dx / (d || 1);
      const ny = dy / (d || 1);
      b.x = bump.x + nx * (min + 2);
      b.y = bump.y + ny * (min + 2);
      let power = bump.type === "normal" ? 560 : 720;
      if (this.superBounce > 0) power += 180;
      b.vx = nx * power;
      b.vy = ny * power;
      if (bump.hit === 0) {
        bump.hit = 10;
        this.addScore(bump.points, bump.x, bump.y, bump.color);
        this.burst(bump.x, bump.y, bump.color, 10);
        this.trauma = Math.min(1, this.trauma + 0.22);
        this.hitstop = this.reduced ? 0 : 2;
        if (bump.type === "normal") sfxPlay.bumper();
        else {
          sfxPlay.special();
          this.triggerAbility(bump.type);
        }
      }
    }
    for (const p of posts) {
      const dx = b.x - p.x;
      const dy = b.y - p.y;
      const d = Math.hypot(dx, dy);
      const min = b.r + p.r;
      if (d >= min) continue;
      const nx = dx / (d || 1);
      const ny = dy / (d || 1);
      b.x = p.x + nx * (min + 1.5);
      b.y = p.y + ny * (min + 1.5);
      b.vx = nx * 480;
      b.vy = ny * 480;
      if (p.hit === 0) {
        p.hit = 8;
        this.addScore(40, p.x, p.y, LIME);
        sfxPlay.bumper();
      }
    }
  }

  collideKickers() {
    const b = this.ball;
    if (!b.inPlay || b.boosterLock > 0) return;
    const now = performance.now();
    for (const k of this.kickers) {
      if (now < k.readyAt) continue;
      const d = Math.hypot(b.x - k.x, b.y - k.y);
      if (d > b.r + k.r) continue;
      b.x = k.x + k.dirx * (k.r + b.r + 4);
      b.y = k.y + k.diry * (k.r + b.r + 4);
      b.vx = k.dirx * k.power * 58;
      b.vy = k.diry * k.power * 58;
      if (k.label === "1") b.launchPath = true;
      k.readyAt = now + 15000;
      k.flash = 18;
      b.boosterLock = 16;
      this.addScore(100, k.x, k.y, LIME);
      this.burst(k.x, k.y, LIME, 12);
      this.status = `PROPULSOR ${k.label}`;
      sfxPlay.kicker();
      this.emit();
    }
  }

  collideTopTrigger() {
    const b = this.ball;
    for (const lane of topLanes) {
      if (
        b.x > lane.x - 6 &&
        b.x < lane.x + lane.w + 6 &&
        b.y > lane.y - 10 &&
        b.y < lane.y + lane.h + 10
      ) {
        if (!lane.lit) {
          lane.lit = true;
          this.addScore(150, lane.x + lane.w / 2, lane.y, AMBER);
          sfxPlay.rollover();
          if (topLanes.every((l) => l.lit)) {
            topLanes.forEach((l) => (l.lit = false));
            this.multiplier = Math.min(this.multiplier + 1, 5);
            this.score += 300;
            if (this.balls < 5) this.balls += 1;
            this.status = `MULTIPLICADOR x${this.multiplier}`;
            sfxPlay.extra();
            this.emit();
          }
        }
      }
    }
  }

  collideFlip(f) {
    const b = this.ball;
    const ex = f.x + Math.cos(f.angle) * f.length;
    const ey = f.y + Math.sin(f.angle) * f.length;
    const abx = ex - f.x;
    const aby = ey - f.y;
    const ab2 = abx * abx + aby * aby;
    let t = ((b.x - f.x) * abx + (b.y - f.y) * aby) / ab2;
    t = clamp(t, 0, 1);
    const px = f.x + abx * t;
    const py = f.y + aby * t;
    const dx = b.x - px;
    const dy = b.y - py;
    const d = Math.hypot(dx, dy);
    if (d >= b.r + 9) return;
    const nx = dx / (d || 1);
    const ny = dy / (d || 1);
    b.x = px + nx * (b.r + 10);
    b.y = py + ny * (b.r + 10);
    const omega = (f.angle - f.prev) / STEP;
    const rx = b.x - f.x;
    const ry = b.y - f.y;
    const tvx = -ry * omega;
    const tvy = rx * omega;
    if (f.active && b.flipperLock <= 0) {
      const power = 980 + Math.abs(omega) * 22;
      const tx = W / 2 - b.x;
      const ty = H * 0.42 - b.y;
      const len = Math.hypot(tx, ty) || 1;
      b.vx = (tx / len) * power + tvx * 0.35;
      b.vy = (ty / len) * power + tvy * 0.35;
      if (b.vy > -220) b.vy = -Math.abs(b.vy) - 280;
      b.flipperLock = 6;
      this.addScore(20, b.x, b.y, MAGENTA);
      this.burst(b.x, b.y, MAGENTA, 5);
    } else {
      const vin = b.vx * nx + b.vy * ny;
      if (vin < 0) {
        b.vx -= 1.6 * vin * nx;
        b.vy -= 1.6 * vin * ny;
      }
    }
  }

  triggerAbility(type) {
    const seq = ["x", "s", "bolt"];
    if (type !== seq[this.abilityStep]) return;
    this.abilityStep++;
    if (this.abilityStep < seq.length) return;
    this.abilityStep = 0;
    const names = ["SUPER REBOTE", "TIEMPO LENTO", "MULTIBOLA"];
    const name = names[Math.floor(Math.random() * names.length)];
    this.ability = name;
    this.abilityTimer = 240;
    if (name === "SUPER REBOTE") this.superBounce = 600;
    if (name === "TIEMPO LENTO") this.slowTimer = 600;
    if (name === "MULTIBOLA") {
      this.score += 500;
      if (this.score > this.record) {
        this.record = this.score;
        saveRecord(this.record);
      }
    }
    this.status = name;
    sfxPlay.ability();
    this.emit();
  }

  bounds() {
    const b = this.ball;
    if (b.x < 30) {
      b.x = 30;
      if (b.vx < 0) b.vx = Math.abs(b.vx) * 1.1;
    }
    if (b.x > W - 12) {
      if (!(b.launchPath && b.y < 575)) {
        b.x = W - 12;
        if (b.vx > 0) b.vx = -Math.abs(b.vx) * 1.08;
      }
    }
    if (b.y < 40 && b.launchPath) {
      b.launchPath = false;
      b.vy = 40;
      b.vx = -80;
      this.status = "SALIDA COMPLETADA";
    }
    if (b.y > H + 28) {
      if (this.ballSave > 0) {
        this.resetBall();
        this.status = "BOLA SALVADA";
        this.emit();
      } else {
        this.balls--;
        sfxPlay.drain();
        if (this.balls <= 0) {
          this.gameOver = true;
          if (this.score > this.record) {
            this.record = this.score;
            saveRecord(this.record);
          }
          this.resetBall();
          this.status = "FIN DEL JUEGO";
        } else {
          this.resetBall();
          this.status = "NUEVA BOLA";
        }
        this.emit();
      }
    }
  }

  glow(ctx, color, blur) {
    if (this.reduced) {
      ctx.shadowBlur = 0;
      return;
    }
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
  }

  draw() {
    const ctx = this.ctx;
    const shake = this.reduced ? 0 : this.trauma * this.trauma;
    const ox = (Math.random() * 2 - 1) * 10 * shake;
    const oy = (Math.random() * 2 - 1) * 10 * shake;
    ctx.save();
    ctx.translate(ox, oy);

    ctx.fillStyle = "#12141c";
    ctx.fillRect(0, 0, W, H);

    this.drawMetal();
    this.drawPlayfield();
    this.drawLeds();
    this.drawTopLanes();
    this.drawWalls();
    this.drawSlings();
    this.drawBumpers();
    this.drawPosts();
    this.drawKickers();
    this.drawLauncher();
    this.drawFlipper(this.left);
    this.drawFlipper(this.right);
    this.drawBall();
    this.drawParticles();
    this.drawFloaters();
    this.drawAbility();
    if (this.paused) this.overlay("PAUSA");
    if (this.gameOver) this.overlay("FIN DEL JUEGO", "ESPACIO PARA REINICIAR");

    ctx.restore();
  }

  drawMetal() {
    const ctx = this.ctx;
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, "#2a2d38");
    g.addColorStop(0.5, "#1a1c24");
    g.addColorStop(1, "#2a2d38");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#0b0a14";
    ctx.beginPath();
    ctx.roundRect(14, 14, W - 28, H - 28, 18);
    ctx.fill();
    ctx.strokeStyle = "rgba(180,190,210,.35)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#9aa3b5";
    const rivets = [
      [22, 22],
      [W - 22, 22],
      [22, H - 22],
      [W - 22, H - 22],
      [W / 2, 18],
      [18, H / 2],
      [W - 18, H / 2],
    ];
    for (const [x, y] of rivets) {
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawPlayfield() {
    const ctx = this.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(18, 18, W - 36, H - 36, 14);
    ctx.clip();
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#09051b");
    bg.addColorStop(1, "#03020b");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    if (this.dragon && this.dragon.complete && this.dragon.naturalWidth) {
      ctx.globalAlpha = 0.2;
      ctx.drawImage(this.dragon, 28, 36, W - 100, H - 70);
      ctx.globalAlpha = 1;
      const vg = ctx.createRadialGradient(W * 0.45, H * 0.42, 30, W * 0.45, H * 0.42, 360);
      vg.addColorStop(0, "rgba(5,3,13,0.08)");
      vg.addColorStop(1, "rgba(5,3,13,0.5)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);
    } else {
      ctx.strokeStyle = "rgba(255,79,216,.12)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(250, 80);
      ctx.bezierCurveTo(160, 220, 340, 360, 250, 520);
      ctx.bezierCurveTo(180, 640, 300, 720, 250, 800);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(0,240,252,.035)";
    ctx.fillRect(428, 112, 44, 720);
    ctx.restore();
    ctx.save();
    this.glow(ctx, CYAN, 12);
    ctx.strokeStyle = CYAN;
    ctx.lineWidth = 2.4;
    ctx.strokeRect(16, 16, W - 32, H - 32);
    ctx.restore();
  }

  drawLeds() {
    const ctx = this.ctx;
    const t = this.time;
    for (let i = 0; i < LEDS.length; i++) {
      const p = LEDS[i];
      const hue = (i * 14 + t * 90) % 360;
      ctx.fillStyle = `hsl(${hue} 100% 58%)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawWalls() {
    const ctx = this.ctx;
    ctx.save();
    this.glow(ctx, CYAN, 10);
    ctx.strokeStyle = CYAN;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    for (const s of walls) {
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(0,240,252,.35)";
    ctx.lineWidth = 3;
    for (const s of laneWalls) {
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
      ctx.stroke();
    }
    ctx.strokeStyle = "#ff3b5f";
    this.glow(ctx, "#ff3b5f", 10);
    ctx.lineWidth = 5;
    for (const s of redGates) {
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawSlings() {
    const ctx = this.ctx;
    for (const sl of slings) {
      ctx.save();
      this.glow(ctx, MAGENTA, 14);
      ctx.fillStyle = "rgba(255,79,216,.18)";
      ctx.strokeStyle = MAGENTA;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(sl.segs[0].x1, sl.segs[0].y1);
      for (const s of sl.segs) ctx.lineTo(s.x2, s.y2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  drawTopLanes() {
    const ctx = this.ctx;
    for (const lane of topLanes) {
      ctx.save();
      ctx.translate(lane.x + lane.w / 2, lane.y + lane.h / 2);
      ctx.rotate(lane.angle);
      this.glow(ctx, lane.lit ? AMBER : VIOLET, lane.lit ? 16 : 6);
      ctx.fillStyle = lane.lit ? AMBER : "#15102b";
      ctx.strokeStyle = lane.lit ? AMBER : VIOLET;
      ctx.lineWidth = 2;
      ctx.fillRect(-lane.w / 2, -lane.h / 2, lane.w, lane.h);
      ctx.strokeRect(-lane.w / 2, -lane.h / 2, lane.w, lane.h);
      ctx.restore();
    }
  }

  drawBumpers() {
    const ctx = this.ctx;
    for (const b of bumpers) {
      ctx.save();
      const hit = b.hit > 0;
      this.glow(ctx, b.color, hit ? 28 : 14);
      ctx.strokeStyle = hit ? "#fff" : b.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(10,5,30,.88)";
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r - 5, 0, Math.PI * 2);
      ctx.fill();
      this.glow(ctx, b.core, 12);
      ctx.fillStyle = b.core;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 7, 0, Math.PI * 2);
      ctx.fill();
      if (b.type !== "normal") {
        ctx.fillStyle = "#fff";
        ctx.font = "bold 14px ui-monospace, Courier New, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowBlur = 0;
        if (b.type === "bolt") {
          ctx.beginPath();
          ctx.moveTo(b.x + 1, b.y - 8);
          ctx.lineTo(b.x - 4, b.y + 1);
          ctx.lineTo(b.x + 1, b.y + 1);
          ctx.lineTo(b.x - 1, b.y + 8);
          ctx.lineTo(b.x + 4, b.y - 1);
          ctx.lineTo(b.x - 1, b.y - 1);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillText(b.type === "x" ? "X" : "S", b.x, b.y + 0.5);
        }
      }
      ctx.restore();
    }
  }

  drawPosts() {
    const ctx = this.ctx;
    for (const p of posts) {
      ctx.save();
      this.glow(ctx, LIME, p.hit ? 16 : 8);
      ctx.strokeStyle = p.hit ? "#fff" : LIME;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(8,30,20,.85)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r - 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawKickers() {
    const ctx = this.ctx;
    const now = performance.now();
    for (const k of this.kickers) {
      const ready = now >= k.readyAt;
      const color = k.flash > 0 ? "#fff" : ready ? LIME : "#5b5870";
      ctx.save();
      this.glow(ctx, color, k.flash > 0 ? 28 : ready ? 16 : 4);
      ctx.fillStyle = ready ? "#071b19" : "#11101a";
      ctx.beginPath();
      ctx.arc(k.x, k.y, k.r + 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(k.x + k.dirx * 9, k.y + k.diry * 9);
      ctx.lineTo(k.x - k.dirx * 5 - k.diry * 6, k.y - k.diry * 5 + k.dirx * 6);
      ctx.lineTo(k.x - k.dirx * 5 + k.diry * 6, k.y - k.diry * 5 - k.dirx * 6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = ready ? LIME : "#aaa5bd";
      ctx.font = "bold 8px ui-monospace, Courier New, monospace";
      ctx.textAlign = "center";
      ctx.shadowBlur = 0;
      ctx.fillText(ready ? "LISTO" : `${Math.ceil((k.readyAt - now) / 1000)}s`, k.x, k.y + 22);
      ctx.restore();
    }
  }

  drawLauncher() {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = "rgba(0,240,252,.4)";
    ctx.lineWidth = 2;
    ctx.strokeRect(428, 748, 44, 88);
    ctx.fillStyle = "rgba(0,240,252,.1)";
    ctx.fillRect(428, 748, 44, 88);
    ctx.fillStyle = "#7ef2ff";
    ctx.font = "7px ui-monospace, Courier New, monospace";
    ctx.textAlign = "center";
    ctx.fillText("LANZADOR", 450, 762);
    const y = 820 - this.plunger * 48;
    ctx.fillStyle = "#cfd6e4";
    ctx.beginPath();
    ctx.roundRect(438, y, 24, 12, 2);
    ctx.fill();
    ctx.fillStyle = this.plunger > 0.85 ? "#ff3b3b" : this.plunger > 0.55 ? AMBER : LIME;
    ctx.fillRect(434, 830, 32 * this.plunger, 5);
    ctx.restore();
  }

  drawFlipper(f) {
    const ctx = this.ctx;
    const ex = f.x + Math.cos(f.angle) * f.length;
    const ey = f.y + Math.sin(f.angle) * f.length;
    const ang = f.angle;
    const px = -Math.sin(ang);
    const py = Math.cos(ang);
    ctx.save();
    this.glow(ctx, MAGENTA, 18);
    ctx.fillStyle = MAGENTA;
    ctx.strokeStyle = "#ffd7fa";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(f.x + px * 11, f.y + py * 11);
    ctx.lineTo(ex + px * 4, ey + py * 4);
    ctx.lineTo(ex + Math.cos(ang) * 8, ey + Math.sin(ang) * 8);
    ctx.lineTo(ex - px * 4, ey - py * 4);
    const mid = 0.42;
    const mx = f.x + Math.cos(ang) * f.length * mid;
    const my = f.y + Math.sin(ang) * f.length * mid;
    ctx.lineTo(mx - px * 16, my - py * 16);
    ctx.lineTo(f.x - px * 11, f.y - py * 11);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.stroke();
    this.glow(ctx, CYAN, 10);
    ctx.fillStyle = CYAN;
    ctx.beginPath();
    ctx.arc(f.x, f.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawBall() {
    const ctx = this.ctx;
    const b = this.ball;
    ctx.save();
    this.glow(ctx, "#fff", 16);
    const g = ctx.createRadialGradient(b.x - 3, b.y - 3, 1, b.x, b.y, b.r);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.45, "#dce4f0");
    g.addColorStop(1, "#8a93a6");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.85)";
    ctx.beginPath();
    ctx.arc(b.x - 3, b.y - 3.5, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawParticles() {
    const ctx = this.ctx;
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawFloaters() {
    const ctx = this.ctx;
    ctx.font = "bold 11px ui-monospace, Courier New, monospace";
    ctx.textAlign = "center";
    for (const f of this.floaters) {
      ctx.globalAlpha = Math.max(0, f.life);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }

  drawAbility() {
    if (this.abilityTimer <= 0 || !this.ability) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = "rgba(10,5,30,.88)";
    ctx.strokeStyle = MAGENTA;
    ctx.lineWidth = 2;
    ctx.fillRect(110, 360, 260, 52);
    ctx.strokeRect(110, 360, 260, 52);
    this.glow(ctx, MAGENTA, 12);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 16px ui-monospace, Courier New, monospace";
    ctx.textAlign = "center";
    ctx.fillText(this.ability, 240, 392);
    ctx.restore();
  }

  overlay(title, sub) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,.62)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = MAGENTA;
    ctx.font = "bold 28px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(title, W / 2, H / 2 - 8);
    if (sub) {
      ctx.fillStyle = "#fff";
      ctx.font = "14px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText(sub, W / 2, H / 2 + 24);
    }
    ctx.restore();
  }
}

/* ===================== UI WIRING ===================== */

document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("table");
  const startGate = document.getElementById("start-gate");

  const elBalls = document.getElementById("stat-balls");
  const elScore = document.getElementById("stat-score");
  const elRecord = document.getElementById("stat-record");
  const elMult = document.getElementById("stat-mult");
  const elCombo = document.getElementById("stat-combo");
  const elStatus = document.getElementById("hud-status");

  const btnLeft = document.getElementById("btn-left");
  const btnRight = document.getElementById("btn-right");
  const btnLaunch = document.getElementById("btn-launch");
  const btnPause = document.getElementById("btn-pause");
  const btnAuto = document.getElementById("btn-auto");
  const btnSpeed = document.getElementById("btn-speed");
  const btnNudge = document.getElementById("btn-nudge");
  const btnMute = document.getElementById("btn-mute");

  function renderHud(hud) {
    elBalls.textContent = String(hud.balls);
    elScore.textContent = hud.score.toLocaleString("es");
    elRecord.textContent = `Récord ${hud.record.toLocaleString("es")}`;
    elMult.textContent = `x${hud.multiplier}`;
    elCombo.textContent = String(hud.combo);
    elStatus.textContent = hud.status;

    startGate.classList.toggle("hidden", hud.started);

    btnLaunch.classList.toggle("charging", hud.charging);
    btnLaunch.style.setProperty("--charge", `${Math.round(hud.plunger * 100)}%`);
    btnLaunch.textContent = hud.gameOver
      ? "Reiniciar"
      : hud.charging
        ? `${Math.round(hud.plunger * 100)}%`
        : "Lanzar";

    btnPause.textContent = hud.paused ? "Seguir" : "Pausa";
    btnAuto.classList.toggle("on", hud.auto);
    btnSpeed.textContent = `x${hud.speed}`;
    btnNudge.textContent = `Empujar ${hud.nudges}`;
    btnNudge.disabled = hud.nudges <= 0;
  }

  const game = new PinballGame(canvas, renderHud);
  game.start();

  window.addEventListener("resize", () => game.resize());

  function hold(el, start, end) {
    el.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      start();
    });
    el.addEventListener("pointerup", (e) => {
      e.preventDefault();
      end();
    });
    el.addEventListener("pointercancel", () => end());
  }

  hold(
    btnLeft,
    () => game.setLeft(true),
    () => game.setLeft(false),
  );
  hold(
    btnRight,
    () => game.setRight(true),
    () => game.setRight(false),
  );
  hold(
    btnLaunch,
    () => game.beginCharge(),
    () => game.releaseCharge(),
  );

  startGate.addEventListener("click", () => {
    unlockAudio();
    game.beginPlay();
  });

  btnPause.addEventListener("click", () => game.togglePause());
  btnAuto.addEventListener("click", () => game.toggleAuto());
  btnSpeed.addEventListener("click", () => game.cycleSpeed());
  btnNudge.addEventListener("click", () => game.nudge());
  btnMute.addEventListener("click", () => {
    const next = !isMuted();
    setMuted(next);
    btnMute.textContent = next ? "Sonido" : "Silencio";
  });

  let gameOverPrev = false;
  const origEmit = game.emit.bind(game);
  game.emit = () => {
    origEmit();
    gameOverPrev = game.gameOver;
  };

  window.addEventListener("keydown", (e) => {
    if (["Space", "ArrowLeft", "ArrowRight", "KeyZ", "Slash", "KeyA", "KeyD"].includes(e.code)) {
      e.preventDefault();
    }
    if (e.repeat) return;
    if (e.code === "ArrowLeft" || e.code === "KeyZ" || e.code === "KeyA") game.setLeft(true);
    if (e.code === "ArrowRight" || e.code === "Slash" || e.code === "KeyD") game.setRight(true);
    if (e.code === "Space") game.beginCharge();
    if (e.code === "KeyP" || e.code === "Escape") game.togglePause();
    if (e.code === "KeyM") game.toggleAuto();
    if (e.code === "KeyN") game.nudge();
    if (e.code === "Enter") {
      unlockAudio();
      game.beginPlay();
      if (gameOverPrev) game.restart();
    }
  });

  window.addEventListener("keyup", (e) => {
    if (e.code === "ArrowLeft" || e.code === "KeyZ" || e.code === "KeyA") game.setLeft(false);
    if (e.code === "ArrowRight" || e.code === "Slash" || e.code === "KeyD") game.setRight(false);
    if (e.code === "Space") game.releaseCharge();
  });

  window.addEventListener("blur", () => {
    game.setLeft(false);
    game.setRight(false);
  });
});
