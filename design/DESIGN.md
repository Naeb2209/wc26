---
name: Pitch Pulse 2026
colors:
  surface: '#fcf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fcf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0edec'
  surface-container-high: '#ebe7e7'
  surface-container-highest: '#e5e2e1'
  on-surface: '#1c1b1b'
  on-surface-variant: '#474557'
  inverse-surface: '#313030'
  inverse-on-surface: '#f3f0ef'
  outline: '#787589'
  outline-variant: '#c8c4db'
  surface-tint: '#5530ff'
  primary: '#3400bf'
  on-primary: '#ffffff'
  primary-container: '#4800ff'
  on-primary-container: '#c7c0ff'
  inverse-primary: '#c7bfff'
  secondary: '#006875'
  on-secondary: '#ffffff'
  secondary-container: '#00e3fd'
  on-secondary-container: '#00616d'
  tertiary: '#294300'
  on-tertiary: '#ffffff'
  tertiary-container: '#3a5c00'
  on-tertiary-container: '#8fdb00'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e4dfff'
  primary-fixed-dim: '#c7bfff'
  on-primary-fixed: '#170065'
  on-primary-fixed-variant: '#3d00dd'
  secondary-fixed: '#9cf0ff'
  secondary-fixed-dim: '#00daf3'
  on-secondary-fixed: '#001f24'
  on-secondary-fixed-variant: '#004f58'
  tertiary-fixed: '#a8f928'
  tertiary-fixed-dim: '#8fdb00'
  on-tertiary-fixed: '#112000'
  on-tertiary-fixed-variant: '#314f00'
  background: '#fcf9f8'
  on-background: '#1c1b1b'
  surface-variant: '#e5e2e1'
typography:
  display-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Be Vietnam Pro
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-md:
    fontFamily: Be Vietnam Pro
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  body-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Be Vietnam Pro
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-caps:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
  data-mono:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
  container-max: 1280px
---

## Brand & Style
The design system captures the electric energy of the FIFA World Cup 2026. It targets a global audience of passionate fans, emphasizing speed, precision, and the monumental scale of the tournament. The visual narrative combines **Corporate Modern** structure with **High-Contrast Bold** accents to ensure that high-density sports data remains accessible yet thrilling.

The aesthetic is defined by:
- **Kinetic Energy:** Subtle gradients and angled accents that imply motion.
- **Data Clarity:** A rigorous commitment to legibility for complex statistics and match schedules.
- **Spotlight Focus:** Using light and shadow to elevate star players and critical tournament moments.
- **Vietnamese Optimization:** Typography is specifically tuned for Vietnamese diacritics to ensure visual balance and readability in long-form news and player bios.

## Colors
The palette is a vibrant, modern interpretation of the 2026 tournament spirit. 

- **Primary (Deep Purple):** Used for global navigation, headers, and primary actions. It provides a sophisticated, authoritative foundation.
- **Secondary (Vibrant Blue):** Used for interactive elements, highlights, and links. It represents the "pulse" of the game.
- **Tertiary (Lime Green):** Reserved for high-energy accents, success states (goals, wins), and the "Spotlight" effect on player cards.
- **Neutrals:** A range of cool grays (from `#F8F9FA` to `#121212`) ensures that data-heavy tables and white-space-heavy layouts remain clean and easy to scan.

## Typography
This design system utilizes **Be Vietnam Pro** as the primary typeface. Its contemporary grotesque structure is exceptionally well-suited for the Vietnamese language, maintaining clean counters even with complex tone marks. 

- **Headlines:** Set in heavy weights (700-800) with slight negative letter-spacing for a bold, "breaking news" feel.
- **Data & Tables:** **Hanken Grotesk** is used for numerical data and labels. Its precise, geometric forms ensure that scores, timings, and standings are legible at small sizes.
- **Hierarchy:** Use `label-caps` for overlines (e.g., "TRỰC TIẾP" or "BẢNG A") to create a structured information architecture.

## Layout & Spacing
The layout follows a **Fluid Grid** logic with rigid internal components. 

- **Desktop (12 columns):** 24px gutters. Use the grid to align player cards and match tiles.
- **Mobile (4 columns):** 16px margins. Content cards should span the full width to maximize readability of player stats.
- **Spacing Logic:** Use a 4px base unit. Component internal padding should default to 16px (base * 4) or 24px (base * 6) to maintain a spacious, professional feel. 
- **Sectioning:** Large vertical gaps (64px - 80px) between major sections (e.g., Standings vs. Top Scorers) to prevent visual fatigue.

## Elevation & Depth
Depth is created through **Tonal Layering** rather than heavy shadows to keep the UI feeling "fast."

- **Level 0 (Background):** `#F8F9FA`.
- **Level 1 (Cards):** White background with a 1px solid border in `#E9ECEF`.
- **Level 2 (Active/Hover):** Subtle, diffused shadow (0px 8px 24px rgba(72, 0, 255, 0.08)) and a primary color accent border.
- **The Spotlight Effect:** On player cards, use a radial gradient overlay (`transparent` to `rgba(173, 255, 47, 0.1)`) that originates from the player's silhouette to create a "star" presence.
- **Video Player:** Uses a dark-mode exception with a high-contrast backdrop blur (Glassmorphism) for the control overlays and channel selection panel.

## Shapes
The shape language is **Rounded**, reflecting the modern and friendly nature of a global celebration. 

- **Standard Elements:** 0.5rem (8px) for buttons, input fields, and standard cards.
- **Large Components:** 1.5rem (24px) for the main Video Player container and Hero banners.
- **Progress Bars:** Fully pill-shaped (rounded-full) for match statistics (possession, shots on goal) to emphasize the fluid nature of the game.

## Components

### Data Tables (Standings)
- **Header:** Dark purple background with white `label-caps` text.
- **Rows:** Alternating zebra stripes (white and light grey) for scanability.
- **Highlighting:** The "Qualified" zone (top 2 teams) should have a subtle 4px left-border in Lime Green.

### Player Cards
- **Visuals:** Large cutout of the player, name in bold display typography, and a "Spotlight" radial gradient background.
- **Stats:** Compact grid at the bottom showing goals, assists, and speed.

### Tournament Brackets
- **Connectors:** 2px solid lines using the Primary Purple. 
- **Active State:** The path of the winning team glows with a Secondary Blue shadow.

### Video Player & Channel Selection
- **Player:** 16:9 aspect ratio with rounded-xl corners.
- **Channel List:** A side-scroll or vertical list of thumbnails. The active channel is indicated by a "TRỰC TIẾP" (LIVE) badge in Lime Green and a 2px blue border.

### Buttons
- **Primary:** Deep purple background, white text.
- **Secondary:** Transparent background, 2px blue border, blue text.
- **Interaction:** On hover, primary buttons shift slightly darker; secondary buttons fill with a light blue tint.