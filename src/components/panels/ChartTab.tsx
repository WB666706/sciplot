import { useTranslation } from 'react-i18next';
import { useStore } from '../../store/useStore';
import type { ChartType, SeriesMapping } from '../../types';

const CHART_TYPES: { type: ChartType; icon: string }[] = [
  { type: 'line', icon: 'M3 17l5-6 4 3 6-8' },
  { type: 'scatter', icon: 'M5 16a1.4 1.4 0 100-2.8A1.4 1.4 0 005 16zm6-5a1.4 1.4 0 100-2.8 1.4 1.4 0 000 2.8zm5 7a1.4 1.4 0 100-2.8 1.4 1.4 0 000 2.8zm2-11a1.4 1.4 0 100-2.8 1.4 1.4 0 000 2.8z' },
  { type: 'bar', icon: 'M4 19V11h3v8zm6.5 0V5h3v14zm6.5 0v-6h3v6z' },
  { type: 'area', icon: 'M3 18l5-7 4 3 6-8v12H3z' },
  { type: 'box', icon: 'M8 4v3M8 17v3M5 7h6v10H5zM8 12h0M16 7v2M16 15v3M13 9h6v6h-6z' },
  { type: 'violin', icon: 'M12 3c1 3 4 4 4 8s-3 5-4 9c-1-4-4-5-4-9s3-5 4-8z' },
  { type: 'histogram', icon: 'M3 19v-4h4v4zm4.7 0V9h4v10zm4.6 0v-7h4v7zm4.7 0V12h4v7z' },
  { type: 'density', icon: 'M3 18c3 0 3-9 6-9s3 6 6 6 3-4 6-4' },
  { type: 'heatmap', icon: 'M4 4h5v5H4zM10 4h5v5h-5zM16 4h4v5h-4zM4 10h5v5H4zM10 10h5v5h-5zM16 10h4v5h-4z' },
  { type: 'correlation', icon: 'M4 4h4v4H4zM10 10h4v4h-4zM16 16h4v4h-4zM16 4h4v4h-4zM4 16h4v4H4z' },
  { type: 'radar', icon: 'M12 3l8 6-3 9H7L4 9zM12 7l4 3-1.5 5h-5L8 10z' },
  { type: 'polar', icon: 'M12 12m-8 0a8 8 0 1016 0 8 8 0 10-16 0M12 12m-4 0a4 4 0 108 0 4 4 0 10-8 0M12 4v16' },
];

function ColSelect({
  value,
  columns,
  onChange,
  allowNone,
  noneLabel,
}: {
  value: number;
  columns: string[];
  onChange: (v: number) => void;
  allowNone?: boolean;
  noneLabel?: string;
}) {
  return (
    <select className="input" value={value} onChange={(e) => onChange(Number(e.target.value))}>
      {allowNone && <option value={-1}>{noneLabel ?? '—'}</option>}
      {columns.map((c, i) => (
        <option key={i} value={i}>
          {c}
        </option>
      ))}
    </select>
  );
}

