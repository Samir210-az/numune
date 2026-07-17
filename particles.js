/* ===========================================================
   Constellation particle system
   Tiny triangular glyphs forming an organic "brain" cloud in the
   hero, plus lighter ambient/orbit/cloud fields elsewhere.
   =========================================================== */

(function () {
  "use strict";

  var PALETTE = [
    "#8052ff", // electric iris
    "#ffb829", // saffron spark
    "#15846e", // deep verdant
    "#b98cff", // soft violet
    "#5ad1c4", // soft teal
    "#ff8fd1", // magenta
    "#6ea8ff", // blue
  ];

  var REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function rand(min, max) { return min + Math.random() * (max - min); }
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }

  function setupCanvas(canvas) {
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      var rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      canvas.style.width = rect.width + "px";
      canvas.style.height = rect.height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { w: rect.width, h: rect.height };
    }

    return { ctx: ctx, resize: resize };
  }

  function drawTriangle(ctx, x, y, size, rotation, color, opacity) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.beginPath();
    for (var i = 0; i < 3; i++) {
      var a = (Math.PI * 2 * i) / 3 - Math.PI / 2;
      var px = Math.cos(a) * size;
      var py = Math.sin(a) * size;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  }

  /* ---- shape helpers for the brain silhouette ---- */
  function lobeInside(x, y, cx, cy, rx, ry, freq, amp, seed) {
    var dx = x - cx, dy = y - cy;
    var angle = Math.atan2(dy, dx);
    var wobble = 1 + amp * Math.sin(angle * freq + seed) * Math.cos(angle * freq * 0.5 + seed * 2);
    var nx = dx / (rx * wobble);
    var ny = dy / (ry * wobble);
    return nx * nx + ny * ny < 1;
  }

  function brainMask(x, y, cx, cy, w, h) {
    var rx = w * 0.29, ry = h * 0.42;
    var off = w * 0.27;
    return (
      lobeInside(x, y, cx - off, cy - h * 0.03, rx, ry, 5, 0.22, 1.3) ||
      lobeInside(x, y, cx + off, cy - h * 0.03, rx, ry, 5, 0.22, 4.1) ||
      lobeInside(x, y, cx, cy + h * 0.36, w * 0.16, h * 0.14, 4, 0.3, 2.2)
    );
  }

  function cloudMask(x, y, cx, cy, w, h) {
    return lobeInside(x, y, cx, cy, w * 0.46, h * 0.46, 6, 0.35, 0.7);
  }

  /* ---- particle field engine ---- */
  function ParticleField(canvas, opts) {
    var self = this;
    this.canvas = canvas;
    this.opts = opts;
    var setup = setupCanvas(canvas);
    this.ctx = setup.ctx;
    this.resizeFn = setup.resize;
    this.dims = { w: 0, h: 0 };
    this.particles = [];
    this.visible = true;
    this.time = 0;

    this.build();

    if ("IntersectionObserver" in window) {
      this.io = new IntersectionObserver(function (entries) {
        self.visible = entries[0].isIntersecting;
      }, { threshold: 0 });
      this.io.observe(canvas);
    }

    window.addEventListener("resize", debounce(function () { self.build(); }, 200));
  }

  function debounce(fn, wait) {
    var t;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, wait);
    };
  }

  ParticleField.prototype.build = function () {
    this.dims = this.resizeFn();
    var w = this.dims.w, h = this.dims.h;
    var cx = w / 2, cy = h / 2;
    var mode = this.opts.mode;
    var count = this.opts.count;
    var particles = [];
    var maxAttempts = count * 60;
    var attempts = 0;

    while (particles.length < count && attempts < maxAttempts) {
      attempts++;
      var x, y, inside;
      if (mode === "field") {
        x = rand(0, w);
        y = rand(0, h);
        inside = true;
      } else if (mode === "orbit") {
        var ringR = rand(Math.min(w, h) * 0.18, Math.min(w, h) * 0.46);
        var ringA = rand(0, Math.PI * 2);
        x = cx + Math.cos(ringA) * ringR;
        y = cy + Math.sin(ringA) * ringR * 0.72;
        inside = true;
      } else if (mode === "cloud") {
        x = rand(0, w);
        y = rand(0, h);
        inside = cloudMask(x, y, cx, cy, w, h);
      } else {
        x = rand(w * 0.08, w * 0.92);
        y = rand(h * 0.1, h * 0.95);
        inside = brainMask(x, y, cx, cy, w, h);
      }
      if (!inside) continue;

      particles.push({
        baseX: x,
        baseY: y,
        x: x,
        y: y,
        size: rand(2.4, 6.2),
        color: pick(PALETTE),
        rotation: rand(0, Math.PI * 2),
        rotSpeed: rand(-0.25, 0.25),
        driftX: rand(6, 18),
        driftY: rand(6, 18),
        speed: rand(0.15, 0.45),
        phase: rand(0, Math.PI * 2),
        flicker: rand(0.4, 1.4),
        orbitR: mode === "orbit" ? Math.hypot(x - cx, (y - cy) / 0.72) : 0,
        orbitA: mode === "orbit" ? Math.atan2((y - cy) / 0.72, x - cx) : 0,
        orbitSpeed: mode === "orbit" ? rand(0.05, 0.18) * (Math.random() < 0.5 ? -1 : 1) : 0,
      });
    }

    this.particles = particles;
    this.cx = cx;
    this.cy = cy;
  };

  ParticleField.prototype.tick = function (dt) {
    if (!this.visible) return;
    this.time += dt;
    var ctx = this.ctx;
    var w = this.dims.w, h = this.dims.h;
    ctx.clearRect(0, 0, w, h);

    var mode = this.opts.mode;
    var t = this.time;

    for (var i = 0; i < this.particles.length; i++) {
      var p = this.particles[i];

      if (mode === "orbit") {
        var a = p.orbitA + t * p.orbitSpeed;
        p.x = this.cx + Math.cos(a) * p.orbitR;
        p.y = this.cy + Math.sin(a) * p.orbitR * 0.72;
      } else {
        p.x = p.baseX + Math.sin(t * p.speed + p.phase) * p.driftX;
        p.y = p.baseY + Math.cos(t * p.speed * 0.8 + p.phase) * p.driftY;
      }

      var opacity = REDUCED_MOTION
        ? 0.65
        : 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(t * p.flicker + p.phase));

      var rotation = REDUCED_MOTION ? p.rotation : p.rotation + t * p.rotSpeed;

      drawTriangle(ctx, p.x, p.y, p.size, rotation, p.color, opacity * (this.opts.opacity || 1));
    }
  };

  /* ---- animation loop ---- */
  var fields = [];
  var lastTime = performance.now();

  function loop(now) {
    var dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    if (!document.hidden) {
      for (var i = 0; i < fields.length; i++) fields[i].tick(dt);
    }
    requestAnimationFrame(loop);
  }

  function init() {
    var heroCanvas = document.getElementById("hero-canvas");
    if (heroCanvas) {
      fields.push(new ParticleField(heroCanvas, { mode: "brain", count: REDUCED_MOTION ? 260 : 520 }));
    }

    var bgCanvas = document.getElementById("bg-canvas");
    if (bgCanvas) {
      fields.push(new ParticleField(bgCanvas, { mode: "field", count: REDUCED_MOTION ? 40 : 90, opacity: 0.45 }));
    }

    var minis = document.querySelectorAll(".mini-canvas");
    minis.forEach(function (el) {
      var variant = el.getAttribute("data-variant") || "cloud";
      fields.push(new ParticleField(el, { mode: variant, count: REDUCED_MOTION ? 60 : 130 }));
    });

    requestAnimationFrame(loop);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
