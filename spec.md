# bentwo

## Personal Website Builder for Creatives

**Technical Architecture & Product Specification**  
**Version 1.0 — Product Spec & Engineering Blueprint**  
Covers: Terminology · Block System · Drag-and-Drop · Editor · Preview · Deployment

---

## 1. Terminology & Glossary

Before any line of code is written, everyone on the team should speak the same language. This section defines every core concept used throughout this document.

| Term | Definition |
| --- | --- |
| Site | The top-level entity owned by a user. A Site has a domain, global settings (fonts, colours, favicon), and contains one or more Pages. |
| Page | A single scrollable URL within a Site (e.g. `/about`, `/work`). A Page is composed of an ordered list of Sections. |
| Section | A full-width horizontal band on a Page. Sections act as layout containers and can have their own background colour, image, or video. Equivalent to a “row” in other builders. |
| Block | The atomic content unit inside a Section. A Block has a Type (image, text, embed, etc.), a set of Props (its configuration), and a unique `blockId`. Blocks can be reordered via drag-and-drop. |
| Block Type | The schema that defines what a Block does and what Props it accepts. Built-in types: Hero, RichText, ImageSingle, ImageGrid, VideoEmbed, PDFViewer, Divider, Spacer, ContactForm, LinkList. |
| Props | The typed configuration object for a Block (e.g. `src`, `caption`, `layout`, `backgroundColor`). Props are edited in the Inspector Panel. |
| Canvas | The central editing surface where Blocks are rendered in real-time. The Canvas is the source of truth for visual output. |
| Inspector Panel | The right-side drawer that surfaces the Props of the currently selected Block. Changes here are reflected on the Canvas instantly. |
| Block Toolbar | A small floating bar that appears above a selected Block on the Canvas. Contains: drag handle, move up/down arrows, duplicate, and delete. |
| Add Block Button | The “+” trigger between Blocks that opens the Block Picker. Clicking it inserts a new Block at that specific position. |
| Block Picker | The modal/sheet that lists all available Block Types, organised by category. Selecting a type inserts a Block with default Props at the target position. |
| Draft | The unpublished working state of a Site. All edits happen in Draft. A Draft can be Previewed at any time. |
| Snapshot | An immutable, versioned copy of a Site’s content tree saved before each Publish. Enables rollback. |
| Published Version | The live version of a Site served to visitors. Created by promoting a Draft to Published via the Deploy Pipeline. |
| Preview Mode | A read-only, full-screen rendering of the Draft that simulates the published site. Can be toggled per-device (Desktop / Tablet / Mobile). |
| Deploy Pipeline | The server-side process triggered by Publish: it validates the content tree, runs Static Site Generation (SSG), uploads assets to CDN, and updates DNS/routing. |
| Content Tree | The full JSON data structure representing a Site: `{ site, pages[], sections[], blocks[] }`. This is what gets serialised, versioned, and rendered. |
| Theme | A set of design tokens (typefaces, colour palette, border radius, spacing scale) that apply globally across a Site. Blocks inherit Theme values unless locally overridden. |
| Asset | Any user-uploaded binary: images, videos, PDFs, fonts. Assets are stored in object storage and referenced by URL in Block Props. |
| Slot | A named drop-zone within a Block where a nested child Block can be placed. Used by compound Blocks like Hero (which has an “eyebrow”, “heading”, “cta” slot). |

---

## 2. The Content Tree

Everything the user creates is serialised into a single JSON data structure — the Content Tree. Understanding its shape is critical before building any feature.

### Data Model Overview

The tree has four layers of nesting: `Site → Page → Section → Block`. Each layer owns only what belongs to it — layout geometry lives in the Section, content lives in the Block, global design lives in the Site’s Theme.

### Design Principle

Keep the content tree flat enough to be readable but nested enough to be meaningful. Avoid deep nesting beyond four levels; it makes drag-and-drop serialisation expensive and diffing for version control messy.

