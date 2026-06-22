/**
 * Constellation Component
 *
 * A vanilla JS constellation for the hero navigation:
 * - Four labeled nodes in an abstract kite/diamond
 * - Organic, bounded drift (~8px amplitude, ~10s period)
 * - Faint ambient glow at rest; fern on hover/focus
 * - Connecting lines that track the moving dots
 * - Smooth-scroll navigation, keyboard accessible
 * - Respects prefers-reduced-motion (renders static, no rAF loop)
 */

(function () {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';

  // Source of truth — mirrors the CSS custom properties.
  const CONFIG = {
    driftAmplitude: 8,      // px (max combined offset per axis)
    nodeRadius: 5,
    glowRadius: 9,
    glowOpacity: 0.12,      // subtle ambient star glow
    hoverGlowRadius: 18,
    hoverGlowOpacity: 0.5,
    lineOpacity: 0.18,
    lineStrokeWidth: 1,
    smoothScrollDuration: 600,
    headerOffset: 72,       // fixed header height
  };

  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  // Node base positions in the hero viewBox (0 0 300 400) — abstract kite.
  const nodes = [
    { id: 'builder',    label: 'builder',    x: 150, y: 70  },
    { id: 'founder',    label: 'founder',    x: 250, y: 200 },
    { id: 'researcher', label: 'researcher', x: 150, y: 340 },
    { id: 'human',      label: 'human',      x: 50,  y: 200 },
  ];

  // Edges connecting the kite.
  const connections = [
    ['builder', 'founder'],
    ['builder', 'human'],
    ['founder', 'researcher'],
    ['researcher', 'human'],
  ];

  const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;

  const byId = (id) => nodes.find((n) => n.id === id);

  // Assign each node two incommensurate drift "waves" per axis plus random
  // phase, so the combined motion reads organic but stays bounded by ±amplitude.
  function seedDrift() {
    nodes.forEach((n) => {
      n.drift = {
        // angular speeds (rad/s) — periods ~8-14s, around the 10s spec
        wx1: (2 * Math.PI) / (9 + Math.random() * 3),
        wx2: (2 * Math.PI) / (13 + Math.random() * 3),
        wy1: (2 * Math.PI) / (10 + Math.random() * 3),
        wy2: (2 * Math.PI) / (14 + Math.random() * 3),
        px1: Math.random() * Math.PI * 2,
        px2: Math.random() * Math.PI * 2,
        py1: Math.random() * Math.PI * 2,
        py2: Math.random() * Math.PI * 2,
      };
      n.offset = { x: 0, y: 0 };
    });
  }

  // Combined offset stays within ±amplitude (0.6 + 0.4 = 1.0 weight sum).
  function driftOffset(n, t) {
    const d = n.drift;
    const A = CONFIG.driftAmplitude;
    return {
      x: A * (0.6 * Math.sin(d.wx1 * t + d.px1) + 0.4 * Math.sin(d.wx2 * t + d.px2)),
      y: A * (0.6 * Math.cos(d.wy1 * t + d.py1) + 0.4 * Math.cos(d.wy2 * t + d.py2)),
    };
  }

  // Smooth-scroll a section to just below the fixed header.
  function smoothScrollTo(element) {
    if (!element) return;

    const startY = window.scrollY;
    const targetY =
      element.getBoundingClientRect().top + startY - CONFIG.headerOffset;
    const distance = targetY - startY;

    if (prefersReducedMotion) {
      window.scrollTo(0, targetY);
      return;
    }

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

  function buildConstellation(svg) {
    // Clear any pre-declared markup so we own the contents.
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const linesGroup = setAttrs(document.createElementNS(SVG_NS, 'g'), {
      class: 'constellation-lines',
    });
    const nodesGroup = setAttrs(document.createElementNS(SVG_NS, 'g'), {
      class: 'constellation-nodes',
    });

    // Lines — store endpoint node refs on the element for the animation loop.
    const lineEls = connections.map(([fromId, toId]) => {
      const from = byId(fromId);
      const to = byId(toId);
      const line = setAttrs(document.createElementNS(SVG_NS, 'line'), {
        x1: from.x, y1: from.y, x2: to.x, y2: to.y,
        stroke: 'var(--color-graphite)',
        'stroke-width': CONFIG.lineStrokeWidth,
        'stroke-opacity': CONFIG.lineOpacity,
        'stroke-linecap': 'round',
      });
      line._from = from;
      line._to = to;
      linesGroup.appendChild(line);
      return line;
    });

    // Nodes — glow + dot + label, grouped so transform moves all three.
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
        fill: 'var(--color-graphite)',
        opacity: CONFIG.glowOpacity,
      });

      const dot = setAttrs(document.createElementNS(SVG_NS, 'circle'), {
        class: 'node',
        cx: node.x, cy: node.y, r: CONFIG.nodeRadius,
        fill: 'var(--color-graphite)',
      });

      const label = setAttrs(document.createElementNS(SVG_NS, 'text'), {
        class: 'node-label',
        x: node.x,
        y: node.y + CONFIG.nodeRadius + 16,
        'text-anchor': 'middle',
      });
      label.textContent = node.label;

      group.appendChild(glow);
      group.appendChild(dot);
      group.appendChild(label);
      nodesGroup.appendChild(group);

      node._group = group;
      node._glow = glow;

      const go = () => smoothScrollTo(document.getElementById(node.id));
      group.addEventListener('click', go);
      group.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          go();
        }
      });
    });

    svg.appendChild(linesGroup);
    svg.appendChild(nodesGroup);

    return { lineEls };
  }

  function animate(lineEls) {
    nodes.forEach((n) => {
      n._group.style.willChange = 'transform';
    });

    function frame(now) {
      const t = now / 1000;

      nodes.forEach((node) => {
        const o = driftOffset(node, t);
        node.offset = o;
        node._group.setAttribute('transform', `translate(${o.x}, ${o.y})`);
      });

      lineEls.forEach((line) => {
        const f = line._from;
        const to = line._to;
        line.setAttribute('x1', f.x + f.offset.x);
        line.setAttribute('y1', f.y + f.offset.y);
        line.setAttribute('x2', to.x + to.offset.x);
        line.setAttribute('y2', to.y + to.offset.y);
      });

      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  function initConstellation(svg) {
    if (!svg) return;
    seedDrift();
    const { lineEls } = buildConstellation(svg);
    if (!prefersReducedMotion) {
      requestAnimationFrame(() => animate(lineEls));
    }
  }

  // Typed "now" line — types out once, instant when reduced motion is on.
  function initTypedNow() {
    const el = document.querySelector('.now-ticker .ticker-item');
    if (!el) return;

    const full = el.textContent;
    if (prefersReducedMotion) return; // leave full text in place

    el.textContent = '';
    let i = 0;
    function type() {
      el.textContent = full.slice(0, i);
      if (i <= full.length) {
        i += 1;
        setTimeout(type, 35);
      }
    }
    type();
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
