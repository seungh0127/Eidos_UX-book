import { TOC_SECTIONS, activeSectionNames } from "../data";

interface TocProps {
  visiblePages: number[];
  onSelect: (page: number) => void;
}

export function Toc({ visiblePages, onSelect }: TocProps) {
  const active = activeSectionNames(visiblePages);

  return (
    <nav id="toc" aria-label="Table of contents">
      {TOC_SECTIONS.map((section) => (
        <button
          key={section.name}
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
