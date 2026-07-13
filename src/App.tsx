import { useCallback, useEffect, useRef, useState } from "react";
import {
  Book,
  type FlipEvent,
  type InitEvent,
  type OrientationEvent,
  type PageFlipInstance,
} from "./components/Book";
import { Toc } from "./components/Toc";
import { ProgressBar } from "./components/ProgressBar";
import { NavButtons } from "./components/NavButtons";
import { TOTAL_PAGES, visiblePagesForIndex } from "./data";

export function App() {
  const bookRef = useRef<{ pageFlip(): PageFlipInstance } | null>(null);
  const portraitRef = useRef(false);
  const visiblePagesRef = useRef<number[]>([1]);
  const [visiblePages, setVisiblePages] = useState<number[]>([1]);
  const [bookFlipping, setBookFlipping] = useState(false);
  const [closingCover, setClosingCover] = useState<
    "front" | "back" | null
  >(null);

  const handleFlip = useCallback((e: FlipEvent) => {
    const nextPages = visiblePagesForIndex(
      Number(e.data),
      portraitRef.current
    );
    visiblePagesRef.current = nextPages;
    setVisiblePages(nextPages);
  }, []);

  const handleOrientation = useCallback((e: OrientationEvent) => {
    const portrait = e.data === "portrait";
    portraitRef.current = portrait;
    const currentIndex =
      bookRef.current?.pageFlip().getCurrentPageIndex() ?? 0;
    const nextPages = visiblePagesForIndex(currentIndex, portrait);
    visiblePagesRef.current = nextPages;
    setVisiblePages(nextPages);
  }, []);

  const handleInit = useCallback((e: InitEvent) => {
    const portrait = e.data.mode === "portrait";
    portraitRef.current = portrait;
    const nextPages = visiblePagesForIndex(e.data.page, portrait);
    visiblePagesRef.current = nextPages;
    setVisiblePages(nextPages);
  }, []);

  const handleChangeState = useCallback((e: FlipEvent) => {
    const state = String(e.data);
    if (state === "flipping") {
      setBookFlipping(true);

      const pageFlip = bookRef.current?.pageFlip();
      const direction = pageFlip
        ?.getFlipController()
        .getCalculation()
        ?.getDirection();
      const currentIndex = pageFlip?.getCurrentPageIndex() ?? 0;
      const isOpenSpread = visiblePagesRef.current.length > 1;

      if (isOpenSpread && direction === 1 && currentIndex <= 1) {
        setClosingCover("front");
      } else if (
        isOpenSpread &&
        direction === 0 &&
        currentIndex >= TOTAL_PAGES - 3
      ) {
        setClosingCover("back");
      } else {
        setClosingCover(null);
      }
    } else if (state === "read") {
      setBookFlipping(false);
      setClosingCover(null);
    }
  }, []);

  const flipToPage = useCallback((page: number) => {
    const clamped = Math.min(Math.max(Math.round(page), 1), TOTAL_PAGES);
    bookRef.current?.pageFlip().flip(clamped - 1);
  }, []);

  const jumpToPage = useCallback((page: number) => {
    const clamped = Math.min(Math.max(Math.round(page), 1), TOTAL_PAGES);
    bookRef.current?.pageFlip().turnToPage(clamped - 1);
  }, []);

  const goToPrevPage = useCallback(() => {
    bookRef.current?.pageFlip().flipPrev();
  }, []);

  const goToNextPage = useCallback(() => {
    bookRef.current?.pageFlip().flipNext();
  }, []);

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowRight") {
        bookRef.current?.pageFlip().flipNext();
      } else if (e.key === "ArrowLeft") {
        bookRef.current?.pageFlip().flipPrev();
      }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, []);

  // The stage/book/page-edge width transitions exist for the cover
  // open-close animation, but they also fire on every `--page-size` change
  // from a viewport resize. Since a resize can update `--page-size` many
  // times per second while those transitions run on different durations,
  // the pieces catch up at different rates and visibly drift apart mid-drag.
  // Suspend the transitions while actively resizing so everything tracks
  // the viewport instantly instead.
  useEffect(() => {
    let timeoutId: number;
    function handleResize() {
      document.documentElement.classList.add("resizing");
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        document.documentElement.classList.remove("resizing");
      }, 150);
    }
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.clearTimeout(timeoutId);
    };
  }, []);

  const isCover = visiblePages.length === 1 && visiblePages[0] === 1;
  const isBackCover =
    visiblePages.length === 1 && visiblePages[0] === TOTAL_PAGES;
  const readRatio = (visiblePages[0] - 1) / (TOTAL_PAGES - 1);
  const leftEdgeRatio = visiblePages[0] <= 2 ? 0 : readRatio;
  const lastVisiblePage = visiblePages[visiblePages.length - 1];
  const rightEdgeRatio =
    lastVisiblePage >= TOTAL_PAGES - 1 ? 0 : 1 - readRatio;
  const shouldClip =
    closingCover !== null || ((isCover || isBackCover) && !bookFlipping);
  const stageFront = isCover || closingCover === "front";
  const stageBack = isBackCover || closingCover === "back";
  const stageClass = [
    shouldClip ? "clipped" : "",
    stageFront ? "cover-front" : "",
    stageBack ? "cover-back" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div id="app">
      <Toc visiblePages={visiblePages} onSelect={flipToPage} />

      <div id="stage-wrap" className={stageClass}>
        <div
          id="edge-left"
          className="page-edge"
          style={{ ["--ratio" as string]: leftEdgeRatio.toFixed(3) }}
        />
        <div id="stage" className={stageClass}>
          <div id="book">
            <Book
              ref={bookRef}
              onFlip={handleFlip}
              onChangeState={handleChangeState}
              onChangeOrientation={handleOrientation}
              onInit={handleInit}
            />
          </div>
        </div>
        <div
          id="edge-right"
          className="page-edge"
          style={{ ["--ratio" as string]: rightEdgeRatio.toFixed(3) }}
        />
      </div>

      <ProgressBar page={visiblePages[0]} onSeek={jumpToPage} />
      <NavButtons onPrev={goToPrevPage} onNext={goToNextPage} />
    </div>
  );
}