### Site Object

| Field | Type | Purpose |
| --- | --- | --- |
| `siteId` | UUID | Globally unique identifier |
| `domain` | string | Custom domain or subdomain (e.g. `jane.folio.so`) |
| `theme` | `ThemeObject` | Global font, colour, spacing tokens |
| `pages` | `Page[]` | Ordered list of pages; first page is the root URL |
| `meta` | `MetaObject` | SEO title, description, og:image, favicon |
| `createdAt / updatedAt` | ISO timestamp | Audit trail for version display |

### Block Object

Every Block, regardless of type, shares this base structure:

| Field | Type | Notes |
| --- | --- | --- |
| `blockId` | UUID | Stable ID — survives reordering and duplication (duplicate gets new ID) |
| `type` | `BlockType` enum | Determines which renderer and Inspector schema to use |
| `props` | `Record<string, any>` | Type-specific configuration. Validated against BlockType schema on save |
| `order` | integer | Position within the parent Section. 0-indexed; gaps allowed (reordering increments by 10) |
| `visibility` | `VisibilityObject` | Per-breakpoint show/hide flags: `{ desktop, tablet, mobile }` |
| `animation` | `AnimationObject?` | Optional entrance animation: `{ type, duration, delay }` |

---

## 3. Block System & The Add Block Flow

The Block System is the heart of the editor. It defines every content type the user can add and precisely how adding one feels — the “+” interaction that drives the entire creative experience.

### Built-in Block Types

Each Block Type is registered in a central `BlockRegistry`. The registry maps a type string to: a default props factory, a React renderer component, and an Inspector schema.

#### Hero
Full-bleed header with background image/video, headline, subheadline, and CTA button. Usually the first block on any page.

#### RichText
WYSIWYG prose block powered by Tiptap. Supports headings H1–H4, bold, italic, links, and inline images.

#### ImageSingle
One image with optional caption and alt text. Supports layout: `full-width | contained | float-left | float-right`.

#### ImageGrid
A responsive photo grid with configurable columns (2–6). Each cell has its own caption. Ideal for portfolios and case study galleries.

#### VideoEmbed
Embeds a Vimeo or YouTube URL. Autoplay, loop, and mute are toggleable. Falls back to poster image in Preview.

#### PDFViewer
Renders a PDF inline using PDF.js. Shows page controls and a download button. PDF is uploaded to asset storage and referenced by URL.

#### Divider
A visual separator. Configurable style: `line | dotted | blank space | custom SVG shape`.

#### ContactForm
A minimal contact form: name, email, message, submit. Sends to a configured email address via a serverless function endpoint.

#### LinkList
An ordered list of hyperlinks — useful for press mentions, social links, or resource lists. Each item has label, URL, and optional icon.

#### Spacer
A configurable blank area. Height is set in the Inspector. Used to control vertical rhythm between Blocks.

### The Add Block Flow

This is the primary creation interaction. It must be instant, discoverable, and non-disruptive to the content already on the canvas.

#### Step 1 — Trigger: The “+” Button
Between every pair of adjacent Blocks (and above the first and below the last), a horizontal `AddBlockZone` is rendered. By default this zone is invisible and only 8px tall. On hover it expands to 32px and reveals a centred “+” button.

The zone is always present in the DOM — it is never conditionally rendered. This ensures hover detection is reliable.

On touch devices, the zone is always 32px tall and the “+” is always visible, since hover is not available.

A keyboard shortcut (`⌘ + Enter` while a Block is focused) opens the Block Picker to insert below the current Block.

#### Step 2 — Block Picker Modal
Clicking “+” opens a full-width bottom sheet on mobile and a centred modal on desktop. The picker shows all Block Types grouped into categories: Layout, Media, Text, Interactive, Utilities.

Each Block Type card shows: an icon, a name, and a one-line description.

A search input at the top of the picker filters Block Types in real time by name or category keyword.

