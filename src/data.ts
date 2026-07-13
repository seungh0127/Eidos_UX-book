export const TOTAL_PAGES = 112;

export function pageImageSrc(pageNumber: number): string {
  const base = import.meta.env.BASE_URL;
  return `${base}pages/page-${String(pageNumber).padStart(3, "0")}.jpg`;
}

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

export function activeSectionNames(visiblePages: number[]): Set<string> {
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

// Mirrors StPageFlip's own pairing for a `showCover` book: the cover
// (page 1) and back cover (last page) are shown alone; every page in
// between is paired left/right, and StPageFlip always reports the
// smaller (left, always even 1-indexed) page of the spread as current.
export function visiblePagesForIndex(
  pageIndex: number,
  portrait = false
): number[] {
  const page = pageIndex + 1;
  if (page <= 1) return [1];
  if (page >= TOTAL_PAGES) return [TOTAL_PAGES];
  if (portrait) return [page];
  return [page, page + 1];
}
