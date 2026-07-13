import { useEffect, useRef } from "react";
import { TOC_SECTIONS, activeSectionNames } from "../data";

interface TocProps {
  visiblePages: number[];
  onSelect: (page: number) => void;
}

export function Toc({ visiblePages, onSelect }: TocProps) {
  const active = activeSectionNames(visiblePages);
  const currentPage = visiblePages[visiblePages.length - 1];
  const currentName = TOC_SECTIONS.find(
    (section) => currentPage >= section.startPage && currentPage <= section.endPage
  )?.name;

  const navRef = useRef<HTMLElement>(null);
  const itemRefs = useRef(new Map<string, HTMLButtonElement>());

  // On the mobile horizontal layout the current section should sit centered
  // in the scroll area rather than just becoming visible at an edge.
  useEffect(() => {
    if (!currentName) return;
    itemRefs.current.get(currentName)?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [currentName]);

  // Native touch scrolling already lets a finger drag the row; add the same
  // affordance for a mouse (relevant for the resized-desktop-window case),
  // without intercepting touch input where inertial scrolling is better.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    let dragging = false;
    let startX = 0;
    let startScroll = 0;

    function handlePointerDown(event: PointerEvent) {
      if (event.pointerType !== "mouse") return;
      dragging = true;
      startX = event.clientX;
      startScroll = nav!.scrollLeft;
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp, { once: true });
    }

    function handlePointerMove(event: PointerEvent) {
      if (!dragging) return;
      nav!.scrollLeft = startScroll - (event.clientX - startX);
    }

    function handlePointerUp() {
      dragging = false;
      window.removeEventListener("pointermove", handlePointerMove);
    }

    nav.addEventListener("pointerdown", handlePointerDown);
    return () => {
      nav.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  return (
    <nav id="toc" aria-label="Table of contents" ref={navRef}>
      {TOC_SECTIONS.map((section) => (
        <button
          key={section.name}
          ref={(el) => {
            if (el) itemRefs.current.set(section.name, el);
            else itemRefs.current.delete(section.name);
          }}
          type="button"
          className={`toc-item${active.has(section.name) ? " active" : ""}`}
          onClick={() => onSelect(section.startPage)}
        >
          {section.name}
        </button>
      ))}
    </nav>
  );
}
