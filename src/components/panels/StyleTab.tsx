import { useTranslation } from 'react-i18next';
import { useStore } from '../../store/useStore';
import { PALETTES } from '../../lib/palettes';
import { THEMES } from '../../lib/themes';
import { FONT_OPTIONS } from '../../lib/journals';
import type { AxisConfig, ChartStyle, TickFormat } from '../../types';

function NumberField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="range"
          className="flex-1 accent-(--color-accent)"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <span className="text-[11px] w-7 text-right" style={{ color: 'var(--text-2)' }}>
          {value}
        </span>
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between text-[11px] cursor-pointer" style={{ color: 'var(--text-2)' }}>
      {label}
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

function AxisEditor({
  title,
  axis,
  onChange,
}: {
  title: string;
  axis: AxisConfig;
  onChange: (patch: Partial<AxisConfig>) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg p-2 space-y-2" style={{ background: 'var(--bg-subtle)' }}>
      <div className="text-[11px] font-semibold" style={{ color: 'var(--text-1)' }}>
        {title}
      </div>
      <div>
        <span className="label">{t('style.axisLabel')}</span>
        <input className="input" value={axis.label} onChange={(e) => onChange({ label: e.target.value })} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <span className="label">{t('style.scale')}</span>
          <select
            className="input"
            value={axis.scale}
            onChange={(e) => onChange({ scale: e.target.value as AxisConfig['scale'] })}
          >
            <option value="linear">{t('style.linear')}</option>
            <option value="log">{t('style.log')}</option>
          </select>
        </div>
        <div>
          <span className="label">{t('style.min')}</span>
          <input
            className="input"
            placeholder={t('style.auto')}
            value={axis.min}
            onChange={(e) => onChange({ min: e.target.value })}
          />
        </div>
        <div>
          <span className="label">{t('style.max')}</span>
          <input
            className="input"
            placeholder={t('style.auto')}
            value={axis.max}
            onChange={(e) => onChange({ max: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="label">{t('style.tickFormat')}</span>
          <select
            className="input"
            value={axis.tickFormat}
            onChange={(e) => onChange({ tickFormat: e.target.value as TickFormat })}
          >
            <option value="auto">{t('style.auto')}</option>
            <option value="fixed0">1</option>
            <option value="fixed1">1.0</option>
            <option value="fixed2">1.00</option>
            <option value="scientific">1e3</option>
            <option value="percent">100%</option>
          </select>
        </div>
        <div>
          <span className="label">{t('style.labelRotate')}</span>
          <select
            className="input"
            value={axis.labelRotate}
            onChange={(e) => onChange({ labelRotate: Number(e.target.value) })}
          >
            <option value={0}>0°</option>
            <option value={30}>30°</option>
            <option value={45}>45°</option>
            <option value={90}>90°</option>
          </select>
        </div>
      </div>
      <Toggle label={t('style.tickInside')} value={axis.tickInside} onChange={(v) => onChange({ tickInside: v })} />
      <Toggle label={t('style.grid')} value={axis.showGrid} onChange={(v) => onChange({ showGrid: v })} />
    </div>
  );
}

export function StyleTab() {
  const { t } = useTranslation();
  const chart = useStore((s) => s.charts.find((c) => c.id === s.activeChartId));
  const updateChart = useStore((s) => s.updateChart);
  if (!chart) return null;

  const st = (patch: Partial<ChartStyle>) =>
    updateChart(chart.id, { style: { ...chart.style, ...patch } });
  const hasY2 = chart.series.some((s) => s.y2);
  const isBar = chart.type === 'bar' || chart.type === 'barh';
  const isLineLike = ['line', 'area', 'polar'].includes(chart.type);
  const isPie = chart.type === 'pie';
  const isBoxLike = chart.type === 'box' || chart.type === 'violin';
  const noAxes = isPie || chart.type === 'radar';

  return (
    <div className="space-y-1 pb-4">
      <div className="section-title">{t('style.theme')}</div>
      <div className="px-3 grid grid-cols-2 gap-1.5">
        {THEMES.map((th) => (
          <button
            key={th.id}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer border transition-colors"
            style={{
              borderColor: chart.style.theme === th.id ? 'var(--color-accent)' : 'var(--border)',
              background:
                chart.style.theme === th.id
                  ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)'
                  : 'transparent',
            }}
            onClick={() => st({ theme: th.id })}
          >
            <span
              className="w-4 h-4 rounded-sm shrink-0 border"
              style={{ background: th.background, borderColor: th.gridColor }}
            />
            <span className="text-[10.5px] truncate" style={{ color: 'var(--text-2)' }}>
              {th.name}
            </span>
          </button>
        ))}
      </div>

      <div className="section-title">{t('style.palette')}</div>
      <div className="px-3 space-y-1">
        {PALETTES.map((p) => (
          <button
            key={p.id}
            className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer border transition-colors"
            style={{
              borderColor: chart.style.palette === p.id ? 'var(--color-accent)' : 'var(--border)',
              background:
                chart.style.palette === p.id
                  ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)'
                  : 'transparent',
            }}
            onClick={() => st({ palette: p.id })}
          >
            <div className="flex rounded overflow-hidden shrink-0">
              {p.colors.slice(0, 6).map((c) => (
                <div key={c} style={{ background: c, width: 13, height: 13 }} />
              ))}
            </div>
            <span className="text-[10.5px] truncate" style={{ color: 'var(--text-2)' }}>
              {p.name}
            </span>
          </button>
        ))}
      </div>

      <div className="section-title">{t('style.style')}</div>
      <div className="px-3 space-y-2.5">
        <div>
          <span className="label">{t('style.font')}</span>
          <select className="input" value={chart.style.fontFamily} onChange={(e) => st({ fontFamily: e.target.value })}>
            {FONT_OPTIONS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <NumberField label={t('style.fontSize')} value={chart.style.fontSize} min={7} max={20} step={1} onChange={(v) => st({ fontSize: v })} />
        <NumberField label={t('style.titleSize')} value={chart.style.titleSize} min={10} max={28} step={1} onChange={(v) => st({ titleSize: v })} />
        {!isPie && (
          <>
            <NumberField label={t('style.lineWidth')} value={chart.style.lineWidth} min={0.5} max={5} step={0.5} onChange={(v) => st({ lineWidth: v })} />
            <NumberField label={t('style.symbolSize')} value={chart.style.symbolSize} min={2} max={16} step={1} onChange={(v) => st({ symbolSize: v })} />
          </>
        )}
        {chart.type === 'histogram' && (
          <NumberField label={t('style.bins')} value={chart.style.histogramBins} min={5} max={60} step={1} onChange={(v) => st({ histogramBins: v })} />
        )}
        {isBar && (
          <>
            <NumberField label={t('style.barGap')} value={chart.style.barGap} min={0} max={100} step={5} onChange={(v) => st({ barGap: v })} />
            <NumberField label={t('style.barRadius')} value={chart.style.barBorderRadius} min={0} max={12} step={1} onChange={(v) => st({ barBorderRadius: v })} />
          </>
        )}
        {isPie && (
          <>
            <NumberField label={t('style.donut')} value={chart.style.pieDonut} min={0} max={0.8} step={0.05} onChange={(v) => st({ pieDonut: v })} />
            <Toggle label={t('style.pieLabels')} value={chart.style.pieShowLabels} onChange={(v) => st({ pieShowLabels: v })} />
          </>
        )}
        {isLineLike && (
          <>
            <Toggle label={t('style.showSymbols')} value={chart.style.showSymbols} onChange={(v) => st({ showSymbols: v })} />
            <Toggle label={t('style.smooth')} value={chart.style.smooth} onChange={(v) => st({ smooth: v })} />
            {chart.type !== 'polar' && (
              <Toggle label={t('style.step')} value={chart.style.step} onChange={(v) => st({ step: v })} />
            )}
          </>
        )}
        {(isBar || chart.type === 'area') && (
          <Toggle label={t('style.stack')} value={chart.style.stack} onChange={(v) => st({ stack: v })} />
        )}
        {isBar && chart.style.stack && (
          <Toggle label={t('style.percentStack')} value={chart.style.percentStack} onChange={(v) => st({ percentStack: v })} />
        )}
        {isBoxLike && (
          <Toggle label={t('style.showPoints')} value={chart.style.boxShowPoints} onChange={(v) => st({ boxShowPoints: v })} />
        )}
        {!isPie && (
          <Toggle label={t('style.dataLabels')} value={chart.style.showDataLabels} onChange={(v) => st({ showDataLabels: v })} />
        )}
        <Toggle label={t('style.legend')} value={chart.style.showLegend} onChange={(v) => st({ showLegend: v })} />
        {chart.style.showLegend && (
          <div>
            <span className="label">{t('style.legendPos')}</span>
            <select
              className="input"
              value={chart.style.legendPosition}
              onChange={(e) => st({ legendPosition: e.target.value as ChartStyle['legendPosition'] })}
            >
              <option value="top">{t('style.top')}</option>
              <option value="bottom">{t('style.bottom')}</option>
              <option value="right">{t('style.right')}</option>
              <option value="insideTopLeft">{t('style.insideTL')}</option>
              <option value="insideTopRight">{t('style.insideTR')}</option>
            </select>
          </div>
        )}
      </div>

      {!noAxes && (
        <>
          <div className="section-title">{t('style.axes')}</div>
          <div className="px-3 space-y-2">
            <AxisEditor title={t('style.xAxis')} axis={chart.xAxis} onChange={(p) => updateChart(chart.id, { xAxis: { ...chart.xAxis, ...p } })} />
            <AxisEditor title={t('style.yAxis')} axis={chart.yAxis} onChange={(p) => updateChart(chart.id, { yAxis: { ...chart.yAxis, ...p } })} />
            {hasY2 && (
              <AxisEditor title={t('style.y2Axis')} axis={chart.y2Axis} onChange={(p) => updateChart(chart.id, { y2Axis: { ...chart.y2Axis, ...p } })} />
            )}
          </div>
        </>
      )}
    </div>
  );
}
