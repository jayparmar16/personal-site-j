/**
 * site.js — non-constellation interactivity
 *
 *   1. Theme manager   — day/night toggle, persisted, system-aware
 *   2. GitHub feed     — live recent repos with cache + static fallback
 *   3. Command palette — ⌘K / Ctrl+K navigation and actions
 *
 * Vanilla, dependency-free, loaded with `defer`.
 */
(function () {
  'use strict';

  const GITHUB_USER = 'jayparmar16';
  const CONTACT_EMAIL = 'contact@jayparmar.dev';

  /* ============================================================
     1. THEME MANAGER
     ============================================================ */
  const Theme = (function () {
    const root = document.documentElement;
    const meta = document.querySelector('meta[name="theme-color"]');

    function current() {
      return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    }

    function apply(theme) {
      root.setAttribute('data-theme', theme);
      try { localStorage.setItem('theme', theme); } catch (e) {}
      if (meta) meta.setAttribute('content', theme === 'dark' ? '#15171a' : '#FAFAF7');
    }

    function toggle() {
      apply(current() === 'dark' ? 'light' : 'dark');
    }

    function init() {
      document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
        btn.addEventListener('click', toggle);
      });
    }

    return { init, toggle, current };
  })();

  /* ============================================================
     2. GITHUB FEED
     ============================================================ */
  const GitHubFeed = (function () {
    const CACHE_KEY = 'gh-feed:' + GITHUB_USER;
    const TTL = 6 * 60 * 60 * 1000; // 6 hours
    const MAX = 4;

    function relativeTime(iso) {
      const then = new Date(iso).getTime();
      const days = Math.floor((Date.now() - then) / 86400000);
      if (days <= 0) return 'today';
      if (days === 1) return 'yesterday';
      if (days < 30) return days + ' days ago';
      const months = Math.floor(days / 30);
      if (months === 1) return 'a month ago';
      if (months < 12) return months + ' months ago';
      const years = Math.floor(months / 12);
      return years === 1 ? 'a year ago' : years + ' years ago';
    }

    function readCache() {
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const { ts, data } = JSON.parse(raw);
        if (Date.now() - ts > TTL) return null;
        return data;
      } catch (e) { return null; }
    }

    function writeCache(data) {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
      } catch (e) {}
    }

    function render(repos, listEl) {
      if (!repos || !repos.length) return; // keep the static fallback
      listEl.removeAttribute('data-fallback');
      listEl.innerHTML = repos.slice(0, MAX).map((r) => {
        const lang = r.language
          ? `<span class="github-lang">${escapeHtml(r.language)}</span>` : '';
        const desc = r.description
          ? `<p class="github-desc">${escapeHtml(r.description)}</p>` : '';
        return `
          <li class="github-item">
            <a class="github-repo" href="${r.html_url}" target="_blank" rel="noopener">${escapeHtml(r.name)}</a>
            ${desc}
            <span class="github-meta">${lang}<span class="github-when">updated ${relativeTime(r.pushed_at)}</span></span>
          </li>`;
      }).join('');
    }

    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
      }[c]));
    }

    function init() {
      const listEl = document.getElementById('github-list');
      if (!listEl) return;

      const cached = readCache();
      if (cached) { render(cached, listEl); return; }

      fetch(`https://api.github.com/users/${GITHUB_USER}/repos?sort=pushed&per_page=10`, {
        headers: { Accept: 'application/vnd.github+json' },
      })
        .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
        .then((repos) => {
          const cleaned = repos
            .filter((r) => !r.fork)
            .map((r) => ({
              name: r.name, html_url: r.html_url, description: r.description,
              language: r.language, pushed_at: r.pushed_at,
            }));
          writeCache(cleaned);
          render(cleaned, listEl);
        })
        .catch(() => { /* static fallback already in the DOM */ });
    }

    return { init };
  })();

  /* ============================================================
     3. COMMAND PALETTE
     ============================================================ */
  const Palette = (function () {
    let overlay, modal, input, results, empty;
    let commands = [];
    let filtered = [];
    let active = 0;
    let lastFocused = null;

    function smoothScrollTo(el) {
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({
        top,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'auto' : 'smooth',
      });
    }

    function buildCommands() {
      const sections = [
        ['Now', 'now'], ['Builder', 'builder'], ['Founder', 'founder'],
        ['Researcher', 'researcher'], ['Notes', 'notes'], ['Human', 'human'],
      ];
      const cmds = sections.map(([label, id]) => ({
        label: 'Go to ' + label,
        hint: 'section',
        run: () => smoothScrollTo(document.getElementById(id)),
      }));
      cmds.push(
        { label: 'Toggle theme', hint: 'appearance', run: () => Theme.toggle() },
        {
          label: 'Copy email', hint: CONTACT_EMAIL, run: () => {
            if (navigator.clipboard) navigator.clipboard.writeText(CONTACT_EMAIL);
          },
        },
        {
          label: 'Open GitHub', hint: 'external', run: () =>
            window.open('https://github.com/' + GITHUB_USER, '_blank', 'noopener'),
        },
        {
          label: 'Open LinkedIn', hint: 'external', run: () =>
            window.open('https://linkedin.com/in/' + GITHUB_USER, '_blank', 'noopener'),
        }
      );
      return cmds;
    }

    function renderList() {
      results.innerHTML = filtered.map((c, i) => `
        <li class="cmdk-item${i === active ? ' is-active' : ''}" role="option"
            id="cmdk-opt-${i}" aria-selected="${i === active}" data-index="${i}">
          <span class="cmdk-label">${c.label}</span>
          <span class="cmdk-hint">${c.hint}</span>
        </li>`).join('');
      empty.hidden = filtered.length > 0;
      const activeEl = results.querySelector('.is-active');
      if (activeEl) {
        input.setAttribute('aria-activedescendant', activeEl.id);
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }

    function filter(q) {
      const query = q.trim().toLowerCase();
      filtered = query
        ? commands.filter((c) => c.label.toLowerCase().includes(query))
        : commands.slice();
      active = 0;
      renderList();
    }

    function open() {
      if (!overlay.hidden) return;
      lastFocused = document.activeElement;
      overlay.hidden = false;
      document.body.style.overflow = 'hidden';
      input.value = '';
      filter('');
      input.focus();
    }

    function close() {
      if (overlay.hidden) return;
      overlay.hidden = true;
      document.body.style.overflow = '';
      input.removeAttribute('aria-activedescendant');
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    }

    function runActive() {
      const cmd = filtered[active];
      if (cmd) { close(); cmd.run(); }
    }

    function onKeydown(e) {
      const isToggle = (e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey);
      if (isToggle) {
        e.preventDefault();
        overlay.hidden ? open() : close();
        return;
      }
      if (overlay.hidden) return;

      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'ArrowDown') {
        e.preventDefault();
        active = Math.min(active + 1, filtered.length - 1); renderList();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        active = Math.max(active - 1, 0); renderList();
      } else if (e.key === 'Enter') {
        e.preventDefault(); runActive();
      } else if (e.key === 'Tab') {
        // Focus trap — only the input is focusable, so keep focus on it.
        e.preventDefault(); input.focus();
      }
    }

    function init() {
      overlay = document.getElementById('cmdk-overlay');
      if (!overlay) return;
      modal = overlay.querySelector('.cmdk-modal');
      input = document.getElementById('cmdk-input');
      results = document.getElementById('cmdk-results');
      empty = document.getElementById('cmdk-empty');
      commands = buildCommands();

      document.addEventListener('keydown', onKeydown);
      document.querySelectorAll('[data-command-open]').forEach((btn) =>
        btn.addEventListener('click', open));
      input.addEventListener('input', () => filter(input.value));
      overlay.addEventListener('mousedown', (e) => {
        if (e.target === overlay) close();
      });
      results.addEventListener('click', (e) => {
        const li = e.target.closest('.cmdk-item');
        if (!li) return;
        active = Number(li.dataset.index);
        runActive();
      });
      results.addEventListener('mousemove', (e) => {
        const li = e.target.closest('.cmdk-item');
        if (li && Number(li.dataset.index) !== active) {
          active = Number(li.dataset.index); renderList();
        }
      });

      // Copy-email affordance on the footer link.
      document.querySelectorAll('[data-contact-email]').forEach((a) => {
        a.addEventListener('click', () => {
          if (navigator.clipboard) navigator.clipboard.writeText(CONTACT_EMAIL);
        });
      });
    }

    return { init };
  })();

  /* ============================================================
     PLATFORM KEY HINTS
     Mac shows ⌘; everyone else (Windows/Linux) shows Ctrl.
     The Cmd+K / Ctrl+K handler already accepts both — this only
     fixes what the labels *say*.
     ============================================================ */
  function applyKeyHints() {
    const isMac = /Mac|iPhone|iPad|iPod/i.test(
      navigator.platform || navigator.userAgent
    );
    if (isMac) return; // labels already correct for Mac

    // Standalone modifier key (nav chip): ⌘ -> Ctrl
    document.querySelectorAll('.kbd-mod').forEach((el) => {
      el.textContent = 'Ctrl';
    });
    // Combined label (footer): ⌘K -> Ctrl K
    document.querySelectorAll('.kbd-cmdk').forEach((el) => {
      el.textContent = 'Ctrl K';
    });
  }

  /* ============================================================
     BOOT
     ============================================================ */
  function start() {
    applyKeyHints();
    Theme.init();
    GitHubFeed.init();
    Palette.init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
