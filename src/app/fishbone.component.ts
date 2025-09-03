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

type Priority = "Critical" | "High" | "Medium" | "Low";

interface Cause {
  id: string;
  text: string;
  priority: Priority;
  subCauses: Cause[];
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
                <button (click)="resetDiagram()" class="btn-outline text-sm flex items-center">
                  <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Reset
                </button>
                <button (click)="toggleGrid()" class="btn-outline text-sm">Grid: {{ showGrid ? 'ON' : 'OFF' }}</button>
              </div>
              <div class="flex items-center gap-2">
                <button (click)="exportData()" class="btn-primary text-sm flex items-center">
                  <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export JSON
                </button>
                <button (click)="exportJPG()" class="btn-outline text-sm flex items-center">
                  <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 16l5-5 4 4 5-6 4 5M3 19h18" />
                  </svg>
                  Export JPG
                </button>
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
            <button (click)="addCategory()" class="btn-primary mt-1 flex items-center">
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v12m6-6H6" />
              </svg>
              Add Category
            </button>
          </div>

          <!-- Priority Legend -->
          <div class="mt-4 p-3 bg-neutral-50 rounded-lg">
            <h3 class="text-sm font-medium text-neutral-700 mb-2">Priority Levels:</h3>
            <div class="flex flex-wrap gap-3">
              <div class="flex items-center"><div class="w-4 h-4 rounded mr-2" [style.background-color]="priorityColors.Critical"></div><span class="text-sm text-neutral-600">Critical</span></div>
              <div class="flex items-center"><div class="w-4 h-4 rounded mr-2" [style.background-color]="priorityColors.High"></div><span class="text-sm text-neutral-600">High</span></div>
              <div class="flex items-center"><div class="w-4 h-4 rounded mr-2" [style.background-color]="priorityColors.Medium"></div><span class="text-sm text-neutral-600">Medium</span></div>
              <div class="flex items-center"><div class="w-4 h-4 rounded mr-2" [style.background-color]="priorityColors.Low"></div><span class="text-sm text-neutral-600">Low</span></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Dynamic Fishbone Diagram Canvas -->
      <div class="max-w-full mx-auto">
        <div class="bg-white rounded-lg shadow-card border border-neutral-200 overflow-x-auto fishbone-wrapper" [style.min-height.px]="canvasHeight">
          <svg #diagramSvg [attr.width]="canvasWidth" [attr.height]="canvasHeight" [attr.viewBox]="'0 0 ' + canvasWidth + ' ' + canvasHeight" class="min-w-full h-full" (click)="clearFocus()">
            <!-- Background Grid -->
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f3f4f6" stroke-width="0.5" />
              </pattern>
              <!-- Subtle drop shadow for bones -->
              <filter id="boneShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#000000" flood-opacity="0.08" />
              </filter>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" *ngIf="showGrid" />

            <!-- Main Spine (Dynamic length) -->
            <line [attr.x1]="spineStartX" [attr.y1]="spineY" [attr.x2]="spineEndX" [attr.y2]="spineY" stroke="#111827" stroke-width="4" stroke-linecap="round" />

            <!-- Problem Statement -->
            <text [attr.x]="problemBoxX + problemBoxWidth / 2" [attr.y]="spineY - 10" fill="#111827" font-size="18" font-weight="800" text-anchor="middle" dominant-baseline="baseline">
              {{ diagram.problemStatement || 'Add Problem Statement' }}
            </text>

