import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../store/useStore';
import type { Dataset } from '../../types';

export function DataTable({ dataset }: { dataset: Dataset }) {
  const { t } = useTranslation();
  const updateCell = useStore((s) => s.updateCell);
  const updateColumnName = useStore((s) => s.updateColumnName);
  const addRow = useStore((s) => s.addRow);
  const addColumn = useStore((s) => s.addColumn);
  const deleteRow = useStore((s) => s.deleteRow);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);

  const commitCell = (row: number, col: number, raw: string) => {
    const trimmed = raw.trim();
    if (trimmed === '') {
      updateCell(dataset.id, row, col, null);
      return;
    }
    const n = Number(trimmed);
    updateCell(dataset.id, row, col, Number.isFinite(n) ? n : trimmed);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 border-t" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-1.5 px-3 py-1.5">
        <button className="btn !px-2 !py-1 text-[11px]" onClick={() => addRow(dataset.id)}>
          + {t('data.addRow')}
        </button>
        <button className="btn !px-2 !py-1 text-[11px]" onClick={() => addColumn(dataset.id)}>
          + {t('data.addCol')}
        </button>
        {selectedRow !== null && (
          <button
            className="btn !px-2 !py-1 text-[11px] !text-red-500"
            onClick={() => {
              deleteRow(dataset.id, selectedRow);
              setSelectedRow(null);
            }}
          >
            {t('data.delRow')}
          </button>
        )}
      </div>
      <div className="flex-1 overflow-auto px-1 pb-1">
        <table className="border-collapse w-full text-[11px]">
          <thead className="sticky top-0 z-10">
            <tr>
              <th
                className="w-8 px-1 py-1 text-[10px] font-normal border"
                style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border)', color: 'var(--text-3)' }}
              >
                #
              </th>
              {dataset.columns.map((c, ci) => (
                <th
                  key={ci}
                  className="border p-0 min-w-16"
                  style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border)' }}
                >
                  <input
                    className="w-full px-1.5 py-1 font-semibold text-[11px] bg-transparent outline-none text-center"
                    style={{ color: 'var(--text-1)' }}
                    defaultValue={c}
                    key={`${dataset.id}-${ci}-${c}`}
                    onBlur={(e) => updateColumnName(dataset.id, ci, e.target.value || c)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    }}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataset.rows.map((row, ri) => (
              <tr key={ri}>
                <td
                  className="px-1 py-0.5 text-center text-[10px] border cursor-pointer select-none"
                  style={{
                    borderColor: 'var(--border)',
                    color: 'var(--text-3)',
                    background: selectedRow === ri ? 'var(--color-accent)' : 'var(--bg-subtle)',
                  }}
                  onClick={() => setSelectedRow(selectedRow === ri ? null : ri)}
                >
                  {ri + 1}
                </td>
                {row.map((cell, ci) => (
                  <td key={ci} className="border p-0" style={{ borderColor: 'var(--border)' }}>
                    <input
                      className="w-full px-1.5 py-0.5 bg-transparent outline-none focus:bg-[var(--bg-subtle)]"
                      style={{
                        color: typeof cell === 'number' ? 'var(--text-1)' : 'var(--color-accent)',
                        textAlign: typeof cell === 'number' ? 'right' : 'left',
                      }}
                      key={`${dataset.id}-${ri}-${ci}-${String(cell)}`}
                      defaultValue={cell === null ? '' : String(cell)}
                      onBlur={(e) => commitCell(ri, ci, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
