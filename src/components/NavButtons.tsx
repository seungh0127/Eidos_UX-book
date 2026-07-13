import backIcon from "../../assets/back_icon.svg";
import nextIcon from "../../assets/next_icon.svg";

interface NavButtonsProps {
  onPrev: () => void;
  onNext: () => void;
}

// Mobile-only prev/next controls (hidden on desktop via CSS): touch
// devices can swipe the page corner, but a flat tap target is more
// reliable once the book no longer fills most of the viewport.
export function NavButtons({ onPrev, onNext }: NavButtonsProps) {
  return (
    <div id="nav-buttons">
      <button type="button" aria-label="Previous page" onClick={onPrev}>
        <img src={backIcon} alt="" draggable={false} />
      </button>
      <button type="button" aria-label="Next page" onClick={onNext}>
        <img src={nextIcon} alt="" draggable={false} />
      </button>
    </div>
  );
}
