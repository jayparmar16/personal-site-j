# Task: Personal Website Build

## Goal
Create a high-performance, minimalist personal website with a constellation motif, strict design system, and five narrative sections using vanilla HTML/CSS/JS.

## Phases of Development
### Phase 1: Project Setup & Design System
- Create `index.html` with semantic structure (header, main, footer)
- Create `styles.css` with CSS custom properties for all colors
- Define typography stack with Google Fonts import (Inter + JetBrains Mono)
- Set base styles: 17px body, 1.7 line-height, max-width 62ch

### Phase 2: Layout & Sections
- Build hero section with eyebrow, name, thesis, and typed "now" line
- Create "Now" strip with three current items and dates
- Build Builder section with 3 project cards (title, description, tags, link)
- Create Founder narrative block (paragraph + CTO line)
- Build Researcher section (minimal CV list format)
- Create Human section (3-4 sentences, no links)
- Build footer with contact links and colophon

### Phase 3: Constellation Feature
- Create SVG constellation component (~80 lines vanilla JS)
- Implement 4 labeled nodes (builder/founder/researcher/human)
- Add smooth-scroll navigation from nodes to sections
- Configure drift animation (8px amplitude, ~10s period)

### Phase 4: Polish & Performance
- Implement `prefers-reduced-motion` media query
- Add hover states with fern accent (max 5% screen usage)
- Configure 120-160px section spacing on desktop
- Add graphite dot motif (5px dots, 1px lines at 18% opacity)
- Run Lighthouse audit and optimize for 100s score

## Files to modify
- `index.html`
- `styles.css`
- `constellation.js`

## Success Criteria
- [ ] Lighthouse Performance score: 100
- [ ] All 5 sections + footer render correctly
- [ ] Constellation nodes smoothly scroll to sections
- [ ] Fern accent never exceeds 5% screen coverage
- [ ] Site loads under 100ms on 4G