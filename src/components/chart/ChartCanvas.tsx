import { useLayoutEffect, useRef, useState } from 'react';
import { useStore } from '../../store/useStore';
import { MM_TO_PX } from '../../lib/journals';
import { ChartPanel } from './ChartPanel';
import { AnnotationLayer } from '../annotate/AnnotationLayer';
import { AnnotationToolbar } from '../annotate/AnnotationToolbar';

export const FIGURE_DOM_ID = 'sciplot-figure';

export function ChartCanvas() {
  const charts = useStore((s) => s.charts);
  const layout = useStore((s) => s.layout);
  const annotations = useStore((s) => s.annotations);
  const figureWidthMm = useStore((s) => s.figureWidthMm);
  const figureHeightMm = useStore((s) => s.figureHeightMm);
  const activeChart = useStore((s) => s.charts.find((c) => c.id === s.activeChartId));

  const W = Math.round(figureWidthMm * MM_TO_PX);
  const H = Math.round(figureHeightMm * MM_TO_PX);

  const wrapRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [autoFit, setAutoFit] = useState(true);

  useLayoutEffect(() => {
    if (!autoFit) return;
    const el = wrapRef.current;
    if (!el) return;
    const compute = () => {
      const pad = 48;
      const z = Math.min(
        (el.clientWidth - pad) / W,
        (el.clientHeight - pad) / H,
        2,
      );
      setZoom(Math.max(0.2, z));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [W, H, autoFit]);

  const cellW = Math.floor(W / layout.cols);
  const cellH = Math.floor(H / layout.rows);

  const panelLabels = layout.showPanelLabels && charts.length > 1
    ? charts.map((_, i) => ({
        x: (i % layout.cols) * cellW + 8,
        y: Math.floor(i / layout.cols) * cellH + 20,
        label: String.fromCharCode(65 + i),
      }))
    : [];

  return (
    <div className="flex flex-col h-full min-w-0">
      <AnnotationToolbar />
      <div
        ref={wrapRef}
        className="flex-1 overflow-auto relative"
        style={{ background: 'var(--bg-canvas)' }}
      >
        <div
          className="absolute"
          style={{
            left: '50%',
            top: '50%',
            transform: `translate(-50%, -50%) scale(${zoom})`,
          }}
        >
          <div
            id={FIGURE_DOM_ID}
            className="relative shadow-xl"
            style={{ width: W, height: H, background: '#ffffff' }}
          >
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${layout.cols}, ${cellW}px)`,
                gridTemplateRows: `repeat(${layout.rows}, ${cellH}px)`,
              }}
            >
              {charts.map((c) => (
                <ChartPanel key={c.id} chart={c} width={cellW} height={cellH} />
              ))}
            </div>
            <AnnotationLayer
              width={W}
              height={H}
              annotations={annotations}
              interactive
              panelLabels={panelLabels}
              labelFont={activeChart?.style.fontFamily ?? 'Arial'}
            />
          </div>
        </div>
        {/* zoom controls */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1 panel rounded-lg px-1.5 py-1 z-20">
          <button
            className="tool-btn !w-6 !h-6"
            onClick={() => {
              setAutoFit(false);
              setZoom((z) => Math.max(0.2, z - 0.1));
            }}
          >
            −
          </button>
          <span className="text-[11px] w-10 text-center" style={{ color: 'var(--text-2)' }}>
            {Math.round(zoom * 100)}%
          </span>
          <button
            className="tool-btn !w-6 !h-6"
            onClick={() => {
              setAutoFit(false);
              setZoom((z) => Math.min(3, z + 0.1));
            }}
          >
            +
          </button>
          <button className="tool-btn !w-6 !h-6 text-[10px]" onClick={() => setAutoFit(true)}>
            ⊡
          </button>
        </div>
      </div>
    </div>
  );
}
