---
phase: 3
slug: books-reading-list
status: draft
created: 2026-05-26
---

# Phase 3 — UI Design Contract

> Visual and interaction contract for Phase 3: Books & Reading List.
> Covers: Books tab (segmented reading list), Book Search screen, Book Detail screen.
> Generated from design/design.md + screen references (screen-book-list.png, screen-book-detail.png, screen-add-book.png, screen-read-books.png, screen-empty-books.png).

---

## Design System

| Property | Value | Source |
|----------|-------|--------|
| Tool | Tamagui 2.0 (`@tamagui/core`, `@tamagui/config/v5`) | CLAUDE.md — locked |
| Font — headlines | **Archivo Narrow Bold** | design/design.md — screen titles, book titles on cards |
| Font — body/UI | **IBM Plex Sans Regular/SemiBold** | design/design.md — all interactive and readable text |
| Background | `#F0EDE4` (Papier) | design/design.md — critical rule, never white |
| Surface/cards | `#FAFAF7` | design/design.md |
| Icon library | `@expo/vector-icons` Feather set | Established in Phase 1 + 2 |
| Animation driver | `@tamagui/animations-react-native` | Phase 1 config — `fast`, `medium`, `slow` presets |

---

## Color Tokens (Phase 3 Usage)

| Token | Hex | Phase 3 Usage |
|-------|-----|---------------|
| `$color` (`--color-ink`) | `#0D0D0D` | Book titles, headings, icon fills |
| `$background` (`--color-papier`) | `#F0EDE4` | All screen backgrounds |
| `$backgroundStrong` (`--color-surface`) | `#FAFAF7` | BookCard background, Sheet frame, Detail screen header |
| `$borderColor` (`--color-border`) | `#E0DDD6` | Card borders, input borders, sheet handle |
| `$colorSecondary` (`--color-muted`) | `#6B6B63` | Author name, publication year, caption text |
| Blue (`--color-blue`) | `#1A4FE0` | Active tab indicator, "Planned" status badge |
| Orange (`--color-orange`) | `#E85D1F` | "Reading" status badge, FAB icon |
| Green (`--color-green`) | `#2A7A3A` | "Completed/Done" status badge |

**Rule:** Max 2 accent colors per screen. Book List uses blue (active tab) + one status color per card. Detail screen uses one accent for the status control.

---

## Spacing Scale (inherited from Phase 1/2)

| Token | Value | Phase 3 Usage |
|-------|-------|---------------|
| `$space.xs` | 4px | Badge padding, icon gaps |
| `$space.sm` | 8px | Card inner spacing (author below title), tab gap |
| `$space.md` | 16px | Card padding, list item vertical gap |
| `$space.lg` | 24px | Screen horizontal padding |
| `$space.xl` | 32px | Bottom sheet internal padding, FAB bottom offset |

---

## Typography (Phase 3)

| Role | Font | Size | Weight | Usage |
|------|------|------|--------|-------|
| Screen title | Archivo Narrow | 24px | Bold | "Books", "Find a book", "Book Detail" screen titles |
| Book title (card) | Archivo Narrow | 18px | Bold | Book name on BookCard and Detail screen |
| Author / Meta | IBM Plex Sans | 13px | Regular | Author, year, caption text |
| Body text | IBM Plex Sans | 15px | Regular | Book description, sheet content |
| Tab label | IBM Plex Sans | 13px | SemiBold | "Reading" / "Planned" / "Done" tab labels |
| Button | IBM Plex Sans | 15px | SemiBold | All CTAs |
| Status badge | IBM Plex Sans | 11px | SemiBold | "Reading", "Planned", "Done" pills |

---

## Screen A: Books Tab (Reading List)

**Route:** `(app)/books/index.tsx`
**Reference:** `design/screen-book-list.png`, `design/screen-read-books.png`, `design/screen-empty-books.png`

### Layout

```
SafeAreaView (background: #F0EDE4)
  YStack flex=1
    XStack paddingH=$lg paddingTop=$md alignItems=center
      Text [Archivo Narrow 24px] "Books"   flex=1
      TouchableOpacity → navigate to search
        Feather "plus" size=24 color=#0D0D0D

    Segmented Control (XStack gap=$xs paddingH=$lg paddingBottom=$md)
      [Tab: "Reading"]  [Tab: "Planned"]  [Tab: "Done"]

    ScrollView
      [BookCard list — filtered by active tab status]
      — OR empty state if no books match
```