Recently used Block Types float to the top of the list under a “Recent” heading for repeat tasks.

#### Step 3 — Insertion
Selecting a Block Type from the picker closes the modal and synchronously inserts a new Block with default Props at the target position in the Content Tree. The new Block is immediately selected and scrolled into view. The Inspector Panel opens automatically showing its editable Props.

Insertion is an atomic operation: the Content Tree update and the Canvas re-render happen in the same React state transaction.

All insertions are pushed to the Undo Stack, so `Cmd+Z` removes the newly added block.

---

## 4. Editor Architecture

The editor is a three-panel layout: a left sidebar for site structure and page management, a central Canvas, and a right Inspector Panel. The Canvas is the source of truth — everything else reacts to it.

### Editor Layout

The three-panel layout is implemented in React with a persistent application shell. Panels communicate exclusively through a shared editor store (`Zustand` recommended for its low boilerplate and support for transient state subscriptions).

### Panel Widths

Left sidebar: 240px fixed. Canvas: fills remaining space with 32px padding each side. Inspector Panel: 320px fixed, slides in/out on Block selection. On screens narrower than 1280px, the Inspector overlays the Canvas rather than pushing it.

### Left Sidebar — Site Navigator

Shows all Pages as draggable rows. Drag to reorder, click to navigate, right-click for context menu (rename, duplicate, delete, set as home).

`Add Page` button: Opens an inline name input that creates a new Page with a single empty Section when confirmed.

Global settings link: Opens a settings sheet for Theme, custom domain, analytics, and SEO defaults.

### Canvas — The Editing Surface

The Canvas renders Block components in reading order. It has two sub-modes that switch without unmounting:

**Edit Mode (default):** Blocks are editable in place. Clicking a Block selects it; its Block Toolbar appears above it and the Inspector opens on the right.

**Preview Mode:** A full-screen overlay renders the Draft through the `PublicRenderer`, identical to how visitors see it. A floating toolbar at the top lets users switch between Desktop (1440px), Tablet (768px), and Mobile (375px) breakpoints. Exiting Preview returns the editor to its previous selection state.

### Inspector Panel — Editing Props

The Inspector is dynamically generated from the BlockType’s Inspector Schema — a JSON Schema–like definition that maps each Prop to a UI control.

| Prop Type | UI Control | Example Prop |
| --- | --- | --- |
| string | Text input | caption, alt text, button label |
| richtext | Tiptap mini-editor | Hero subheadline |
| url | Text input + validate button | Link href, embed URL |
| asset | Asset Picker + upload dropzone | Image src, PDF src, video poster |
| color | Colour swatch + hex input | Background color, text color |
| enum | Segmented control or Select | Layout variant (full / contained) |
| boolean | Toggle switch | Autoplay, loop, show caption |
| number | Slider + number input | Spacer height, grid columns |
| spacing | Four-input margin/padding editor | Block padding top/bottom |

### Prop Change Latency

All Prop changes must update the Canvas within one frame (`< 16ms`). This means Inspector changes must never trigger a network call — they only update local state. Debounced auto-save to the server happens 1,500ms after the last change.

---

## 5. Drag-and-Drop Reordering

Drag-and-drop is the most mechanically complex part of the editor. Done poorly it feels laggy and unpredictable. Done well it feels like physically manipulating real objects. Use `@dnd-kit/core` as the DnD primitive — it is pointer-event based, accessible, and works in sandboxed iframes.

### Library Choice: `@dnd-kit`

`@dnd-kit` is preferred over React Beautiful DnD (unmaintained) and HTML5 Drag API (no touch support) for three reasons:

- It is pointer-event-based, giving identical behaviour on mouse, touch, and stylus.
- It does not mutate the DOM during drag — it uses CSS transforms on a `DragOverlay` clone, so the rest of the layout is not disturbed.
- It provides a `useSortable` hook that handles all ARIA attributes for screen-reader accessibility without extra work.

