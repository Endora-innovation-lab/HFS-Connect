# Project conventions

- Main app logo placements share a single uploaded asset pointer; the footer uses a separate uploaded transparent variant. Favicon and PWA icons are proportionally resized derivatives with safe padding, so all surfaces retain the supplied artwork without distortion or platform cropping.
- Shared theme roles live in global CSS and Tailwind tokens; brand accents and success/warning/error colors remain separate so changing branding never obscures operational statuses.