            <!-- Categories and Causes -->
            <g *ngFor="let category of diagram.categories; let i = index" [attr.id]="'cat-' + category.id" [style.opacity]="!focusedCategoryId || focusedCategoryId === category.id ? 1 : 0.15" (click)="setFocus(category, $event)">
              <!-- Category Bone -->
              <line [attr.x1]="getCategoryX(i)" [attr.y1]="spineY" [attr.x2]="getCategoryEndX(i)" [attr.y2]="getCategoryEndY(i)" [attr.stroke]="category.color" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" filter="url(#boneShadow)" />

              <!-- Category Title -->
              <text [attr.x]="getCategoryTextX(i)" [attr.y]="getCategoryTextY(i)" fill="#111827" font-size="12" font-weight="700" text-anchor="middle" dominant-baseline="middle" class="cursor-pointer">
                {{ category.title }}
              </text>

              <!-- Add Cause Button -->
              <g class="cursor-pointer hover:opacity-80" (click)="addCause(category)">
                <circle [attr.cx]="getCategoryEndX(i)" [attr.cy]="getCategoryEndY(i)" r="10" [attr.fill]="getTint(category.color, 0.2)" [attr.stroke]="category.color" stroke-width="1.5" />
                <path [attr.d]="'M ' + (getCategoryEndX(i)) + ' ' + (getCategoryEndY(i)-4) + ' v 8 M ' + (getCategoryEndX(i)-4) + ' ' + (getCategoryEndY(i)) + ' h 8'" [attr.stroke]="category.color" stroke-width="2" stroke-linecap="round" />
              </g>

              <!-- Category Causes: connectors -->
              <g *ngFor="let cause of category.causes; let j = index" (mouseenter)="hoveredCauseId = cause.id" (mouseleave)="hoveredCauseId = null">
                <path [attr.d]="getCauseConnectorPath(i, j, cause.text)" stroke="#6b7280" [attr.stroke-width]="hoveredCauseId === cause.id ? 2 : 1.5" stroke-linejoin="round" stroke-linecap="round" fill="none" />
              </g>

              <!-- Delete Category Button (trash icon) -->
              <g class="cursor-pointer hover:opacity-75" (click)="deleteCategory(category)">
                <circle [attr.cx]="getCategoryTextX(i) + 40" [attr.cy]="getCategoryTextY(i)" r="10" [attr.fill]="getTint('#ef4444', 0.9)" />
                <svg [attr.x]="getCategoryTextX(i) + 34" [attr.y]="getCategoryTextY(i) - 6" width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M19 7l-1 12a2 2 0 01-2 2H8a2 2 0 01-2-2L5 7m3 0V5a2 2 0 012-2h4a2 2 0 012 2v2m-9 0h10" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </g>
            </g>

            <!-- Overlay pass: labels above all bones -->
            <g *ngFor="let category of diagram.categories; let i = index">
              <g *ngFor="let cause of category.causes; let j = index">
                <foreignObject [attr.x]="getLabelLeftX(i, j, cause.text) - 3" [attr.y]="getLabelTopY(i, j, cause.text)" [attr.width]="getLabelWidth(i, j, cause.text) + 3" [attr.height]="getLabelHeight(i, j, cause.text)">
                  <div xmlns="http://www.w3.org/1999/xhtml" class="cause-box" [attr.data-cause-id]="cause.id" [style.border-left]="'4px solid ' + priorityColors[cause.priority]" style="border:1px solid #E5E7EB;border-left-width:4px;border-radius:8px;padding:6px 8px;display:inline-block;background:#ffffff;box-shadow:0 4px 15px -2px rgba(0,0,0,0.05);transition:box-shadow 150ms ease, transform 150ms ease;">
                    <span class="cause-text" [class.clamped]="true" [style.max-width.px]="labelMaxWidth" [attr.title]="needsClamp(i, j, cause.text) ? cause.text : null">{{ cause.text }}</span>
                    <button type="button" class="ellipsis-btn" *ngIf="needsClamp(i, j, cause.text)" (mouseenter)="showTooltip($event, cause.text)" (mouseleave)="hideTooltip()" (focus)="showTooltip($event, cause.text)" (blur)="hideTooltip()">…</button>
                  </div>
                </foreignObject>
                <!-- Delete cause icon (trash) -->
                <svg [attr.x]="getLabelRightX(i, j, cause.text) - 10" [attr.y]="getLabelY(i, j, cause.text) - 6" width="12" height="12" viewBox="0 0 24 24" [attr.opacity]="hoveredCauseId === cause.id ? 1 : 0" class="cursor-pointer" (click)="deleteCause(category, cause)">
                  <path d="M19 7l-1 12a2 2 0 01-2 2H8a2 2 0 01-2-2L5 7m3 0V5a2 2 0 012-2h4a2 2 0 012 2v2m-9 0h10" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </g>
            </g>
          </svg>
        </div>
      </div>

      <!-- Full-text Popover -->
      <div *ngIf="tooltipVisible" class="popover animate-fade-in" [style.left.px]="tooltipX" [style.top.px]="tooltipY" role="tooltip">
        <div class="popover-inner">{{ tooltipText }}</div>
      </div>

      <!-- Enhanced Category Management Panel -->
      <div class="max-w-full mx-auto mt-4" *ngIf="diagram.categories.length > 0">
        <div class="card p-4">
          <h2 class="mb-3">Categories & Causes</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6">
            <div *ngFor="let category of diagram.categories" class="border border-neutral-200 rounded-lg p-4 shadow-soft-lift bg-white">
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-base font-bold truncate" [style.color]="category.color">{{ category.title }}</h3>
                <button (click)="addCause(category)" class="btn-secondary text-xs flex items-center px-2 py-1">
                  <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v12m6-6H6"/></svg>
                  Add
                </button>
              </div>
              <div class="space-y-1 max-h-40 overflow-y-auto scrollbar-thin">
                <div *ngFor="let cause of category.causes" class="text-xs flex items-center justify-between group p-2 rounded relative odd:bg-neutral-50" [style.background-color]="priorityColors[cause.priority] + '14'">
                  <div class="flex items-center flex-1 min-w-0">
                    <div class="w-2.5 h-2.5 rounded-full mr-2 flex-shrink-0" [style.background-color]="priorityColors[cause.priority]"></div>
                    <span class="cursor-pointer text-neutral-700 line-clamp-2" (click)="editCause(cause)" [title]="cause.text + ' (' + cause.priority + ')'">
                      {{ cause.text }}
                    </span>
                  </div>
                  <div class="flex items-center space-x-1 ml-2">
                    <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white" [style.background-color]="priorityColors[cause.priority]">
                      {{ cause.priority.charAt(0) }}
                    </span>
                    <button class="text-neutral-600 hover:text-neutral-900 p-1 rounded hover:bg-neutral-100" (click)="toggleCauseMenu(cause, $event)">
                      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
                    </button>
                    <div *ngIf="openMenuForCauseId === cause.id" class="absolute right-2 top-7 z-10 bg-white border border-neutral-200 rounded-md shadow-card p-1" (click)="$event.stopPropagation()">
                      <button class="flex items-center w-full text-left text-[12px] px-2 py-1 rounded hover:bg-neutral-50" (click)="editCause(cause); closeCauseMenu()">Edit</button>
                      <button class="flex items-center w-full text-left text-[12px] text-red-600 px-2 py-1 rounded hover:bg-red-50" (click)="deleteCause(category, cause); closeCauseMenu()">Delete</button>
                    </div>
                  </div>
                </div>
                <div *ngIf="category.causes.length === 0" class="text-xs text-neutral-400 italic">Click Add to create causes</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Add Cause Modal -->
      <div *ngIf="showAddCauseModal" class="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50" (click)="cancelAddCause()" (keydown.escape)="cancelAddCause()">
        <div #modalRef class="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-modal animate-slide-up animate-fade-in" (click)="$event.stopPropagation()" tabindex="-1" aria-modal="true" role="dialog">
          <h3 class="text-lg font-semibold text-neutral-900 mb-4">Add New Cause</h3>

          <div class="mb-4">
            <label class="block text-sm font-medium text-neutral-700 mb-2">Cause Description:</label>
            <input type="text" [(ngModel)]="newCauseText" placeholder="Enter cause description..." class="input w-full" id="causeInput" #causeInput />
          </div>

          <div class="mb-6">
            <label class="block text-sm font-medium text-neutral-700 mb-2">Priority Level:</label>
            <div class="inline-flex items-center rounded-lg border border-neutral-300 overflow-hidden">
              <label *ngFor="let priority of priorities" class="px-3 py-1.5 text-sm cursor-pointer select-none" [class.font-semibold]="selectedPriority === priority" [style.background-color]="selectedPriority === priority ? getTint(priorityColors[priority], 0.12) : 'transparent'" [style.color]="selectedPriority === priority ? '#111827' : '#374151'" (click)="selectedPriority = priority">
                <span class="inline-flex items-center"><span class="w-2.5 h-2.5 rounded-full mr-2" [style.background-color]="priorityColors[priority]"></span>{{ priority }}</span>
              </label>
            </div>
          </div>

          <div class="flex justify-end space-x-3">
            <button (click)="cancelAddCause()" class="btn-outline">Cancel</button>
            <button (click)="confirmAddCause()" class="btn-primary" [disabled]="!newCauseText.trim()">Add Cause</button>
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
      .cursor-pointer:hover { opacity: 0.9; }
      .overflow-y-auto { scrollbar-width: thin; scrollbar-color: #d1d5db #f3f4f6; }
      .overflow-y-auto::-webkit-scrollbar { width: 4px; }
      .overflow-y-auto::-webkit-scrollbar-track { background: #f3f4f6; border-radius: 2px; }
      .overflow-y-auto::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 2px; }
      .btn-primary:disabled { background-color: #a3a3a3; cursor: not-allowed; }
      .cause-box { font-size: 10px; line-height: 14px; color: #111827; background: #ffffff; max-width: 300px; }
      .cause-text { overflow-wrap: anywhere; word-break: break-word; }
      .cause-text.clamped { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
      .ellipsis-btn { background: transparent; border: none; color: #2563eb; cursor: pointer; font-weight: 700; margin-left: 4px; padding: 0 2px; line-height: 1; }
      .fishbone-wrapper { width: 100%; overflow-x: auto; }
      .popover { position: fixed; z-index: 50; pointer-events: none; transform: translate(-50%, calc(-100% - 8px)); }
      .popover-inner { max-width: 360px; background: #111827; color: white; padding: 8px 10px; border-radius: 6px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25); font-size: 12px; line-height: 16px; white-space: normal; }
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

  // Measurement cache
  private measuredLabelWidth: Record<string, number> = {};
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

  // Sequential layout mapping
  private SAFE_MARGIN = 110;
  private INITIAL_X = 140;
  private LABEL_LEFT_PADDING = 16;
  private categoryXMap: Record<string, number> = {};

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
            this.measureAllLabels();
            this.recomputeCategoryXMap();
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
      this.mutationObserver.observe(svg, { childList: true, subtree: true, characterData: true });
    } catch (e) {
      console.warn("observers setup failed", e);
    }
  }

  private recomputeCategoryXMap() {
    const newMap: Record<string, number> = {};
    const count = this.diagram.categories.length;
    const pairs = Math.ceil(count / 2);
    let prevRight = this.spineStartX;
    let baseline = this.spineStartX + this.INITIAL_X;
    const tipPad = 20;

    for (let p = 0; p < pairs; p++) {
      const topIdx = p * 2;
      const botIdx = topIdx + 1;

      const leftExtTop = topIdx < count ? this.getMaxLabelWidth(topIdx) + this.LABEL_LEFT_PADDING : 0;
      const leftExtBot = botIdx < count ? this.getMaxLabelWidth(botIdx) + this.LABEL_LEFT_PADDING : 0;
      const maxLeftExt = Math.max(leftExtTop, leftExtBot);

      const rightFoot = (idx: number) => {
        if (idx >= count) return 0;
        const length = this.getCategoryLength(idx);
        const bone = Math.cos((45 * Math.PI) / 180) * length;
        return bone + tipPad;
      };
      const maxRightExt = Math.max(rightFoot(topIdx), rightFoot(botIdx));

      const startX = Math.max(baseline, prevRight + this.SAFE_MARGIN + maxLeftExt);

      if (topIdx < count) newMap[this.diagram.categories[topIdx].id] = startX;
      if (botIdx < count) newMap[this.diagram.categories[botIdx].id] = startX;

      prevRight = startX + maxRightExt;
      baseline = prevRight;
    }

    this.categoryXMap = newMap;
  }
  diagram: DiagramData = { problemStatement: "", categories: [] };

  showGrid = false;
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
  get canvasWidth(): number {
    const minWidth = 520;
    const count = this.diagram.categories.length;
    const pairs = Math.ceil(Math.max(count, 2) / 2);
    let prevRight = this.spineStartX;
    let baseline = this.spineStartX + this.INITIAL_X;
    const tipPad = 28;
    for (let p = 0; p < pairs; p++) {
      const topIdx = p * 2;
      const botIdx = topIdx + 1;
      const leftExt = Math.max(
        topIdx < count ? this.getMaxLabelWidth(topIdx) + this.LABEL_LEFT_PADDING : 0,
        botIdx < count ? this.getMaxLabelWidth(botIdx) + this.LABEL_LEFT_PADDING : 0,
      );
      const rightExt = Math.max(
        topIdx < count ? Math.cos((45 * Math.PI) / 180) * this.getCategoryLength(topIdx) + tipPad : 0,
        botIdx < count ? Math.cos((45 * Math.PI) / 180) * this.getCategoryLength(botIdx) + tipPad : 0,
      );
      const startX = Math.max(baseline, prevRight + this.SAFE_MARGIN + leftExt);
      prevRight = startX + rightExt;
      baseline = prevRight;
    }
    return Math.max(minWidth, prevRight + 260);
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
            sum += this.getLabelHeight(i, j, cause.text) + (j > 0 ? this.minGap : 0);
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

  get spineStartX(): number { return 80; }
  get spineEndX(): number { return this.canvasWidth - 250; }
  get spineY(): number { return this.canvasHeight / 2; }
  get problemBoxX(): number { return this.spineEndX + 20; }
  get problemBoxY(): number { return this.spineY - 40; }
  get problemBoxWidth(): number { return 200; }
  get problemBoxHeight(): number { return 80; }

  ngOnInit() {
    this.diagram.problemStatement = "Website Conversion Rate is Low";
    this.addDefaultCategories();
    this.runLayoutAfterRender();
  }

  private addDefaultCategories() {
    const defaultCategories = ["Methods", "Machines", "Materials", "Measurements", "Mother Nature", "Manpower"];
    defaultCategories.forEach((title, index) => {
      this.diagram.categories.push({ id: this.generateId(), title, causes: [], color: this.categoryColors[index % this.categoryColors.length] });
    });
  }

  addCategory() {
    const title = prompt("Enter category name:");
    if (title && title.trim()) {
      const category: Category = {
        id: this.generateId(),
        title: title.trim(),
        causes: [],
        color: this.categoryColors[this.diagram.categories.length % this.categoryColors.length],
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
      const cause: Cause = { id: this.generateId(), text: this.newCauseText.trim(), priority: this.selectedPriority, subCauses: [] };
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
    }
  }

  deleteCause(category: Category, cause: Cause) {
    if (confirm(`Delete cause "${cause.text}"?`)) {
      const index = category.causes.indexOf(cause);
      if (index > -1) {
        category.causes.splice(index, 1);
      }
    }
  }

  resetDiagram() {
    if (confirm("Reset the entire diagram? This cannot be undone.")) {
      this.diagram = { problemStatement: "", categories: [] };
    }
  }

  toggleGrid() { this.showGrid = !this.showGrid; }

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

  exportJPG() {
    const svgEl = this.svgRef?.nativeElement;
    if (!svgEl) return;

    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(svgEl);

    const problemText = this.diagram.problemStatement || "Add Problem Statement";
    const textX = this.problemBoxX + this.problemBoxWidth / 2;
    const textY = this.problemBoxY + this.problemBoxHeight / 2;
    svgString = svgString.replace(/<foreignObject[\s\S]*?<\/foreignObject>/, `
      <text x="${textX}" y="${textY}" fill="#ffffff" font-size="12" font-weight="600" text-anchor="middle" dominant-baseline="middle">
        ${problemText.replace(/&/g, "&amp;").replace(/</g, "&lt;")}
      </text>
    `);

    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    const width = this.canvasWidth;
    const height = this.canvasHeight;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        return;
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (b) => {
          if (!b) return;
          const a = document.createElement("a");
          a.href = URL.createObjectURL(b);
          a.download = "fishbone.jpg";
          a.click();
          URL.revokeObjectURL(a.href);
        },
        "image/jpeg",
        0.95,
      );
    };
    img.src = url;
  }

  // Expanded/clamped logic and measurements for labels
  isExpanded(cause: Cause): boolean { return this.expandedCauses.has(cause.id); }
  toggleExpand(cause: Cause, event?: MouseEvent) {
    if (event) event.stopPropagation();
    this.isExpanded(cause) ? this.expandedCauses.delete(cause.id) : this.expandedCauses.add(cause.id);
  }
  getLabelWidth(categoryIndex: number, causeIndex: number, text: string): number {
    const id = this.diagram.categories[categoryIndex]?.causes[causeIndex]?.id;
    if (id && this.measuredLabelWidth[id] != null) return this.measuredLabelWidth[id];
    return this.getLabelWidthFromText(text);
  }
  private getCharsPerLine(width: number): number { return Math.max(10, Math.floor(width / this.approxCharWidth)); }
  getTotalLines(text: string, width: number): number { const cpl = this.getCharsPerLine(width); return Math.max(1, Math.ceil(text.length / cpl)); }
  collapsedLines = 3;
  lineHeightPx = 14;
  needsClamp(categoryIndex: number, causeIndex: number, text: string): boolean {
    const w = this.getLabelWidth(categoryIndex, causeIndex, text);
    return this.getTotalLines(text, w) > this.collapsedLines;
  }
  getLabelHeight(categoryIndex: number, causeIndex: number, text: string): number {
    const w = this.getLabelWidth(categoryIndex, causeIndex, text);
    const total = this.getTotalLines(text, w);
    const lines = Math.min(total, this.collapsedLines);
    const padding = 12;
    return lines * this.lineHeightPx + padding;
  }
  getLabelTopY(categoryIndex: number, causeIndex: number, text: string): number {
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
  hideTooltip() { this.tooltipVisible = false; }

  // Utility functions
  getTruncatedText(text: string, maxLength: number): string { return text.length > maxLength ? text.substring(0, maxLength) + "..." : text; }

  labelMaxWidth = 300;
  private approxCharWidth = 7;
  getLabelWidthFromText(text: string): number { return Math.min(Math.max(text.length * this.approxCharWidth + 16, 120), this.labelMaxWidth); }

  private measureAllLabels() {
    try {
      const svg = this.svgRef?.nativeElement;
      if (!svg) return;
      for (const category of this.diagram.categories) {
        for (const cause of category.causes) {
          const el = svg.querySelector(`div.cause-box[data-cause-id="${cause.id}"]`) as HTMLElement | null;
          if (el && typeof el.getBoundingClientRect === "function") {
            const rect = el.getBoundingClientRect();
            const w = Math.min(Math.ceil(rect.width || 0), this.labelMaxWidth);
            if (w && w > 0) this.measuredLabelWidth[cause.id] = w;
          }
        }
      }
    } catch (e) {
      console.warn("measureAllLabels failed", e);
    }
  }
  getCauseTextWidth(text: string): number { return this.getLabelWidthFromText(text); }

  getPriorityIndicatorColor(priority: Priority): string {
    const colors = { Critical: "#ffffff", High: "#ffffff", Medium: "#ffffff", Low: "#ffffff" };
    return colors[priority];
  }

  // Category positioning
  getCategoryX(index: number): number {
    const id = this.diagram.categories[index]?.id;
    if (id && this.categoryXMap[id] != null) return this.categoryXMap[id];
    const availableWidth = this.spineEndX - this.spineStartX;
    const pairsCount = Math.ceil(this.diagram.categories.length / 2);
    const spacing = availableWidth / (pairsCount + 1);
    return this.spineStartX + (Math.floor(index / 2) + 1) * spacing;
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
    const angle = this.isTopSide(index) ? -45 : 45;
    return startX + Math.cos((angle * Math.PI) / 180) * length;
  }

  getCategoryEndY(index: number): number {
    const length = this.getCategoryLength(index);
    const angle = this.isTopSide(index) ? -45 : 45;
    return this.spineY + Math.sin((angle * Math.PI) / 180) * length;
  }

  getCategoryTextX(index: number): number { return this.getCategoryEndX(index); }
  getCategoryTextY(index: number): number { return this.getCategoryEndY(index) + (this.isTopSide(index) ? -20 : 20); }

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

  private getGlobalBoneLimit(left: number, right: number, topSide: boolean): number {
    let limit = topSide ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
    for (let k = 0; k < this.diagram.categories.length; k++) {
      const x1 = this.getCategoryX(k);
      const x2 = this.getCategoryEndX(k);
      const minX = Math.min(x1, x2);
      const maxX = Math.max(x1, x2);
      const sampleL = this.getBoneYAtXClamped(k, left);
      const sampleR = this.getBoneYAtXClamped(k, right);
      const boneSpanIntersects = !(right < minX || left > maxX);
      const bL = boneSpanIntersects ? this.getBoneYAtX(k, Math.max(minX, Math.min(maxX, left))) : sampleL;
      const bR = boneSpanIntersects ? this.getBoneYAtX(k, Math.max(minX, Math.min(maxX, right))) : sampleR;
      const candidate = topSide ? Math.min(bL, bR) : Math.max(bL, bR);
      if (topSide) limit = Math.min(limit, candidate); else limit = Math.max(limit, candidate);
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
    return categoryStartX + (categoryEndX - categoryStartX) * (0.1 + ratio * 0.8);
  }

  getCauseConnectionY(categoryIndex: number, causeIndex: number): number {
    const categoryEndY = this.getCategoryEndY(categoryIndex);
    const totalCauses = this.diagram.categories[categoryIndex].causes.length;
    const base = totalCauses === 1 ? 0.5 : 0.1 + (causeIndex / (totalCauses - 1)) * 0.8;
    let cy = this.spineY + (categoryEndY - this.spineY) * base;
    const outwardTop = categoryEndY < this.spineY;
    if (outwardTop) cy = Math.min(cy, this.spineY - 1); else cy = Math.max(cy, this.spineY + 1);
    return cy;
  }

  // Spacing/alignment configuration for labels
  private labelBaseOffset = 24;
  private labelHeight = 20;
  private minGap = 8;
  private connectorShelf = 8;
  private connectorGap = 8;

  private getAntiCollisionStep(): number { return this.labelHeight + this.minGap; }

  private getOffsetFromSpine(categoryIndex: number, causeIndex: number, text: string): number {
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

  private getRawCenterY(categoryIndex: number, causeIndex: number, text: string): number {
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

    if (outwardTop) { center = Math.min(center, limiting - margin - h / 2); }
    else { center = Math.max(center, limiting + margin + h / 2); }
    return center;
  }

  private getStackedCenterY(categoryIndex: number, causeIndex: number, text: string): number {
    const outwardTop = this.getCategoryEndY(categoryIndex) < this.spineY;
    let prevCenter: number | null = null;
    let prevH = 0;
    for (let k = 0; k <= causeIndex; k++) {
      const t = k === causeIndex ? text : (this.diagram.categories[categoryIndex]?.causes[k]?.text ?? "");
      const raw = this.getRawCenterY(categoryIndex, k, t);
      const h = this.getLabelHeight(categoryIndex, k, t);
      let y = raw;
      if (prevCenter != null) {
        const requiredGap = prevH / 2 + this.minGap + h / 2;
        if (outwardTop) { y = Math.min(y, prevCenter - requiredGap); }
        else { y = Math.max(y, prevCenter + requiredGap); }
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
      const w = this.measuredLabelWidth[c.id] ?? this.getLabelWidthFromText(c.text);
      return Math.max(m, w);
    }, 120);
  }

  private getLabelColumnX(categoryIndex: number): number {
    const maxW = this.getMaxLabelWidth(categoryIndex);
    return this.getCategoryX(categoryIndex) - this.LABEL_LEFT_PADDING - maxW;
  }

  getLabelY(categoryIndex: number, causeIndex: number, text?: string): number {
    const t = text ?? this.diagram.categories[categoryIndex]?.causes[causeIndex]?.text ?? "";
    return this.getStackedCenterY(categoryIndex, causeIndex, t);
  }

  getLabelCenterX(categoryIndex: number, causeIndex: number, text: string): number {
    const w = this.getLabelWidth(categoryIndex, causeIndex, text);
    const ax = this.getCauseConnectionX(categoryIndex, causeIndex);
    const left = ax - (this.connectorShelf + w);
    return left + w / 2;
  }

  getLabelLeftX(categoryIndex: number, causeIndex: number, text: string): number {
    const w = this.getLabelWidth(categoryIndex, causeIndex, text);
    const ax = this.getCauseConnectionX(categoryIndex, causeIndex);
    return ax - (this.connectorShelf + w);
  }

  getLabelRightX(categoryIndex: number, causeIndex: number, text: string): number {
    const ax = this.getCauseConnectionX(categoryIndex, causeIndex);
    return ax - this.connectorGap;
  }

  getCauseConnectorPath(categoryIndex: number, causeIndex: number, text: string): string {
    const ax = this.getCauseConnectionX(categoryIndex, causeIndex);
    const ay = this.getCauseConnectionY(categoryIndex, causeIndex);
    const y = this.getLabelY(categoryIndex, causeIndex, text);
    const xr = this.getLabelRightX(categoryIndex, causeIndex, text);
    const shelfEnd = xr - this.connectorShelf;
    return `M ${xr} ${y} H ${shelfEnd} L ${ax} ${ay}`;
  }

  isTopSide(index: number): boolean { return index % 2 === 0; }

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

  private generateId(): string { return Date.now().toString(36) + Math.random().toString(36).substr(2); }

  // Context menu helpers
  toggleCauseMenu(cause: Cause, ev: MouseEvent) {
    ev.stopPropagation();
    this.openMenuForCauseId = this.openMenuForCauseId === cause.id ? null : cause.id;
  }
  closeCauseMenu() { this.openMenuForCauseId = null; }

  @HostListener('document:click')
  onDocClick() { this.openMenuForCauseId = null; }
}
