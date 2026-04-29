# bentwo — Technical Specification

## Purpose

This document is the single source of truth for the architecture, implementation plan, and design decisions of **bentwo**, a personal website builder for creatives. It exists so that every engineering decision can be traced back to an explicit requirement or constraint documented here.

**How to use this document:**
- Each phase is self-contained and testable in isolation. A phase is considered **complete** only when its defined tests pass.
- Phases are ordered by dependency. Do not start Phase N+1 until Phase N is complete.
- Open questions (marked with 🔬) are decisions that require research or prototyping before the phase can be finalized.
- Stretch goals at the end are explicitly unplanned. They are recorded so they don't get lost, but they do not affect MVP scope.

---

## Core Principles

1. **Isolation:** Every phase builds a testable artifact. No phase depends on downstream phases to function.
2. **Simplicity:** Use the minimum code that solves the problem. No speculative abstractions.
3. **First-Principles:** Build primitives (components, hooks, schemas) from scratch. Do not carry over assumptions from the old `spec.md`.
4. **Guest-First:** The editor works without authentication. Auth and persistence are layered on, not required for basic functionality.

---

## Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Framework | Next.js 15 (App Router) | File-based routing, SSR for public sites, one codebase |
| Language | TypeScript 5.x | Type safety across editor and renderer |
| Styling | Tailwind CSS 4.x | Utility-first, responsive by default |
| Components | shadcn/ui | Headless primitives, consistent with Tailwind |
| Editor Engine | `@craftjs/core` | Declarative node tree, built-in drag-and-drop, serialization |
| Icons | `@phosphor-icons/react` | Consistent icon set, better than lucide for this aesthetic |
| Database | InstantDB (`@instantdb/react`) | Client-first, real-time, auth built-in, no backend boilerplate |
| Animation | None for MVP | Defer to post-MVP |

---

## Data Model

### InstantDB Schema

```typescript
// instant.schema.ts — Phase 7 finalizes this
entities: {
  $users: i.entity({
    email: i.string().unique().indexed().optional(),
    imageURL: i.string().optional(),
  }),
  $files: i.entity({
    path: i.string().unique().indexed(),
    url: i.string(),
  }),
  sites: i.entity({
    subdomain: i.string().unique().indexed(),
    name: i.string(),
    settings: i.json(), // { title, metaDescription, faviconUrl, ogImageUrl }
    publishedAt: i.number().optional(), // timestamp
  }),
  pages: i.entity({
    siteId: i.string().indexed(),
    slug: i.string().indexed(),
    name: i.string(),
    contentJSON: i.json(), // Craft.js serialized tree (single blob)
    order: i.number(), // for page ordering in nav
  }),
}
links: {
  siteOwner: {
    forward: { on: "sites", has: "one", label: "owner" },
    reverse: { on: "$users", has: "many", label: "sites" },
  },
  sitePages: {
    forward: { on: "sites", has: "many", label: "pages" },
    reverse: { on: "pages", has: "one", label: "site" },
  },
}
```

### Content Tree Format

Each page stores its entire Craft.js tree as a single JSON blob in `pages.contentJSON`.

**Why blob, not normalized nodes:**
- One read/write per page. No N+1 query problems.
- Craft.js's `query.serialize()` / `actions.deserialize()` work natively with zero transformation.
- InstantDB does not need to query inside the tree structure. The tree is opaque to the DB.
- Upgrade path: can migrate to normalized nodes later by walking the blob.

**Tradeoff accepted:** Cannot ask InstantDB "find all pages containing a Card." This is not an MVP requirement.

---

## Phases

### Phase 0 — Stack Migration: Vite → Next.js

**Goal:** The repository builds and runs as a Next.js App Router application. All existing UI components and styles are preserved.

**Scope:**
- Remove Vite, `vite.config.ts`, and `index.html`.
- Install Next.js 15 with App Router.
- Reconfigure Tailwind CSS v4 for Next.js.
- Create App Router file structure: `app/layout.tsx`, `app/page.tsx` (landing), `app/editor/page.tsx`.
- Remove `react-router-dom` dependency. Use Next.js `Link` and file-based routing.
- Port `src/main.tsx` logic into `app/layout.tsx`.
- Ensure all existing `components/ui/*` and `components/user/*` imports resolve.
- Verify `tailwind-merge`, `class-variance-authority`, `clsx` still work.
- Update `tsconfig.json` if needed for Next.js path aliases.

