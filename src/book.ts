export const TOTAL_PAGES = 112;
const SHEET_COUNT = TOTAL_PAGES / 2;

// CSS transition duration for a sheet flip - keep this in sync with the
// `transition: transform ...` value on `.bf-sheet` in style.css.
const FLIP_MS = 700;

const Z_REST_BASE = 1000;
const Z_HOVER = 2000;
const Z_ACTIVE = 3000;

function pageImageSrc(pageNumber: number): string {
  const base = import.meta.env.BASE_URL;
  return `${base}pages/page-${String(pageNumber).padStart(3, "0")}.jpg`;
}

// The book is modeled as 56 physical sheets, each with a front and back
// face, exactly like a real book: sheet i's front is page (2i+1) and its
// back is page (2i+2). `openCount` sheets have been turned to the left.
function pagesForOpenCount(k: number): number[] {
  if (k <= 0) return [1];
  if (k >= SHEET_COUNT) return [TOTAL_PAGES];
  return [2 * k, 2 * k + 1];
}

function pageToOpenCount(page: number): number {
  const clamped = Math.min(Math.max(Math.round(page), 1), TOTAL_PAGES);
  if (clamped <= 1) return 0;
  if (clamped >= TOTAL_PAGES) return SHEET_COUNT;
  return Math.min(Math.max(Math.floor(clamped / 2), 1), SHEET_COUNT - 1);
}

function restAngle(sheetIndex: number, openCount: number): number {
  return sheetIndex < openCount ? -180 : 0;
}

function restZ(sheetIndex: number, openCount: number): number {
  return sheetIndex < openCount
    ? Z_REST_BASE + sheetIndex
    : Z_REST_BASE - sheetIndex;
}

export interface BookController {
  /** Animated page turn, used for discrete navigation (e.g. TOC clicks). */
  flipToPage(page: number): void;
  /** Instant, unanimated jump, used while scrubbing the progress bar. */
  jumpToPage(page: number): void;
  getVisiblePages(): number[];
  onChange(callback: (pages: number[]) => void): void;
  /** Fires whenever the flip/drag/hover-corner animation starts or stops. */
  onActivityChange(callback: (active: boolean) => void): void;
}