### Drag Interaction Design

#### Initiating a Drag
A drag is initiated via the drag handle icon (`⠿`) in the Block Toolbar. The handle appears on Block hover and on Block selection. Using a dedicated handle (rather than making the whole Block draggable) prevents accidental drags when the user tries to click or text-select inside the Block.

Minimum drag distance before activation: 8px. This prevents accidental drags on tap.

Long-press threshold on touch: 200ms. This allows the user to tap and hold to initiate a drag on mobile.

#### During a Drag
When a drag starts, two things happen simultaneously:

- A `DragOverlay` clone of the Block is created and follows the pointer. The clone has reduced opacity (0.85) and a box shadow to communicate it is “lifted”.
- The original Block’s position in the list becomes a placeholder — a dashed outline the same height as the original Block — so the user can see where the Block will land if dropped.

As the user drags over other Blocks, the list reorders in real time using a CSS transition (`all 200ms ease`). The placeholder moves to the new position. This is the key feedback mechanism — the user sees the result before committing.

#### Critical: No Layout Reflow During Drag
Because `@dnd-kit` uses CSS transforms (`translate`) on the `DragOverlay`, and because the placeholder uses the same fixed height as the original, no other DOM elements shift during the drag. This prevents the disorienting jumping that plagues naive DnD implementations.

#### Dropping
On pointer release (or touch end), three things happen in this exact order:

1. The `DragOverlay` animates to the placeholder position (duration: 150ms, easing: ease-out).
2. The Content Tree is updated: the Block’s `order` field is recalculated, and the state is written to the editor store.
3. The action is pushed to the Undo Stack so `Cmd+Z` restores the previous order.

### Keyboard Reordering (Accessibility)

Users who cannot use a pointer must also be able to reorder Blocks. When a Block’s drag handle is focused, Space activates keyboard drag mode. Arrow Up and Arrow Down move the Block one position. Space or Enter confirms the drop. Escape cancels. A live region announces the new position to screen readers.

### Cross-Section Dragging

In v1, Blocks can only be reordered within the same Section. Cross-section drag is deferred to v2. The DnD context boundary is intentionally scoped to one `SortableContext` per Section.

### Order Field Strategy

Block order is stored as a sparse integer rather than a dense array index. The first Block in a Section gets `order = 10`, the second `order = 20`, and so on, leaving gaps.

Inserting a Block between `order 10` and `order 20` gives it `order = 15` — no other Blocks need updating.

If the gap becomes too small (e.g. 14 and 15 with a new insert needed between them), a “rebalance” runs on that Section: all order values are recalculated as 10, 20, 30... and a single batch update is sent to the server.

This design means that in the common case, reordering sends a single PATCH request updating only the moved Block’s order field, not a full re-serialisation of the Section.

---

## 6. Preview System

Preview is a non-destructive, read-only rendering of the Draft. It must be pixel-identical to the published site and must not share any editor state or styling.

### Two Rendering Paths

The application maintains two separate rendering stacks that consume the same Content Tree:

**Editor Renderer**  
Wraps each Block in selection/hover/DnD affordances. Imports editor-specific CSS. Runs only inside the editor shell.

**Public Renderer**  
Pure content output. No editor chrome. Used by Preview Mode, the Deploy Pipeline’s SSG step, and the live published site.

This separation prevents a common builder bug where the “preview” looks different from the live site because it accidentally inherits editor styles or interactive event handlers.

### Preview Mode Implementation

#### Activation
The user clicks the “Preview” button in the editor’s top bar. This mounts a full-screen overlay (`position: fixed, inset: 0, z-index: 9999`) over the editor. The overlay renders the `PublicRenderer` with the current Draft’s Content Tree passed as a prop. The editor beneath is not unmounted — this makes closing Preview instant.