**Definition of Done:**
- [ ] `npm run dev` starts Next.js dev server without errors.
- [ ] `npm run build` produces a successful production build.
- [ ] `/` renders a placeholder landing page.
- [ ] `/editor` renders a placeholder editor page.
- [ ] All 4 existing user components (`UText`, `UCard`, `UButton`, `UContainer`) render without visual regression.

**Open Questions:**
- 🔬 Tailwind v4 configuration syntax changed significantly from v3. Research the correct `globals.css` import pattern for Next.js.
- 🔬 `shadcn/ui` components were installed for Vite. Do they need re-initialization for Next.js?

---

### Phase 1 — Craft.js Core Foundation

**Goal:** The `/editor` route renders a functioning Craft.js canvas with a default text node. The node is selectable and serializable.

**Scope:**
- Install `@craftjs/core` and its peer dependencies (`@craftjs/layers` is deferred).
- Build the editor shell component hierarchy:
  ```
  <Editor resolver={resolver}>
    <Frame>
      <Element is="div" canvas={true}>
        {/* default nodes */}
      </Element>
    </Frame>
  </Editor>
  ```
- Convert `UText` from a plain React component to a Craft.js **User Component**:
  - Wrap with `React.forwardRef`.
  - Use `useNode()` hook inside.
  - Attach `connectors.connect` and `connectors.drag` to the outer DOM element.
  - Define static `.craft` property with default `props` and `rules`.
  - Use `setProp` for prop mutations.
- Convert `UCard`, `UButton` to User Components with `.craft` defaults.
- Build a `resolver` object mapping component names to User Components.
- Render a default tree: one `UText` node with placeholder text.
- Add visual selection/hover states:
  - `isSelected` → blue ring border.
  - `isHovered` → subtle gray background tint.
  - Only one node selected at a time.

**Definition of Done:**
- [ ] `/editor` renders without runtime errors.
- [ ] A default text node appears on the canvas.
- [ ] Clicking the text shows a blue selection ring.
- [ ] Hovering the text shows a hover state.
- [ ] Calling `query.serialize()` returns a JSON tree with the text node and its props.
- [ ] `UCard` and `UButton` are registered in the resolver and can be referenced in serialized trees.

**Open Questions:**
- 🔬 Does `@craftjs/core` support React 19? If not, what is the compatibility workaround?
- 🔬 How does Craft.js handle SSR in Next.js? The `<Editor>` must likely be wrapped in a `"use client"` boundary.

---

### Phase 2 — The Slash Command

**Goal:** Typing `/` inside the default text node opens a command palette. Selecting an item replaces the current node with that component type.

**Scope:**
- Make `UText` editable inline. Use a controlled `contentEditable` div or `<input>`.
- Track the current text value in the node's props via `setProp`.
- On `onKeyDown` in the text input:
  - If key is `/`, record that slash-command mode is active.
  - If key is `Escape`, cancel slash-command mode.
  - If key is `Enter` or `ArrowDown` while in slash mode, navigate dropdown.
- Render a dropdown menu below the cursor position when slash mode is active.
- Dropdown lists all available component types: `Text`, `Card`, `Button`.
- Filter dropdown items by substring after `/` (e.g., `/ca` → Card).
- On item selection:
  1. Get current node's ID and parent ID.
  2. Delete current node via `actions.delete(id)`.
  3. Create new node tree for selected component type via `query.parseReactElement()`.
  4. Add new node at the same index in parent via `actions.addNodeTree()`.
- Support undo: the delete+add sequence must be a single undoable action (or two sequential undos must restore original state).

**Definition of Done:**
- [ ] Typing `/` in the text node opens a dropdown.
- [ ] Dropdown lists Card, Button, Text.
- [ ] Typing `/bu` filters to Button.
- [ ] Selecting Button replaces the text node with a Button component at the exact same position.
- [ ] Pressing `Cmd+Z` restores the original text node.
- [ ] Escape closes the dropdown without replacing anything.

**Open Questions:**
- 🔬 Craft.js `actions.addNodeTree()` — does it preserve insertion order relative to siblings? Verify behavior.
- 🔬 Should the dropdown be a floating UI element (portaled) or inline? Inline is simpler for MVP.

---

### Phase 3 — Hover Toolbar (Add-Below + Drag)

**Goal:** Hovering any component shows two action icons: `+` to add a component below, and a drag handle to reorder.

