import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fork } from "node:child_process";
import { createCanvas } from "@napi-rs/canvas";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const PDF_PATH = path.join(ROOT, "assets", "Eidos_UX Book_0802.pdf");
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

async function renderPage(pdf, pageNum) {
  const canvasFactory = new NodeCanvasFactory();
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
}

async function loadPdf() {
  const data = new Uint8Array(await readFile(PDF_PATH));
  const loadingTask = pdfjsLib.getDocument({ data, isEvalSupported: false });
  return loadingTask.promise;
}

// Single-page worker mode: some pages in a large PDF carry big enough
// embedded images to segfault @napi-rs/canvas's native renderer. Rendering
// one page per child process means a crash only takes down that page's
// worker, instead of the whole batch losing every page after it.
async function runWorker(pageNum) {
  const pdf = await loadPdf();
  await renderPage(pdf, pageNum);
}

function renderPageInChildProcess(pageNum) {
  return new Promise((resolve) => {
    const child = fork(__filename, ["--page", String(pageNum)], {
      stdio: "inherit",
    });
    child.on("exit", (code) => resolve(code === 0));
  });
}

async function runAll() {
  await mkdir(OUT_DIR, { recursive: true });

  const pdf = await loadPdf();
  const numPages = pdf.numPages;
  console.log(`PDF loaded: ${numPages} pages`);

  const failedPages = [];
  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const ok = await renderPageInChildProcess(pageNum);
    if (!ok) {
      failedPages.push(pageNum);
      console.error(`Page ${pageNum} failed to render (worker crashed).`);
    } else if (pageNum % 10 === 0 || pageNum === numPages) {
      console.log(`Rendered ${pageNum}/${numPages}`);
    }
  }

  if (failedPages.length > 0) {
    console.error(`Done with failures: ${failedPages.join(", ")}`);
    process.exitCode = 1;
  } else {
    console.log("Done.");
  }
}

const pageArgIndex = process.argv.indexOf("--page");
if (pageArgIndex !== -1) {
  const pageNum = Number(process.argv[pageArgIndex + 1]);
  runWorker(pageNum).catch((err) => {
    console.error(err);
    process.exit(1);
  });
} else {
  runAll().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
