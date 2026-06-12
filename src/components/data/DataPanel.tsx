import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../store/useStore';
import { parseDelimitedText, parseFile } from '../../lib/parse';
import { makeSampleDatasets } from '../../lib/sampleData';
import { DataTable } from './DataTable';

export function DataPanel() {
  const { t } = useTranslation();
  const datasets = useStore((s) => s.datasets);
  const activeDatasetId = useStore((s) => s.activeDatasetId);
  const setActiveDataset = useStore((s) => s.setActiveDataset);
  const addDatasets = useStore((s) => s.addDatasets);
  const removeDataset = useStore((s) => s.removeDataset);
  const renameDataset = useStore((s) => s.renameDataset);

  const fileRef = useRef<HTMLInputElement>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [firstRowHeader, setFirstRowHeader] = useState(true);
  const [renamingId, setRenamingId] = useState<string | null>(null);

  const active = datasets.find((d) => d.id === activeDatasetId) ?? datasets[0];

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) {
      try {
        addDatasets(await parseFile(f, firstRowHeader));
      } catch (err) {
        alert(`Failed to parse ${f.name}: ${String(err)}`);
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="section-title">{t('data.datasets')}</div>
      <div className="flex gap-1.5 px-3 pb-2">
        <button className="btn-primary flex-1" onClick={() => fileRef.current?.click()}>
          {t('data.import')}
        </button>
        <button className="btn flex-1" onClick={() => setPasteOpen(true)}>
          {t('data.paste')}
        </button>
        <button className="btn flex-1" onClick={() => addDatasets(makeSampleDatasets())}>
          {t('data.sample')}
        </button>
      </div>
      <label className="flex items-center gap-1.5 px-3 pb-2 text-[11px]" style={{ color: 'var(--text-2)' }}>
        <input
          type="checkbox"
          checked={firstRowHeader}
          onChange={(e) => setFirstRowHeader(e.target.checked)}
        />
        {t('data.firstRowHeader')}
      </label>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,.tsv,.txt,.xlsx,.xls"
        multiple
        hidden
        onChange={(e) => {
          void onFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {/* dataset list */}
      <div className="px-3 pb-2 space-y-1 max-h-44 overflow-y-auto shrink-0">
        {datasets.length === 0 && (
          <div
            className="text-center text-[11px] whitespace-pre-line py-6 rounded-lg border border-dashed"
            style={{ color: 'var(--text-3)', borderColor: 'var(--border)' }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void onFiles(e.dataTransfer.files);
            }}
          >
            {t('data.empty')}
          </div>
        )}
        {datasets.map((d) => (
          <div
            key={d.id}
            className="group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-xs"
            style={{
              background: d.id === active?.id ? 'var(--bg-subtle)' : 'transparent',
              outline: d.id === active?.id ? '1px solid var(--color-accent)' : 'none',
            }}
            onClick={() => setActiveDataset(d.id)}
          >
            {renamingId === d.id ? (
              <input
                autoFocus
                className="input flex-1"
                defaultValue={d.name}
                onClick={(e) => e.stopPropagation()}
                onBlur={(e) => {
                  renameDataset(d.id, e.target.value || d.name);
                  setRenamingId(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                }}
              />
            ) : (
              <span className="flex-1 truncate font-medium" onDoubleClick={() => setRenamingId(d.id)}>
                {d.name}
              </span>
            )}
            <span className="text-[10px] shrink-0" style={{ color: 'var(--text-3)' }}>
              {d.rows.length}×{d.columns.length}
            </span>
            <button
              className="opacity-0 group-hover:opacity-100 text-[10px] px-1 hover:text-red-500"
              style={{ color: 'var(--text-3)' }}
              title={t('data.delete')}
              onClick={(e) => {
                e.stopPropagation();
                removeDataset(d.id);
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* data table */}
      {active && <DataTable dataset={active} />}

      {/* paste dialog */}
      {pasteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="panel rounded-xl p-4 w-[520px] max-w-[90vw] shadow-2xl">
            <div className="font-semibold mb-1">{t('data.pasteTitle')}</div>
            <div className="text-[11px] mb-2" style={{ color: 'var(--text-2)' }}>
              {t('data.pasteHint')}
            </div>
            <textarea
              autoFocus
              className="input !h-48 font-mono resize-none"
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={'X\tY1\tY2\n0\t1.2\t3.4\n1\t2.3\t4.5'}
            />
            <div className="flex justify-end gap-2 mt-3">
              <button className="btn" onClick={() => setPasteOpen(false)}>
                {t('data.cancel')}
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  if (pasteText.trim()) {
                    addDatasets([
                      parseDelimitedText(pasteText, `Pasted ${new Date().toLocaleTimeString()}`, firstRowHeader),
                    ]);
                  }
                  setPasteText('');
                  setPasteOpen(false);
                }}
              >
                {t('data.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
