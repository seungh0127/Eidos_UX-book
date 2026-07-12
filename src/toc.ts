export interface TocSection {
  name: string;
  startPage: number;
  endPage: number;
}

// Page numbers are 1-indexed, matching the PDF page numbers / rendered file names.
export const TOC_SECTIONS: TocSection[] = [
  { name: "Background", startPage: 8, endPage: 13 },
  { name: "Insight", startPage: 14, endPage: 17 },
  { name: "Define", startPage: 18, endPage: 23 },
  { name: "Concept", startPage: 24, endPage: 31 },
  { name: "Solution", startPage: 32, endPage: 39 },
  { name: "Key Features", startPage: 40, endPage: 51 },
  { name: "Scenario", startPage: 52, endPage: 87 },
  { name: "Expectation", startPage: 88, endPage: 97 },
  { name: "Branding", startPage: 98, endPage: 107 },
];

function activeSectionNames(visiblePages: number[]): Set<string> {
  const active = new Set<string>();
  for (const page of visiblePages) {
    for (const section of TOC_SECTIONS) {
      if (page >= section.startPage && page <= section.endPage) {
        active.add(section.name);
      }
    }
  }
  return active;
}

export interface TocController {
  update(visiblePages: number[]): void;
}

export function createToc(
  container: HTMLElement,
  onSelect: (page: number) => void
): TocController {
  const itemsByName = new Map<string, HTMLButtonElement>();

  for (const section of TOC_SECTIONS) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "toc-item";
    item.textContent = section.name;
    item.addEventListener("click", () => onSelect(section.startPage));
    container.appendChild(item);
    itemsByName.set(section.name, item);
  }

  return {
    update(visiblePages) {
      const active = activeSectionNames(visiblePages);
      itemsByName.forEach((item, name) => {
        item.classList.toggle("active", active.has(name));
      });
    },
  };
}
