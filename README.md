# Interactive Fishbone (Ishikawa) Diagram Component

An Angular + Tailwind CSS component for building interactive Fishbone (Ishikawa) diagrams. It supports fast authoring of categories and causes, a compact collision-aware layout engine, pan/zoom, keyboard-friendly dialogs, and robust export to JSON, SVG, PNG, and PDF.

This repository is ready-to-run and includes the component mounted at the app root.

## Tech Stack

- Angular 20 (standalone components)
- Tailwind CSS 3
- SVG rendering with orthogonal connectors
- jsPDF (via CDN) for PDF export

## Features

- Diagram authoring
  - Add/Edit/Delete categories and causes
  - Priority levels: Critical, High, Medium, Low (colored indicators and subtle list highlighting)
  - Inline title for the problem statement
  - Quick menus for per-cause actions
- Layout engine
  - Fixed-width compact cause boxes for a clean, uniform look
  - Orthogonal connectors aligned to category bones
  - Collision-aware vertical stacking with consistent spacing
  - Alternating top/bottom category bones for balanced distribution
  - Dynamic canvas sizing based on content
- Interactivity
  - Focus mode per category (de-emphasizes others)
  - Pan and zoom with mouse drag and wheel; reset, zoom-in, zoom-out buttons
  - Tooltip preview for truncated text (ellipsis button)
- Export
  - JSON: raw diagram data
  - SVG/PNG: foreignObject elements converted to pure SVG for portability and to avoid tainted canvas
  - PDF: rendered via jsPDF using an intermediate canvas
  - Safe fallbacks: when canvas export is blocked, download sanitized SVG instead
- Theming and UI
  - Tailwind-based design system with modern palette, shadows, and inputs
  - Clean header with Reset and unified Export dropdown

## Project Structure

- src/app/fishbone.component.ts — main component (rendering, layout, interactivity, export)
- src/app/app.ts — application shell mounting the component
- src/styles.css — Tailwind layers, components, utilities, and app styles
- tailwind.config.js — Tailwind theme extensions (colors, shadows, typography)
- src/index.html — base document (adds jsPDF CDN)

## Running Locally

- Install deps: npm install
- Start dev server: npm start (or ng serve)
- Open the app: http://localhost:4200

## Using the Component

The app already renders the component at the root. If embedding elsewhere:

```ts
import { Component } from "@angular/core";
import { FishboneComponent } from "./fishbone.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [FishboneComponent],
  template: "<app-fishbone></app-fishbone>",
})
export class App {}
```

## Data Model

```ts
interface Cause {
  id: string;
  text: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  subCauses: Cause[]; // reserved for future nesting
  layout?: { x: number; y: number; width: number; height: number }; // computed
}

interface Category {
  id: string;
  title: string;
  causes: Cause[];
  color: string; // assigned from a palette
}

interface DiagramData {
  problemStatement: string;
  categories: Category[];
}
```

## Controls and UI

- Problem statement: type directly in the header input
- Add Category: create new category with a color from the palette
- Category card: add/edit/delete causes in a compact list
- Add Cause modal: text field plus segmented priority control
- Focus mode: click a category bone to de-emphasize others; click empty canvas to clear
- Zoom: + / − / reset buttons, or use mouse wheel and drag to pan
- Export dropdown: JSON, SVG, PNG, PDF

## Layout Engine Overview

- Fixed-width cause boxes (Tailwind w-60) ensure tidy columns
- Vertical levels calculated independently for top/bottom halves
- Causes connect orthogonally to their category bone
- Collision handling maintains minimum gaps and pushes labels away from the spine when needed
- Canvas dimensions auto-scale to fit all content and the problem statement

## Export Details

- JSON: serializes DiagramData
- SVG/PNG/PDF: the component clones the SVG and converts all foreignObject elements into native SVG rectangles and text nodes
  - Prevents browser "tainted canvas" errors
  - Embeds a small stylesheet for consistent typography
- PNG/PDF: rendered via an offscreen canvas; if the canvas is blocked, the sanitized SVG is downloaded as a safe fallback
- Dependency: jsPDF is included via CDN in src/index.html

## Theming and Styling

- Global typography, gradient background, and component classes are defined in src/styles.css under Tailwind layers
- Theme tokens (colors, spacing, shadows, animations) live in tailwind.config.js
- Reusable classes: btn-primary, btn-secondary, btn-outline, card, input, scrollbar-thin

## Extensibility

- Priorities: extend the priority palette and mapping in fishbone.component.ts
- Export: customize sanitize/replaceForeignObjectsWithSVG for richer markup
- Layout: tweak layoutConfig (angles, gaps, padding) for different aesthetics
- Persistence: wire up import/restore from JSON to rehydrate DiagramData from storage

## Troubleshooting

- Export blocked (SecurityError / tainted canvas): use the provided PNG/SVG/PDF buttons; the component already sanitizes and falls back to SVG
- Missing labels or overlap: the layout engine runs after render; allow a brief moment or trigger a small window resize to reflow

## License

MIT
