# Design Handoff — Club der dichten Lebenden

**Figma-Datei:** `vQP5zRZW98GqtNQGNBW3rc`  
**Seite:** Dev Handoff  
**Erstellt:** Mai 2025  
**Screens:** 13 · Mobile App (390×844px)

---

## 1. Brand Identity

| Eigenschaft | Wert |
|-------------|------|
| **Kürzel** | CLD — Extra-Bold, kondensiert, Großbuchstaben |
| **Vollname** | CLUB DER DICHTEN LEBENDEN |
| **Icon-Mark** | Zwei Hände halten Buch aus Wasser |
| **Tagline** | Bücher. Gespräche. Gemeinschaft. |
| **Ton** | Selbstbewusst, literarisch, leicht humorvoll |
| **Energie** | Editorial — nicht minimal, nicht brutalistisch |
| **Wärme** | Analoge Papier-Haptik im digitalen Interface |

---

## 2. Farben / Colors

> ⚠️ Im Interface sparsam dosieren — App-Oberfläche ist hell & warm. Akzentfarben gezielt einsetzen.

| Token | Name | Hex | Verwendung |
|-------|------|-----|-----------|
| `--color-ink` | Ink Black | `#0D0D0D` | Headlines, Texte, dunkle BGs |
| `--color-papier` | Papier | `#F0EDE4` | App-Hintergrund, warme Surfaces |
| `--color-blue` | Electric Blue | `#1A4FE0` | Primäre CTAs, Links, aktiv |
| `--color-green` | Buchgrün | `#2A7A3A` | Erfolg, Gelesen-Status |
| `--color-orange` | Orange Press | `#E85D1F` | Upvotes, Badges, Energie |
| `--color-surface` | Card Surface | `#FAFAF7` | Cards, Modals, Inputs |
| `--color-muted` | Warm Gray | `#6B6B63` | Body-Text, Captions |
| `--color-border` | Border | `#E0DDD6` | Trennlinien, Input-Ränder |

---

## 3. Typografie / Typography

### Font Families

```css
/* Display & Headings */
font-family: 'Archivo Narrow', sans-serif;

/* Body, Labels, UI */
font-family: 'IBM Plex Sans', sans-serif;
```

### Type Scale

| Token | Familie | Size / LH | Verwendung |
|-------|---------|-----------|-----------|
| `--text-display` | Archivo Narrow Bold | 32 / 36px | Screen-Titel, Hero-Headlines |
| `--text-h1` | Archivo Narrow Bold | 24 / 28px | Karten-Titel, Buchnamen |
| `--text-h2` | Archivo Narrow Bold | 18 / 24px | Sektions-Überschriften |
| `--text-body` | IBM Plex Sans Regular | 15 / 22px | Haupt-Body-Text |
| `--text-body-sm` | IBM Plex Sans Regular | 13 / 20px | Captions, Meta, Timestamps |
| `--text-label` | IBM Plex Sans SemiBold | 12 / 16px | Tags, Chips, Labels |
| `--text-button` | IBM Plex Sans SemiBold | 15 / 20px | CTA-Buttons |

---

## 4. Abstände & Radius / Spacing

### Spacing

```css
--spacing-xs: 4px;   /* Icon gap, inline spacing */
--spacing-sm: 8px;   /* Tag padding, tight rows */
--spacing-md: 16px;  /* Card padding, list gap */
--spacing-lg: 24px;  /* Section padding horizontal */
--spacing-xl: 32px;  /* Screen edge padding */
--spacing-2xl: 48px; /* Section gap vertical */
```

### Border Radius

```css
--radius-sm: 8px;     /* Input fields, small chips */
--radius-md: 12px;    /* Buttons, tags */
--radius-lg: 16px;    /* Cards, bottom sheet */
--radius-xl: 24px;    /* Hero cards, modals */
--radius-full: 9999px; /* Pills, FAB, avatar circles */
```

---

## 5. Komponenten