### Segmented Control / Tabs

Three tabs displayed as a horizontal pill group:
- **Active tab:** solid fill `#0D0D0D` (Ink Black), white label, `borderRadius={9999}`, height 36px
- **Inactive tab:** transparent fill, `#6B6B63` label, same border radius
- Full-width XStack with 3 equal-width tabs (`flex=1` on each)
- Wraps in `XStack` with `backgroundColor="$backgroundStrong"` and `borderRadius={12}` container, `padding={4}`
- Labels: `tab_reading` / `tab_planned` / `tab_done` (i18n keys)

### BookCard Component

**File:** `expo-app/components/ui/BookCard.tsx`

```
YStack
  backgroundColor="$backgroundStrong"
  borderRadius={16}           ← cards rule
  overflow="hidden"
  shadowColor="rgba(0,0,0,.06)"
  shadowOffset={width:0, height:2}
  shadowRadius={12}
  elevation={2}
  // @ts-expect-error Tamagui 2.x animation prop
  animation="fast"
  pressStyle={{ opacity: 0.9 }}
  onPress → navigate to detail
  onLongPress → open status Sheet

  XStack padding=$md gap=$md
    Image
      width={72}
      height={108}              ← aspect ratio 2:3 (portrait)
      borderRadius={8}
      resizeMode="cover"
      source={{ uri: coverUrl }} | fallback illustration

    YStack flex=1 gap=$xs
      Text [Archivo Narrow 18px] numberOfLines=2 — book title
      Text [IBM Plex Sans 13px color=$colorSecondary] — author
      YStack marginTop="auto"
        StatusBadge — pill with color-coded status
```

### StatusBadge Component (inline, no separate file)

```tsx
// Inside BookCard or as a small inline component
<YStack
  backgroundColor={statusColor}  // per status color below
  paddingVertical={4}
  paddingHorizontal={10}
  borderRadius={9999}
  alignSelf="flex-start"
>
  <Text color="white" fontSize={11} fontWeight="600">
    {t(`books:status_${status}`)}
  </Text>
</YStack>
```

Status colors:
- `planned` → `#1A4FE0` (blue)
- `reading` → `#E85D1F` (orange)
- `completed` → `#2A7A3A` (green)

### Empty State

When no books match the active tab:

```
YStack alignItems=center justifyContent=center paddingH=$lg gap=$md flex=1
  Image
    source={require('../../../assets/illustrations/empty-man.png')}
    width={220}
    height={220}
    resizeMode="contain"
  Text [Archivo Narrow 24px] — books.empty_list_heading
  Text [IBM Plex Sans 15px color=$colorSecondary textAlign=center] — books.empty_list_subtext
  Button variant="primary" → navigate to search
    {t('books:empty_search_cta')}
```

---

## Screen B: Book Search

**Route:** `(app)/books/search.tsx`
**Reference:** `design/screen-add-book.png`

### Layout

```
SafeAreaView (background: #F0EDE4)
  YStack flex=1
    XStack paddingH=$lg paddingTop=$md paddingBottom=$sm alignItems=center gap=$sm
      TouchableOpacity onPress → router.back()
        Feather "arrow-left" size=24 color=#0D0D0D
      Input
        flex=1
        placeholder={t('books:search_placeholder')}
        value={searchText}
        onChangeText={setSearchText}
        autoFocus={true}
        returnKeyType="search"
        clearButtonMode="while-editing"

    [Results area — conditional rendering]
    — Loading skeleton: 3 BookCard placeholders (opacity 0.5)
    — Results: FlatList / ScrollView of BookCard items (search variant)
    — Empty: empty state illustration + message
    — Error: Alert component type="error"
    — Load more: Button variant="secondary" at bottom of list
```

### BookCard (Search Variant)

Same `BookCard` component, but without `StatusBadge`. Instead show publication year:

```
...
  Text [IBM Plex Sans 13px color=$colorSecondary] — author
  Text [IBM Plex Sans 12px color=$colorSecondary] — published year (if available)
```

`onPress` → navigate to `(app)/books/[googleBooksId]?source=search` with title/author/coverUrl/isbn passed as params.

### Load More Button

```
YStack paddingH=$lg paddingV=$md
  Button variant="secondary" onPress={fetchNextPage} loading={isFetchingNextPage}
    {t('books:search_load_more')}
```

