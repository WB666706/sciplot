import { useTranslation } from 'react-i18next';
import { useStore } from '../../store/useStore';
import type { AnnotationStyle } from '../../types';

export function AnnotateTab() {
  const { t } = useTranslation();
  const mode = useStore((s) => s.mode);
  const annotations = useStore((s) => (s.mode === 'chart' ? s.annotations : s.canvasAnnotations));
  const selectedId = useStore((s) => s.selectedAnnotationId);
  const updateAnnotation = useStore((s) => s.updateAnnotation);
  const selected = annotations.find((a) => a.id === selectedId);

  if (!selected) {
    return (
      <div
        className="text-center text-[11px] whitespace-pre-line py-10 px-4"
        style={{ color: 'var(--text-3)' }}
      >
        {t('annotate.noneSelected')}
        {'\n\n'}
        {t('annotate.dblclickEdit')}
      </div>
    );
  }

  const st = (patch: Partial<AnnotationStyle>) =>
    updateAnnotation(selected.id, { style: { ...selected.style, ...patch } });
  const hasText = selected.kind === 'text' || selected.kind === 'sig';
  const hasFill = selected.kind === 'rect' || selected.kind === 'ellipse';

  return (
    <div className="space-y-2.5 px-3 pt-3 pb-4" key={`${mode}-${selected.id}`}>
      <div className="text-[11px] font-semibold" style={{ color: 'var(--text-1)' }}>
        {t(`annotate.${selected.kind === 'line' ? 'lineTool' : selected.kind}`)}
      </div>

      {hasText && (
        <div>
          <span className="label">{t('annotate.textContent')}</span>
          <input
            className="input"
            value={selected.text}
            onChange={(e) => updateAnnotation(selected.id, { text: e.target.value })}
          />
        </div>
      )}

      <div>
        <span className="label">{t('annotate.stroke')}</span>
        <div className="flex gap-1.5 items-center">
          <input
            type="color"
            className="w-8 h-7 rounded cursor-pointer border-0 bg-transparent"
            value={selected.style.stroke}
            onChange={(e) => st({ stroke: e.target.value })}
          />
          <input className="input flex-1" value={selected.style.stroke} onChange={(e) => st({ stroke: e.target.value })} />
        </div>
      </div>

      {hasFill && (
        <div>
          <span className="label">{t('annotate.fill')}</span>
          <div className="flex gap-1.5 items-center">
            <input
              type="color"
              className="w-8 h-7 rounded cursor-pointer border-0 bg-transparent"
              value={selected.style.fill === 'none' ? '#ffffff' : selected.style.fill}
              onChange={(e) => st({ fill: e.target.value })}
            />
            <button className="btn flex-1" onClick={() => st({ fill: 'none' })}>
              {t('chart.none')}
            </button>
          </div>
        </div>
      )}

      <div>
        <span className="label">
          {t('annotate.width')} · {selected.style.strokeWidth}
        </span>
        <input
          type="range"
          className="w-full accent-(--color-accent)"
          min={0.5}
          max={6}
          step={0.5}
          value={selected.style.strokeWidth}
          onChange={(e) => st({ strokeWidth: Number(e.target.value) })}
        />
      </div>

      {hasText && (
        <div>
          <span className="label">
            {t('annotate.fontSize')} · {selected.style.fontSize}
          </span>
          <input
            type="range"
            className="w-full accent-(--color-accent)"
            min={8}
            max={32}
            step={1}
            value={selected.style.fontSize}
            onChange={(e) => st({ fontSize: Number(e.target.value) })}
          />
        </div>
      )}

      <label className="flex items-center justify-between text-[11px] cursor-pointer" style={{ color: 'var(--text-2)' }}>
        {t('annotate.dash')}
        <input type="checkbox" checked={selected.style.dash} onChange={(e) => st({ dash: e.target.checked })} />
      </label>
    </div>
  );
}