export function createBook(container: HTMLElement): BookController {
  container.innerHTML = "";

  const sheetEls: HTMLElement[] = [];
  for (let i = 0; i < SHEET_COUNT; i++) {
    const sheet = document.createElement("div");
    sheet.className = "bf-sheet";

    const front = document.createElement("div");
    front.className = "bf-face bf-face--front";
    front.style.backgroundImage = `url(${pageImageSrc(2 * i + 1)})`;

    const back = document.createElement("div");
    back.className = "bf-face bf-face--back";
    back.style.backgroundImage = `url(${pageImageSrc(2 * i + 2)})`;

    sheet.append(front, back);
    container.appendChild(sheet);
    sheetEls.push(sheet);
  }

  let openCount = 0;
  let hoverIndex: number | null = null;
  let activeDrag: {
    index: number;
    direction: "forward" | "backward";
    startX: number;
    moved: boolean;
    angle: number;
  } | null = null;

  const listeners = new Set<(pages: number[]) => void>();
  const activityListeners = new Set<(active: boolean) => void>();

  function emitChange() {
    const pages = pagesForOpenCount(openCount);
    listeners.forEach((cb) => cb(pages));
  }

  function emitActivity(active: boolean) {
    activityListeners.forEach((cb) => cb(active));
  }

  function withInstant(fn: () => void) {
    container.classList.add("bf-instant");
    fn();
    void container.offsetHeight; // flush the instant styles synchronously
    container.classList.remove("bf-instant");
  }

  // Snaps every sheet to its resting pose for `targetOpenCount`. If
  // `animateIndex` is given, that one sheet is skipped here and animated
  // separately afterwards (with the transition re-enabled), so a jump of
  // any distance still reads as a single page turn.
  function applyRestState(targetOpenCount: number, animateIndex?: number) {
    withInstant(() => {
      for (let i = 0; i < SHEET_COUNT; i++) {
        if (i === animateIndex) continue;
        sheetEls[i].style.transform = `rotateY(${restAngle(i, targetOpenCount)}deg)`;
        sheetEls[i].style.zIndex = String(restZ(i, targetOpenCount));
      }
    });
    if (animateIndex !== undefined) {
      const el = sheetEls[animateIndex];
      el.style.zIndex = String(Z_ACTIVE);
      el.style.transform = `rotateY(${restAngle(animateIndex, targetOpenCount)}deg)`;
    }
  }

  function revertHover() {
    if (hoverIndex === null) return;
    const el = sheetEls[hoverIndex];
    el.style.transform = `rotateY(${restAngle(hoverIndex, openCount)}deg)`;
    el.style.zIndex = String(restZ(hoverIndex, openCount));
    hoverIndex = null;
    emitActivity(false);
  }

  function handleHoverMove(e: MouseEvent) {
    if (activeDrag) return;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const zoneW = rect.width * 0.14;
    const zoneH = rect.height * 0.3;
    const inBottomBand = y >= rect.height - zoneH && y <= rect.height;

    let target: number | null = null;
    if (inBottomBand && x >= rect.width - zoneW && openCount < SHEET_COUNT) {
      target = openCount;
    } else if (inBottomBand && x <= zoneW && openCount > 0) {
      target = openCount - 1;
    }

    if (target === hoverIndex) return;
    if (hoverIndex !== null) revertHover();
    if (target !== null) {
      hoverIndex = target;
      const peekAngle = target >= openCount ? -10 : -170;
      const el = sheetEls[target];
      el.style.zIndex = String(Z_HOVER);
      el.style.transform = `rotateY(${peekAngle}deg)`;
      emitActivity(true);
    }
  }

  function handleHoverLeave() {
    revertHover();
  }

  function handlePointerDown(e: PointerEvent) {
    if (e.button !== 0) return;
    if (hoverIndex !== null) revertHover();

    const rect = container.getBoundingClientRect();
    const half = rect.width / 2;
    const isRightHalf = e.clientX - rect.left >= half;

    let index: number;
    let direction: "forward" | "backward";
    if (isRightHalf) {
      if (openCount >= SHEET_COUNT) return;
      index = openCount;
      direction = "forward";
    } else {
      if (openCount <= 0) return;
      index = openCount - 1;
      direction = "backward";
    }

    e.preventDefault();
    activeDrag = {
      index,
      direction,
      startX: e.clientX,
      moved: false,
      angle: direction === "forward" ? 0 : -180,
    };
    sheetEls[index].style.zIndex = String(Z_ACTIVE);
    emitActivity(true);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
  }

  function handlePointerMove(e: PointerEvent) {
    if (!activeDrag) return;
    const dx = e.clientX - activeDrag.startX;
    if (Math.abs(dx) > 5) activeDrag.moved = true;

    const half = container.getBoundingClientRect().width / 2;
    let progress: number;
    if (activeDrag.direction === "forward") {
      progress = Math.min(Math.max(-dx / half, 0), 1);
      activeDrag.angle = -180 * progress;
    } else {
      progress = Math.min(Math.max(dx / half, 0), 1);
      activeDrag.angle = -180 + 180 * progress;
    }

    const el = sheetEls[activeDrag.index];
    el.style.transition = "none";
    el.style.transform = `rotateY(${activeDrag.angle}deg)`;
  }

  function handlePointerUp() {
    if (!activeDrag) return;
    const { index, direction, moved, angle } = activeDrag;
    window.removeEventListener("pointermove", handlePointerMove);
    activeDrag = null;

    const shouldComplete = moved ? Math.abs(angle) > 90 : true;
    openCount =
      direction === "forward"
        ? shouldComplete
          ? openCount + 1
          : openCount
        : shouldComplete
          ? openCount - 1
          : openCount;

    const el = sheetEls[index];
    el.style.transition = "";
    el.style.zIndex = String(Z_ACTIVE);
    el.style.transform = `rotateY(${restAngle(index, openCount)}deg)`;

    window.setTimeout(() => {
      applyRestState(openCount);
      emitChange();
      emitActivity(false);
    }, FLIP_MS + 30);
  }

  container.addEventListener("mousemove", handleHoverMove);
  container.addEventListener("mouseleave", handleHoverLeave);
  container.addEventListener("pointerdown", handlePointerDown);

  applyRestState(openCount);

  return {
    flipToPage(page) {
      const target = pageToOpenCount(page);
      if (target === openCount) return;
      const forward = target > openCount;
      const boundaryIndex = forward ? target - 1 : target;
      applyRestState(target, boundaryIndex);
      openCount = target;
      emitActivity(true);
      window.setTimeout(() => {
        applyRestState(openCount);
        emitChange();
        emitActivity(false);
      }, FLIP_MS + 30);
    },
    jumpToPage(page) {
      const target = pageToOpenCount(page);
      if (target === openCount) return;
      openCount = target;
      applyRestState(openCount);
      emitChange();
    },
    getVisiblePages() {
      return pagesForOpenCount(openCount);
    },
    onChange(callback) {
      listeners.add(callback);
    },
    onActivityChange(callback) {
      activityListeners.add(callback);
    },
  };
}
