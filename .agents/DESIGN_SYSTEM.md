# Design System — Vecktrix DNA for PMS

PMS UI **inherits** the marketing site. Do not invent a parallel theme.

## Source files to port

| Asset | Source |
|-------|--------|
| Tokens + components | `../Vecktrix/src/index.css` |
| Fonts | `../Vecktrix/src/app/layout.tsx` |
| Background | `../Vecktrix/public/bg.avif` |
| Logo | `../Vecktrix/public/logo.svg` |
| Hero patterns | `../Vecktrix/src/components/PageHero.tsx` |

## Colors

| Token | Value |
|-------|-------|
| bg-dark | `#030914` |
| bg-cardDark | `#050b18` |
| bg-light | `#f4f4f5` |
| text-darkPrimary | `#ffffff` |
| text-darkSecondary | `#94a3b8` |
| accent-blue | `#102e65` |
| accent-glow | `#0b1d3d` |
| border-dark | `#ffffff0f` |

## Fonts

- **Newsreader** — serif display / page titles (`font-serif`)
- **Inter** — UI body (`font-sans`)
- **JetBrains Mono** — mono

## Components to reuse

- `.btn-primary-dark`, `.btn-secondary-dark`
- `.card-dark`
- `.heading-section`, `.heading-card`, `.overline-text`, `.body-text`
- `.container-base`
- `.glow-spotlight`

## PMS adaptation

- Auth + shell: full-bleed `bg.avif` + `#030914` scrims + glow
- Dense boards/tables: `bg-bg-dark` / `bg-bg-cardDark`, serif page titles
- Buttons: `rounded-[4px]`, not pills
- Forbidden: purple SaaS gradients, generic Inter-only dashboards

## Port checklist (Phase 1)

- [x] Copy `public/bg.avif`, `public/logo.svg`
- [x] Port `@theme` + `@layer components` from index.css
- [x] Wire next/font Inter + Newsreader + JetBrains Mono
- [x] Style login + app chrome with atmospheric background
