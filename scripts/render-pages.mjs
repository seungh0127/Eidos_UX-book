import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas } from "@napi-rs/canvas";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PDF_PATH = path.join(ROOT, "assets", "Eidos_UX Book.pdf");
const OUT_DIR = path.join(ROOT, "public", "pages");

const TARGET_SIZE = 1600; // px, square page
const JPEG_QUALITY = 0.85;

class NodeCanvasFactory {
  create(width, height) {
    const canvas = createCanvas(width, height);
    const context = canvas.getContext("2d");
    return { canvas, context };
  }
  reset(canvasAndContext, width, height) {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }
  destroy(canvasAndContext) {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const data = new Uint8Array(await readFile(PDF_PATH));
  const loadingTask = pdfjsLib.getDocument({ data, isEvalSupported: false });
  const pdf = await loadingTask.promise;
  console.log(`PDF loaded: ${pdf.numPages} pages`);

  const canvasFactory = new NodeCanvasFactory();

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1 });
    const scale = TARGET_SIZE / Math.max(viewport.width, viewport.height);
    const scaledViewport = page.getViewport({ scale });

    const { canvas, context } = canvasFactory.create(
      Math.ceil(scaledViewport.width),
      Math.ceil(scaledViewport.height)
    );

    await page.render({
      canvasContext: context,
      viewport: scaledViewport,
      canvasFactory,
    }).promise;

    const outPath = path.join(
      OUT_DIR,
      `page-${String(pageNum).padStart(3, "0")}.jpg`
    );
    const buffer = canvas.toBuffer("image/jpeg", Math.round(JPEG_QUALITY * 100));
    await writeFile(outPath, buffer);

    canvasFactory.destroy({ canvas, context });
    page.cleanup();

    if (pageNum % 10 === 0 || pageNum === pdf.numPages) {
      console.log(`Rendered ${pageNum}/${pdf.numPages}`);
    }
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
