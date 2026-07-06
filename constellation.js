/**
 * Constellation Component
 *
 * A vanilla JS spring-network for the hero navigation:
 * - Four labeled nodes in an abstract kite, connected by spring edges
 * - Pronounced organic idle wander (the drifting rest position)
 * - Grab / drag / throw any node (mouse + touch); neighbors follow via
 *   edge springs, then the whole network self-organizes back to equilibrium
 * - System "energy" blooms the fern accent during interaction, then decays
 *   to near-zero at rest (motion earns the accent)
 * - Faint ambient glow at rest; smooth-scroll navigation, keyboard accessible
 * - Respects prefers-reduced-motion and touch (static render, no physics)
 */

(function () {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';

  const CONFIG = {
    nodeRadius: 5,
    glowRadius: 9,
    glowOpacity: 0.12,        // subtle ambient star glow at rest
    lineStrokeWidth: 1,
    smoothScrollDuration: 600,
    headerOffset: 72,

    // Idle wander — clearly visible, still bounded.
    driftAmplitude: 16,       // px (max combined offset per axis)

    // Spring physics.
    kHome: 0.020,             // pull toward the (drifting) rest position
    kEdge: 0.015,             // edge spring stiffness (tugs neighbors)
    damping: 0.86,            // velocity decay → wobble then settle
    pad: 14,                  // keep nodes inside the viewBox (glow headroom)
    maxThrow: 60,             // clamp throw velocity (user units / frame)

    // Energy → fern.
    linkMinOpacity: 0.10,
    linkMaxOpacity: 0.55,
    energyEase: 0.10,         // smoothing for the displayed energy value
    clickThreshold: 4,        // px of travel under which a press = click
  };

  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  // Hero viewBox is 0 0 300 400.
  const VIEW = { w: 300, h: 400 };

  const nodes = [
    { id: 'builder',    label: 'builder',    x: 150, y: 70  },
    { id: 'founder',    label: 'founder',    x: 250, y: 200 },
    { id: 'researcher', label: 'researcher', x: 150, y: 340 },
    { id: 'human',      label: 'human',      x: 50,  y: 200 },
  ];

  const connections = [
    ['builder', 'founder'],
    ['builder', 'human'],
    ['founder', 'researcher'],
    ['researcher', 'human'],
  ];

  const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  const byId = (id) => nodes.find((n) => n.id === id);

  /* ---- Theme-aware colors (graphite → fern lerp) ------------------------ */
  const themeColors = { graphite: [35, 38, 35], fern: [15, 110, 86] };

  function parseColor(str) {
    str = str.trim();
    if (str[0] === '#') {
      const h = str.slice(1);
      const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
      return [parseInt(f.slice(0, 2), 16), parseInt(f.slice(2, 4), 16),
        parseInt(f.slice(4, 6), 16)];
    }
    const m = str.match(/(\d+\.?\d*)/g);
    return m ? [+m[0], +m[1], +m[2]] : [0, 0, 0];
  }

  function refreshThemeColors() {
    const cs = getComputedStyle(document.documentElement);
    const g = cs.getPropertyValue('--color-graphite');
    const f = cs.getPropertyValue('--color-fern');
    if (g) themeColors.graphite = parseColor(g);
    if (f) themeColors.fern = parseColor(f);
  }

  function mix(t) {
    const g = themeColors.graphite, f = themeColors.fern;
    const r = Math.round(g[0] + (f[0] - g[0]) * t);
    const gr = Math.round(g[1] + (f[1] - g[1]) * t);
    const b = Math.round(g[2] + (f[2] - g[2]) * t);
    return `rgb(${r}, ${gr}, ${b})`;
  }

  /* ---- Drift (moving rest position) ------------------------------------- */
  function seedDrift() {
    nodes.forEach((n) => {
      n.drift = {
        wx1: (2 * Math.PI) / (9 + Math.random() * 3),
        wx2: (2 * Math.PI) / (13 + Math.random() * 3),
        wx3: (2 * Math.PI) / (23 + Math.random() * 6),  // slow wander
        wy1: (2 * Math.PI) / (10 + Math.random() * 3),
        wy2: (2 * Math.PI) / (14 + Math.random() * 3),
        wy3: (2 * Math.PI) / (25 + Math.random() * 6),
        px1: Math.random() * Math.PI * 2, px2: Math.random() * Math.PI * 2,
        px3: Math.random() * Math.PI * 2, py1: Math.random() * Math.PI * 2,
        py2: Math.random() * Math.PI * 2, py3: Math.random() * Math.PI * 2,
      };
      // Physics state.
      n.pos = { x: n.x, y: n.y };
      n.vel = { x: 0, y: 0 };
      n.offset = { x: 0, y: 0 };  // pos - base, consumed by line drawing
      n.dragging = false;
      n.samples = [];             // recent pointer samples for throw velocity
    });
  }

  // Combined offset stays within ±amplitude (0.5 + 0.3 + 0.2 = 1.0).
  function driftOffset(n, t) {
    const d = n.drift;
    const A = CONFIG.driftAmplitude;
    return {
      x: A * (0.5 * Math.sin(d.wx1 * t + d.px1) +
              0.3 * Math.sin(d.wx2 * t + d.px2) +
              0.2 * Math.sin(d.wx3 * t + d.px3)),
      y: A * (0.5 * Math.cos(d.wy1 * t + d.py1) +
              0.3 * Math.cos(d.wy2 * t + d.py2) +
              0.2 * Math.cos(d.wy3 * t + d.py3)),
    };
  }

  function smoothScrollTo(element) {
    if (!element) return;
    const startY = window.scrollY;
    const targetY =
      element.getBoundingClientRect().top + startY - CONFIG.headerOffset;
    const distance = targetY - startY;

    if (prefersReducedMotion) { window.scrollTo(0, targetY); return; }

    const startTime = performance.now();
    function step(now) {
      const t = Math.min((now - startTime) / CONFIG.smoothScrollDuration, 1);
      window.scrollTo(0, startY + distance * easeInOutSine(t));
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function setAttrs(el, attrs) {
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  /* ---- Build ------------------------------------------------------------ */
  function buildConstellation(svg) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const linesGroup = setAttrs(document.createElementNS(SVG_NS, 'g'),
      { class: 'constellation-lines' });
    const nodesGroup = setAttrs(document.createElementNS(SVG_NS, 'g'),
      { class: 'constellation-nodes' });

    // Rest length per edge = base distance between its two nodes.
    const lineEls = connections.map(([fromId, toId]) => {
      const from = byId(fromId);
      const to = byId(toId);
      const line = setAttrs(document.createElementNS(SVG_NS, 'line'), {
        x1: from.x, y1: from.y, x2: to.x, y2: to.y,
        stroke: mix(0),
        'stroke-width': CONFIG.lineStrokeWidth,
        'stroke-opacity': CONFIG.linkMinOpacity,
        'stroke-linecap': 'round',
      });
      line._from = from;
      line._to = to;
      line._rest = Math.hypot(to.x - from.x, to.y - from.y);
      linesGroup.appendChild(line);
      return line;
    });

    nodes.forEach((node) => {
      const group = setAttrs(document.createElementNS(SVG_NS, 'g'), {
        class: 'node-group',
        'data-node-id': node.id,
        tabindex: '0',
        role: 'button',
        'aria-label': `Navigate to ${node.label} section`,
      });

      const glow = setAttrs(document.createElementNS(SVG_NS, 'circle'), {
        class: 'node-glow',
        cx: node.x, cy: node.y, r: CONFIG.glowRadius,
        fill: 'var(--color-graphite)', opacity: CONFIG.glowOpacity,
      });
      const dot = setAttrs(document.createElementNS(SVG_NS, 'circle'), {
        class: 'node',
        cx: node.x, cy: node.y, r: CONFIG.nodeRadius,
        fill: 'var(--color-graphite)',
      });
      const label = setAttrs(document.createElementNS(SVG_NS, 'text'), {
        class: 'node-label',
        x: node.x, y: node.y + CONFIG.nodeRadius + 16, 'text-anchor': 'middle',
      });
      label.textContent = node.label;

      group.appendChild(glow);
      group.appendChild(dot);
      group.appendChild(label);
      nodesGroup.appendChild(group);

      node._group = group;
      node._glow = glow;
      node._dot = dot;

      attachInteraction(svg, node, group);
    });

    svg.appendChild(linesGroup);
    svg.appendChild(nodesGroup);
    return { lineEls };
  }

  /* ---- Pointer / drag --------------------------------------------------- */
  function svgPoint(svg, clientX, clientY) {
    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return {
      x: ((clientX - rect.left) / rect.width) * VIEW.w,
      y: ((clientY - rect.top) / rect.height) * VIEW.h,
    };
  }

  let dragHintDismissed = false;
  function dismissHint() {
    if (dragHintDismissed) return;
    dragHintDismissed = true;
    const hint = document.querySelector('.constellation-hint');
    if (hint) hint.classList.add('is-hidden');
  }

  function attachInteraction(svg, node, group) {
    const go = () => smoothScrollTo(document.getElementById(node.id));

    // Keyboard nav (always available).
    group.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
    });

    if (prefersReducedMotion) {
      group.addEventListener('click', go);
      return;
    }

    let downPt = null;     // pointer pos at press (client coords)
    let travel = 0;

    group.addEventListener('pointerdown', (e) => {
      const p = svgPoint(svg, e.clientX, e.clientY);
      if (!p) return;
      e.preventDefault();
      group.setPointerCapture(e.pointerId);
      node.dragging = true;
      node.samples = [{ x: p.x, y: p.y, t: performance.now() }];
      node.pos.x = p.x; node.pos.y = p.y;
      node.vel.x = 0; node.vel.y = 0;
      downPt = { x: e.clientX, y: e.clientY };
      travel = 0;
      group.classList.add('is-dragging');
    });

    group.addEventListener('pointermove', (e) => {
      if (!node.dragging) return;
      const p = svgPoint(svg, e.clientX, e.clientY);
      if (!p) return;
      node.pos.x = clamp(p.x, CONFIG.pad, VIEW.w - CONFIG.pad);
      node.pos.y = clamp(p.y, CONFIG.pad, VIEW.h - CONFIG.pad);
      node.samples.push({ x: p.x, y: p.y, t: performance.now() });
      if (node.samples.length > 6) node.samples.shift();
      travel = Math.max(travel,
        Math.hypot(e.clientX - downPt.x, e.clientY - downPt.y));
    });

    const endDrag = (e) => {
      if (!node.dragging) return;
      node.dragging = false;
      group.classList.remove('is-dragging');
      try { group.releasePointerCapture(e.pointerId); } catch (_) {}

      if (travel < CONFIG.clickThreshold) {
        // Treat as a click → navigate; no throw.
        node.vel.x = 0; node.vel.y = 0;
        go();
        return;
      }

      dismissHint();
      // Throw velocity from the last ~80ms of samples.
      const s = node.samples;
      if (s.length >= 2) {
        const last = s[s.length - 1];
        let i = s.length - 2;
        while (i > 0 && last.t - s[i].t < 80) i--;
        const dt = Math.max(16, last.t - s[i].t);
        node.vel.x = clamp((last.x - s[i].x) / dt * 16,
          -CONFIG.maxThrow, CONFIG.maxThrow);
        node.vel.y = clamp((last.y - s[i].y) / dt * 16,
          -CONFIG.maxThrow, CONFIG.maxThrow);
      }
    };

    group.addEventListener('pointerup', endDrag);
    group.addEventListener('pointercancel', endDrag);
  }

  /* ---- Simulation ------------------------------------------------------- */
  function animate(lineEls) {
    nodes.forEach((n) => { n._group.style.willChange = 'transform'; });
    const span = CONFIG.linkMaxOpacity - CONFIG.linkMinOpacity;
    let energyDisplay = 0;

    function frame(now) {
      const t = now / 1000;
      let kinetic = 0;

      // Integrate physics.
      nodes.forEach((node) => {
        const d = driftOffset(node, t);
        const homeX = node.x + d.x;
        const homeY = node.y + d.y;

        if (!node.dragging) {
          // Home spring.
          let fx = (homeX - node.pos.x) * CONFIG.kHome;
          let fy = (homeY - node.pos.y) * CONFIG.kHome;

          // Edge springs.
          node._edges = node._edges || edgesFor(node, lineEls);
          node._edges.forEach(({ other, rest }) => {
            const dx = other.pos.x - node.pos.x;
            const dy = other.pos.y - node.pos.y;
            const len = Math.hypot(dx, dy) || 0.001;
            const f = (len - rest) * CONFIG.kEdge;
            fx += (dx / len) * f;
            fy += (dy / len) * f;
          });

          node.vel.x = (node.vel.x + fx) * CONFIG.damping;
          node.vel.y = (node.vel.y + fy) * CONFIG.damping;
          node.pos.x += node.vel.x;
          node.pos.y += node.vel.y;

          // Clamp to padded region; stop velocity on contact.
          if (node.pos.x < CONFIG.pad) { node.pos.x = CONFIG.pad; node.vel.x = 0; }
          if (node.pos.x > VIEW.w - CONFIG.pad) { node.pos.x = VIEW.w - CONFIG.pad; node.vel.x = 0; }
          if (node.pos.y < CONFIG.pad) { node.pos.y = CONFIG.pad; node.vel.y = 0; }
          if (node.pos.y > VIEW.h - CONFIG.pad) { node.pos.y = VIEW.h - CONFIG.pad; node.vel.y = 0; }
        }

        kinetic += node.vel.x * node.vel.x + node.vel.y * node.vel.y;
        node.offset = { x: node.pos.x - node.x, y: node.pos.y - node.y };
        node._group.setAttribute('transform',
          `translate(${node.offset.x}, ${node.offset.y})`);
      });

      // Energy ∈ [0,1] from kinetic energy; decays naturally with damping.
      const rawEnergy = clamp(kinetic / 400, 0, 1);
      energyDisplay += (rawEnergy - energyDisplay) * CONFIG.energyEase;
      const e = energyDisplay;
      const strokeColor = mix(e);

      // Lines track moving nodes; strain + energy drive color/opacity.
      lineEls.forEach((line) => {
        const f = line._from, to = line._to;
        const x1 = f.pos.x, y1 = f.pos.y, x2 = to.pos.x, y2 = to.pos.y;
        line.setAttribute('x1', x1); line.setAttribute('y1', y1);
        line.setAttribute('x2', x2); line.setAttribute('y2', y2);
        const len = Math.hypot(x2 - x1, y2 - y1);
        const strain = clamp(Math.abs(len - line._rest) / line._rest, 0, 1);
        const lit = clamp(e + strain * 0.6, 0, 1);
        line.setAttribute('stroke', mix(lit));
        line.setAttribute('stroke-opacity',
          (CONFIG.linkMinOpacity + span * lit).toFixed(3));
      });

      // Glow blooms fern with energy.
      if (e > 0.01) {
        nodes.forEach((node) => {
          node._glow.setAttribute('r', (CONFIG.glowRadius + e * 10).toFixed(2));
          node._glow.setAttribute('opacity',
            (CONFIG.glowOpacity + e * 0.4).toFixed(3));
          node._glow.setAttribute('fill', strokeColor);
        });
      } else {
        nodes.forEach((node) => {
          node._glow.setAttribute('r', CONFIG.glowRadius);
          node._glow.setAttribute('opacity', CONFIG.glowOpacity);
          node._glow.setAttribute('fill', 'var(--color-graphite)');
        });
      }

      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  // Precompute each node's edges (neighbor + rest length) from the line list.
  function edgesFor(node, lineEls) {
    const out = [];
    lineEls.forEach((line) => {
      if (line._from === node) out.push({ other: line._to, rest: line._rest });
      else if (line._to === node) out.push({ other: line._from, rest: line._rest });
    });
    return out;
  }

  function initConstellation(svg) {
    if (!svg) return;
    refreshThemeColors();
    seedDrift();
    const { lineEls } = buildConstellation(svg);

    // Keep the energy lerp correct across theme toggles.
    new MutationObserver(refreshThemeColors).observe(
      document.documentElement, { attributes: true, attributeFilter: ['data-theme'] }
    );

    if (!prefersReducedMotion) {
      requestAnimationFrame(() => animate(lineEls));
    }
  }

  // Typed "now" line — types out once, instant when reduced motion is on.
  function initTypedNow() {
    const el = document.querySelector('.now-ticker .ticker-item');
    if (!el) return;
    const full = el.textContent;
    if (prefersReducedMotion) return;
    el.textContent = '';
    let i = 0;
    (function type() {
      el.textContent = full.slice(0, i);
      if (i <= full.length) { i += 1; setTimeout(type, 35); }
    })();
  }

  function start() {
    initConstellation(document.getElementById('hero-constellation'));
    initTypedNow();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
