import { useTranslation } from 'react-i18next';
import { useStore } from '../../store/useStore';
import type { ToolId } from '../../types';

const ICONS: Record<string, string> = {
  // simple path-based icons on a 24x24 grid
  select: 'M7 3l12 9-5.5 1L16 19l-2.5 1-2.5-6L7 17z',
  arrow: 'M4 20L18 6M18 6h-6M18 6v6',
  line: 'M4 20L20 4',
  rect: 'M4 6h16v12H4z',
  ellipse: 'M12 5c4.4 0 8 3.1 8 7s-3.6 7-8 7-8-3.1-8-7 3.6-7 8-7z',
  text: 'M5 6V4h14v2M12 4v16M9 20h6',
  sig: 'M5 12v-4h14v4M12 8V6M10 4h4',
  pen: 'M4 20c2-6 5-10 8-12 2-1 4 1 3 3-2 3-6 6-11 9z',
};

function ToolIcon({ id }: { id: string }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={ICONS[id]} />
    </svg>
  );
}

export function AnnotationToolbar() {
  const { t } = useTranslation();
  const tool = useStore((s) => s.tool);
  const setTool = useStore((s) => s.setTool);
  const editPoints = useStore((s) => s.editPoints);
  const setEditPoints = useStore((s) => s.setEditPoints);
  const mode = useStore((s) => s.mode);
  const clearAnnotations = useStore((s) => s.clearAnnotations);
  const selectedId = useStore((s) => s.selectedAnnotationId);
  const removeAnnotation = useStore((s) => s.removeAnnotation);

  const tools: { id: ToolId; label: string }[] = [
    { id: 'select', label: t('annotate.select') },
    { id: 'arrow', label: t('annotate.arrow') },
    { id: 'line', label: t('annotate.lineTool') },
    { id: 'rect', label: t('annotate.rect') },
    { id: 'ellipse', label: t('annotate.ellipse') },
    { id: 'text', label: t('annotate.text') },
    { id: 'sig', label: t('annotate.sig') },
    { id: 'pen', label: t('annotate.pen') },
  ];

  return (
    <div
      className="flex items-center gap-0.5 px-2 py-1 border-b shrink-0 overflow-x-auto whitespace-nowrap"
      style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)' }}
    >
      {tools.map(({ id, label }) => (
        <button
          key={id}
          title={label}
          className={`tool-btn ${tool === id && !editPoints ? 'active' : ''}`}
          onClick={() => setTool(id)}
        >
          <ToolIcon id={id} />
        </button>
      ))}
      <div className="w-px h-5 mx-1.5" style={{ background: 'var(--border)' }} />
      {mode === 'chart' && (
        <button
          title={t('annotate.editPoints')}
          className={`tool-btn !w-auto shrink-0 px-2 gap-1 text-[11px] font-medium whitespace-nowrap ${editPoints ? 'active' : ''}`}
          onClick={() => setEditPoints(!editPoints)}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="6" cy="16" r="2" />
            <circle cx="12" cy="8" r="2" />
            <circle cx="19" cy="13" r="2" />
            <path d="M7.5 14.5L10.5 9.5M13.8 9l3.5 3" />
          </svg>
          {t('annotate.editPoints')}
        </button>
      )}
      <div className="flex-1" />
      {selectedId && (
        <button className="btn !py-1 text-[11px] shrink-0 whitespace-nowrap" onClick={() => removeAnnotation(selectedId)}>
          {t('annotate.deleteSel')}
        </button>
      )}
      <button
        className="btn !py-1 text-[11px] ml-1 shrink-0 whitespace-nowrap"
        onClick={() => {
          if (confirm(t('annotate.clear') + '?')) clearAnnotations();
        }}
      >
        {t('annotate.clear')}
      </button>
    </div>
  );
}
