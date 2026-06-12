import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../store/useStore';
import { ChartTab } from '../panels/ChartTab';
import { StyleTab } from '../panels/StyleTab';
import { AnnotateTab } from '../panels/AnnotateTab';
import { ExportTab } from '../panels/ExportTab';

type TabId = 'chart' | 'style' | 'annotate' | 'export';

export function RightPanel() {
  const { t } = useTranslation();
  const mode = useStore((s) => s.mode);
  const [tab, setTab] = useState<TabId>('chart');

  const tabs: { id: TabId; label: string; chartOnly?: boolean }[] = [
    { id: 'chart', label: t('mode.chart'), chartOnly: true },
    { id: 'style', label: t('style.style'), chartOnly: true },
    { id: 'annotate', label: t('annotate.annotate') },
    { id: 'export', label: t('exportP.export') },
  ];
  const visible = tabs.filter((x) => !(x.chartOnly && mode === 'canvas'));
  const current = visible.some((x) => x.id === tab) ? tab : visible[0].id;

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
        {visible.map((x) => (
          <button
            key={x.id}
            className="flex-1 py-2 text-[11.5px] font-medium cursor-pointer transition-colors"
            style={{
              color: current === x.id ? 'var(--color-accent)' : 'var(--text-3)',
              boxShadow: current === x.id ? 'inset 0 -2px 0 var(--color-accent)' : 'none',
            }}
            onClick={() => setTab(x.id)}
          >
            {x.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {current === 'chart' && <ChartTab />}
        {current === 'style' && <StyleTab />}
        {current === 'annotate' && <AnnotateTab />}
        {current === 'export' && <ExportTab />}
      </div>
    </div>
  );
}
