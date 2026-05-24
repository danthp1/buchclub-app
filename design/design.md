# Design Guidelines — Club der dichten Lebenden

**Produkt:** Buchclub Mobile App (iOS · Android · Web)  
**Version:** 1.0 · Mai 2025  
**Figma:** [`vQP5zRZW98GqtNQGNBW3rc`](https://www.figma.com/design/vQP5zRZW98GqtNQGNBW3rc/Spielwiese?node-id=38-448&m=dev) → Seite: Dev Handoff

---

## Brand

| | |
|---|---|
| **Name** | CLUB DER DICHTEN LEBENDEN (Kürzel: CLD) |
| **Tagline** | Bücher. Gespräche. Gemeinschaft. |
| **Ton** | Selbstbewusst, literarisch, leicht humorvoll |
| **Stil** | Editorial — nicht minimal, nicht brutalistisch |
| **Haptik** | Analoge Papier-Haptik im digitalen Interface |

---

## Farben

> Im Interface sparsam dosieren. Max. 2 Akzentfarben pro Screen sichtbar.

| Token | Hex | Verwendung |
|-------|-----|-----------|
| `--color-ink` | `#0D0D0D` | Headlines, Texte, dunkle Hintergründe |
| `--color-papier` | `#F0EDE4` | App-Hintergrund, warme Surfaces |
| `--color-surface` | `#FAFAF7` | Cards, Modals, Input-Felder |
| `--color-border` | `#E0DDD6` | Trennlinien, Input-Ränder |
| `--color-muted` | `#6B6B63` | Body-Text, Captions, Timestamps |
| `--color-blue` | `#1A4FE0` | Primäre CTAs, Links, aktiver Zustand |
| `--color-orange` | `#E85D1F` | Upvotes, Badges, Energie |
| `--color-green` | `#2A7A3A` | Erfolg, Gelesen-Status |

**Regeln:**
- Nie `#000000` — immer `#0D0D0D`
- Hintergrund ist immer `#F0EDE4` (Papier), nie reines Weiß
- Electric Blue für primäre Aktionen, Orange für soziale Energie (Upvotes)

---

## Typografie

### Schriftarten

| Rolle | Familie | Laden via |
|-------|---------|-----------|
| Display & Headlines | **Archivo Narrow** (Bold) | Google Fonts / expo-font |
| Body, Labels, UI | **IBM Plex Sans** (Regular, SemiBold) | Google Fonts / expo-font |

### Type Scale

| Token | Schrift | Größe / Zeilenhöhe | Einsatz |
|-------|---------|---------------------|---------|
| `display` | Archivo Narrow Bold | 32px / 36px | Screen-Titel, Hero-Headlines |
| `h1` | Archivo Narrow Bold | 24px / 28px | Karten-Titel, Buchnamen |
| `h2` | Archivo Narrow Bold | 18px / 24px | Sektions-Überschriften |
| `body` | IBM Plex Sans Regular | 15px / 22px | Haupt-Fließtext |
| `body-sm` | IBM Plex Sans Regular | 13px / 20px | Captions, Meta, Timestamps |
| `label` | IBM Plex Sans SemiBold | 12px / 16px | Tags, Chips, Kategorie-Labels |
| `button` | IBM Plex Sans SemiBold | 15px / 20px | CTA-Buttons |

**Regeln:**
- Archivo Narrow nur für Headlines, Screen-Titel, Hero — nie für Formulare oder Fließtext
- IBM Plex Sans für alles Interaktive und Lesbare

---

## Abstände

```
xs   4px   — Icon-Gap, Inline-Abstände
sm   8px   — Tag-Padding, enge Reihen
md  16px   — Card-Padding, Listen-Gap
lg  24px   — Horizontales Screen-Padding
xl  32px   — Screen-Edge-Padding
2xl 48px   — Vertikaler Sektions-Abstand
```

---

## Radius

```
sm    8px     — Inputs, kleine Chips
md   12px     — Buttons, Tags
lg   16px     — Cards, Bottom Sheet
xl   24px     — Hero-Cards, Modals
full 9999px   — Pills, FAB, Avatare
```

**Regel:** Keine scharfen Ecken (0px) auf interaktiven Elementen.

---

## Komponenten

### Buttons

| Typ | Spezifikation |
|-----|---------------|
| **Primär** | Fill `#0D0D0D` · Weiß Text · `radius-md` · Höhe 52px · Padding 24px horizontal |
| **Sekundär** | Outline 1.5px `#0D0D0D` · Transparent · Höhe 52px |
| **FAB** | 56×56px · `radius-full` · Ink Fill · Shadow `0 4px 16px rgba(0,0,0,.15)` |

### Inputs

| Eigenschaft | Wert |
|-------------|------|
| Höhe | 52px |
| Border | 1.5px `--color-border` |
| Radius | `radius-sm` (8px) |
| Hintergrund | `--color-surface` |

### Cards

| Eigenschaft | Wert |
|-------------|------|
| Radius | `radius-lg` (16px) |
| Shadow | `0 2px 12px rgba(0,0,0,.06)` |
| Padding | 16px |

### Weitere Elemente

| Element | Spezifikation |
|---------|---------------|
| **Avatar** | 36×36px · `radius-full` |
| **Status-Tag** | Pill · 6px vertikal · 12px horizontal · `radius-full` |
| **Bottom Nav** | Höhe 80px · Hintergrund `--color-surface` · Border-Top 1px `--color-border` |

---

## Illustrationen

- **Stil:** Schwarz-Weiß Lineart auf weißem/transparentem Hintergrund
- **Funktion:** Dekorativ — nie funktional (kein interaktives Element)
- **Maximale Breite:** 320px in der App
- **Farbakzent:** 30–40% Opacity wenn verwendet

| Motiv | Screen | Platzierung | Figma-Node |
|-------|--------|-------------|-----------|
| Zwei Hände halten Buch | Splash / Welcome | Hero, volle Breite | 38:222 |
| Mann + Uhr | Termine | Header-Bereich | 38:257 |
| Lesender Mann | Home Feed | In Hero-Card | 38:303 |
| Dramatische Pose | Profil | Accent, 35% Opacity | 38:345 |
| Schlüsselloch/Auge | Login | Über Formular, mittig | 38:374 |
| Papierfetzen-Mann | Gelesene Bücher | Hero-Illustration | 38:220 |
| Kopf-Kratz-Mann | Error Screen | Zentral, humorvoll | 38:216 |
| Lesender Mann | Empty State | Zentral, einladend | 38:221 |

---

## Navigation

### Bottom Navigation Bar

4 Tabs, gleichmäßig verteilt:

| # | Icon | Label |
|---|------|-------|
| 1 | book-open | Bücher |
| 2 | calendar | Termine |
| 3 | users | Community |
| 4 | user | Profil |

- Icon-Größe: 24×24px
- Label: 14px IBM Plex Sans, unter Icon
- Höhe: 80px + Home Indicator

---

## Screen-Übersicht (13 Screens)

| # | Screen | Figma-Node |
|---|--------|-----------|
| 1 | Splash / Welcome | 36:44 |
| 2 | Login | 36:67 |
| 3 | Registrierung | 36:103 |
| 4 | Home Feed | 36:143 |
| 5 | Bücherliste | 36:213 |
| 6 | Buch-Detail | 36:392 |
| 7 | Buch vorschlagen | 36:486 |
| 8 | Treffen / Termine | 36:552 |
| 9 | Gelesene Bücher | 36:731 |
| 10 | Profil | 36:831 |
| 11 | Success State | 44:6 |
| 12 | Error State | 44:49 |
| 13 | Empty State | 44:89 |

---

## Do's & Don'ts

### Do
- Warme Cream-Basis (`#F0EDE4`) — kein reines Weiß
- Rundliche Ecken auf Cards (16–24px) und Modals
- Archivo Narrow für alle Screen-Titel und Hero-Headlines
- Subtile Schatten auf Cards (`0 2px 12px rgba(0,0,0,.06)`)
- Orange (`#E85D1F`) für Upvotes · Grün (`#2A7A3A`) für Erfolgs-Zustände
- Electric Blue (`#1A4FE0`) ausschließlich für primäre Aktionen und Links

### Don't
- Nie `#000000` — immer `#0D0D0D`
- Max. 2 Akzentfarben gleichzeitig pro Screen
- Keine scharfen Ecken (0px) auf Buttons, Cards oder Inputs
- Kein Archivo Narrow in Formularen oder Fließtext
- Illustrationen nie breiter als 320px
- Illustrationen nie als interaktive/funktionale Elemente einsetzen

---

*Vollständige Screen-Specs und Komponenten-Details: [`design-handoff.md`](./design-handoff.md)*
