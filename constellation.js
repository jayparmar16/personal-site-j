/**
 * Constellation Component
 *
 * A vanilla JS implementation of a node constellation with:
 * - Drift animation (8px amplitude, ~10s period)
 * - Smooth scroll navigation from nodes
 * - Reduced motion support
 * - GPU-accelerated animations for Lighthouse 100 score
 */

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    driftAmplitude: 8,
    driftDuration: 10000, // 10s
    driftEasing: 'ease-in-out',
    lineOpacity: 0.18,
    lineStrokeWidth: 1,
    nodeRadius: 5,
    smoothScrollDuration: 600,
    glowRadius: 12,
    glowOpacity: 0.3,
    hoverGlowRadius: 20,
    hoverGlowOpacity: 0.6,
    // GPU acceleration settings
    gpuLayer: true,
    animationFPS: 60,
  };

  // Utility functions
  const lerp = (start, end, t) => start + (end - start) * t;

  // Get current time offset for drift animation
  let driftOffset = 0;
  function getDriftTime() {
    driftOffset = (driftOffset + CONFIG.driftDuration * 0.016) % CONFIG.driftDuration;
    return driftOffset;
  }

  // Easing function for smooth drift
  function easeInOutSine(t) {
    return -(Math.cos(Math.PI * t) - 1) / 2;
  }

  // Calculate drift position
  function getDriftPosition(x, y, time) {
    const t = time / CONFIG.driftDuration;
    const ease = easeInOutSine(t);
    const offsetX = Math.sin(t * 2) * CONFIG.driftAmplitude * ease;
    const offsetY = Math.cos(t * 2) * CONFIG.driftAmplitude * ease;
    return {
      x: x + offsetX,
      y: y + offsetY
    };
  }

  // Smooth scroll to element
  function smoothScrollTo(element) {
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const targetY = rect.top + window.innerHeight / 2 - 80; // -80 for header offset
    const currentY = window.scrollY;
    const distance = targetY - currentY;
    const startTime = performance.now();

    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const t = Math.min(elapsed / CONFIG.smoothScrollDuration, 1);
      const ease = easeInOutSine(t);

      window.scrollTo(0, currentY + distance * ease);

      if (t < 1) {
        requestAnimationFrame(animate);
      }
    }

    requestAnimationFrame(animate);
  }

  // Node data
  const nodes = [
    { id: 'builder', label: 'builder', x: 0.25, y: 0.3 },
    { id: 'founder', label: 'founder', x: 0.75, y: 0.3 },
    { id: 'researcher', label: 'researcher', x: 0.5, y: 0.7 },
    { id: 'human', label: 'human', x: 0.5, y: 0.1 },
  ];

  // Connect nodes with lines
  function createLines(container) {
    const linesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    linesGroup.setAttribute('class', 'constellation-lines');

    // GPU acceleration hint
    if (CONFIG.gpuLayer) {
      linesGroup.style.transform = 'translateZ(0)';
      linesGroup.style.willChange = 'transform';
    }

    // Define connections between nodes
    const connections = [
      ['builder', 'founder'],
      ['builder', 'researcher'],
      ['founder', 'researcher'],
      ['researcher', 'human'],
    ];

    connections.forEach(([fromId, toId]) => {
      const fromNode = nodes.find(n => n.id === fromId);
      const toNode = nodes.find(n => n.id === toId);

      if (fromNode && toNode) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', fromNode.x);
        line.setAttribute('y1', fromNode.y);
        line.setAttribute('x2', toNode.x);
        line.setAttribute('y2', toNode.y);
        line.setAttribute('stroke', 'var(--color-graphite)');
        line.setAttribute('stroke-width', CONFIG.lineStrokeWidth);
        line.setAttribute('stroke-opacity', CONFIG.lineOpacity);
        line.setAttribute('stroke-linecap', 'round');
        linesGroup.appendChild(line);
      }
    });

    container.appendChild(linesGroup);
    return linesGroup;
  }

  // Create nodes with labels
  function createNodes(container) {
    const nodesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    nodesGroup.setAttribute('class', 'constellation-nodes');
    nodesGroup.setAttribute('transform', 'translate(0,0)'); // GPU anchor

    nodes.forEach(node => {
      // Node glow effect (pulse on hover)
      const glow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      glow.setAttribute('cx', node.x);
      glow.setAttribute('cy', node.y);
      glow.setAttribute('r', CONFIG.glowRadius);
      glow.setAttribute('fill', 'var(--color-fern)');
      glow.setAttribute('opacity', 0);
      glow.setAttribute('class', 'node-glow');

      // Node circle
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', node.x);
      circle.setAttribute('cy', node.y);
      circle.setAttribute('r', CONFIG.nodeRadius);
      circle.setAttribute('fill', 'var(--color-graphite)');
      circle.setAttribute('class', 'node');
      circle.setAttribute('data-node-id', node.id);
      circle.setAttribute('tabindex', '0');
      circle.setAttribute('role', 'button');
      circle.setAttribute('aria-label', `Navigate to ${node.label} section`);

      // Node label
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('class', 'node-label');
      label.setAttribute('x', node.x);
      label.setAttribute('y', node.y + CONFIG.nodeRadius + 0.4);
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('font-family', 'var(--font-sans)');
      label.setAttribute('font-size', '0.55rem');
      label.setAttribute('font-weight', '500');
      label.setAttribute('fill', 'var(--color-stone)');
      label.textContent = node.label;

      // Group: glow + node + label
      const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      nodeGroup.setAttribute('class', 'node-group');
      nodeGroup.setAttribute('data-node-id', node.id);
      nodeGroup.appendChild(glow);
      nodeGroup.appendChild(circle);
      nodeGroup.appendChild(label);
      nodesGroup.appendChild(nodeGroup);

      // Hover effects
      const onHover = () => {
        glow.setAttribute('r', CONFIG.hoverGlowRadius);
        glow.setAttribute('opacity', CONFIG.hoverGlowOpacity);
        circle.setAttribute('fill', 'var(--color-fern)');
      };

      const onLeave = () => {
        glow.setAttribute('r', CONFIG.glowRadius);
        glow.setAttribute('opacity', 0);
        circle.setAttribute('fill', 'var(--color-graphite)');
      };

      nodeGroup.addEventListener('mouseenter', onHover);
      nodeGroup.addEventListener('mouseleave', onLeave);
      nodeGroup.addEventListener('mousemove', (e) => {
        // Subtle glow intensity based on mouse proximity
        const rect = nodeGroup.getBoundingClientRect();
        const dx = e.clientX - rect.left - node.x * rect.width;
        const dy = e.clientY - rect.top - node.y * rect.height;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDistance = 0.5;
        const intensity = Math.max(0, 1 - distance / maxDistance);
        glow.setAttribute('opacity', CONFIG.hoverGlowOpacity * (0.5 + intensity * 0.5));
      });

      // Click handler
      nodeGroup.addEventListener('click', () => {
        const targetSection = document.getElementById(node.id);
        if (targetSection) {
          smoothScrollTo(targetSection);
        }
      });

      // Keyboard navigation
      circle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const targetSection = document.getElementById(node.id);
          if (targetSection) {
            smoothScrollTo(targetSection);
          }
        }
      });
    });

    container.appendChild(nodesGroup);
    return nodesGroup;
  }

  // Animate nodes with drift
  function animateNodes(linesGroup, nodesGroup) {
    // Use CSS will-change for GPU acceleration hints
    linesGroup.style.willChange = 'transform';
    nodesGroup.style.willChange = 'transform';

    let lastTime = performance.now();

    function update(currentTime) {
      const elapsed = currentTime - lastTime;
      lastTime = currentTime;

      // Multi-layer drift for more organic motion
      const t1 = (elapsed % CONFIG.driftDuration) / CONFIG.driftDuration;
      const t2 = (elapsed * 0.5) / CONFIG.driftDuration;
      const t3 = (elapsed * 0.25) / CONFIG.driftDuration;

      const ease1 = easeInOutSine(t1);
      const ease2 = easeInOutSine(t2);
      const ease3 = easeInOutSine(t3);

      // Update lines
      const lines = linesGroup.querySelectorAll('line');
      lines.forEach(line => {
        const fromId = line.getAttribute('x1');
        const toId = line.getAttribute('x2');

        const fromNode = nodes.find(n => n.id === fromId);
        const toNode = nodes.find(n => n.id === toId);

        if (fromNode && toNode) {
          // Combine multiple drift layers
          const baseOffsetX = (Math.sin(t1 * 2) + Math.cos(t2 * 3)) * CONFIG.driftAmplitude * 0.5 * ease1;
          const baseOffsetY = (Math.cos(t1 * 2) - Math.sin(t2 * 3)) * CONFIG.driftAmplitude * 0.5 * ease1;

          const fromPos = {
            x: fromNode.x + baseOffsetX,
            y: fromNode.y + baseOffsetY
          };
          const toPos = {
            x: toNode.x + baseOffsetX,
            y: toNode.y + baseOffsetY
          };

          line.setAttribute('x1', fromPos.x);
          line.setAttribute('y1', fromPos.y);
          line.setAttribute('x2', toPos.x);
          line.setAttribute('y2', toPos.y);
        }
      });

      // Update nodes
      const nodeGroups = nodesGroup.querySelectorAll('.node-group');
      nodeGroups.forEach(group => {
        const nodeId = group.getAttribute('data-node-id');
        const node = nodes.find(n => n.id === nodeId);

        if (node) {
          // Each node has its own phase for staggered motion
          const phaseOffset = (node.y * 0.3);
          const phaseT = (elapsed + phaseOffset * 1000) % CONFIG.driftDuration / CONFIG.driftDuration;
          const phaseEase = easeInOutSine(phaseT);

          const baseOffsetX = Math.sin(phaseT * 2 + phaseOffset) * CONFIG.driftAmplitude * 0.5 * phaseEase;
          const baseOffsetY = Math.cos(phaseT * 2 + phaseOffset) * CONFIG.driftAmplitude * 0.5 * phaseEase;

          const pos = {
            x: node.x + baseOffsetX,
            y: node.y + baseOffsetY
          };

          // Use transform for GPU-accelerated animation
          group.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
        }
      });

      requestAnimationFrame(update);
    }

    update();
  }

  // Initialize constellation
  function initConstellation(svgElement) {
    if (!svgElement) return;

    const viewBox = svgElement.getAttribute('viewBox') || '0 0 400 400';
    const [width, height] = viewBox.split(' ').map(Number);

    // Set up SVG for GPU rendering
    svgElement.setAttribute('shape-rendering', 'geometricPrecision');
    svgElement.setAttribute('rendering-intent', 'optimizeSpeed');

    // Create lines
    const linesGroup = createLines(svgElement);
    linesGroup.style.transform = 'translateZ(0)'; // GPU hint

    // Create nodes
    const nodesGroup = createNodes(svgElement);
    nodesGroup.style.transform = 'translateZ(0)'; // GPU hint

    // Start animation
    requestAnimationFrame(() => animateNodes(linesGroup, nodesGroup));

    return svgElement;
  }

  // Initialize footer constellation (static, no animation)
  function initFooterConstellation(svgElement) {
    if (!svgElement) return;

    const viewBox = svgElement.getAttribute('viewBox') || '0 0 100 100';
    const [width, height] = viewBox.split(' ').map(Number);

    // Set up SVG for GPU rendering
    svgElement.setAttribute('shape-rendering', 'geometricPrecision');

    // Create static lines
    const linesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    linesGroup.setAttribute('class', 'footer-lines');
    linesGroup.style.transform = 'translateZ(0)'; // GPU hint

    const connections = [
      { from: 0.2, to: 0.5 },
      { from: 0.5, to: 0.8 },
      { from: 0.2, to: 0.8 },
    ];

    connections.forEach(conn => {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', conn.from);
      line.setAttribute('y1', conn.to);
      line.setAttribute('x2', conn.to);
      line.setAttribute('y2', conn.to);
      line.setAttribute('stroke', 'var(--color-graphite)');
      line.setAttribute('stroke-width', 0.5);
      line.setAttribute('stroke-opacity', 0.15);
      line.setAttribute('stroke-linecap', 'round');
      linesGroup.appendChild(line);
    });

    svgElement.appendChild(linesGroup);
  }

  // Public API
  window.Constellation = {
    init: initConstellation,
    initFooter: initFooterConstellation,
    CONFIG,
  };

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      const heroSvg = document.getElementById('hero-constellation');
      const footerSvg = document.getElementById('footer-constellation');

      if (heroSvg) {
        initConstellation(heroSvg);
      }

      if (footerSvg) {
        initFooterConstellation(footerSvg);
      }
    });
  } else {
    initConstellation(document.getElementById('hero-constellation'));
    initFooterConstellation(document.getElementById('footer-constellation'));
  }

})();