#### Breakpoint Simulation
A floating device toolbar at the top of the preview overlay shows three buttons: Desktop, Tablet, Mobile. Selecting a breakpoint sets a CSS max-width constraint on the content wrapper inside the overlay and also injects a meta viewport override. This simulates the responsive behaviour of the live site without changing the user’s actual browser window size.

#### Asset Resolution in Preview
Assets in the Draft state are already uploaded to the CDN (upload happens on drop, not on publish). This means Preview Mode loads real production URLs for images, PDFs, and videos — there is no mocked or proxied asset system needed.

#### Live Preview Sync
While Preview Mode is open, the user should NOT be able to edit the Canvas — this prevents a confusing half-state. The editor’s input affordances are disabled (`pointer-events: none` on the Canvas layer) while the preview overlay is mounted.

---

## 7. Deployment Pipeline

Publishing is the act of taking a Draft and making it publicly accessible. The pipeline must be reliable, fast, and reversible. A failed publish should never corrupt the live site.

### High-Level Pipeline Steps

| # | Step | Detail |
| --- | --- | --- |
| 1 | Snapshot | Clone the current Draft’s Content Tree and write it as a new Snapshot with a UTC timestamp and auto-incremented version number (v1, v2…). |
| 2 | Validation | Run the Content Tree through a schema validator. Check: all required Props are present, all asset URLs resolve (HEAD request), no broken internal links. |
| 3 | Asset Optimisation | For any newly added images since the last publish, trigger an async job: resize to multiple breakpoints (400px, 800px, 1200px, 2400px), convert to WebP, and write versioned filenames to CDN. |
| 4 | Static Site Generation | Feed the Content Tree into the `PublicRenderer` (Next.js `getStaticProps` or an equivalent SSG function). Generate one HTML file per Page. Inline critical CSS. Output to a build artefact directory. |
| 5 | CDN Upload | Upload the build artefact directory to object storage (R2 or S3). Use atomic deployment: write to a new prefix (e.g. `/sites/{siteId}/v{n}/`), not in-place. |
| 6 | Routing Update | Update the edge routing config (Cloudflare Workers or a database-backed reverse proxy) to point the user’s domain to the new version prefix. This is the atomic cutover — it is a single config write. |
| 7 | Health Check | Issue a HEAD request to the live domain and verify a 200 response within 5 seconds. |
| 8 | Publish Record | If the health check passes, write a Publish record to the database: `{ siteId, snapshotId, publishedAt, publishedBy }`. Update the Site’s `publishedVersion` pointer. |

### Rollback

Because the routing update is the only change that makes a version live, rollback is equivalent to pointing the router back at the previous version prefix. The UI exposes a “Version History” panel listing all Snapshots. Clicking “Restore” on any past Snapshot triggers Steps 6–8 of the pipeline with that Snapshot’s build artefact.

Build artefacts are retained for 30 days or the last 10 versions, whichever is larger.

Rollback does NOT overwrite the Draft — the user’s current work-in-progress is preserved.

### Custom Domains

The user connects a custom domain by adding a CNAME or A record to their DNS provider pointing to the platform’s edge IP. On the platform side, the domain is added to the Cloudflare zone (or equivalent), and a TLS certificate is provisioned via Let’s Encrypt / ACME. Domain verification is polled every 30 seconds until the DNS record resolves correctly, at which point the certificate is issued and the routing rule activates.

---

## 8. Recommended Tech Stack

These are pragmatic recommendations for a small team building v1. Each choice prioritises developer velocity and production reliability over theoretical purity.

