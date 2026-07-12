export interface ProgressBarController {
  setPage(page: number): void;
}

export function createProgressBar(
  track: HTMLElement,
  fill: HTMLElement,
  totalPages: number,
  onSeek: (page: number) => void
): ProgressBarController {
  let dragging = false;

  function ratioToPage(ratio: number): number {
    const clamped = Math.min(Math.max(ratio, 0), 1);
    return Math.round(clamped * (totalPages - 1)) + 1;
  }

  function pageToRatio(page: number): number {
    return (page - 1) / (totalPages - 1);
  }

  function renderRatio(ratio: number) {
    const clamped = Math.min(Math.max(ratio, 0), 1);
    // The pill has a fixed CSS width, so its travel range is the track
    // width minus its own width (see `calc()` on #progress-fill) -
    // otherwise it would overshoot past the track at either end.
    fill.style.setProperty("--seek", clamped.toFixed(4));
  }

  function ratioFromEvent(clientX: number): number {
    const rect = track.getBoundingClientRect();
    return (clientX - rect.left) / rect.width;
  }

  // Drives the page turn live as the bar is dragged, not just on release.
  function seekFromEvent(clientX: number) {
    const ratio = ratioFromEvent(clientX);
    renderRatio(ratio);
    onSeek(ratioToPage(ratio));
  }

  function handlePointerDown(event: PointerEvent) {
    dragging = true;
    track.setPointerCapture(event.pointerId);
    seekFromEvent(event.clientX);
  }

  function handlePointerMove(event: PointerEvent) {
    if (!dragging) return;
    seekFromEvent(event.clientX);
  }

  function handlePointerUp(event: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    track.releasePointerCapture(event.pointerId);
    seekFromEvent(event.clientX);
  }

  track.addEventListener("pointerdown", handlePointerDown);
  track.addEventListener("pointermove", handlePointerMove);
  track.addEventListener("pointerup", handlePointerUp);
  track.addEventListener("pointercancel", handlePointerUp);

  return {
    setPage(page) {
      if (dragging) return;
      renderRatio(pageToRatio(page));
    },
  };
}
