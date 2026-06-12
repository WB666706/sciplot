import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../store/useStore';
import { JOURNAL_PRESETS } from '../../lib/journals';
import {
  downloadPdf,
  downloadPng,
  downloadSvg,
  readProjectFile,
  saveProjectFile,
} from '../../lib/export';
import { FIGURE_DOM_ID } from '../chart/ChartCanvas';
import { CANVAS_DOM_ID } from '../freecanvas/FreeCanvas';

export function ExportTab() {
  const { t } = useTranslation();
  const mode = useStore((s) => s.mode);
  const figureWidthMm = useStore((s) => s.figureWidthMm);
  const figureHeightMm = useStore((s) => s.figureHeightMm);
  const setFigureSize = useStore((s) => s.setFigureSize);
  const exportDpi = useStore((s) => s.exportDpi);
  const setExportDpi = useStore((s) => s.setExportDpi);
  const serializeProject = useStore((s) => s.serializeProject);
  const loadProject = useStore((s) => s.loadProject);

  const [preset, setPreset] = useState('');
  const [busy, setBusy] = useState(false);
  const projectInputRef = useRef<HTMLInputElement>(null);

  const targetEl = () =>
    document.getElementById(mode === 'chart' ? FIGURE_DOM_ID : CANVAS_DOM_ID);
  const filename = mode === 'chart' ? 'sciplot-figure' : 'sciplot-canvas';

  const run = async (fn: (el: HTMLElement) => Promise<void> | void) => {
    const el = targetEl();
    if (!el || busy) return;
    setBusy(true);
    try {
      await fn(el);
    } catch (err) {
      alert(String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-1 pb-4">
      <div className="section-title">{t('exportP.journal')}</div>
      <div className="px-3 space-y-2">
        <select
          className="input"
          value={preset}
          onChange={(e) => {
            setPreset(e.target.value);
            const p = JOURNAL_PRESETS.find((j) => j.id === e.target.value);
            if (p) setFigureSize(p.widthMm, p.heightMm);
          }}
        >
          <option value="">{t('exportP.custom')}</option>
          {JOURNAL_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="label">{t('exportP.width')}</span>
            <input
              type="number"
              className="input"
              value={figureWidthMm}
              min={30}
              max={400}
              onChange={(e) => {
                setPreset('');
                setFigureSize(Number(e.target.value) || figureWidthMm, figureHeightMm);
              }}
            />
          </div>
          <div>
            <span className="label">{t('exportP.height')}</span>
            <input
              type="number"
              className="input"
              value={figureHeightMm}
              min={30}
              max={400}
              onChange={(e) => {
                setPreset('');
                setFigureSize(figureWidthMm, Number(e.target.value) || figureHeightMm);
              }}
            />
          </div>
        </div>
      </div>

      <div className="section-title">{t('exportP.export')}</div>
      <div className="px-3 space-y-2">
        {mode === 'canvas' && (
          <div className="text-[10.5px]" style={{ color: 'var(--text-3)' }}>
            {t('exportP.canvasExportHint')}
          </div>
        )}
        <div>
          <span className="label">{t('exportP.dpi')}</span>
          <select className="input" value={exportDpi} onChange={(e) => setExportDpi(Number(e.target.value))}>
            {[150, 300, 600, 1200].map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <button className="btn-primary" disabled={busy} onClick={() => run((el) => downloadSvg(el, filename))}>
            SVG
          </button>
          <button className="btn-primary" disabled={busy} onClick={() => run((el) => downloadPng(el, filename, exportDpi))}>
            PNG
          </button>
          <button className="btn-primary" disabled={busy} onClick={() => run((el) => downloadPdf(el, filename))}>
            PDF
          </button>
        </div>
      </div>

      <div className="section-title">{t('exportP.project')}</div>
      <div className="px-3 grid grid-cols-2 gap-1.5">
        <button className="btn" onClick={() => saveProjectFile(serializeProject())}>
          {t('exportP.save')}
        </button>
        <button className="btn" onClick={() => projectInputRef.current?.click()}>
          {t('exportP.load')}
        </button>
        <input
          ref={projectInputRef}
          type="file"
          accept=".json"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            try {
              loadProject(await readProjectFile(f));
            } catch (err) {
              alert(String(err));
            }
          }}
        />
      </div>
    </div>
  );
}
