import { useEffect, useRef } from "react";
import { TOTAL_PAGES } from "../data";

interface ProgressBarProps {
  page: number;
  onSeek: (page: number) => void;
}

export function ProgressBar({ page, onSeek }: ProgressBarProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  function ratioToPage(ratio: number): number {
    const clamped = Math.min(Math.max(ratio, 0), 1);
    return Math.round(clamped * (TOTAL_PAGES - 1)) + 1;
  }

  function renderRatio(ratio: number) {
    const clamped = Math.min(Math.max(ratio, 0), 1);
    // The pill has a fixed CSS width, so its travel range is the track
    // width minus its own width (see `calc()` on #progress-fill) -
    // otherwise it would overshoot past the track at either end.
    fillRef.current?.style.setProperty("--seek", clamped.toFixed(4));
  }

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    function ratioFromEvent(clientX: number): number {
      const rect = track!.getBoundingClientRect();
      return (clientX - rect.left) / rect.width;
    }

    // Drives the page turn live as the bar is dragged, not just on release.
    function seekFromEvent(clientX: number) {
      const ratio = ratioFromEvent(clientX);
      renderRatio(ratio);
      onSeek(ratioToPage(ratio));
    }

    // Deliberately not using setPointerCapture: capturing the pointer on
    // this track left react-pageflip's underlying PageFlip instance stuck
    // after a second turnToPage() call to a distant page (reproducible
    // even with React removed from the picture entirely) - likely capture
    // interferes with its internal size/position measurement. Tracking
    // the drag via window-level listeners instead sidesteps that while
    // still following the pointer outside the track's own bounds.
    function handlePointerDown(event: PointerEvent) {
      draggingRef.current = true;
      seekFromEvent(event.clientX);
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp, { once: true });
    }

    function handlePointerMove(event: PointerEvent) {
      if (!draggingRef.current) return;
      seekFromEvent(event.clientX);
    }

    function handlePointerUp() {
      draggingRef.current = false;
      window.removeEventListener("pointermove", handlePointerMove);
      // No seekFromEvent here: pointerdown (a plain click) or the last
      // pointermove (a drag) already seeked to this same position.
    }

    track.addEventListener("pointerdown", handlePointerDown);

    return () => {
      track.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onSeek]);

  useEffect(() => {
    if (draggingRef.current) return;
    renderRatio((page - 1) / (TOTAL_PAGES - 1));
  }, [page]);

  return (
    <div id="progress">
      <div id="progress-track" ref={trackRef}>
        <div id="progress-fill" ref={fillRef} />
      </div>
    </div>
  );
}