Only shown when `hasNextPage === true`.

---

## Screen C: Book Detail

**Route:** `(app)/books/[id].tsx`
**Reference:** `design/screen-book-detail.png`
**Accessible from:** Search results (source=search) and Reading list (source=list)

### Layout

```
SafeAreaView (background: #F0EDE4)
  ScrollView
    YStack

      [Header]
      XStack paddingH=$lg paddingTop=$md paddingBottom=$sm alignItems=center
        TouchableOpacity → router.back()
          Feather "arrow-left" size=24
        [spacer flex=1]
        [Feather "bookmark" if in list — visual only indicator, optional]

      [Cover + Title section]
      YStack alignItems=center paddingH=$lg paddingTop=$md paddingBottom=$lg gap=$md
        Image
          width={160}
          height={240}          ← aspect ratio 2:3
          borderRadius={12}
          resizeMode="cover"
          source={{ uri: coverUrl }}

        YStack alignItems=center gap=$xs
          Text [Archivo Narrow 24px textAlign=center] — title
          Text [IBM Plex Sans 15px color=$colorSecondary] — author
          Text [IBM Plex Sans 13px color=$colorSecondary] — published year (if available)

      [Description section — if source=search or has description]
      YStack paddingH=$lg gap=$sm
        Text [IBM Plex Sans 15px lineHeight=22] numberOfLines={collapsed ? 3 : undefined}
          — book description
        TouchableOpacity onPress → toggle expanded
          Text [IBM Plex Sans 13px color=#1A4FE0] — "Read more" / "Show less"

      [Divider]
      YStack height={1} backgroundColor="$borderColor" marginH=$lg marginV=$lg

      [Status / Add to list section]
      — When source=list (already in reading list):
        YStack paddingH=$lg gap=$md
          Text [IBM Plex Sans 13px fontWeight=600 color=$colorSecondary] — "books:change_status_heading"
          StatusButtonGroup (3 buttons, active one filled)

          [Remove from list — bottom destructive action]
          YStack marginTop=$xl
            Button
              variant="text"
              onPress → deleteMutation.mutate(personalBookId)
              style={{ color: '#D32F2F' }}       ← destructive text color
              loading={deleteMutation.isPending}
              {t('books:remove_from_list')}

      — When source=search (not yet in list):
        YStack paddingH=$lg gap=$md
          Text [IBM Plex Sans 13px fontWeight=600 color=$colorSecondary] — "books:add_to_list_heading"
          StatusButtonGroup (3 buttons, none active by default — or 'planned' pre-selected)

          Button
            variant="primary"
            onPress → addMutation.mutate({ item, status: selectedStatus })
            loading={addMutation.isPending}
            {t('books:add_to_list_cta')}

      YStack height={40} — bottom spacer
```

### StatusButtonGroup Component

```tsx
// Three adjacent buttons for status selection
XStack gap=$sm
  {(['planned', 'reading', 'completed'] as const).map(s => (
    <YStack
      key={s}
      flex={1}
      height={44}
      borderRadius={12}
      alignItems="center"
      justifyContent="center"
      backgroundColor={status === s ? statusColor(s) : '$backgroundStrong'}
      borderWidth={1.5}
      borderColor={status === s ? statusColor(s) : '$borderColor'}
      pressStyle={{ opacity: 0.85 }}
      onPress={() => setStatus(s)}
    >
      <Text
        fontSize={13}
        fontWeight="600"
        color={status === s ? 'white' : '$colorSecondary'}
      >
        {t(`books:status_${s}`)}
      </Text>
    </YStack>
  ))}
```

---

## Sheet: Long-Press Status Change

**Trigger:** `onLongPress` on a `BookCard` in the reading list
**Component:** Tamagui `Sheet`

```tsx
<Sheet
  modal
  open={statusSheetOpen}
  onOpenChange={setStatusSheetOpen}
  snapPoints={[40]}
  dismissOnSnapToBottom
  // @ts-expect-error Tamagui 2.x animation prop requires config registration
  animation="slow"
>
  {/* @ts-expect-error */}
  <Sheet.Overlay animation="medium" enterStyle={{ opacity: 0 }} exitStyle={{ opacity: 0 }} />
  <Sheet.Handle />
  <Sheet.Frame
    borderTopLeftRadius={24}
    borderTopRightRadius={24}
    backgroundColor="$backgroundStrong"
    paddingHorizontal="$lg"
    paddingVertical="$md"
    gap="$md"
  >
    <Text fontFamily="$heading" fontSize={18} color="$color">
      {t('books:change_status_heading')}
    </Text>
    <StatusButtonGroup status={currentStatus} onStatusChange={handleStatusChange} />
  </Sheet.Frame>
</Sheet>
```