**Scope:**
- Inside each User Component, use `useNode()` to read `isHovered`.
- When hovered, render a small floating toolbar adjacent to the node (left side or top-right).
- Toolbar contains two icon buttons (Phosphor icons):
  - `Plus` icon: "Add component below."
  - `DotsSixVertical` or `HandGrabbing` icon: drag handle.
- **Add-Below (`+`):**
  - On click, insert a new `UText` node immediately after the hovered node.
  - Use `actions.add()` with the new node and target parent/index.
  - The new text node starts in edit mode (optional: focus it).
- **Drag Handle:**
  - Attach `connectors.drag(ref)` to the drag handle button element.
  - The handle itself is the drag initiator, not the whole component.
  - Craft.js built-in positioner handles drop indicators and reordering.
  - Ensure `forwardRef` on the component outer element so Craft.js can measure DOM bounds.

**Definition of Done:**
- [ ] Hovering any component shows the toolbar.
- [ ] Moving mouse away hides the toolbar.
- [ ] Clicking `+` inserts a new `UText` node directly below.
- [ ] Dragging the handle reorders the component within its parent canvas.
- [ ] Drop indicators show during drag (provided by Craft.js).
- [ ] Undo restores order after drag.

**Open Questions:**
- 🔬 Craft.js `connectors.drag` on a child element (the handle) vs. the whole component — any gotchas with event bubbling?
- 🔬 On touch devices, hover doesn't exist. How does the toolbar behave? (Defer touch to post-MVP, but document.)

---

### Phase 4 — Click-to-Edit Settings Panel

**Goal:** Clicking a selected component opens a floating settings panel near it. Changes reflect on canvas immediately.

**Scope:**
- Build a `SettingsPanel` component.
- It accepts: `componentType`, `currentProps`, `onPropChange(propKey, value)`.
- It renders form controls based on a **prop schema** defined per component type.
- Position the panel using `getBoundingClientRect()` of the selected DOM node. Use `fixed` positioning offset to the right of the node. If off-screen, flip to left side.
- Panel closes when: user clicks outside, user presses Escape, user selects a different node.
- Define prop schemas:
  - **UText:** `text` (string), `fontSize` (number/slider), `color` (string/hex), `align` (enum: left/center/right).
  - **UCard:** `title` (string), `description` (string).
  - **UButton:** `label` (string), `href` (string), `variant` (enum: default/outline/ghost).
- Use shadcn/ui form controls: `Input`, `Slider`, `Select`.
- Every prop change calls `onPropChange`, which internally calls `setProp` via Craft.js. This updates the node prop and re-renders the component.

**Definition of Done:**
- [ ] Clicking a component opens the settings panel next to it.
- [ ] Changing `text` in the panel updates the canvas text immediately (< 16ms).
- [ ] Changing `fontSize` via slider updates text size live.
- [ ] Changing `color` updates text color live.
- [ ] Panel closes on outside click or Escape.
- [ ] Panel does not open for unselected nodes.
- [ ] All three component types have working settings.

**Open Questions:**
- 🔬 How to handle panel going off-screen on small viewports? Clamp to viewport bounds?
- 🔬 Should settings be debounced for text inputs, or fire on every keystroke? (Fire immediately for responsiveness; debounce is for persistence, not UI.)

---

### Phase 5 — Editor Shell (Bottom Bar)

**Goal:** The editor is a clean, full-bleed canvas. The only chrome is a floating bottom bar.

**Scope:**
- Remove or hide any persistent sidebars, top bars, or inspectors.
- Canvas fills the entire viewport.
- Build `BottomBar` component:
  - Fixed position, bottom-center of screen.
  - Rounded pill shape, shadow, background blur.
  - Height: ~48px. Padding: comfortable touch targets (min 40px per button).
- Buttons in the bar:
  - **Page switcher:** Dropdown showing current page name (default "Home"). Click to expand list.
  - **Add Page:** Small `+` button next to the page name.
  - **Docs:** Link to `/docs` (TBD — can be a placeholder href for now).
  - **Settings:** Gear icon. Opens a slide-out sheet or modal.
- Ensure the bar never obstructs the bottom-most component on the canvas. Add sufficient bottom padding to the canvas container.
- The bar is always visible when in editor mode.

**Definition of Done:**
- [ ] Editor canvas is full-bleed, no sidebars.
- [ ] Bottom bar is visible and centered at bottom.
- [ ] Page switcher shows "Home" by default.
- [ ] Docs link is present (can be `href="#"` for now).
- [ ] Settings button opens a panel/sheet.
- [ ] Bar does not overlap canvas content at the bottom.

