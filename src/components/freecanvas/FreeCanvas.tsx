import { useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../store/useStore';
import { MM_TO_PX } from '../../lib/journals';
import { AnnotationLayer } from '../annotate/AnnotationLayer';
import { AnnotationToolbar } from '../annotate/AnnotationToolbar';

export const CANVAS_DOM_ID = 'sciplot-canvas';

export function FreeCanvas() {
  const { t } = useTranslation();
  const annotations = useStore((s) => s.canvasAnnotations);
  const figureWidthMm = useStore((s) => s.figureWidthMm);
  const figureHeightMm = useStore((s) => s.figureHeightMm);

  const W = Math.round(figureWidthMm * MM_TO_PX);
  const H = Math.round(figureHeightMm * MM_TO_PX);

  const wrapRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const compute = () => {
      const pad = 48;
      const z = Math.min((el.clientWidth - pad) / W, (el.clientHeight - pad) / H, 2);
      setZoom(Math.max(0.2, z));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [W, H]);

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
          style={{ left: '50%', top: '50%', transform: `translate(-50%, -50%) scale(${zoom})` }}
        >
          <div
            id={CANVAS_DOM_ID}
            className="relative shadow-xl"
            style={{ width: W, height: H, background: '#ffffff' }}
          >
            <AnnotationLayer width={W} height={H} annotations={annotations} interactive />
          </div>
        </div>
        <div
          className="absolute top-2 left-1/2 -translate-x-1/2 text-[11px] px-3 py-1 rounded-full z-20 pointer-events-none"
          style={{ background: 'var(--bg-panel)', color: 'var(--text-3)', border: '1px solid var(--border)' }}
        >
          {t('canvas.hint')} · {t('annotate.dblclickEdit')}
        </div>
      </div>
    </div>
  );
}
