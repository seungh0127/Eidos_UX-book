import { forwardRef, memo, useMemo } from "react";
import HTMLFlipBook from "react-pageflip";
import { TOTAL_PAGES, pageImageSrc } from "../data";

// react-pageflip / page-flip ship no TypeScript types for the underlying
// PageFlip instance returned by `ref.current.pageFlip()`; declare just the
// methods this app actually calls.
export interface PageFlipInstance {
  flip(pageIndex: number, corner?: "top" | "bottom"): void;
  flipNext(corner?: "top" | "bottom"): void;
  flipPrev(corner?: "top" | "bottom"): void;
  turnToPage(pageIndex: number): void;
  getCurrentPageIndex(): number;
  getPageCount(): number;
  getFlipController(): {
    getCalculation(): { getDirection(): 0 | 1 } | null;
  };
}

export interface FlipEvent {
  data: number | string;
}

export interface OrientationEvent {
  data: "portrait" | "landscape";
}

export interface InitEvent {
  data: {
    page: number;
    mode: "portrait" | "landscape";
  };
}

const Page = forwardRef<HTMLDivElement, { pageNumber: number }>(
  ({ pageNumber }, ref) => {
    const isFrontCover = pageNumber === 1;
    const isBackCover = pageNumber === TOTAL_PAGES;
    const isCover = isFrontCover || isBackCover;
    const coverClass = isFrontCover
      ? " book-page--front-cover"
      : isBackCover
        ? " book-page--back-cover"
        : "";

    return (
      <div
        className={`book-page${isCover ? " book-page--cover" : ""}${coverClass}`}
        ref={ref}
        data-density={isCover ? "hard" : "soft"}
      >
        <img
          src={pageImageSrc(pageNumber)}
          alt={`Page ${pageNumber}`}
          draggable={false}
          decoding="async"
        />
      </div>
    );
  }
);
Page.displayName = "Page";

interface BookProps {
  onFlip: (e: FlipEvent) => void;
  onChangeState: (e: FlipEvent) => void;
  onChangeOrientation: (e: OrientationEvent) => void;
  onInit: (e: InitEvent) => void;
}

const BookImpl = forwardRef<{ pageFlip(): PageFlipInstance }, BookProps>(
  ({ onFlip, onChangeState, onChangeOrientation, onInit }, ref) => {
    // Stable across re-renders (e.g. from `onFlip`'s own state update) so
    // react-pageflip - which reprocesses its children on every render
    // unless told otherwise - doesn't reset itself mid-flip. Combined
    // with `renderOnlyPageLengthChange` below, since the page count here
    // never changes.
    const pages = useMemo(
      () => Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1),
      []
    );

    return (
      // @ts-expect-error - react-pageflip's IFlipSetting marks every prop
      // required, but the component itself provides sane internal
      // defaults for anything not listed here.
      <HTMLFlipBook
        ref={ref}
        width={720}
        height={720}
        size="stretch"
        minWidth={280}
        maxWidth={1400}
        minHeight={200}
        maxHeight={1400}
        showCover={true}
        usePortrait={true}
        autoSize={false}
        maxShadowOpacity={0.5}
        flippingTime={700}
        showPageCorners={true}
        disableFlipByClick={false}
        useMouseEvents={true}
        renderOnlyPageLengthChange={true}
        className="book-flip"
        onFlip={onFlip}
        onChangeState={onChangeState}
        onChangeOrientation={onChangeOrientation}
        onInit={onInit}
      >
        {pages.map((n) => (
          <Page key={n} pageNumber={n} />
        ))}
      </HTMLFlipBook>
    );
  }
);
BookImpl.displayName = "Book";

export const Book = memo(BookImpl);