**Open Questions:**
- 🔬 Should the bar auto-hide after inactivity and reappear on mouse move? (Defer to polish phase.)

---

### Phase 6 — Multi-Page System (In-Memory)

**Goal:** Users can create, rename, switch, and delete pages. Each page has its own independent Craft.js tree. No backend yet.

**Scope:**
- In-memory page store: React state shaped as `Record<string, SerializedNode>`.
  - Key = page slug (e.g., `"home"`, `"about"`).
  - Value = Craft.js serialized tree for that page.
- Default state: one page `"home"` with a single `UText` node.
- Page switcher in bottom bar:
  - Dropdown lists all page names.
  - Clicking a page switches the active page.
  - Switching pages unmounts the current `<Frame>` and mounts a new one with the selected tree.
- **Add Page:**
  - Button in bottom bar opens a small prompt (inline input or modal) for page name.
  - Validates: name is non-empty, slug is unique.
  - Creates new entry with default tree (single `UText`).
- **Rename Page:**
  - Right-click or long-press on page name in switcher → inline edit.
  - Updates slug and name.
- **Delete Page:**
  - Confirm dialog. Cannot delete the last remaining page.
- **URL Sync:**
  - `/editor` loads the "home" page.
  - `/editor/[pageName]` loads that specific page.
  - Use Next.js dynamic route: `app/editor/[pageName]/page.tsx`.
  - When switching pages via UI, call `router.push(`/editor/${slug}`)`.
- **Undo scope:** Undo history is per-page. Switching pages resets the undo stack (acceptable for MVP).

**Definition of Done:**
- [ ] Bottom bar page switcher lists all pages.
- [ ] Clicking a page loads its canvas.
- [ ] Each page has an independent tree (add component to Page A, switch to Page B, component is not there).
- [ ] Adding a page creates it with default content.
- [ ] Renaming a page updates the switcher and URL.
- [ ] Deleting a page removes it from the switcher.
- [ ] Direct navigation to `/editor/about` loads the "about" page.
- [ ] Cannot delete the only remaining page.

**Open Questions:**
- 🔬 Does Craft.js `<Frame>` support dynamic tree replacement without unmounting? If not, unmounting is fine.
- 🔬 Should page order in the switcher be configurable (drag to reorder)? (Defer to stretch goals.)

---

### Phase 7 — InstantDB Schema Design

**Goal:** The database schema supports sites, pages, and users. Schema is pushed to InstantDB and validated.

**Scope:**
- Finalize schema design (see Data Model section above).
- Update `src/lib/instant.schema.ts` with new entities: `sites`, `pages`.
- Define links:
  - `sites` → `pages` (one-to-many).
  - `$users` → `sites` (one-to-many, owner).
- Index fields that will be queried: `sites.subdomain`, `pages.siteId`, `pages.slug`.
- Update `src/lib/instant.perms.ts`:
  - Owners can create, view, update, delete their own `sites` and `pages`.
  - Anyone can view published sites (when we get there; for now, restrict view to owner).
  - `$users` defaults are acceptable for MVP.
- Push schema and permissions:
  ```bash
  npx instant-cli push schema --yes
  npx instant-cli push perms --yes
  ```
- Verify in InstantDB dashboard that schema is active.

**Definition of Done:**
- [ ] `instant.schema.ts` contains `sites` and `pages` entities with correct types.
- [ ] `instant.perms.ts` contains ownership-based rules.
- [ ] `npx instant-cli push schema --yes` succeeds.
- [ ] `npx instant-cli push perms --yes` succeeds.
- [ ] Schema is visible and correct in InstantDB dashboard.