| Komponente | Spezifikation |
|-----------|---------------|
| **Primär-Button** | Ink Black Fill · Weiß Text · radius-md · h 52px · px 24px |
| **Sekundär-Button** | Outline 1.5px Ink · Transparent · h 52px |
| **FAB** | 56×56px · radius-full · Ink · Shadow 0 4px 16px rgba(0,0,0,.15) |
| **Input-Feld** | h 52px · Border 1.5px --color-border · radius-sm · bg --color-surface |
| **Buch-Card** | radius-lg · Shadow 0 2px 12px rgba(0,0,0,.06) · padding 16px |
| **Avatar** | 36×36px · radius-full |
| **Status-Tag** | Pill · 6px vertical · 12px horizontal · radius-full |
| **Bottom Nav** | h 80px · bg --color-surface · Border-Top 1px --color-border |

---

## 6. Illustrationssystem

Alle Illustrationen: Schwarz-Weiß Lineart auf weißem/transparentem Hintergrund. Dekorativ, nie funktional. Max. Breite 320px. Accent-Einsatz: 30–40% Opacity.

| Node | Motiv | Screen | Platzierung |
|------|-------|--------|-------------|
| 38:222 | Zwei Hände | Splash / Welcome | Hero, volle Breite |
| 38:257 | Mann + Uhr | Termine | Header-Bereich |
| 38:303 | Lesender Mann | Home Feed | In Hero-Card |
| 38:345 | Dramatische Pose | Profil | Accent, 35% Opacity |
| 38:374 | Schlüsselloch/Auge | Login | Über Formular, mittig |
| 38:220 | Papierfetzen-Mann | Gelesene Bücher | Hero-Illustration |
| 38:216 | Kopf-Kratz-Mann | Error Screen | Zentral, humorvoll |
| 38:221 | Lesender Mann | Empty State | Zentral, einladend |

---

## 7. Screen-Inventar (13 Screens)

| # | Node ID | Screen | Beschreibung |
|---|---------|--------|-------------|
| 1 | 36:44 | Splash / Welcome | Hero-Typografie + Illustration |
| 2 | 36:67 | Login | E-Mail + Passwort + Schlüsselloch |
| 3 | 36:103 | Registrierung | 5-Felder Formular |
| 4 | 36:143 | Home Feed | Aktuelles Buch, Treffen, Feed |
| 5 | 36:213 | Bücherliste | Gefilterte Liste + FAB |
| 6 | 36:392 | Buch-Detail | Cover, Voting, Kommentare |
| 7 | 36:486 | Buch vorschlagen | Upload + Formular |
| 8 | 36:552 | Treffen / Termine | Kalender + RSVP |
| 9 | 36:731 | Gelesene Bücher | Grid + Club-Statistiken |
| 10 | 36:831 | Profil | Avatar, Stats, Aktivität |
| 11 | 44:6 | Success State | Bestätigung nach Aktion |
| 12 | 44:49 | Error State | Fehlerscreen + Illustration |
| 13 | 44:89 | Empty State | Leere Liste / keine Bücher |

---

## 8. Do's & Don'ts

