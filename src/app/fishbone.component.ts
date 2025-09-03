import {
  Component,
  OnInit,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  HostListener,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

declare const jspdf: any;

type Priority = "Critical" | "High" | "Medium" | "Low";

interface Cause {
  id: string;
  text: string;
  priority: Priority;
  subCauses: Cause[];
  layout?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface Category {
  id: string;
  title: string;
  causes: Cause[];
  color: string;
}

interface DiagramData {
  problemStatement: string;
  categories: Category[];
}

@Component({
  selector: "app-fishbone",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen p-6">
      <!-- Header with controls -->
      <div class="max-w-full mx-auto mb-4">
        <div class="card p-4">
          <div class="flex flex-wrap justify-between items-center gap-6 mb-4">
            <h1>Interactive Fishbone Diagram</h1>
            <div class="flex items-center flex-wrap gap-6">
              <div class="flex items-center gap-2">
                <button
                  (click)="resetDiagram()"
                  class="btn-outline text-sm flex items-center"
                >
                  <svg
                    class="w-5 h-5 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Reset
                </button>
              </div>
              <div class="relative">
                <button
                  (click)="$event.stopPropagation(); toggleExportMenu()"
                  class="btn-primary text-sm flex items-center"
                >
                  <svg
                    class="w-5 h-5 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Export
                  <svg
                    class="w-4 h-4 ml-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </button>
                <div
                  *ngIf="isExportMenuOpen"
                  class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-neutral-200 z-10"
                  (click)="$event.stopPropagation()"
                >
                  <a
                    (click)="exportData(); closeExportMenu()"
                    class="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 cursor-pointer"
                    >Export as JSON</a
                  >
                  <a
                    (click)="exportSVG(); closeExportMenu()"
                    class="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 cursor-pointer"
                    >Export as SVG</a
                  >
                  <a
                    (click)="exportPNG(); closeExportMenu()"
                    class="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 cursor-pointer"
                    >Export as PNG</a
                  >
                  <a
                    (click)="exportPDF(); closeExportMenu()"
                    class="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 cursor-pointer"
                    >Export as PDF</a
                  >
                </div>
              </div>
            </div>
          </div>

          <div class="flex flex-wrap items-end gap-4">
            <!-- Problem Statement Input styled as title -->
            <div class="flex-1 min-w-[300px]">
              <input
                type="text"
                [(ngModel)]="diagram.problemStatement"
                placeholder="Click here to define the core problem."
                class="input w-full text-xl md:text-2xl font-semibold py-3 px-4 focus:ring-2 focus:ring-primary-300"
              />
            </div>

            <!-- Add Category Button -->
            <button
              (click)="addCategory()"
              class="btn-primary mt-1 flex items-center"
            >
              <svg
                class="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 6v12m6-6H6"
                />
              </svg>
              Add Category
            </button>
          </div>

          <!-- Priority Legend -->
          <div class="mt-4 p-3 bg-neutral-50 rounded-lg">
            <h3 class="text-sm font-medium text-neutral-700 mb-2">
              Priority Levels:
            </h3>
            <div class="flex flex-wrap gap-3">
              <div class="flex items-center">
                <div
                  class="w-4 h-4 rounded mr-2"
                  [style.background-color]="priorityColors.Critical"
                ></div>
                <span class="text-sm text-neutral-600">Critical</span>
              </div>
              <div class="flex items-center">
                <div
                  class="w-4 h-4 rounded mr-2"
                  [style.background-color]="priorityColors.High"
                ></div>
                <span class="text-sm text-neutral-600">High</span>
              </div>
              <div class="flex items-center">
                <div
                  class="w-4 h-4 rounded mr-2"
                  [style.background-color]="priorityColors.Medium"
                ></div>
                <span class="text-sm text-neutral-600">Medium</span>
              </div>
              <div class="flex items-center">
                <div
                  class="w-4 h-4 rounded mr-2"
                  [style.background-color]="priorityColors.Low"
                ></div>
                <span class="text-sm text-neutral-600">Low</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Dynamic Fishbone Diagram Canvas -->
      <div class="max-w-full mx-auto">
        <div
          class="bg-white rounded-lg shadow-card border border-neutral-200 overflow-x-auto fishbone-wrapper relative"
          [style.min-height.px]="canvasHeight"
        >
          <!-- Zoom/Pan overlay controls -->
          <div class="absolute right-3 top-3 z-10 flex flex-col gap-2">
            <button class="btn-secondary w-9 h-9 p-0" (click)="zoomIn()">
              +
            </button>
            <button class="btn-secondary w-9 h-9 p-0" (click)="zoomOut()">
              −
            </button>
            <button class="btn-outline w-9 h-9 p-0" (click)="resetView()">
              ⤾
            </button>
          </div>

          <svg
            #diagramSvg
            [attr.width]="canvasWidth"
            [attr.height]="canvasHeight"
            [attr.viewBox]="viewX + ' ' + viewY + ' ' + viewW + ' ' + viewH"
            class="min-w-full h-full"
            (click)="clearFocus()"
            (wheel)="onWheel($event)"
            (mousedown)="onMouseDown($event)"
            (mousemove)="onMouseMove($event)"
            (mouseleave)="onMouseUp()"
            (mouseup)="onMouseUp()"
          >
            <defs>
              <!-- Subtle drop shadow for bones -->
              <filter
                id="boneShadow"
                x="-20%"
                y="-20%"
                width="140%"
                height="140%"
              >
                <feDropShadow
                  dx="0"
                  dy="1"
                  stdDeviation="1"
                  flood-color="#000000"
                  flood-opacity="0.08"
                />
              </filter>
            </defs>

            <!-- Main Spine (Dynamic length) -->
            <line
              [attr.x1]="spineStartX"
              [attr.y1]="spineY"
              [attr.x2]="spineEndX"
              [attr.y2]="spineY"
              stroke="#111827"
              stroke-width="4"
              stroke-linecap="round"
            />

            <!-- Problem Statement -->
            <text
              [attr.x]="problemBoxX + problemBoxWidth / 2"
              [attr.y]="spineY - 10"
              fill="#111827"
              font-size="18"
              font-weight="800"
              text-anchor="middle"
              dominant-baseline="baseline"
            >
              {{ diagram.problemStatement || "Add Problem Statement" }}
            </text>

            <!-- Categories and Causes -->
            <g
              *ngFor="let category of diagram.categories; let i = index"
              [attr.id]="'cat-' + category.id"
              [style.opacity]="
                !focusedCategoryId || focusedCategoryId === category.id
                  ? 1
                  : 0.15
              "
              (click)="setFocus(category, $event)"
            >
              <!-- Category Bone -->
              <line
                [attr.x1]="getCategoryX(i)"
                [attr.y1]="spineY"
                [attr.x2]="getCategoryEndX(i)"
                [attr.y2]="getCategoryEndY(i)"
                [attr.stroke]="category.color"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                filter="url(#boneShadow)"
              />

              <!-- Category Title -->
              <text
                [attr.x]="getCategoryTextX(i)"
                [attr.y]="getCategoryTextY(i)"
                fill="#111827"
                font-size="12"
                font-weight="700"
                text-anchor="middle"
                dominant-baseline="middle"
                class="cursor-pointer"
              >
                {{ category.title }}
              </text>

              <!-- Add Cause Button -->
              <g
                class="cursor-pointer hover:opacity-80"
                (click)="addCause(category)"
              >
                <circle
                  [attr.cx]="getCategoryEndX(i)"
                  [attr.cy]="getCategoryEndY(i)"
                  r="10"
                  [attr.fill]="getTint(category.color, 0.2)"
                  [attr.stroke]="category.color"
                  stroke-width="1.5"
                />
                <path
                  [attr.d]="
                    'M ' +
                    getCategoryEndX(i) +
                    ' ' +
                    (getCategoryEndY(i) - 4) +
                    ' v 8 M ' +
                    (getCategoryEndX(i) - 4) +
                    ' ' +
                    getCategoryEndY(i) +
                    ' h 8'
                  "
                  [attr.stroke]="category.color"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </g>

              <!-- Category Causes: connectors -->
              <g
                *ngFor="let cause of category.causes; let j = index"
                (mouseenter)="hoveredCauseId = cause.id"
                (mouseleave)="hoveredCauseId = null"
              >
                <path
                  [attr.d]="getOrthogonalCauseConnectorPath(i, cause, j)"
                  stroke="#6b7280"
                  [attr.stroke-width]="hoveredCauseId === cause.id ? 2 : 1.5"
                  stroke-linejoin="round"
                  stroke-linecap="round"
                  fill="none"
                />
              </g>

              <!-- Delete Category Button (trash icon) -->
              <g
                class="cursor-pointer hover:opacity-75"
                (click)="deleteCategory(category)"
              >
                <circle
                  [attr.cx]="getCategoryTextX(i) + 40"
                  [attr.cy]="getCategoryTextY(i)"
                  r="10"
                  [attr.fill]="getTint('#ef4444', 0.9)"
                />
                <svg
                  [attr.x]="getCategoryTextX(i) + 34"
                  [attr.y]="getCategoryTextY(i) - 6"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M19 7l-1 12a2 2 0 01-2 2H8a2 2 0 01-2-2L5 7m3 0V5a2 2 0 012-2h4a2 2 0 012 2v2m-9 0h10"
                    stroke="white"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </g>
            </g>

            <!-- Overlay pass: labels above all bones -->
            <g *ngFor="let category of diagram.categories; let i = index">
              <g *ngFor="let cause of category.causes; let j = index">
                <foreignObject
                  [attr.x]="
                    (cause.layout?.x ?? getLabelLeftX(i, j, cause.text)) - 3
                  "
                  [attr.y]="cause.layout?.y ?? getLabelTopY(i, j, cause.text)"
                  [attr.width]="
                    (cause.layout?.width ?? getLabelWidth(i, j, cause.text)) + 3
                  "
                  [attr.height]="
                    cause.layout?.height ?? getLabelHeight(i, j, cause.text)
                  "
                >
                  <div
                    xmlns="http://www.w3.org/1999/xhtml"
                    class="cause-box w-60"
                    [attr.data-cause-id]="cause.id"
                    [style.border-left]="
                      '4px solid ' + priorityColors[cause.priority]
                    "
                    style="border:1px solid #E5E7EB;border-left-width:4px;border-radius:8px;padding:6px 8px;display:inline-block;background:#ffffff;box-shadow:0 4px 15px -2px rgba(0,0,0,0.05);transition:box-shadow 150ms ease, transform 150ms ease;"
                  >
                    <span
                      class="cause-text break-words"
                      [class.clamped]="true"
                      [style.max-width.px]="labelMaxWidth"
                      [attr.title]="
                        needsClamp(i, j, cause.text) ? cause.text : null
                      "
                      >{{ cause.text }}</span
                    >
                    <button
                      type="button"
                      class="ellipsis-btn"
                      *ngIf="needsClamp(i, j, cause.text)"
                      (mouseenter)="showTooltip($event, cause.text)"
                      (mouseleave)="hideTooltip()"
                      (focus)="showTooltip($event, cause.text)"
                      (blur)="hideTooltip()"
                    >
                      …
                    </button>
                  </div>
                </foreignObject>
                <!-- Delete cause icon (trash) -->
                <svg
                  [attr.x]="
                    (cause.layout?.x ?? getLabelLeftX(i, j, cause.text)) +
                    (cause.layout?.width ?? getLabelWidth(i, j, cause.text)) -
                    10
                  "
                  [attr.y]="
                    (cause.layout?.y ?? getLabelTopY(i, j, cause.text)) +
                    (cause.layout?.height ?? getLabelHeight(i, j, cause.text)) /
                      2 -
                    6
                  "
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  [attr.opacity]="hoveredCauseId === cause.id ? 1 : 0"
                  class="cursor-pointer"
                  (click)="deleteCause(category, cause)"
                >
                  <path
                    d="M19 7l-1 12a2 2 0 01-2 2H8a2 2 0 01-2-2L5 7m3 0V5a2 2 0 012-2h4a2 2 0 012 2v2m-9 0h10"
                    stroke="#ef4444"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </g>
            </g>
          </svg>
        </div>
      </div>

      <!-- Full-text Popover -->
      <div
        *ngIf="tooltipVisible"
        class="popover animate-fade-in"
        [style.left.px]="tooltipX"
        [style.top.px]="tooltipY"
        role="tooltip"
      >
        <div class="popover-inner">{{ tooltipText }}</div>
      </div>

      <!-- Enhanced Category Management Panel -->
      <div
        class="max-w-full mx-auto mt-4"
        *ngIf="diagram.categories.length > 0"
      >
        <div class="card p-4">
          <h2 class="mb-3">Categories & Causes</h2>
          <div
            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6"
          >
            <div
              *ngFor="let category of diagram.categories"
              class="border border-neutral-200 rounded-lg p-4 shadow-soft-lift bg-white"
            >
              <div class="flex items-center justify-between mb-3">
                <h3
                  class="text-base font-bold truncate"
                  [style.color]="category.color"
                >
                  {{ category.title }}
                </h3>
                <button
                  (click)="addCause(category)"
                  class="btn-secondary text-xs flex items-center px-2 py-1"
                >
                  <svg
                    class="w-4 h-4 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 6v12m6-6H6"
                    />
                  </svg>
                  Add
                </button>
              </div>
              <div class="space-y-1 max-h-40 overflow-y-auto scrollbar-thin">
                <div
                  *ngFor="let cause of category.causes"
                  class="text-xs flex items-center justify-between group p-2 rounded relative odd:bg-neutral-50"
                  [style.background-color]="
                    priorityColors[cause.priority] + '14'
                  "
                >
                  <div class="flex items-center flex-1 min-w-0">
                    <div
                      class="w-2.5 h-2.5 rounded-full mr-2 flex-shrink-0"
                      [style.background-color]="priorityColors[cause.priority]"
                    ></div>
                    <span
                      class="cursor-pointer text-neutral-700 line-clamp-2"
                      (click)="editCause(cause)"
                      [title]="cause.text + ' (' + cause.priority + ')'"
                    >
                      {{ cause.text }}
                    </span>
                  </div>
                  <div class="flex items-center space-x-1 ml-2">
                    <span
                      class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white"
                      [style.background-color]="priorityColors[cause.priority]"
                    >
                      {{ cause.priority.charAt(0) }}
                    </span>
                    <button
                      class="text-neutral-600 hover:text-neutral-900 p-1 rounded hover:bg-neutral-100"
                      (click)="toggleCauseMenu(cause, $event)"
                    >
                      <svg
                        class="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <circle cx="12" cy="5" r="1.5" />
                        <circle cx="12" cy="12" r="1.5" />
                        <circle cx="12" cy="19" r="1.5" />
                      </svg>
                    </button>
                    <div
                      *ngIf="openMenuForCauseId === cause.id"
                      class="absolute right-2 top-7 z-10 bg-white border border-neutral-200 rounded-md shadow-card p-1"
                      (click)="$event.stopPropagation()"
                    >
                      <button
                        class="flex items-center w-full text-left text-[12px] px-2 py-1 rounded hover:bg-neutral-50"
                        (click)="editCause(cause); closeCauseMenu()"
                      >
                        Edit
                      </button>
                      <button
                        class="flex items-center w-full text-left text-[12px] text-red-600 px-2 py-1 rounded hover:bg-red-50"
                        (click)="deleteCause(category, cause); closeCauseMenu()"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
                <div
                  *ngIf="category.causes.length === 0"
                  class="text-xs text-neutral-400 italic"
                >
                  Click Add to create causes
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Add Cause Modal -->
      <div
        *ngIf="showAddCauseModal"
        class="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50"
        (click)="cancelAddCause()"
        (keydown.escape)="cancelAddCause()"
      >
        <div
          #modalRef
          class="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-modal animate-slide-up animate-fade-in"
          (click)="$event.stopPropagation()"
          tabindex="-1"
          aria-modal="true"
          role="dialog"
        >
          <h3 class="text-lg font-semibold text-neutral-900 mb-4">
            Add New Cause
          </h3>

          <div class="mb-4">
            <label class="block text-sm font-medium text-neutral-700 mb-2"
              >Cause Description:</label
            >
            <input
              type="text"
              [(ngModel)]="newCauseText"
              placeholder="Enter cause description..."
              class="input w-full"
              id="causeInput"
              #causeInput
            />
          </div>

          <div class="mb-6">
            <label class="block text-sm font-medium text-neutral-700 mb-2"
              >Priority Level:</label
            >
            <div
              class="inline-flex items-center rounded-lg border border-neutral-300 overflow-hidden"
            >
              <label
                *ngFor="let priority of priorities"
                class="px-3 py-1.5 text-sm cursor-pointer select-none"
                [class.font-semibold]="selectedPriority === priority"
                [style.background-color]="
                  selectedPriority === priority
                    ? getTint(priorityColors[priority], 0.12)
                    : 'transparent'
                "
                [style.color]="
                  selectedPriority === priority ? '#111827' : '#374151'
                "
                (click)="selectedPriority = priority"
              >
                <span class="inline-flex items-center"
                  ><span
                    class="w-2.5 h-2.5 rounded-full mr-2"
                    [style.background-color]="priorityColors[priority]"
                  ></span
                  >{{ priority }}</span
                >
              </label>
            </div>
          </div>

          <div class="flex justify-end space-x-3">
            <button (click)="cancelAddCause()" class="btn-outline">
              Cancel
            </button>
            <button
              (click)="confirmAddCause()"
              class="btn-primary"
              [disabled]="!newCauseText.trim()"
            >
              Add Cause
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      svg text {
        user-select: none;
      }
      .cursor-pointer:hover {
        opacity: 0.9;
      }
      .overflow-y-auto {
        scrollbar-width: thin;
        scrollbar-color: #d1d5db #f3f4f6;
      }
      .overflow-y-auto::-webkit-scrollbar {
        width: 4px;
      }
      .overflow-y-auto::-webkit-scrollbar-track {
        background: #f3f4f6;
        border-radius: 2px;
      }
      .overflow-y-auto::-webkit-scrollbar-thumb {
        background: #d1d5db;
        border-radius: 2px;
      }
      .btn-primary:disabled {
        background-color: #a3a3a3;
        cursor: not-allowed;
      }
      .cause-box {
        font-size: 10px;
        line-height: 14px;
        color: #111827;
        background: #ffffff;
        max-width: 300px;
      }
      .cause-text {
        overflow-wrap: anywhere;
        word-break: break-word;
      }
      .cause-text.clamped {
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .ellipsis-btn {
        background: transparent;
        border: none;
        color: #2563eb;
        cursor: pointer;
        font-weight: 700;
        margin-left: 4px;
        padding: 0 2px;
        line-height: 1;
      }
      .fishbone-wrapper {
        width: 100%;
        overflow-x: auto;
      }
      .popover {
        position: fixed;
        z-index: 50;
        pointer-events: none;
        transform: translate(-50%, calc(-100% - 8px));
      }
      .popover-inner {
        max-width: 360px;
        background: #111827;
        color: white;
        padding: 8px 10px;
        border-radius: 6px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
        font-size: 12px;
        line-height: 16px;
        white-space: normal;
      }
    `,
  ],
})
export class FishboneComponent implements OnInit, AfterViewInit, OnDestroy {
  hoveredCauseId: string | null = null;
  focusedCategoryId: string | null = null;
  expandedCauses = new Set<string>();
  @ViewChild("diagramSvg") svgRef!: ElementRef<SVGSVGElement>;
  @ViewChild("causeInput") causeInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild("modalRef") modalRef?: ElementRef<HTMLDivElement>;

  // Measurement cache and offsets
  private measuredLabelWidth: Record<string, number> = {};
  private yOffsets: Record<string, number> = {};

  private raf1: number | null = null;
  private raf2: number | null = null;
  private resizeObserver?: ResizeObserver;
  private mutationObserver?: MutationObserver;

  // Tooltip state for full text
  tooltipVisible = false;
  tooltipText = "";
  tooltipX = 0;
  tooltipY = 0;

  // Context menu state for causes
  openMenuForCauseId: string | null = null;
  // Export dropdown state
  isExportMenuOpen = false;
  toggleExportMenu() {
    this.isExportMenuOpen = !this.isExportMenuOpen;
  }
  closeExportMenu() {
    this.isExportMenuOpen = false;
  }

  // Sequential layout mapping
  private categoryXMap: Record<string, number> = {};

  // Grid layout configuration and state
  private layoutConfig = {
    fixedCauseWidth: 240, // Tailwind w-60 (15rem)
    levelPadding: 15,
    horizontalColumnGap: 40,
    spineStartX: 80,
    problemStatementWidth: 200,
    problemStatementGap: 50,
    boneAngle: 45,
    spineStartYOffset: 40,
    connectorShelf: 10,
    connectorGap: 5,
  };
  private topLevelYPositions: number[] = [];
  private bottomLevelYPositions: number[] = [];

  // Pan and zoom viewBox
  viewX = 0;
  viewY = 0;
  viewW = 0;
  viewH = 0;
  private isPanning = false;
  private panStartX = 0;
  private panStartY = 0;
  private viewStartX = 0;
  private viewStartY = 0;

  setFocus(category: Category, ev: MouseEvent) {
    ev.stopPropagation();
    this.focusedCategoryId = category.id;
  }

  clearFocus() {
    this.focusedCategoryId = null;
  }

  ngAfterViewInit() {
    this.setupObservers();
    this.runLayoutAfterRender();
  }

  private runLayoutAfterRender() {
    this.scheduleLayout();
  }

  private scheduleLayout() {
    try {
      if (this.raf1) cancelAnimationFrame(this.raf1);
      if (this.raf2) cancelAnimationFrame(this.raf2);
      this.raf1 = requestAnimationFrame(() => {
        this.raf2 = requestAnimationFrame(() => {
          try {
            this.runLayoutEngine();
            this.resetViewIfUnset();
          } catch (e) {
            console.warn("layout pass skipped due to error", e);
          }
        });
      });
    } catch (e) {
      console.warn("scheduleLayout failed", e);
    }
  }

  private setupObservers() {
    const svg = this.svgRef?.nativeElement;
    if (!svg || typeof ResizeObserver === "undefined") return;
    try {
      this.resizeObserver = new ResizeObserver(() => this.scheduleLayout());
      this.resizeObserver.observe(svg);
      this.mutationObserver = new MutationObserver(() => this.scheduleLayout());
      this.mutationObserver.observe(svg, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    } catch (e) {
      console.warn("observers setup failed", e);
    }
  }

  private recomputeCategoryXMap() {
    let previousColumnEndX = this.layoutConfig.spineStartX;

    for (let i = 0; i < this.diagram.categories.length; i += 2) {
      const topCat = this.diagram.categories[i];
      const bottomCat = this.diagram.categories[i + 1];

      const labelSpace = this.layoutConfig.fixedCauseWidth;
      const boneX =
        previousColumnEndX + labelSpace + this.layoutConfig.horizontalColumnGap;

      if (topCat) this.categoryXMap[topCat.id] = boneX;
      if (bottomCat) this.categoryXMap[bottomCat.id] = boneX;

      const angleRadians = (this.layoutConfig.boneAngle * Math.PI) / 180;
      const topLen = topCat
        ? Math.cos(angleRadians) * this.getCategoryLength(i)
        : 0;
      const botLen = bottomCat
        ? Math.cos(angleRadians) * this.getCategoryLength(i + 1)
        : 0;
      previousColumnEndX = boneX + Math.max(topLen, botLen);
    }
  }

  private getCategoryAngle(index: number): number {
    const angle = this.layoutConfig.boneAngle;
    return this.isTopSide(index) ? -angle : angle;
  }

  diagram: DiagramData = { problemStatement: "", categories: [] };

  showAddCauseModal = false;
  newCauseText = "";
  selectedPriority: Priority = "Medium";
  currentCategory: Category | null = null;

  priorities: Priority[] = ["Critical", "High", "Medium", "Low"];

  priorityColors = {
    Critical: "#dc2626",
    High: "#ea580c",
    Medium: "#ca8a04",
    Low: "#16a34a",
  };

  private readonly categoryColors = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#06b6d4",
    "#ec4899",
    "#14b8a6",
    "#f97316",
    "#8b5cf6",
  ];

  // Dynamic canvas dimensions
  get lastBoneEndX(): number {
    if (this.diagram.categories.length === 0) return this.spineStartX;
    const lastIndex = this.diagram.categories.length - 1;
    const lastCat = this.diagram.categories[lastIndex];
    // Avoid calling getCategoryX here to prevent recursive access via spineEndX
    let boneX = this.categoryXMap[lastCat.id];
    if (boneX == null) {
      const col = Math.floor(lastIndex / 2);
      const angleRad = (this.layoutConfig.boneAngle * Math.PI) / 180;
      const projectedBase = Math.cos(angleRad) * 80;
      const step =
        this.layoutConfig.fixedCauseWidth +
        this.layoutConfig.horizontalColumnGap +
        projectedBase;
      boneX = this.layoutConfig.spineStartX + (col + 1) * step;
    }
    const angle = Math.abs(this.getCategoryAngle(lastIndex));
    const horiz =
      Math.cos((angle * Math.PI) / 180) * this.getCategoryLength(lastIndex);
    return boneX + horiz;
  }

  get spineEndX(): number {
    return this.lastBoneEndX + this.layoutConfig.problemStatementGap;
  }

  get problemBoxX(): number {
    return this.spineEndX + 20;
  }

  get problemBoxWidth(): number {
    return this.layoutConfig.problemStatementWidth;
  }

  get canvasWidth(): number {
    return this.problemBoxX + this.layoutConfig.problemStatementWidth + 40;
  }

  get canvasHeight(): number {
    const minHeight = 360;
    const margin = 30;
    const sideDepth = (top: boolean) => {
      let maxDepth = this.labelBaseOffset;
      this.diagram.categories.forEach((cat, i) => {
        if (!!cat && this.isTopSide(i) === top) {
          let sum = 0;
          cat.causes.forEach((cause, j) => {
            sum +=
              this.getLabelHeight(i, j, cause.text) + (j > 0 ? this.minGap : 0);
          });
          maxDepth = Math.max(maxDepth, this.labelBaseOffset + sum + 16);
        }
      });
      return maxDepth + margin;
    };
    const topDepth = sideDepth(true);
    const bottomDepth = sideDepth(false);
    return Math.max(minHeight, topDepth + bottomDepth + 20);
  }

  get spineStartX(): number {
    return this.layoutConfig.spineStartX;
  }
  get spineY(): number {
    return this.canvasHeight / 2;
  }
  get problemBoxY(): number {
    return this.spineY - 40;
  }
  get problemBoxHeight(): number {
    return 80;
  }

  ngOnInit() {
    this.diagram.problemStatement = "Website Conversion Rate is Low";
    this.addDefaultCategories();
    this.runLayoutAfterRender();
  }

  private addDefaultCategories() {
    const defaultCategories = [
      "Methods",
      "Machines",
      "Materials",
      "Measurements",
      "Mother Nature",
      "Manpower",
    ];
    defaultCategories.forEach((title, index) => {
      this.diagram.categories.push({
        id: this.generateId(),
        title,
        causes: [],
        color: this.categoryColors[index % this.categoryColors.length],
      });
    });
  }

  addCategory() {
    const title = prompt("Enter category name:");
    if (title && title.trim()) {
      const category: Category = {
        id: this.generateId(),
        title: title.trim(),
        causes: [],
        color:
          this.categoryColors[
            this.diagram.categories.length % this.categoryColors.length
          ],
      };
      this.diagram.categories.push(category);
    }
  }

  editCategory(category: Category) {
    const newTitle = prompt("Edit category name:", category.title);
    if (newTitle && newTitle.trim()) {
      category.title = newTitle.trim();
    }
  }

  deleteCategory(category: Category) {
    if (confirm(`Delete category "${category.title}" and all its causes?`)) {
      const index = this.diagram.categories.indexOf(category);
      if (index > -1) {
        this.diagram.categories.splice(index, 1);
        this.runLayoutAfterRender();
      }
    }
  }

  addCause(category: Category) {
    this.currentCategory = category;
    this.newCauseText = "";
    this.selectedPriority = "Medium";
    this.showAddCauseModal = true;
    setTimeout(() => this.causeInputRef?.nativeElement?.focus(), 0);
  }

  confirmAddCause() {
    if (this.newCauseText.trim() && this.currentCategory) {
      const cause: Cause = {
        id: this.generateId(),
        text: this.newCauseText.trim(),
        priority: this.selectedPriority,
        subCauses: [],
      };
      this.currentCategory.causes.push(cause);
      this.cancelAddCause();
      this.runLayoutAfterRender();
    }
  }

  cancelAddCause() {
    this.showAddCauseModal = false;
    this.currentCategory = null;
    this.newCauseText = "";
    this.selectedPriority = "Medium";
  }

  editCause(cause: Cause) {
    const newText = prompt("Edit cause description:", cause.text);
    if (newText && newText.trim()) {
      cause.text = newText.trim();
      this.runLayoutAfterRender();
    }
  }

  deleteCause(category: Category, cause: Cause) {
    if (confirm(`Delete cause "${cause.text}"?`)) {
      const index = category.causes.indexOf(cause);
      if (index > -1) {
        category.causes.splice(index, 1);
        this.runLayoutAfterRender();
      }
    }
  }

  resetDiagram() {
    if (confirm("Reset the entire diagram? This cannot be undone.")) {
      this.diagram = { problemStatement: "", categories: [] };
    }
  }

  exportData() {
    const dataStr = JSON.stringify(this.diagram, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "fishbone-diagram.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  ngOnDestroy() {
    try {
      if (this.raf1) cancelAnimationFrame(this.raf1);
      if (this.raf2) cancelAnimationFrame(this.raf2);
      this.resizeObserver?.disconnect?.();
      this.mutationObserver?.disconnect?.();
    } catch {}
  }

  // Compute a content bounding box for export
  private getContentBoundingBox() {
    const x = 0;
    const y = 0;
    const width = this.canvasWidth;
    const height = this.canvasHeight;
    return { x, y, width, height };
  }

  async exportSVG() {
    const svgEl = this.svgRef?.nativeElement;
    if (!svgEl) return;
    const clone = svgEl.cloneNode(true) as SVGSVGElement;

    // Replace foreignObject with pure SVG for portability
    this.replaceForeignObjectsWithSVG(clone);

    const bbox = this.getContentBoundingBox();
    const padding = 20;
    clone.setAttribute("width", String(bbox.width + padding * 2));
    clone.setAttribute("height", String(bbox.height + padding * 2));
    clone.setAttribute(
      "viewBox",
      `${bbox.x - padding} ${bbox.y - padding} ${bbox.width + padding * 2} ${bbox.height + padding * 2}`,
    );

    const style = document.createElement("style");
    style.textContent = `
      svg text { user-select: none; font-family: Inter, system-ui, sans-serif; }
    `;
    clone.prepend(style);

    const svgString = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fishbone-diagram.svg";
    a.click();
    URL.revokeObjectURL(url);
  }

  async exportPNG() {
    const svgEl = this.svgRef?.nativeElement;
    if (!svgEl) return;

    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    // Ensure no foreignObject remains to avoid tainting canvas
    this.replaceForeignObjectsWithSVG(clone);

    const bbox = this.getContentBoundingBox();
    const padding = 20;
    const exportWidth = Math.round(bbox.width + padding * 2);
    const exportHeight = Math.round(bbox.height + padding * 2);
    clone.setAttribute("width", String(exportWidth));
    clone.setAttribute("height", String(exportHeight));
    clone.setAttribute(
      "viewBox",
      `${bbox.x - padding} ${bbox.y - padding} ${exportWidth} ${exportHeight}`,
    );

    const style = document.createElement("style");
    style.textContent = `
      svg text { user-select: none; font-family: Inter, system-ui, sans-serif; }
    `;
    clone.prepend(style);

    const svgString = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = exportWidth;
      canvas.height = exportHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        return;
      }
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      try {
        ctx.getImageData(0, 0, 1, 1);
      } catch {
        const a = document.createElement("a");
        a.href = url;
        a.download = "fishbone-diagram.svg";
        a.click();
        return;
      }
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png", 1.0);
      a.download = "fishbone-diagram.png";
      a.click();
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  async exportPDF() {
    const svgEl = this.svgRef?.nativeElement;
    if (!svgEl) return;

    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    this.replaceForeignObjectsWithSVG(clone);

    const bbox = this.getContentBoundingBox();
    const padding = 40;
    const exportWidth = Math.round(bbox.width + padding * 2);
    const exportHeight = Math.round(bbox.height + padding * 2);
    clone.setAttribute("width", String(exportWidth));
    clone.setAttribute("height", String(exportHeight));
    clone.setAttribute(
      "viewBox",
      `${bbox.x - padding} ${bbox.y - padding} ${exportWidth} ${exportHeight}`,
    );

    const style = document.createElement("style");
    style.textContent = `svg text { user-select: none; font-family: Inter, system-ui, sans-serif; }`;
    clone.prepend(style);

    const svgString = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = exportWidth;
      canvas.height = exportHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        return;
      }
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      try {
        ctx.getImageData(0, 0, 1, 1);
      } catch {
        const a = document.createElement("a");
        a.href = url;
        a.download = "fishbone-diagram.svg";
        a.click();
        return;
      }
      const imgData = canvas.toDataURL("image/png");
      const orientation = exportWidth > exportHeight ? "l" : "p";
      const pdf = new jspdf.jsPDF({
        orientation,
        unit: "px",
        format: [exportWidth, exportHeight],
      });
      pdf.addImage(imgData, "PNG", 0, 0, exportWidth, exportHeight);
      pdf.save("fishbone-diagram.pdf");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  private replaceForeignObjectsWithSVG(clone: SVGSVGElement) {
    // Remove all foreignObjects and draw rectangles + wrapped text instead
    const ns = "http://www.w3.org/2000/svg";
    // Remove existing foreignObjects
    clone.querySelectorAll("foreignObject").forEach((fo) => fo.remove());
    const overlay = document.createElementNS(ns, "g");
    overlay.setAttribute("id", "export-labels");

    const lineHeight = 14;
    const paddingX = 6;
    const paddingY = 6;
    const approxChar = 6; // px per char at 10px font

    // Use current component data for positions
    this.diagram.categories.forEach((category, i) => {
      category.causes.forEach((cause, j) => {
        const lay = cause.layout;
        if (!lay) return;
        const group = document.createElementNS(ns, "g");

        const rect = document.createElementNS(ns, "rect");
        rect.setAttribute("x", String(lay.x));
        rect.setAttribute("y", String(lay.y));
        rect.setAttribute("width", String(lay.width));
        rect.setAttribute("height", String(lay.height));
        rect.setAttribute("fill", "#ffffff");
        rect.setAttribute("stroke", "#E5E7EB");
        rect.setAttribute("rx", "8");
        group.appendChild(rect);

        const leftBar = document.createElementNS(ns, "rect");
        leftBar.setAttribute("x", String(lay.x));
        leftBar.setAttribute("y", String(lay.y));
        leftBar.setAttribute("width", "4");
        leftBar.setAttribute("height", String(lay.height));
        leftBar.setAttribute("fill", this.priorityColors[cause.priority]);
        group.appendChild(leftBar);

        // Word wrap text
        const maxTextWidth = lay.width - paddingX * 2 - 4;
        const charsPerLine = Math.max(
          10,
          Math.floor(maxTextWidth / approxChar),
        );
        const words = cause.text.split(/\s+/);
        const lines: string[] = [];
        let current = "";
        for (const w of words) {
          const trial = current ? current + " " + w : w;
          if (trial.length <= charsPerLine) current = trial;
          else {
            lines.push(current);
            current = w;
          }
        }
        if (current) lines.push(current);
        const maxLines = Math.max(
          1,
          Math.floor((lay.height - paddingY * 2) / lineHeight),
        );
        const finalLines = lines.slice(0, maxLines);

        finalLines.forEach((ln, idx) => {
          const text = document.createElementNS(ns, "text");
          text.setAttribute("x", String(lay.x + 4 + paddingX));
          text.setAttribute(
            "y",
            String(lay.y + paddingY + lineHeight * (idx + 1) - 3),
          );
          text.setAttribute("fill", "#111827");
          text.setAttribute("font-size", "10");
          text.setAttribute("font-family", "Inter, system-ui, sans-serif");
          text.textContent = ln;
          group.appendChild(text);
        });

        overlay.appendChild(group);
      });
    });

    clone.appendChild(overlay);
  }

  // Level-Based Grid Layout Engine

  // Level-Based Grid Layout Engine
  runLayoutEngine() {
    requestAnimationFrame(() => {
      const measured = this.measureAllLabels();
      if (measured) {
        this.calculateGridLayout();
      }
    });
  }

  private calculateVerticalLevels() {
    const topHeights: number[] = [];
    const bottomHeights: number[] = [];
    const pad = this.layoutConfig.levelPadding;

    this.diagram.categories.forEach((cat, i) => {
      const isTop = this.isTopSide(i);
      const arr = isTop ? topHeights : bottomHeights;
      cat.causes.forEach((cause, j) => {
        const h = cause.layout?.height || this.getLabelHeight(i, j, cause.text);
        arr[j] = Math.max(arr[j] || 0, h);
      });
    });

    let currentTopY = this.spineY - this.layoutConfig.spineStartYOffset;
    this.topLevelYPositions = topHeights.map((h) => {
      const y = currentTopY - h;
      currentTopY -= h + pad;
      return y;
    });

    let currentBottomY = this.spineY + this.layoutConfig.spineStartYOffset;
    this.bottomLevelYPositions = bottomHeights.map((h) => {
      const y = currentBottomY;
      currentBottomY += h + pad;
      return y;
    });
  }

  private assignFinalPositions() {
    const yMapTop = this.topLevelYPositions;
    const yMapBottom = this.bottomLevelYPositions;

    this.diagram.categories.forEach((category, i) => {
      const isTop = this.isTopSide(i);
      const yPositions = isTop ? yMapTop : yMapBottom;
      category.causes.forEach((cause, j) => {
        if (!cause.layout || yPositions[j] === undefined) return;
        cause.layout.y = yPositions[j];
        const boneX = this.getCauseConnectionX(i, j);
        const shelf = this.layoutConfig.connectorShelf;
        const gap = this.layoutConfig.connectorGap;
        cause.layout.x = boneX - (cause.layout.width ?? 0) - shelf - gap;
      });
    });

    this.diagram = { ...this.diagram };
  }

  private calculateGridLayout() {
    this.calculateVerticalLevels();
    this.recomputeCategoryXMap();
    this.assignFinalPositions();
  }

  // Expanded/clamped logic and measurements for labels
  isExpanded(cause: Cause): boolean {
    return this.expandedCauses.has(cause.id);
  }
  toggleExpand(cause: Cause, event?: MouseEvent) {
    if (event) event.stopPropagation();
    this.isExpanded(cause)
      ? this.expandedCauses.delete(cause.id)
      : this.expandedCauses.add(cause.id);
  }
  getLabelWidth(
    categoryIndex: number,
    causeIndex: number,
    text: string,
  ): number {
    const id = this.diagram.categories[categoryIndex]?.causes[causeIndex]?.id;
    if (id && this.measuredLabelWidth[id] != null)
      return this.measuredLabelWidth[id];
    return this.layoutConfig.fixedCauseWidth;
  }
  private getCharsPerLine(width: number): number {
    return Math.max(10, Math.floor(width / this.approxCharWidth));
  }
  getTotalLines(text: string, width: number): number {
    const cpl = this.getCharsPerLine(width);
    return Math.max(1, Math.ceil(text.length / cpl));
  }
  collapsedLines = 3;
  lineHeightPx = 14;
  needsClamp(categoryIndex: number, causeIndex: number, text: string): boolean {
    const w = this.getLabelWidth(categoryIndex, causeIndex, text);
    return this.getTotalLines(text, w) > this.collapsedLines;
  }
  getLabelHeight(
    categoryIndex: number,
    causeIndex: number,
    text: string,
  ): number {
    const w = this.getLabelWidth(categoryIndex, causeIndex, text);
    const total = this.getTotalLines(text, w);
    const lines = Math.min(total, this.collapsedLines);
    const padding = 12;
    return lines * this.lineHeightPx + padding;
  }

  // Y with collision offsets
  getLabelY(categoryIndex: number, causeIndex: number, text?: string): number {
    const t =
      text ??
      this.diagram.categories[categoryIndex]?.causes[causeIndex]?.text ??
      "";
    const base = this.getStackedCenterY(categoryIndex, causeIndex, t);
    const id = this.diagram.categories[categoryIndex]?.causes[causeIndex]?.id;
    const off = (id && this.yOffsets[id]) || 0;
    return base + off;
  }

  getLabelTopY(
    categoryIndex: number,
    causeIndex: number,
    text: string,
  ): number {
    const center = this.getLabelY(categoryIndex, causeIndex, text);
    const h = this.getLabelHeight(categoryIndex, causeIndex, text);
    return center - h / 2;
  }

  showTooltip(event: Event, text: string) {
    const target = event.currentTarget as HTMLElement | null;
    if (!target || !target.getBoundingClientRect) return;
    const rect = target.getBoundingClientRect();
    const margin = 12;
    const centerX = rect.left + rect.width / 2;
    let x = centerX;
    let y = rect.top;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    x = Math.max(margin, Math.min(vw - margin, x));
    y = Math.max(margin, Math.min(vh - margin, y));
    this.tooltipText = text;
    this.tooltipX = x;
    this.tooltipY = y;
    this.tooltipVisible = true;
  }
  hideTooltip() {
    this.tooltipVisible = false;
  }

  // Utility functions

  labelMaxWidth = 300;
  private approxCharWidth = 7;
  getLabelWidthFromText(text: string): number {
    return Math.min(
      Math.max(text.length * this.approxCharWidth + 16, 120),
      this.labelMaxWidth,
    );
  }

  private measureAllLabels(): boolean {
    try {
      const svg = this.svgRef?.nativeElement;
      if (!svg) return false;
      let allFound = true;
      for (const category of this.diagram.categories) {
        for (const cause of category.causes) {
          const el = svg.querySelector(
            `div.cause-box[data-cause-id="${cause.id}"]`,
          ) as HTMLElement | null;
          if (el && typeof el.getBoundingClientRect === "function") {
            const rect = el.getBoundingClientRect();
            const fixedW = this.layoutConfig.fixedCauseWidth;
            this.measuredLabelWidth[cause.id] = fixedW;
            cause.layout = { x: 0, y: 0, width: fixedW, height: rect.height };
          } else {
            allFound = false;
          }
        }
      }
      return allFound;
    } catch (e) {
      console.warn("measureAllLabels failed", e);
      return false;
    }
  }
  getCauseTextWidth(text: string): number {
    return this.getLabelWidthFromText(text);
  }

  // Category positioning
  getCategoryX(index: number): number {
    const id = this.diagram.categories[index]?.id;
    if (id && this.categoryXMap[id] != null) return this.categoryXMap[id];
    // Safe fallback that does not depend on spineEndX to avoid recursive getters
    const col = Math.floor(index / 2);
    const angleRad = (this.layoutConfig.boneAngle * Math.PI) / 180;
    const projectedBase = Math.cos(angleRad) * 80; // base projected bone length
    const step =
      this.layoutConfig.fixedCauseWidth +
      this.layoutConfig.horizontalColumnGap +
      projectedBase;
    return this.layoutConfig.spineStartX + (col + 1) * step;
  }

  private getCategoryLength(index: number): number {
    const causes = this.diagram.categories[index]?.causes.length || 0;
    const step = this.getAntiCollisionStep();
    const base = 80;
    return Math.max(base, base + (causes > 0 ? (causes - 1) * step : 0));
  }

  getCategoryEndX(index: number): number {
    const startX = this.getCategoryX(index);
    const length = this.getCategoryLength(index);
    const angle = this.getCategoryAngle(index);
    return startX + Math.cos((angle * Math.PI) / 180) * length;
  }

  getCategoryEndY(index: number): number {
    const length = this.getCategoryLength(index);
    const angle = this.getCategoryAngle(index);
    return this.spineY + Math.sin((angle * Math.PI) / 180) * length;
  }

  getCategoryTextX(index: number): number {
    return this.getCategoryEndX(index);
  }
  getCategoryTextY(index: number): number {
    return this.getCategoryEndY(index) + (this.isTopSide(index) ? -20 : 20);
  }

  private getBoneYAtX(categoryIndex: number, x: number): number {
    const x1 = this.getCategoryX(categoryIndex);
    const y1 = this.spineY;
    const x2 = this.getCategoryEndX(categoryIndex);
    const y2 = this.getCategoryEndY(categoryIndex);
    if (x2 === x1) return y2;
    const t = (x - x1) / (x2 - x1);
    return y1 + t * (y2 - y1);
  }

  private getBoneYAtXClamped(categoryIndex: number, x: number): number {
    const x1 = this.getCategoryX(categoryIndex);
    const x2 = this.getCategoryEndX(categoryIndex);
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const clampedX = Math.max(Math.min(x, maxX), minX);
    return this.getBoneYAtX(categoryIndex, clampedX);
  }

  private getGlobalBoneLimit(
    left: number,
    right: number,
    topSide: boolean,
  ): number {
    let limit = topSide ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
    for (let k = 0; k < this.diagram.categories.length; k++) {
      const x1 = this.getCategoryX(k);
      const x2 = this.getCategoryEndX(k);
      const minX = Math.min(x1, x2);
      const maxX = Math.max(x1, x2);
      const sampleL = this.getBoneYAtXClamped(k, left);
      const sampleR = this.getBoneYAtXClamped(k, right);
      const boneSpanIntersects = !(right < minX || left > maxX);
      const bL = boneSpanIntersects
        ? this.getBoneYAtX(k, Math.max(minX, Math.min(maxX, left)))
        : sampleL;
      const bR = boneSpanIntersects
        ? this.getBoneYAtX(k, Math.max(minX, Math.min(maxX, right)))
        : sampleR;
      const candidate = topSide ? Math.min(bL, bR) : Math.max(bL, bR);
      if (topSide) limit = Math.min(limit, candidate);
      else limit = Math.max(limit, candidate);
    }
    return limit;
  }

  getCauseConnectionX(categoryIndex: number, causeIndex: number): number {
    const categoryStartX = this.getCategoryX(categoryIndex);
    const categoryEndX = this.getCategoryEndX(categoryIndex);
    const totalCauses = this.diagram.categories[categoryIndex].causes.length;
    if (totalCauses === 1) {
      return categoryStartX + (categoryEndX - categoryStartX) * 0.5;
    }
    const ratio = causeIndex / (totalCauses - 1);
    return (
      categoryStartX + (categoryEndX - categoryStartX) * (0.1 + ratio * 0.8)
    );
  }

  getCauseConnectionY(categoryIndex: number, causeIndex: number): number {
    const categoryEndY = this.getCategoryEndY(categoryIndex);
    const totalCauses = this.diagram.categories[categoryIndex].causes.length;
    const base =
      totalCauses === 1 ? 0.5 : 0.1 + (causeIndex / (totalCauses - 1)) * 0.8;
    let cy = this.spineY + (categoryEndY - this.spineY) * base;
    const outwardTop = categoryEndY < this.spineY;
    if (outwardTop) cy = Math.min(cy, this.spineY - 1);
    else cy = Math.max(cy, this.spineY + 1);
    return cy;
  }

  // Spacing/alignment configuration for labels
  private labelBaseOffset = 24;
  private labelHeight = 20;
  private minGap = 8;
  private connectorShelf = 10;
  private connectorGap = 8;

  private getAntiCollisionStep(): number {
    return this.labelHeight + this.minGap;
  }

  private getOffsetFromSpine(
    categoryIndex: number,
    causeIndex: number,
    text: string,
  ): number {
    const cat = this.diagram.categories[categoryIndex];
    if (!cat) return this.labelBaseOffset;
    let offset = this.labelBaseOffset;
    for (let k = 0; k < causeIndex; k++) {
      const t = cat.causes[k]?.text ?? "";
      offset += this.getLabelHeight(categoryIndex, k, t) + this.minGap;
    }
    offset += this.getLabelHeight(categoryIndex, causeIndex, text) / 2;
    return offset;
  }

  private getRawCenterY(
    categoryIndex: number,
    causeIndex: number,
    text: string,
  ): number {
    const outwardTop = this.getCategoryEndY(categoryIndex) < this.spineY;
    const dir = outwardTop ? -1 : 1;
    const ax = this.getCauseConnectionX(categoryIndex, causeIndex);
    const ay = this.getCauseConnectionY(categoryIndex, causeIndex);
    const w = this.getLabelWidth(categoryIndex, causeIndex, text);
    const h = this.getLabelHeight(categoryIndex, causeIndex, text);
    let center = ay + (causeIndex % 2 === 0 ? -1 : 1) * dir * (h / 2 + 6);

    const left = ax - (this.connectorShelf + w);
    const right = ax - this.connectorGap;
    const margin = 24;

    const limiting = this.getGlobalBoneLimit(left, right, outwardTop);

    if (outwardTop) {
      center = Math.min(center, limiting - margin - h / 2);
    } else {
      center = Math.max(center, limiting + margin + h / 2);
    }
    return center;
  }

  private getStackedCenterY(
    categoryIndex: number,
    causeIndex: number,
    text: string,
  ): number {
    const outwardTop = this.getCategoryEndY(categoryIndex) < this.spineY;
    let prevCenter: number | null = null;
    let prevH = 0;
    for (let k = 0; k <= causeIndex; k++) {
      const t =
        k === causeIndex
          ? text
          : (this.diagram.categories[categoryIndex]?.causes[k]?.text ?? "");
      const raw = this.getRawCenterY(categoryIndex, k, t);
      const h = this.getLabelHeight(categoryIndex, k, t);
      let y = raw;
      if (prevCenter != null) {
        const requiredGap = prevH / 2 + this.minGap + h / 2;
        if (outwardTop) {
          y = Math.min(y, prevCenter - requiredGap);
        } else {
          y = Math.max(y, prevCenter + requiredGap);
        }
      }
      prevCenter = y;
      prevH = h;
    }
    return prevCenter ?? this.spineY;
  }

  private getMaxLabelWidth(categoryIndex: number): number {
    const cat = this.diagram.categories[categoryIndex];
    if (!cat || !cat.causes.length) return 120;
    return cat.causes.reduce((m, c) => {
      const w =
        this.measuredLabelWidth[c.id] ?? this.getLabelWidthFromText(c.text);
      return Math.max(m, w);
    }, 120);
  }

  getLabelLeftX(
    categoryIndex: number,
    causeIndex: number,
    text: string,
  ): number {
    const w = this.getLabelWidth(categoryIndex, causeIndex, text);
    const ax = this.getCauseConnectionX(categoryIndex, causeIndex);
    return ax - (this.connectorShelf + w);
  }

  getLabelRightX(
    categoryIndex: number,
    causeIndex: number,
    text: string,
  ): number {
    const ax = this.getCauseConnectionX(categoryIndex, causeIndex);
    return ax - this.connectorGap;
  }

  // Orthogonal connector using stable layout positions
  getOrthogonalCauseConnectorPath(
    categoryIndex: number,
    cause: Cause,
    causeIndex: number,
  ): string {
    const ax = this.getCauseConnectionX(categoryIndex, causeIndex);
    const ay = this.getCauseConnectionY(categoryIndex, causeIndex);
    if (!cause.layout) {
      const y = this.getLabelY(categoryIndex, causeIndex, cause.text);
      const xr = this.getLabelRightX(categoryIndex, causeIndex, cause.text);
      const xh = ax - this.layoutConfig.connectorGap;
      return `M ${xr} ${y} H ${xh} V ${ay} H ${ax}`;
    }
    const labelEdgeX = cause.layout.x + cause.layout.width;
    const labelCenterY = cause.layout.y + cause.layout.height / 2;
    const intermediateX = ax - 30;
    return `M ${ax} ${ay} H ${intermediateX} V ${labelCenterY} H ${labelEdgeX}`;
  }

  isTopSide(index: number): boolean {
    return index % 2 === 0;
  }

  // Collision-aware offsets computation
  private computeCollisionOffsets() {
    const margin = 6;
    const top: {
      id: string;
      center: number;
      height: number;
      indexInfo: [number, number];
      left: number;
      right: number;
    }[] = [];
    const bottom: {
      id: string;
      center: number;
      height: number;
      indexInfo: [number, number];
      left: number;
      right: number;
    }[] = [];

    for (let i = 0; i < this.diagram.categories.length; i++) {
      const cat = this.diagram.categories[i];
      for (let j = 0; j < cat.causes.length; j++) {
        const cause = cat.causes[j];
        const text = cause.text;
        const w = this.getLabelWidth(i, j, text);
        const h = this.getLabelHeight(i, j, text);
        const c = this.getStackedCenterY(i, j, text); // base without offsets
        const left = this.getLabelLeftX(i, j, text);
        const right = left + w;
        const item = {
          id: cause.id,
          center: c,
          height: h,
          indexInfo: [i, j] as [number, number],
          left,
          right,
        };
        if (c < this.spineY) top.push(item);
        else bottom.push(item);
      }
    }

    // Helper to adjust along one side, pushing away from spine and resolving overlaps
    const adjust = (arr: typeof top, isTop: boolean) => {
      // Pack from spine outward
      arr.sort((a, b) => (isTop ? b.center - a.center : a.center - b.center)); // closest first
      for (let k = 0; k < arr.length; k++) {
        const prev = k === 0 ? null : arr[k - 1];
        const cur = arr[k];
        if (!prev) continue;
        const prevTop = prev.center - prev.height / 2;
        const prevBottom = prev.center + prev.height / 2;
        let curTop = cur.center - cur.height / 2;
        let curBottom = cur.center + cur.height / 2;
        if (isTop) {
          // ensure cur is above prev by margin
          const allowedBottom = prevTop - margin;
          if (curBottom > allowedBottom) {
            const newCenter = allowedBottom - cur.height / 2;
            cur.center = newCenter;
          }
        } else {
          // bottom side: ensure cur is below prev by margin
          const allowedTop = prevBottom + margin;
          if (curTop < allowedTop) {
            const newCenter = allowedTop + cur.height / 2;
            cur.center = newCenter;
          }
        }
      }
    };

    adjust(top, true);
    adjust(bottom, false);

    // Write offsets relative to base centers
    const newOffsets: Record<string, number> = {};
    for (const item of [...top, ...bottom]) {
      const [i, j] = item.indexInfo;
      const base = this.getStackedCenterY(
        i,
        j,
        this.diagram.categories[i].causes[j].text,
      );
      newOffsets[item.id] = item.center - base;
    }
    this.yOffsets = newOffsets;
  }

  // Helper for angles based on content height
  private getCategoryTotalHeight(index: number): number {
    const cat = this.diagram.categories[index];
    if (!cat) return 0;
    return cat.causes.reduce(
      (sum, c, j) =>
        sum + this.getLabelHeight(index, j, c.text) + (j > 0 ? this.minGap : 0),
      0,
    );
  }

  // Pan/Zoom
  private resetViewIfUnset() {
    if (this.viewW === 0 || this.viewH === 0) this.resetView();
  }
  resetView() {
    this.viewX = 0;
    this.viewY = 0;
    this.viewW = this.canvasWidth;
    this.viewH = this.canvasHeight;
  }
  zoom(factor: number, originX?: number, originY?: number) {
    const minW = this.canvasWidth / 6;
    const maxW = this.canvasWidth * 1.5;
    const cx = originX ?? this.viewX + this.viewW / 2;
    const cy = originY ?? this.viewY + this.viewH / 2;
    const newW = Math.max(minW, Math.min(maxW, this.viewW * factor));
    const newH = Math.max(
      minW * (this.canvasHeight / this.canvasWidth),
      Math.min(
        maxW * (this.canvasHeight / this.canvasWidth),
        this.viewH * factor,
      ),
    );
    this.viewX = cx - (cx - this.viewX) * (newW / this.viewW);
    this.viewY = cy - (cy - this.viewY) * (newH / this.viewH);
    this.viewW = newW;
    this.viewH = newH;
  }
  zoomIn() {
    this.zoom(0.85);
  }
  zoomOut() {
    this.zoom(1.15);
  }

  onWheel(event: WheelEvent) {
    event.preventDefault();
    const svg = this.svgRef?.nativeElement;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const sx =
      ((event.clientX - rect.left) / rect.width) * this.viewW + this.viewX;
    const sy =
      ((event.clientY - rect.top) / rect.height) * this.viewH + this.viewY;
    const factor = event.deltaY < 0 ? 0.9 : 1.1;
    this.zoom(factor, sx, sy);
  }

  onMouseDown(event: MouseEvent) {
    this.isPanning = true;
    this.panStartX = event.clientX;
    this.panStartY = event.clientY;
    this.viewStartX = this.viewX;
    this.viewStartY = this.viewY;
  }
  onMouseMove(event: MouseEvent) {
    if (!this.isPanning) return;
    const svg = this.svgRef?.nativeElement;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const dxPx = event.clientX - this.panStartX;
    const dyPx = event.clientY - this.panStartY;
    const dx = (dxPx / rect.width) * this.viewW;
    const dy = (dyPx / rect.height) * this.viewH;
    this.viewX = this.viewStartX - dx;
    this.viewY = this.viewStartY - dy;
  }
  onMouseUp() {
    this.isPanning = false;
  }

  // Color utilities
  getTint(hex: string, alpha: number): string {
    const { r, g, b } = this.hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const h = hex.replace("#", "");
    const bigint = parseInt(h, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return { r, g, b };
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Context menu helpers
  toggleCauseMenu(cause: Cause, ev: MouseEvent) {
    ev.stopPropagation();
    this.openMenuForCauseId =
      this.openMenuForCauseId === cause.id ? null : cause.id;
  }
  closeCauseMenu() {
    this.openMenuForCauseId = null;
  }

  @HostListener("document:click")
  onDocClick() {
    this.openMenuForCauseId = null;
    this.isExportMenuOpen = false;
  }
}