---

## FAB Button

On the Books tab (reading list), the "+" to navigate to search:

```tsx
// In books/index.tsx header (right side):
<TouchableOpacity
  onPress={() => router.push('/(app)/books/search' as never)}
  accessibilityRole="button"
  accessibilityLabel={isClient ? t('books:add_book_fab') : 'Add book'}
  style={{ padding: 10 }}
>
  <Feather name="plus" size={24} color="#0D0D0D" />
</TouchableOpacity>
```

Design spec says FAB is 56×56px with Ink fill and shadow. Use the TouchableOpacity pattern from clubs/index.tsx to match established pattern — a circular FAB is also valid per design.md if preferred.

---

## Skeleton Loading States

Follow the pattern from `clubs/index.tsx`:

```tsx
// BookCard skeleton
{[1, 2, 3].map(i => (
  <YStack
    key={i}
    height={124}
    backgroundColor="$backgroundStrong"
    borderRadius={16}
    opacity={0.5}
    marginBottom="$sm"
    // @ts-expect-error Tamagui 2.x animation prop requires config registration
    animation="slow"
  />
))}
```

---

## Delete Animation (D-14: slide-out)

After `deleteMutation.onSuccess`, the card should slide out. Because the detail screen navigates back on delete (`router.back()`), the animation happens on the Books list when it re-renders with the deleted item removed. TanStack Query `invalidateQueries` causes a re-render; the removed card animates out via Tamagui's `exitStyle`:

```tsx
// On BookCard:
exitStyle={{ opacity: 0, x: -100 }}
// @ts-expect-error Tamagui 2.x animation prop requires config registration
animation="fast"
```

---

## Error Handling

Reuse existing `Alert` component (`components/ui/Alert.tsx`) with `type="error"`:

```tsx
{searchError && <Alert type="error" message={t('books:error_search_failed')} />}
```

---

## Navigation Contract

| From | To | Route | Method |
|------|-----|-------|--------|
| Books tab | Book Search | `/(app)/books/search` | `router.push()` |
| Search result | Book Detail | `/(app)/books/${googleBooksId}?source=search&title=...&author=...&coverUrl=...` | `router.push()` |
| Book list card | Book Detail | `/(app)/books/${personalBookId}?source=list` | `router.push()` |
| Detail (delete) | Books tab | back | `router.back()` |
| Detail (add) | Books tab | back | `router.back()` (after success) |
| Search | back | Books tab | `router.back()` |

---

## Expo Router File Convention

The `[(app)/books/[id].tsx]` dynamic segment is available in Expo Router SDK 56. No special layout file is required for the books sub-screens — they push onto the existing `(app)` stack.

If a `_layout.tsx` is needed in the `books/` folder (to configure the stack header), create a minimal one:

```tsx
// expo-app/app/(app)/books/_layout.tsx
import { Stack } from 'expo-router';
export default function BooksLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

---

## Accessibility

- All interactive elements: `accessibilityRole` set appropriately
- Cover images: `accessibilityLabel={t('books:cover_alt', { title: book.title })}`
- Status buttons: `accessibilityState={{ selected: status === s }}`
- Long-press: `accessibilityHint={t('common:more_options')}`

---

## Component Summary

| Component | File | New / Modified |
|-----------|------|----------------|
| `BookCard` | `components/ui/BookCard.tsx` | New |
| `Books` (tab root) | `app/(app)/books/index.tsx` | Replace stub |
| `BooksSearch` | `app/(app)/books/search.tsx` | New |
| `BookDetail` | `app/(app)/books/[id].tsx` | New |
| `BooksLayout` | `app/(app)/books/_layout.tsx` | New (if needed) |
| i18n `books` namespace | `lib/i18n/en.json`, `de.json` | Extend |
| `useDebounce` hook | `lib/hooks/useDebounce.ts` | New |
| Edge Function | `supabase/functions/google-books-search/index.ts` | New |

---

*Phase: 3-books-reading-list*
*UI-SPEC generated: 2026-05-26 (auto mode)*