### ✓ Do's
- Warme Cream-Töne als Basis (#F0EDE4) — kein reines Weiß
- Rundliche Ecken auf Cards (16–24px) und Modals
- Kondensierte Schrift für Screen-Titel und Hero-Headlines
- Subtile Schatten auf Cards (0 2px 12px rgba(0,0,0,.06))
- Orange für Upvotes · Buchgrün für Erfolg

### ✗ Don'ts
- Kein #000000 — immer #0D0D0D oder gar nicht
- Max. 2 Akzentfarben sichtbar pro Screen
- Keine scharfen Ecken (0px) auf interaktiven Elementen
- Keine kondensierte Schrift für Formulare oder Body-Text
- Illustrationen nie über 320px Breite in der App

---

## 9. Screen Details

### 9.1 Splash / Welcome (screen-splash)
- **Layout:** Full screen 390×844
- **Hero-Typografie:** "CLUB / DER / DICHTEN / LEBENDEN" — gestapelt, Archivo Narrow Bold, ~63px Zeilenhöhe
- **Illustration:** Book-open Icon (134px, y:273) als Platzhalter für Illustration
- **Buttons:** 2x volle Breite (326px), Abstand 68px untereinander
  - "Anmelden" — Primär-Button
  - "Registrieren" — Sekundär-Button
- **Hintergrund:** Gradient/Overlay mit abgerundeten Rechtecken

### 9.2 Login (screen-login)
- **Header:** Illustration (297×114px)
- **Titel:** "Willkommen zurück" (H1) + Subtitle "Schön, dass du wieder da bist."
- **Formular:**
  - E-Mail Input (Placeholder: "deine@mail.de")
  - Passwort Input (Placeholder: "••••••••")
  - "Passwort vergessen?" Link
- **CTA:** "Anmelden" Button (Primär, volle Breite)
- **Divider:** Linie — "oder" — Linie
- **Social:** "Mit Google anmelden" Button (Sekundär)
- **Footer:** "Noch kein Konto? Registrieren"

### 9.3 Registrierung (screen-registration)
- **Titel:** "Konto erstellen" (Display)
- **Formular:**
  - Vorname + Nachname (nebeneinander, je 157px)
  - E-Mail (volle Breite)
  - Passwort (volle Breite)
  - Passwort bestätigen (volle Breite)
  - Checkbox "Ich akzeptiere die Nutzungsbedingungen"
- **CTA:** "Registrieren" Button (Primär)
- **Footer:** "Bereits Mitglied? Anmelden"

### 9.4 Home Feed (screen-home)
- **Header:** "Guten Abend, Julian" + Avatar "CLD" (40×40)
- **Aktuelles Buch Card:**
  - Cover-Thumbnail (80×110)
  - Titel: "Der Process" · Autor: "Franz Kafka"
  - Upvotes: 24 Stimmen (mit arrow-up Icon)
  - Fortschritt: "64% gelesen" · "Kapitel 8" · Progress Bar (200/302px)
- **Nächstes Treffen:** Calendar-Icon + "Di, 14. Nov • 19:30 • Buchbox Berlin"
- **Zuletzt diskutiert:** Horizontale Karten (240px breit)
  - Avatar + Name + Zitat
- **Bottom Nav:** Bücher · Termine · Community · Profil

### 9.5 Bücherliste (screen-book-list)
- **Titel:** "Bücherliste" (Display)
- **Filter-Tabs:** Alle | Aktuell | Gelesen | Vorschläge
- **Buch-Items:** (342px breit, 120px hoch)
  - Cover (64×88px) + Titel + Autor + Jahr
  - Status-Tag ("Aktuell lesen" / "Gelesen" / "Vorschlag")
  - Upvote-Count mit Icon
- **FAB:** Plus-Button (56×56, unten rechts bei x:310, y:678)
- **Bottom Nav**

### 9.6 Buch-Detail (screen-book-detail)
- **Hero:** Cover-Bereich (390×360px) mit Back-Arrow
- **Info:**
  - Titel: "Der Process" (H1) + Autor/Jahr
  - Actions: Seitenanzahl(482) · Bookmark · Share
  - Status-Badge: "Aktuell gelesenes Buch im Club"
  - Tags: "Weltliteratur" · "Klassiker"
- **Beschreibung:** Truncated mit "Mehr lesen"
- **Diskussion (24):** Comment-Cards
  - Avatar + Name + Timestamp + Heart-Count
  - Comment-Text
- **Comment-Bar:** Avatar + Input "Kommentar schreiben..." + Send-Button
- **Bottom Nav**

### 9.7 Buch vorschlagen (screen-add-book)
- **Titel:** "Buch vorschlagen" (Display)
- **Cover Upload:** Dashed area (342×160) mit Upload-Icon + "Cover hochladen"
- **Formular:**
  - Titel (Input)
  - Autor (Input)
  - Erscheinungsjahr (Input, Placeholder: "z.B. 1925")
  - Kategorie (Tag-Picker: Roman · Lyrik · Essay · "+ Kategorie hinzufügen")
  - Beschreibung (Textarea, 120px hoch)
  - "Warum dieses Buch?" (Textarea, 80px hoch)
- **Actions:**
  - "Vorschlag einreichen" (Primär-Button)
  - "Abbrechen" (Text-Link)

### 9.8 Treffen / Termine (screen-appointments)
- **Titel:** "Treffen" (Display)
- **Kalender:** Mai 2025
  - Wochentage: M D M D F S S
  - Tage 1–31 in Grid (32×32 pro Tag)
  - Dot-Indicators auf 14. und 28.
  - Navigation: Chevron-left / Chevron-right
- **Bevorstehende Treffen:**
  - Farbiger Rand links (6px breit)
  - "Di, 14. Mai • 19:30 Uhr"
  - "Monatstreffen — Mai 2025"
  - Map-Pin + "Buchbox Berlin, Kiezladen"
  - Teilnehmer-Avatare (gestapelt) + "+12"
  - Actions: "Absagen" / "Zusagen" (Tags)
- **FAB:** Plus-Button

### 9.9 Gelesene Bücher (screen-read-books)
- **Titel:** "Gelesene Bücher" (Display)
- **Subtitle:** "12 Bücher gelesen • 3 dieses Jahr"
- **Grid:** 2 Spalten (158px je Karte)
  - Cover (158×220px)
  - Autor + Titel + Star-Rating (5 Sterne) + "gelesen" Tag
- **Club-Statistiken:** Horizontal scrollbar
  - 24 Bücher gesamt
  - 1.2k Diskussionen
  - 86 Mitglieder
  - Drama (Lieblingsgenre)

### 9.10 Profil (screen-profile)
- **Header:** Avatar (80×80) + Name "Julian" + Handle "@julian_reads" + "Mitglied seit 2023" + Edit-Button
- **Stats:** 12 Gelesen · 48 Kommentare · 4.8 Bewertungen
- **Meine Bücher:** 4 Cover-Thumbnails (64×88px) in Reihe
- **Aktivität:**
  - "Hat 'Siddhartha' bewertet" · vor 2 Stunden
  - "Neuer Kommentar zu 'Der Process'" · Gestern
  - "Hat 'Die Verwandlung' beendet" · Jan 12
- **Settings:**
  - Benachrichtigungen · Chevron-right
  - Datenschutz · Chevron-right
  - Abmelden · Chevron-right

### 9.11 Success State (screen-success)
- **Illustration:** Abgerundetes Quadrat (363×363) als Platzhalter
- **Text:**
  - "Geschafft!" (Display)
  - "Dein Buchvorschlag wurde eingereicht."
  - "Der Club stimmt bald ab — bleib gespannt!"
- **Actions:**
  - "Zurück zur Bücherliste" (Primär)
  - "Weiteren Vorschlag machen" (Sekundär)

### 9.12 Error State (screen-error)
- **Illustration:** Abgerundetes Quadrat (370×370) als Platzhalter
- **Text:**
  - "Etwas ist schiefgelaufen." (Display)
  - "Wir konnten deine Anfrage nicht verarbeiten. Bitte versuche es erneut."
  - "Fehler 500" (Label)
- **Actions:**
  - "Erneut versuchen" (Primär)
  - "Zurück zur Startseite" (Sekundär)

### 9.13 Empty State (screen-empty-books)
- **Illustration:** Abgerundetes Quadrat (430×430) als Platzhalter
- **Text:**
  - "Noch keine Bücher hier." (Display)
  - "Schlage das erste Buch für den Club vor und starte die Diskussion."
- **Actions:**
  - "Buch vorschlagen" (Primär)

---

## 10. Navigation

### Bottom Navigation Bar
- **Höhe:** 78–84px + 13px Home Indicator
- **Items:** 4 Tabs, gleichmäßig verteilt (70px breit)
  1. 📖 Bücher (book-open icon)
  2. 📅 Termine (calendar icon)
  3. 👥 Community (users icon)
  4. 👤 Profil (user icon)
- **Icon-Größe:** 24×24px
- **Label:** 14px, unter Icon (28px offset)

### Status Bar
- **Höhe:** 34–46px
- **Inhalt:** Zeit (9:41) links · Signal + WiFi + Battery rechts

---

## 11. Figma Source

- **File Key:** `vQP5zRZW98GqtNQGNBW3rc`
- **Section Node:** `38:448`
- **Design Tokens Node:** `45:957`
- **Brand Documentation Node:** `47:2`
- **URL:** https://www.figma.com/design/vQP5zRZW98GqtNQGNBW3rc/Spielwiese?node-id=38-448&m=dev