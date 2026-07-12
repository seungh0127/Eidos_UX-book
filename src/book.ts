import { PageFlip } from "page-flip/dist/js/page-flip.module.js";

export const TOTAL_PAGES = 112;

function pageImageSrc(pageNumber: number): string {
  const base = import.meta.env.BASE_URL;
  return `${base}pages/page-${String(pageNumber).padStart(3, "0")}.jpg`;
}

// The book always shows the cover (page 1) and the back page (TOTAL_PAGES) alone;
// every page in between is paired left/right, and StPageFlip reports the smaller
// (left) index of the current spread as the "current page".
function visiblePagesFor(currentPage: number): number[] {
  if (currentPage <= 1) return [1];
  if (currentPage >= TOTAL_PAGES) return [TOTAL_PAGES];
  return [currentPage, currentPage + 1];
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
  const images = Array.from({ length: TOTAL_PAGES }, (_, i) =>
    pageImageSrc(i + 1)
  );

  const pageFlip = new PageFlip(container, {
    width: 720,
    height: 720,
    size: "stretch",
    // Kept small on purpose: StPageFlip applies `minWidth * 2` as an
    // inline `min-width` on the container, which would otherwise stop
    // the book from shrinking below that on narrow viewports and clip
    // the responsive CSS sizing.
    minWidth: 40,
    maxWidth: 1400,
    minHeight: 40,
    maxHeight: 1400,
    maxShadowOpacity: 0.45,
    showCover: true,
    usePortrait: false,
    autoSize: false,
    mobileScrollSupport: false,
    useMouseEvents: true,
    flippingTime: 700,
    showPageCorners: true,
    disableFlipByClick: false,
  });

  pageFlip.loadFromImages(images);

  const listeners = new Set<(pages: number[]) => void>();
  const activityListeners = new Set<(active: boolean) => void>();

  pageFlip.on("flip", (e) => {
    const pages = visiblePagesFor(e.data + 1);
    listeners.forEach((cb) => cb(pages));
  });

  pageFlip.on("changeState", (e) => {
    const active = e.data !== "read";
    activityListeners.forEach((cb) => cb(active));
  });

  return {
    flipToPage(page) {
      const clamped = Math.min(Math.max(Math.round(page), 1), TOTAL_PAGES);
      pageFlip.flip(clamped - 1);
    },
    jumpToPage(page) {
      const clamped = Math.min(Math.max(Math.round(page), 1), TOTAL_PAGES);
      pageFlip.turnToPage(clamped - 1);
    },
    getVisiblePages() {
      return visiblePagesFor(pageFlip.getCurrentPageIndex() + 1);
    },
    onChange(callback) {
      listeners.add(callback);
    },
    onActivityChange(callback) {
      activityListeners.add(callback);
    },
  };
}
