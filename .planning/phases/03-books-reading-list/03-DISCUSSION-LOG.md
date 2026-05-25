# Phase 3: Books & Reading List - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-26
**Phase:** 3-Books & Reading List
**Areas discussed:** Search UX, Book Detail Screen, List Layout & Status Display, Status Change Interaction

---

## Search UX

### Where does book search live?

| Option | Description | Selected |
|--------|-------------|----------|
| Separate search screen | Books tab shows the list; '+' / FAB navigates to `(app)/books/search` | ✓ |
| Inline in Books tab | Search bar at top of tab; results replace the list inline | |
| You decide | Claude picks based on navigation structure | |

**User's choice:** Separate search screen
**Notes:** Search lives at a dedicated route, keeping the Books tab clean.

---

### How should search trigger?

| Option | Description | Selected |
|--------|-------------|----------|
| 300ms debounce, 2 char min | Live as you type, starts after 2 chars | ✓ |
| Manual submit | Only fires on button tap or return key | |
| Live, no debounce | Fires on every keystroke | |

**User's choice:** 300ms debounce, 2 char min

---

### How many search results to show?

| Option | Description | Selected |
|--------|-------------|----------|
| 10 results max | Simple cap, no pagination | |
| 20 results max | More results, still no pagination | |
| Paginated (10 + load more) | First 10, then "Load more" button | ✓ |

**User's choice:** Paginated (10 + load more)

---

### What happens when search returns no results?

| Option | Description | Selected |
|--------|-------------|----------|
| Empty state illustration + message | Friendly illustration + 'No books found' | ✓ |
| Plain text only | 'No results for "..."' | |
| Text + search tips | Suggestion to try different term or ISBN | |

**User's choice:** Empty state illustration + message

---

## Book Detail Screen

### Is there a separate Book Detail screen?

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated detail screen | Opens from search result; shows cover, title, author, description, add-to-list action | ✓ |
| No detail screen — inline add | Search result has inline 'Add' button with bottom sheet status picker | |
| You decide | Claude picks based on architecture | |

**User's choice:** Dedicated detail screen

---

### What information appears on the Book Detail screen?

| Option | Description | Selected |
|--------|-------------|----------|
| Cover + title + author + description | Clean reading experience, description expandable | ✓ |
| Cover + title + author only | Minimal | |
| Full Google Books metadata | Everything: publisher, page count, categories, etc. | |

**User's choice:** Cover + title + author + description

---

### Can the Book Detail screen be reached from the reading list?

| Option | Description | Selected |
|--------|-------------|----------|
| Also accessible from the reading list | Same screen; shows current status when accessed from list | ✓ |
| Search-only | Only reachable from search results | |

**User's choice:** Also accessible from the reading list

---

## List Layout & Status Display

### How should books be displayed in the reading list?

| Option | Description | Selected |
|--------|-------------|----------|
| Horizontal rows with cover thumbnail | 60×90px thumbnail on left, text on right | |
| Portrait cover cards | Full-width card, prominent cover, title + author below | ✓ |
| Text-only rows | No covers in list; covers only in detail | |

**User's choice:** Portrait cover cards
**Notes:** Visual cover image matters for a reading app; full-width cards give it prominence.

---

### How should status be organized in the list view?

| Option | Description | Selected |
|--------|-------------|----------|
| Tabs / segmented control per status | Three tabs at top: Reading / Planned / Done | ✓ |
| Single list with status badges | All books together, colored badges to differentiate | |
| Two sections: active list + read books screen | Matches screen-read-books.png design | |

**User's choice:** Tabs / segmented control
**Notes:** Labels to use: "Reading" / "Planned" / "Done"

---

### How should status be visually indicated on each book card?

| Option | Description | Selected |
|--------|-------------|----------|
| Blue / Orange / Green badges | Design token colors: #1A4FE0 / #E85D1F / #2A7A3A | ✓ |
| Text label, no color | 'Planned', 'Reading', 'Read' in plain text | |
| Icon only | Bookmark / book-open / check icons | |

**User's choice:** Blue / Orange / Green badges matching design tokens

---

## Status Change Interaction

### How does the user change a book's status?

| Option | Description | Selected |
|--------|-------------|----------|
| Change status on the Book Detail screen | Segmented control or button group on detail screen | ✓ |
| Long-press on list card — bottom sheet | Long-press reveals status options in a sheet | ✓ |
| Swipe actions on list row | Swipe-left reveals status buttons | |

**User's choice:** Both option 1 AND option 2 — status can be changed from the detail screen and via long-press bottom sheet on the list card.

---

### How does the user delete a book from their reading list?

| Option | Description | Selected |
|--------|-------------|----------|
| Delete from detail screen only | 'Remove from list' button at bottom of detail screen | ✓ |
| Delete from long-press sheet too | Delete included alongside status options in long-press sheet | |
| Swipe-to-delete on list card | Swipe-left reveals delete button | |

**User's choice:** Delete from detail screen only

---

### Should deletion require confirmation?

| Option | Description | Selected |
|--------|-------------|----------|
| Confirmation dialog | 'Remove "Book Title" from your list?' dialog | |
| Immediate delete + undo toast | Immediate with 4-second undo toast | |
| No confirmation | Delete immediately | |

**User's choice:** "do animation and no confirmation" — immediate slide-out animation, no confirmation dialog.

---

## Claude's Discretion

- Route path for book detail (e.g. `(app)/books/[id]` vs `(app)/books/search/[id]`)
- Exact layout of "Add to list" button vs. status picker on the detail screen
- Google Books Edge Function name and caching strategy

## Deferred Ideas

None — discussion stayed within phase scope.
