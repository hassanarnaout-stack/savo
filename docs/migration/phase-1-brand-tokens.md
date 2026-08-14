# Migration Phase 1: Official brand assets and visual tokens

## Scope

This phase registers the approved SAVO Version 21 brand system in the operational application. It does not migrate or restructure storefront UI.

## Source and target

- Source: `savo-new/public/brand/official`
- Target: `public/brand/official`
- Included: numbered production Brand Kit folders `01-master` through `11-office`

Canonical digital assets:

- Primary logo: `/brand/official/02-svg/SAVO-Logo-Primary.svg`
- Light-background/black logo: `/brand/official/02-svg/SAVO-Logo-Black.svg`
- Dark-background/white logo: `/brand/official/02-svg/SAVO-Logo-White.svg`
- Standalone mark: `/brand/official/02-svg/SAVO-Mark-FullColor.svg`
- Favicons and application icons: `/brand/official/06-icons/`

## Visual tokens

| Token | Value | Tailwind 3 registration |
|---|---|---|
| Dark Navy | `#1A1C24` | `saveo.darkNavy` |
| UI Ink | `#0D0E12` | `saveo.ink.DEFAULT` |
| Ink Mid | `#1A1C24` | `saveo.ink.mid` |
| Teal | `#00C9A7` | `saveo.primary.DEFAULT` |
| Fire | `#FF4D2E` | `saveo.accent.DEFAULT` |
| Surface | `#F5F5F2` | `saveo.surface` |
| White | `#FFFFFF` | `saveo.white` and `saveo.card` |
| Muted | `#8A8FA0` | `saveo.muted` |

Equivalent `--savo-*` CSS custom properties are registered in `src/app/globals.css` for components that do not use Tailwind utilities.

Application typography is registered additively:

- Lexend Exa 700-800: `font-display` / `--font-display`
- Manrope 400-800: `font-manrope` / `--font-manrope`
- Cairo 400-800: `font-cairo` / `--font-cairo`

Legacy Inter and IBM Plex Sans Arabic defaults remain in place until individual UI areas are migrated.

## Tailwind 4 to Tailwind 3 translation

The Tailwind 4 stylesheet was not copied. Version 21 primitives were translated into `theme.extend.colors` and `theme.extend.fontFamily` in the existing Tailwind 3 configuration. CSS variables are additive and do not change the operational application's current body, Header, Footer, Admin, Supplier, or commerce styling.

## Intentionally excluded

- `12-archive/` legacy live-text system
- Duplicate root `icons/`, `png/`, `social/`, and `svg/` exports
- Root legacy `SAVO-BRAND-GUIDE.md`
- Exploration studies
- ZIP handoff/backup exports
- Illustrator temporary files

## Intentionally untouched

Prisma, database configuration, authentication, Admin, Supplier, operational APIs, cart and checkout logic, orders, inventory, commissions, payouts, Header, Footer, mobile navigation, Homepage, product cards, PDP, and Categories.
