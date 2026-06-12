import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import 'svg2pdf.js';
import type { ProjectFile } from '../types';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Compose the on-screen figure (ECharts SVG panels + annotation overlay SVG)
 * into a single standalone SVG document.
 */
export function composeFigureSvg(figureEl: HTMLElement): SVGSVGElement {
  const rootRect = figureEl.getBoundingClientRect();
  // The on-screen figure may be CSS-scaled (zoom); offsetWidth is the unscaled size.
  const scale = rootRect.width / figureEl.offsetWidth || 1;
  const W = Math.round(figureEl.offsetWidth);
  const H = Math.round(figureEl.offsetHeight);

  const out = document.createElementNS(SVG_NS, 'svg');
  out.setAttribute('xmlns', SVG_NS);
  out.setAttribute('width', String(W));
  out.setAttribute('height', String(H));
  out.setAttribute('viewBox', `0 0 ${W} ${H}`);

  const bg = document.createElementNS(SVG_NS, 'rect');
  bg.setAttribute('width', String(W));
  bg.setAttribute('height', String(H));
  bg.setAttribute('fill', '#ffffff');
  out.appendChild(bg);

  const append = (svg: SVGSVGElement) => {
    const r = svg.getBoundingClientRect();
    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute(
      'transform',
      `translate(${(r.left - rootRect.left) / scale}, ${(r.top - rootRect.top) / scale})`,
    );
    for (const child of Array.from(svg.childNodes)) {
      g.appendChild(child.cloneNode(true));
    }
    out.appendChild(g);
  };

  figureEl
    .querySelectorAll<SVGSVGElement>('[data-chart-panel] svg')
    .forEach((svg) => append(svg));
  figureEl
    .querySelectorAll<SVGSVGElement>('svg[data-overlay]')
    .forEach((svg) => append(svg));

  // strip interactive-only attributes
  out.querySelectorAll('[cursor]').forEach((el) => el.removeAttribute('cursor'));
  return out;
}

function svgToString(svg: SVGSVGElement): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(svg)}`;
}

export function downloadSvg(figureEl: HTMLElement, filename: string) {
  const svg = composeFigureSvg(figureEl);
  const blob = new Blob([svgToString(svg)], { type: 'image/svg+xml;charset=utf-8' });
  saveAs(blob, `${filename}.svg`);
}

export async function downloadPng(figureEl: HTMLElement, filename: string, dpi: number) {
  const svg = composeFigureSvg(figureEl);
  const W = Number(svg.getAttribute('width'));
  const H = Number(svg.getAttribute('height'));
  const scale = dpi / 96;

  const url = URL.createObjectURL(
    new Blob([svgToString(svg)], { type: 'image/svg+xml;charset=utf-8' }),
  );
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to rasterize SVG'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(W * scale);
    canvas.height = Math.round(H * scale);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/png'),
    );
    if (blob) saveAs(blob, `${filename}.png`);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function downloadPdf(figureEl: HTMLElement, filename: string) {
  const svg = composeFigureSvg(figureEl);
  const W = Number(svg.getAttribute('width'));
  const H = Number(svg.getAttribute('height'));
  const pt = 0.75; // px -> pt
  const doc = new jsPDF({
    orientation: W >= H ? 'landscape' : 'portrait',
    unit: 'pt',
    format: [W * pt, H * pt],
  });
  await doc.svg(svg, { x: 0, y: 0, width: W * pt, height: H * pt });
  doc.save(`${filename}.pdf`);
}

export function saveProjectFile(project: ProjectFile) {
  const blob = new Blob([JSON.stringify(project, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  saveAs(blob, 'sciplot-project.json');
}

export async function readProjectFile(file: File): Promise<ProjectFile> {
  const text = await file.text();
  const data = JSON.parse(text) as ProjectFile;
  if (data.app !== 'sciplot') throw new Error('Not a SciPlot project file');
  return data;
}
