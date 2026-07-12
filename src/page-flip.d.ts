declare module "page-flip/dist/js/page-flip.module.js" {
  export interface PageFlipEvent<T = unknown> {
    data: T;
    object: PageFlip;
  }

  export interface PageFlipSettings {
    width: number;
    height: number;
    size?: "fixed" | "stretch";
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    drawShadow?: boolean;
    flippingTime?: number;
    usePortrait?: boolean;
    startZIndex?: number;
    autoSize?: boolean;
    maxShadowOpacity?: number;
    showCover?: boolean;
    mobileScrollSupport?: boolean;
    swipeDistance?: number;
    clickEventForward?: boolean;
    useMouseEvents?: boolean;
    showPageCorners?: boolean;
    disableFlipByClick?: boolean;
    startPage?: number;
  }

  export type PageFlipState = "read" | "flipping" | "fold_corner" | "user_fold";

  export class PageFlip {
    constructor(element: HTMLElement, settings: PageFlipSettings);
    loadFromImages(images: string[]): void;
    on(event: "flip", callback: (e: PageFlipEvent<number>) => void): this;
    on(
      event: "changeState",
      callback: (e: PageFlipEvent<PageFlipState>) => void
    ): this;
    on(event: string, callback: (e: PageFlipEvent<unknown>) => void): this;
    flip(pageIndex: number): void;
    flipNext(): void;
    flipPrev(): void;
    turnToPage(pageIndex: number): void;
    getCurrentPageIndex(): number;
    getPageCount(): number;
    destroy(): void;
  }
}