function SeriesEditor({ chartId, mapping }: { chartId: string; mapping: SeriesMapping }) {
  const { t } = useTranslation();
  const datasets = useStore((s) => s.datasets);
  const updateSeries = useStore((s) => s.updateSeries);
  const removeSeries = useStore((s) => s.removeSeries);
  const chart = useStore((s) => s.charts.find((c) => c.id === chartId));
  const ds = datasets.find((d) => d.id === mapping.datasetId);
  if (!ds || !chart) return null;

  const isDistribution = ['box', 'violin', 'histogram', 'density'].includes(chart.type);
  const isMatrix = ['heatmap', 'correlation', 'radar'].includes(chart.type);
  const patch = (p: Partial<SeriesMapping>) => updateSeries(chartId, mapping.id, p);

  return (
    <div className="rounded-lg p-2 space-y-2" style={{ background: 'var(--bg-subtle)' }}>
      <div className="flex items-center gap-2">
        <select
          className="input flex-1"
          value={mapping.datasetId}
          onChange={(e) => patch({ datasetId: e.target.value, xCol: 0, yCol: 1, errCol: -1, groupCol: -1 })}
        >
          {datasets.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <button
          className="text-[11px] px-1 hover:text-red-500 shrink-0"
          style={{ color: 'var(--text-3)' }}
          onClick={() => removeSeries(chartId, mapping.id)}
        >
          ✕
        </button>
      </div>

      {!isMatrix && (
        <div className="grid grid-cols-2 gap-2">
          {!isDistribution && (
            <div>
              <span className="label">{t('chart.xCol')}</span>
              <ColSelect value={mapping.xCol} columns={ds.columns} onChange={(v) => patch({ xCol: v })} />
            </div>
          )}
          <div>
            <span className="label">{isDistribution ? t('chart.valueCol') : t('chart.yCol')}</span>
            <ColSelect value={mapping.yCol} columns={ds.columns} onChange={(v) => patch({ yCol: v })} />
          </div>
          {!isDistribution && (
            <div>
              <span className="label">{t('chart.errCol')}</span>
              <ColSelect
                value={mapping.errCol}
                columns={ds.columns}
                onChange={(v) => patch({ errCol: v })}
                allowNone
                noneLabel={t('chart.none')}
              />
            </div>
          )}
          <div>
            <span className="label">{t('chart.groupCol')}</span>
            <ColSelect
              value={mapping.groupCol}
              columns={ds.columns}
              onChange={(v) => patch({ groupCol: v })}
              allowNone
              noneLabel={t('chart.none')}
            />
          </div>
        </div>
      )}

      {!isMatrix && !isDistribution && (
        <>
          <div>
            <span className="label">{t('chart.seriesName')}</span>
            <input
              className="input"
              value={mapping.name}
              placeholder={ds.columns[mapping.yCol]}
              onChange={(e) => patch({ name: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-2)' }}>
            <input type="checkbox" checked={mapping.y2} onChange={(e) => patch({ y2: e.target.checked })} />
            {t('chart.secondY')}
          </label>
        </>
      )}
    </div>
  );
}

export function ChartTab() {
  const { t } = useTranslation();
  const datasets = useStore((s) => s.datasets);
  const charts = useStore((s) => s.charts);
  const chart = useStore((s) => s.charts.find((c) => c.id === s.activeChartId));
  const layout = useStore((s) => s.layout);
  const setChartType = useStore((s) => s.setChartType);
  const updateChart = useStore((s) => s.updateChart);
  const addSeries = useStore((s) => s.addSeries);
  const addChart = useStore((s) => s.addChart);
  const removeChart = useStore((s) => s.removeChart);
  const setLayout = useStore((s) => s.setLayout);
  const setActiveChart = useStore((s) => s.setActiveChart);

  if (!chart) return null;

  return (
    <div className="space-y-1 pb-4">
      <div className="section-title">{t('chart.panels')}</div>
      <div className="px-3 flex flex-wrap gap-1.5 items-center">
        {charts.map((c, i) => (
          <button
            key={c.id}
            className="btn !px-2.5"
            style={
              c.id === chart.id
                ? { background: 'var(--color-accent)', color: '#fff', borderColor: 'transparent' }
                : undefined
            }
            onClick={() => setActiveChart(c.id)}
          >
            {String.fromCharCode(65 + i)}
          </button>
        ))}
        <button className="btn" onClick={addChart}>
          + {t('chart.addPanel')}
        </button>
        {charts.length > 1 && (
          <button className="btn !text-red-500" onClick={() => removeChart(chart.id)}>
            {t('chart.delPanel')}
          </button>
        )}
      </div>
      {charts.length > 1 && (
        <label className="flex items-center gap-1.5 px-3 pt-1 text-[11px]" style={{ color: 'var(--text-2)' }}>
          <input
            type="checkbox"
            checked={layout.showPanelLabels}
            onChange={(e) => setLayout({ showPanelLabels: e.target.checked })}
          />
          {t('chart.panelLabels')}
        </label>
      )}

      <div className="section-title">{t('chart.type')}</div>
      <div className="px-3 grid grid-cols-4 gap-1.5">
        {CHART_TYPES.map(({ type, icon }) => (
          <button
            key={type}
            title={t(`chart.types.${type}`)}
            className="flex flex-col items-center gap-1 rounded-lg py-2 cursor-pointer transition-colors border"
            style={{
              borderColor: chart.type === type ? 'var(--color-accent)' : 'var(--border)',
              background: chart.type === type ? 'color-mix(in srgb, var(--color-accent) 12%, transparent)' : 'transparent',
              color: chart.type === type ? 'var(--color-accent)' : 'var(--text-2)',
            }}
            onClick={() => setChartType(chart.id, type)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d={icon} />
            </svg>
            <span className="text-[9.5px] leading-none">{t(`chart.types.${type}`)}</span>
          </button>
        ))}
      </div>

      <div className="section-title">{t('chart.title')}</div>
      <div className="px-3">
        <input
          className="input"
          value={chart.title}
          onChange={(e) => updateChart(chart.id, { title: e.target.value })}
        />
      </div>

      <div className="section-title">{t('chart.series')}</div>
      <div className="px-3 space-y-2">
        {datasets.length === 0 ? (
          <div className="text-[11px] py-2" style={{ color: 'var(--text-3)' }}>
            {t('chart.needData')}
          </div>
        ) : (
          <>
            {chart.series.length === 0 && (
              <div className="text-[11px]" style={{ color: 'var(--text-3)' }}>
                {t('chart.noSeries')}
              </div>
            )}
            {chart.series.map((m) => (
              <SeriesEditor key={m.id} chartId={chart.id} mapping={m} />
            ))}
            <button className="btn w-full" onClick={() => addSeries(chart.id)}>
              + {t('chart.addSeries')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