| Layer | Technology | Rationale |
| --- | --- | --- |
| Editor Frontend | React + Next.js App Router | Server Components for the public renderer, Client Components for the editor. One codebase. |
| Editor State | Zustand + Immer | Zustand for global editor state. Immer for immutable block tree mutations with undo/redo. |
| Rich Text | Tiptap (ProseMirror) | Headless rich-text editor. Full control over rendering. Works in both Editor and Public Renderer. |
| Drag-and-Drop | `@dnd-kit/sortable` | Pointer-event based, accessible, works inside iframes and `overflow: hidden` containers. |
| Styling | Tailwind CSS + CSS Variables | Tailwind for editor chrome. CSS Variables for Theme tokens injected into Public Renderer. |
| Database | PostgreSQL (Supabase) | Relational data for users, sites, pages, snapshots. Supabase provides auth, real-time, and row-level security out of the box. |
| Asset Storage | Cloudflare R2 | S3-compatible, no egress fees. Paired with Cloudflare Images for on-the-fly resizing. |
| Deploy / Hosting | Cloudflare Workers + Pages | SSG output deployed to Pages. Workers handle domain routing and auth edge middleware. |
| Background Jobs | Inngest or Trigger.dev | Async pipeline steps (asset optimisation, SSG, health checks) as durable functions. |
| Auth | Supabase Auth | Magic link + OAuth (Google). JWTs validated at the Cloudflare Workers edge. |

---

## 9. Undo / Redo & Auto-Save

A website builder without a reliable undo stack will frustrate every user who accidentally deletes a block. The undo system is non-negotiable for v1.

### Undo Stack Design

Use a command-pattern undo stack stored in the editor’s Zustand store. Each undoable action is represented as a pair of functions: `{ apply, revert }`. The stack has a max depth of 100 entries; older entries are discarded.

Block add, delete, reorder, and duplicate are undoable.

Prop changes are batched: rapid consecutive changes to the same Prop (e.g. dragging a slider) are collapsed into a single undo entry using a 500ms debounce window. The user does not want to undo 50 slider positions.

Page-level operations (add page, delete page, rename) are undoable.

Published state is NOT undoable from the editor — use the Version History / Rollback feature instead.

### Auto-Save

The Draft is continuously auto-saved to the server. Auto-save is triggered 1,500ms after the last state change. A status indicator in the top bar shows: `Saving... | Saved | Unsaved changes`. On browser unload (`beforeunload`), if there are unsaved changes, the browser’s native “Leave page?” dialog is shown.

---

## 10. V2 Considerations

These features are explicitly deferred to avoid scope creep in v1. They should be designed for from the start, even if not implemented.

- Cross-Section drag-and-drop: Blocks dragged across Section boundaries. Requires a unified DnD context across the entire Page.
- Nested Blocks / Columns: A ColumnLayout Block Type that contains two or more vertical columns, each of which holds an ordered list of child Blocks. Requires recursive rendering and a recursive DnD context.
- Custom Block Types: An SDK for developers to register their own Block Types. Requires a sandboxed iframe renderer and a props schema validation API.
- Collaborative Editing: Real-time multi-cursor editing using CRDTs (Yjs). Requires replacing Immer mutations with Yjs-compatible operations.
- Theme Editor: A visual editor for the Site’s Theme tokens. Currently Theme is edited via a JSON editor for simplicity in v1.
- A/B Testing: Multiple Variants per Block. Traffic splitting at the edge. Requires a variant management UI and analytics integration.

---

## 11. Open-source tools to study

These are good references for the same general problem space:

- **Craft.js** — a React framework for building drag-and-drop page editors. It is an abstraction layer rather than a full editor UI, which makes it useful for studying editor state, node trees, and custom renderers.
- **GrapesJS** — a mature open-source web builder framework for drag-and-drop HTML-like content. Good for studying blocks, canvas interactions, and export flows.
- **TinaCMS** — an open-source headless CMS with visual editing. Useful for preview/editor coupling and content workflows.
- **Payload CMS** — an open-source TypeScript/Next.js framework with a blocks field, admin UI, and live preview patterns.
- **Webstudio** — an open-source website builder and Webflow alternative. Useful for studying modern visual editing and CSS-property-level control.
- **Puck** — a modular open-source visual editor for React. Good for studying component-driven block editing in React apps.

---

_— End of Document —_
