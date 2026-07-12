import "./style.css";
import { createBook, TOTAL_PAGES } from "./book";
import { createToc } from "./toc";
import { createProgressBar } from "./progressBar";

const bookEl = document.querySelector<HTMLElement>("#book")!;
const stageEl = document.querySelector<HTMLElement>("#stage")!;
const edgeLeftEl = document.querySelector<HTMLElement>("#edge-left")!;
const edgeRightEl = document.querySelector<HTMLElement>("#edge-right")!;
const tocEl = document.querySelector<HTMLElement>("#toc")!;
const progressTrack = document.querySelector<HTMLElement>("#progress-track")!;
const progressFill = document.querySelector<HTMLElement>("#progress-fill")!;

const book = createBook(bookEl);

let currentPages = book.getVisiblePages();
let flipActive = false;

// While a flip/drag/hover-corner animation is running, StPageFlip draws the
// turning page (and the page it reveals underneath) as a free-floating
// overlay that naturally bulges outside the flat page rectangle. Clipping
// the stage during that window would cut the animation off, so we only
// clip to hide the phantom blank half-page while the book is closed AND
// at rest.
function updateStageFraming() {
  const isSingle = currentPages.length === 1;
  const isCover = isSingle && currentPages[0] === 1;
  const isBackCover = isSingle && currentPages[0] === TOTAL_PAGES;
  const shouldClip = (isCover || isBackCover) && !flipActive;

  stageEl.classList.toggle("clipped", shouldClip);
  stageEl.classList.toggle("cover-front", shouldClip && isCover);
  stageEl.classList.toggle("cover-back", shouldClip && isBackCover);
}

// Mirrors a physical book's fore-edge: pages already turned pile up on
// the left, pages still ahead pile up on the right.
function applyPageEdges(pages: number[]) {
  const readRatio = (pages[0] - 1) / (TOTAL_PAGES - 1);
  edgeLeftEl.style.setProperty("--ratio", readRatio.toFixed(3));
  edgeRightEl.style.setProperty("--ratio", (1 - readRatio).toFixed(3));
}

const toc = createToc(tocEl, (page) => book.flipToPage(page));

const progressBar = createProgressBar(
  progressTrack,
  progressFill,
  TOTAL_PAGES,
  (page) => book.flipToPage(page)
);

function handlePagesChange(pages: number[]) {
  currentPages = pages;
  updateStageFraming();
  applyPageEdges(pages);
  toc.update(pages);
  progressBar.setPage(pages[0]);
}

book.onChange(handlePagesChange);
book.onActivityChange((active) => {
  flipActive = active;
  updateStageFraming();
});
handlePagesChange(book.getVisiblePages());
