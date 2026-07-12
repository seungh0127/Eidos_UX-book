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
    const percent = Math.min(Math.max(ratio, 0), 1) * 100;
    fill.style.width = `${percent}%`;
  }

  function ratioFromEvent(clientX: number): number {
    const rect = track.getBoundingClientRect();
    return (clientX - rect.left) / rect.width;
  }

  function handlePointerDown(event: PointerEvent) {
    dragging = true;
    track.setPointerCapture(event.pointerId);
    const ratio = ratioFromEvent(event.clientX);
    renderRatio(ratio);
  }

  function handlePointerMove(event: PointerEvent) {
    if (!dragging) return;
    const ratio = ratioFromEvent(event.clientX);
    renderRatio(ratio);
  }

  function handlePointerUp(event: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    track.releasePointerCapture(event.pointerId);
    const ratio = ratioFromEvent(event.clientX);
    onSeek(ratioToPage(ratio));
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