**Open Questions:**
- 🔬 InstantDB `i.json()` type — does it have size limits? Document findings.
- 🔬 Should `contentJSON` be typed more strictly than `i.json()`? (No — it's an opaque blob.)

---

### Phase 8 — Auth (Sign-Up / Sign-In)

**Goal:** Users can authenticate via InstantDB. Guest editing continues to work. Unauthenticated users are nudged to sign up.

**Scope:**
- Use InstantDB built-in auth (magic code recommended for simplicity; OAuth as stretch).
- Build minimal auth UI:
  - Sign-in modal with email input.
  - InstantDB sends magic code.
  - Code verification input.
  - On success, `db.useAuth()` returns user.
- Guest mode:
  - Editor is fully functional without auth.
  - Trees live in React state + `localStorage` backup.
  - On mount, check `localStorage` for guest session and restore.
- "Sign up to save" banner:
  - Appears after the user makes their first meaningful edit (e.g., adds a component or changes text).
  - Dismissible. Non-intrusive.
  - Clicking it opens the sign-in modal.
- On successful auth:
  - Hide guest banner.
  - Do NOT auto-migrate guest data yet (Phase 9 handles this).

**Definition of Done:**
- [ ] Guest user can open editor and add components without signing in.
- [ ] Guest session persists across reload via `localStorage`.
- [ ] Sign-in modal accepts email and magic code.
- [ ] Successful sign-in creates `$users` entry.
- [ ] Banner appears after first edit and can be dismissed.
- [ ] Auth state is reactive across the app (via `db.useAuth()`).

**Open Questions:**
- 🔬 Magic code expiration time in InstantDB? How long is the code valid?
- 🔬 OAuth (Google) — is it worth adding in this phase or defer? (Defer to stretch goals.)

---

### Phase 9 — Persistence Layer

**Goal:** Authenticated users can save and load their sites from InstantDB. Auto-save works.

**Scope:**
- **Save action:**
  - Serialize all page trees from the in-memory store.
  - Upsert `sites` entity (create if new, update if existing).
  - Upsert all `pages` entities for that site.
  - Use `db.transact()` with multiple transactions in one batch.
  - Show "Saving..." / "Saved" status in bottom bar.
- **Load action:**
  - On editor mount for authenticated user, query their site and pages from InstantDB.
  - `db.useQuery({ sites: { pages: {} } })`.
  - If site exists, deserialize each page's `contentJSON` into the in-memory store.
  - If no site exists, create a default one with a "home" page.
- **Auto-save:**
  - Debounce: 1500ms after the last change.
  - Trigger on: prop change, add/delete/reorder node, add/rename/delete page.
  - Status indicator in bottom bar: `Unsaved changes → Saving... → Saved`.
- **Guest → Auth migration:**
  - On login, if guest session has unsaved data, show modal: "Save your work to your account?"
  - If yes, create new site with guest data.
  - If no, discard guest data.
- **Error handling:**
  - If save fails, show error toast. Keep local state intact. Retry on next change.

**Definition of Done:**
- [ ] Authenticated user sees their previously saved site on reload.
- [ ] Adding a component triggers auto-save after 1.5s debounce.
- [ ] Bottom bar shows correct save status.
- [ ] Guest data can be migrated to authenticated account.
- [ ] Save failure shows error and does not corrupt local state.
- [ ] Data is visible and correct in InstantDB dashboard.

**Open Questions:**
- 🔬 InstantDB transaction batch limits? How many pages can we upsert at once?
- 🔬 Should we compress `contentJSON` before storing? (Probably not for MVP, but note if blobs get large.)

---

### Phase 10 — Public Renderer

**Goal:** A read-only component renders a Craft.js tree without the Editor overhead. Used for preview and published sites.

**Scope:**
- Build `PublicRenderer` component:
  - Props: `data: SerializedNode`, `resolver: ComponentResolver`.
  - Recursively walks the tree and renders React elements.
  - Does NOT import `@craftjs/core` hooks or context.
  - Does NOT render selection borders, hover toolbars, or drag handles.
  - Pure rendering based on props.
- Tree walker logic:
  - For each node in `data`, look up `type` in `resolver`.
  - Pass `props` to the resolved component.
  - If node has `nodes` (children), recursively render them.
  - If node has `isCanvas`, render children as a flex container (respecting layout direction).
- Preview mode in editor:
  - Toggle button in bottom bar: "Preview".
  - When active, render the current page tree through `PublicRenderer` instead of `<Frame>`.
  - Add a "Back to editor" button to exit preview.
  - Preview is read-only.
- Responsive verification:
  - Ensure Tailwind responsive classes in component props are applied correctly.
  - Test at 375px, 768px, 1280px.

**Definition of Done:**
- [ ] `PublicRenderer` renders a card tree identically to the editor, minus chrome.
- [ ] Preview toggle switches between editable canvas and read-only preview.
- [ ] Preview is truly read-only (no selection, no editing).
- [ ] Responsive classes work in preview mode.

**Open Questions:**
- 🔬 Does Craft.js expose a utility for tree traversal that we can reuse, or must we write our own? (Likely our own — it's simple recursion.)
- 🔬 How to handle `Element canvas={true}` in the public renderer? Render as a `<div>` with flex layout.

---

### Phase 11 — Publishing & Wildcard Subdomain

**Goal:** Visiting `[subdomain].xyz.cc` fetches the site JSON and renders it via `PublicRenderer`.

**Scope:**
- **API Route:**
  - `app/api/site/route.ts` (App Router Route Handler).
  - Accepts `?subdomain=x` query param.
  - Uses InstantDB Admin SDK (`@instantdb/admin`) to query site + pages.
  - Returns JSON: `{ site, pages }`.
  - Handle 404 if subdomain not found.
- **Middleware:**
  - `middleware.ts` at root.
  - Inspect `request.headers.get("host")`.
  - If host matches `*.xyz.cc`:
    - Extract subdomain.
    - Rewrite to `/[subdomain]/page?subdomain={subdomain}`.
  - Else, continue to normal Next.js routing.
- **Subdomain Page:**
  - `app/[subdomain]/page.tsx` (or similar catch-all).
  - Server Component: calls the internal API or queries InstantDB directly.
  - Fetches site JSON.
  - Renders `PublicRenderer` with the home page tree.
  - Inject site settings into `<head>`: title, meta description, favicon.
- **Publish button:**
  - In editor bottom bar.
  - On click, sets `sites.publishedAt` to current timestamp in InstantDB.
  - Shows confirmation toast: "Published to {subdomain}.xyz.cc".
- **Unpublished state:**
  - If `publishedAt` is null, visiting the subdomain shows a "Coming soon" page or 404.

**Definition of Done:**
- [ ] `GET /api/site?subdomain=test` returns correct site JSON.
- [ ] Middleware correctly identifies `*.xyz.cc` hosts and rewrites.
- [ ] Visiting subdomain page renders the site's home page.
- [ ] Published site has correct `<head>` metadata.
- [ ] Unpublished site shows 404 or placeholder.
- [ ] Publish button in editor updates `publishedAt`.

**Open Questions:**
- 🔬 Next.js App Router `middleware.ts` — does it support subdomain-based rewrites in production (e.g., Vercel)? Verify hosting platform capabilities.
- 🔬 InstantDB Admin SDK initialization — where to store admin token securely? (Env var, server-only.)
- 🔬 Caching strategy for published sites? Next.js ISR with `revalidate`?

---

### Phase 12 — Container System (Research → Implementation)

**Goal:** `UContainer` becomes a true layout primitive. It can hold multiple child components and control their flow direction.

**Scope:**
- **12a — Research:**
  - Convert `UContainer` to a Craft.js User Component.
  - Add an `<Element canvas={true} />` inside it as the drop zone.
  - Test: can components be dropped into the container?
  - Test: can components be dragged out of the container?
  - Test: does Craft.js positioner correctly calculate drop indices inside a nested canvas?
  - Document findings: what works, what breaks, what's awkward.
- **12b — Flex Container MVP:**
  - Add `direction: "row" | "column"` prop to `UContainer`.
  - Render children in a flex container with `flex-direction` set accordingly.
  - Container settings panel: direction toggle.
- **12c — Arbitrary Grid Research:**
  - Investigate whether Craft.js supports multiple independent drop zones per component.
  - Investigate custom `Positioner` behavior for grid-like layouts.
  - Determine if arbitrary row/column placement is feasible within Craft.js's architecture.
  - **Decision point:** If feasible, proceed to 12d. If not, document the limitation and define the upgrade path (e.g., custom DnD library for containers, or defer grid to v2).
- **12d — Extended Props (if grid is feasible):**
  - Add `gap`, `justifyContent`, `alignItems`, `padding`, `backgroundColor`, `borderRadius`.
  - Settings panel reflects these props.

**Definition of Done:**
- [ ] Components can be dropped into `UContainer`.
- [ ] Components can be reordered within `UContainer`.
- [ ] `direction: row` renders children horizontally.
- [ ] `direction: column` renders children vertically (default).
- [ ] Research findings are documented in this spec (update Phase 12 with results).
- [ ] If grid is deferred, the decision and rationale are recorded.

**Open Questions:**
- 🔬 **This is the primary research phase.** The entire feasibility of the container system depends on Craft.js's support for nested canvases. Prototype first, decide second.
- 🔬 Does nested `<Element canvas={true}>` create a separate drag context, or is it unified with the parent?
- 🔬 What happens when dragging a node from a container to the root canvas? Does `actions.move()` handle cross-parent moves?

---

### Phase 13 — Settings & Docs

**Goal:** Site-level settings are editable and reflected in published output. Landing page is complete.

**Scope:**
- **Site Settings Sheet:**
  - Opened from bottom bar gear icon.
  - Fields:
    - Site name (string).
    - Meta title (string).
    - Meta description (string).
    - Favicon URL (string — can be InstantDB file upload later, string for MVP).
    - OG image URL (string).
  - Saved to `sites.settings` JSON blob in InstantDB.
- **Renderer `<head>` injection:**
  - In public renderer and subdomain pages, read `site.settings`.
  - Render `<title>`, `<meta name="description">`, `<link rel="icon">`, `<meta property="og:image">`.
- **Landing Page (`/`):**
  - Showcase the builder's capabilities.
  - Sections: Hero, Feature list, Example sites gallery, CTA to `/editor`.
  - Use existing user components to build the landing page (dogfood the builder).
  - Responsive design.
- **Docs Link:**
  - Bottom bar "Docs" button links to external GitBook (TBD).
  - Opens in new tab.

**Definition of Done:**
- [ ] Settings sheet opens from bottom bar.
- [ ] All settings fields save correctly.
- [ ] Published site has correct `<head>` metadata.
- [ ] Landing page is visually complete and responsive.
- [ ] Docs link opens external URL in new tab.

**Open Questions:**
- 🔬 Should the landing page be built *with* the builder (self-hosting), or hand-coded? (Hand-coded is faster for MVP. Dogfooding is a stretch goal.)

---

## Stretch Goals (Unplanned)

These are features that would be nice but are **explicitly out of scope** for the MVP. They are recorded here to avoid losing good ideas.

### Editor Polish
- [ ] **Animation system:** Entrance animations for components (fade, slide). Framer-motion integration.
- [ ] **Undo/Redo UI:** Visual undo history (timeline of actions).
- [ ] **Keyboard shortcuts:** `Cmd+Z` / `Cmd+Shift+Z`, `Cmd+D` duplicate, `Delete` remove.
- [ ] **Touch device support:** Bottom toolbar for mobile editing, touch-friendly drag handles.
- [ ] **Zoom controls:** Zoom in/out of canvas.
- [ ] **Grid/snap system:** Align components to a grid.

### Component System
- [ ] **More components:** Image, Video, Divider, Spacer, Form, Gallery, Embed.
- [ ] **Component presets:** Pre-designed component combinations (Hero section, Feature grid).
- [ ] **Custom CSS per component:** Advanced users can inject custom CSS classes.
- [ ] **Container grid mode:** True CSS Grid with configurable rows/columns.

### Multi-Page Enhancements
- [ ] **Page drag reordering:** Reorder pages in the bottom bar via drag-and-drop.
- [ ] **Nested pages:** Sub-pages or folder-like organization.
- [ ] **Page templates:** Start a new page from a template.

### Collaboration
- [ ] **Real-time collaboration:** Multiple users editing the same site simultaneously.
- [ ] **Comments:** Leave comments on components.
- [ ] **Version history:** Snapshots of site state, ability to restore.

### Publishing & Hosting
- [ ] **Custom domains:** Users can connect their own domain (CNAME setup).
- [ ] **SSL auto-provisioning:** Let's Encrypt integration.
- [ ] **Analytics:** Basic page view tracking.
- [ ] **SEO tools:** Sitemap generation, robots.txt, structured data.
- [ ] **Preview before publish:** Temporary preview URL (`preview-{id}.xyz.cc`).

### Auth & Billing
- [ ] **OAuth providers:** Google, GitHub sign-in.
- [ ] **Team/organization support:** Multiple users per site with roles (admin, editor).
- [ ] **Paid plans:** Stripe integration for premium features (custom domains, more pages).

### Data & Export
- [ ] **Export to HTML/JSX:** Download site as static files or React code.
- [ ] **Import from other builders:** Notion, WordPress import.
- [ ] **Asset manager:** Centralized image/file library with organization.

---

## Appendix: Component Registry

Each user component must expose:

```typescript
interface UserComponentConfig {
  displayName: string;           // Human-readable name for slash command
  craft: {
    props: Record<string, any>;  // Default props
    rules: {
      canDrag?: (node: Node) => boolean;
      canDrop?: (targetNode: Node) => boolean;
      canMoveIn?: (incomingNode: Node) => boolean;
      canMoveOut?: (outgoingNode: Node) => boolean;
    };
    related: {
      settings?: React.ComponentType<any>;
    };
  };
  propSchema: PropSchema;        // Defines settings panel fields
}

type PropSchema = Array<{
  key: string;
  label: string;
  type: "string" | "number" | "boolean" | "enum" | "color";
  defaultValue: any;
  options?: string[]; // for enum
}>;
```

### UText

```typescript
{
  displayName: "Text",
  craft: {
    props: { text: "Start typing or press '/' for commands...", fontSize: 16, color: "#000000", align: "left" },
    rules: { canDrag: () => true },
  },
  propSchema: [
    { key: "text", label: "Content", type: "string", defaultValue: "" },
    { key: "fontSize", label: "Font Size", type: "number", defaultValue: 16 },
    { key: "color", label: "Color", type: "color", defaultValue: "#000000" },
    { key: "align", label: "Alignment", type: "enum", defaultValue: "left", options: ["left", "center", "right"] },
  ],
}
```

### UCard

```typescript
{
  displayName: "Card",
  craft: {
    props: { title: "Card Title", description: "Card description goes here." },
    rules: { canDrag: () => true },
  },
  propSchema: [
    { key: "title", label: "Title", type: "string", defaultValue: "Card Title" },
    { key: "description", label: "Description", type: "string", defaultValue: "" },
  ],
}
```

### UButton

```typescript
{
  displayName: "Button",
  craft: {
    props: { label: "Click me", href: "#", variant: "default" },
    rules: { canDrag: () => true },
  },
  propSchema: [
    { key: "label", label: "Label", type: "string", defaultValue: "Button" },
    { key: "href", label: "Link", type: "string", defaultValue: "#" },
    { key: "variant", label: "Variant", type: "enum", defaultValue: "default", options: ["default", "outline", "ghost"] },
  ],
}
```

### UContainer

```typescript
{
  displayName: "Container",
  craft: {
    props: { direction: "column", gap: 16, padding: 16 },
    rules: {
      canDrag: () => true,
      canDrop: () => true, // Can receive children
    },
  },
  propSchema: [
    { key: "direction", label: "Direction", type: "enum", defaultValue: "column", options: ["row", "column"] },
    { key: "gap", label: "Gap", type: "number", defaultValue: 16 },
    { key: "padding", label: "Padding", type: "number", defaultValue: 16 },
  ],
}
```

---

## Appendix: File Structure (Target)

```
bentwo/
├── app/
│   ├── layout.tsx              # Root layout, providers
│   ├── page.tsx                # Landing page
│   ├── editor/
│   │   ├── page.tsx            # Editor shell (home page)
│   │   └── [pageName]/
│   │       └── page.tsx        # Editor for specific page
│   ├── [subdomain]/
│   │   └── page.tsx            # Public site renderer
│   └── api/
│       └── site/
│           └── route.ts        # API: fetch site by subdomain
│   └── docs/
│       └── page.tsx            # Docs (TBD / placeholder)
├── components/
│   ├── ui/                     # shadcn/ui primitives
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   └── container.tsx
│   ├── user/                   # Craft.js User Components
│   │   ├── text.tsx
│   │   ├── card.tsx
│   │   ├── button.tsx
│   │   └── container.tsx
│   ├── editor/
│   │   ├── EditorShell.tsx     # Editor layout shell
│   │   ├── BottomBar.tsx       # Floating bottom bar
│   │   ├── SettingsPanel.tsx   # Floating props panel
│   │   ├── SlashCommand.tsx    # / dropdown
│   │   ├── HoverToolbar.tsx    # Component hover actions
│   │   └── PageSwitcher.tsx    # Page dropdown
│   ├── renderer/
│   │   └── PublicRenderer.tsx  # Read-only tree renderer
│   └── auth/
│       ├── AuthModal.tsx       # Sign-in/sign-up
│       └── GuestBanner.tsx     # "Sign up to save"
├── hooks/
│   ├── usePages.ts             # In-memory page state
│   ├── useAutoSave.ts          # Debounced save logic
│   └── useSiteSettings.ts      # Site settings query/mutation
├── lib/
│   ├── utils.ts                # cn() and helpers
│   ├── db.ts                   # InstantDB client init
│   ├── instant.schema.ts       # InstantDB schema
│   ├── instant.perms.ts        # InstantDB permissions
│   └── resolver.ts             # Craft.js component resolver
├── types/
│   └── index.ts                # Shared types (PropSchema, etc.)
├── public/
│   └── favicon.ico
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

_— End of Document —_
