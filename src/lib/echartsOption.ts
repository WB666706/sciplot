import type { EChartsOption, SeriesOption } from 'echarts';
import type {
  AxisConfig,
  ChartConfig,
  Dataset,
  SeriesMapping,
  TickFormat,
} from '../types';
import { getPalette, HEATMAP_RAMP, DIVERGING_RAMP } from './palettes';
import {
  boxStats,
  histogram,
  jitter,
  kde,
  linearRegression,
  linspace,
  movingAverage,
  pearson,
} from './stats';
import { numericColumn, numericColumnIndices } from './parse';
import { getTheme, type ChartTheme } from './themes';

/** Minimal typing for ECharts custom-series renderItem api. */
interface RenderApi {
  value: (dim: number) => number;
  coord: (point: (number | string)[]) => number[];
  size: (dataSize: number[]) => number[];
}

interface XYPoint {
  x: number | string;
  y: number;
  err?: number;
  size?: number;
  /** original row index in the dataset — used for drag-editing */
  ri: number;
}

interface ResolvedSeries {
  /** stable id: `m:<mappingId>` or `m:<mappingId>:<group>` */
  sid: string;
  name: string;
  points: XYPoint[];
  mapping: SeriesMapping;
}

const LINE_TYPE: Record<string, 'solid' | 'dashed' | 'dotted'> = {
  solid: 'solid',
  dashed: 'dashed',
  dotted: 'dotted',
};

function resolveSeries(mapping: SeriesMapping, datasets: Dataset[]): ResolvedSeries[] {
  const ds = datasets.find((d) => d.id === mapping.datasetId);
  if (!ds) return [];
  const indexed = ds.rows
    .map((r, idx) => ({ r, idx }))
    .filter(({ r }) => r[mapping.yCol] !== null);
  const mk = (rs: typeof indexed, name: string, sid: string): ResolvedSeries => ({
    sid,
    name,
    mapping,
    points: rs
      .map(({ r, idx }) => {
        const rawX = mapping.xCol >= 0 ? r[mapping.xCol] : null;
        const y = r[mapping.yCol];
        if (typeof y !== 'number') return null;
        const p: XYPoint = { x: rawX === null ? '' : (rawX as number | string), y, ri: idx };
        if (mapping.errCol >= 0 && typeof r[mapping.errCol] === 'number') {
          p.err = r[mapping.errCol] as number;
        }
        if (mapping.sizeCol >= 0 && typeof r[mapping.sizeCol] === 'number') {
          p.size = r[mapping.sizeCol] as number;
        }
        return p;
      })
      .filter((p): p is XYPoint => p !== null),
  });
  if (mapping.groupCol >= 0) {
    const groups = new Map<string, typeof indexed>();
    for (const item of indexed) {
      const g = String(item.r[mapping.groupCol] ?? '—');
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push(item);
    }
    return [...groups.entries()].map(([g, rs]) => mk(rs, g, `m:${mapping.id}:${g}`));
  }
  return [
    mk(indexed, mapping.name || ds.columns[mapping.yCol] || 'Series', `m:${mapping.id}`),
  ];
}

/** Values grouped by category — used by box / violin / histogram / density / pie. */
function groupedValues(
  mapping: SeriesMapping,
  datasets: Dataset[],
): { name: string; values: number[] }[] {
  const ds = datasets.find((d) => d.id === mapping.datasetId);
  if (!ds) return [];
  if (mapping.groupCol >= 0) {
    const groups = new Map<string, number[]>();
    for (const r of ds.rows) {
      const v = r[mapping.yCol];
      if (typeof v !== 'number') continue;
      const g = String(r[mapping.groupCol] ?? '—');
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push(v);
    }
    return [...groups.entries()].map(([name, values]) => ({ name, values }));
  }
  return [
    { name: mapping.name || ds.columns[mapping.yCol], values: numericColumn(ds, mapping.yCol) },
  ];
}

function tickFormatter(fmt: TickFormat): ((v: number) => string) | undefined {
  switch (fmt) {
    case 'fixed0':
      return (v) => v.toFixed(0);
    case 'fixed1':
      return (v) => v.toFixed(1);
    case 'fixed2':
      return (v) => v.toFixed(2);
    case 'scientific':
      return (v) => (v === 0 ? '0' : v.toExponential(1).replace('e+', 'e'));
    case 'percent':
      return (v) => `${(v * 100).toFixed(0)}%`;
    default:
      return undefined;
  }
}

function axisOption(
  cfg: AxisConfig,
  chart: ChartConfig,
  theme: ChartTheme,
  isCategory: boolean,
  categories?: string[],
) {
  const fontStyle = {
    fontFamily: chart.style.fontFamily,
    fontSize: chart.style.fontSize,
    color: theme.textColor,
  };
  const rotate = cfg.labelRotate || (isCategory && (categories?.length ?? 0) > 8 ? 45 : 0);
  return {
    type: isCategory
      ? ('category' as const)
      : cfg.scale === 'log'
        ? ('log' as const)
        : ('value' as const),
    name: cfg.label,
    nameLocation: 'middle' as const,
    nameGap: isCategory ? (rotate ? 45 : 30) : 38,
    nameTextStyle: { ...fontStyle, fontSize: chart.style.fontSize + 1 },
    min: cfg.min !== '' && !isCategory ? Number(cfg.min) : undefined,
    max: cfg.max !== '' && !isCategory ? Number(cfg.max) : undefined,
    data: categories,
    axisLine: {
      show: !theme.hideAxisLine,
      lineStyle: { color: theme.axisColor, width: 1 },
    },
    axisTick: {
      show: !theme.hideAxisLine,
      inside: cfg.tickInside,
      lineStyle: { color: theme.axisColor },
    },
    axisLabel: {
      ...fontStyle,
      rotate,
      formatter: isCategory ? undefined : tickFormatter(cfg.tickFormat),
    },
    splitLine: {
      show: cfg.showGrid,
      lineStyle: { color: theme.gridColor, type: theme.gridType },
    },
  };
}

function hexOpacity(color: string, opacity: number): string {
  if (opacity >= 1 || !color.startsWith('#') || color.length !== 7) return color;
  const alpha = Math.round(opacity * 255)
    .toString(16)
    .padStart(2, '0');
  return color + alpha;
}

export function buildChartOption(chart: ChartConfig, datasets: Dataset[]): EChartsOption {
  const { style } = chart;
  const theme = getTheme(style.theme);
  const palette = getPalette(style.palette);
  const fontStyle = {
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    color: theme.textColor,
  };

  const hasSubtitle = chart.subtitle !== '';
  const titleBlock = chart.title || hasSubtitle
    ? {
        text: chart.title,
        subtext: chart.subtitle,
        left: 'center' as const,
        textStyle: { ...fontStyle, fontSize: style.titleSize, fontWeight: 'bold' as const },
        subtextStyle: { ...fontStyle, fontSize: style.fontSize, color: theme.axisColor },
      }
    : undefined;

  const legendTop = style.legendPosition === 'top';
  const topOffset =
    (chart.title ? style.titleSize + 14 : 0) +
    (hasSubtitle ? style.fontSize + 8 : 0);

  const base: EChartsOption = {
    animation: false,
    backgroundColor: theme.background,
    color: palette,
    textStyle: { fontFamily: style.fontFamily, color: theme.textColor },
    title: titleBlock,
    tooltip: { trigger: 'item', confine: true },
    grid: {
      left: 12,
      right: chart.series.some((s) => s.y2)
        ? 55
        : style.legendPosition === 'right'
          ? 110
          : 20,
      top: Math.max(28, topOffset + (legendTop && style.showLegend ? 28 : 8)),
      bottom:
        style.showLegend && style.legendPosition === 'bottom'
          ? 58
          : chart.xAxis.label
            ? 48
            : 36,
      containLabel: true,
    },
  };

  const legend = style.showLegend
    ? {
        show: true,
        textStyle: fontStyle,
        itemWidth: 16,
        itemHeight: 9,
        top: legendTop
          ? topOffset + 2
          : style.legendPosition === 'insideTopLeft' || style.legendPosition === 'insideTopRight'
            ? topOffset + 14
            : undefined,
        bottom: style.legendPosition === 'bottom' ? 4 : undefined,
        right:
          style.legendPosition === 'right' || style.legendPosition === 'insideTopRight'
            ? 8
            : undefined,
        left:
          style.legendPosition === 'insideTopLeft'
            ? 60
            : style.legendPosition === 'right' || style.legendPosition === 'insideTopRight'
              ? undefined
              : 'center',
        orient:
          style.legendPosition === 'right' ? ('vertical' as const) : ('horizontal' as const),
        backgroundColor:
          style.legendPosition === 'insideTopLeft' || style.legendPosition === 'insideTopRight'
            ? hexOpacity(theme.background, 0.7)
            : 'transparent',
        borderRadius: 3,
        padding: [4, 8] as [number, number],
      }
    : { show: false };

  switch (chart.type) {
    case 'line':
    case 'area':
    case 'scatter':
    case 'bar':
    case 'barh':
      return buildXY(chart, datasets, base, legend, palette, theme);
    case 'pie':
      return buildPie(chart, datasets, base, legend, palette, theme);
    case 'box':
      return buildBox(chart, datasets, base, palette, theme);
    case 'violin':
      return buildViolin(chart, datasets, base, palette, theme);
    case 'histogram':
      return buildHistogram(chart, datasets, base, legend, palette, theme);
    case 'density':
      return buildDensity(chart, datasets, base, legend, theme);
    case 'heatmap':
      return buildHeatmap(chart, datasets, base, false, theme);
    case 'correlation':
      return buildHeatmap(chart, datasets, base, true, theme);
    case 'radar':
      return buildRadar(chart, datasets, base, legend, theme);
    case 'polar':
      return buildPolar(chart, datasets, base, legend, theme);
    default:
      return base;
  }
}

// ---------------------------------------------------------------- XY family

function buildXY(
  chart: ChartConfig,
  datasets: Dataset[],
  base: EChartsOption,
  legend: object,
  palette: string[],
  theme: ChartTheme,
): EChartsOption {
  const { style } = chart;
  const resolved = chart.series.flatMap((m) => resolveSeries(m, datasets));
  const isBar = chart.type === 'bar' || chart.type === 'barh';
  const horizontal = chart.type === 'barh';
  const hasStringX = resolved.some((s) => s.points.some((p) => typeof p.x === 'string'));
  const categoryX = isBar || hasStringX;

  let categories: string[] | undefined;
  if (categoryX) {
    const set = new Set<string>();
    resolved.forEach((s) => s.points.forEach((p) => set.add(String(p.x))));
    categories = [...set];
  }

  // percent-stack normalization: compute per-category totals
  const usePercent = isBar && style.stack && style.percentStack && categoryX;
  const totals = new Map<string, number>();
  if (usePercent) {
    resolved.forEach((s) =>
      s.points.forEach((p) => {
        const k = String(p.x);
        totals.set(k, (totals.get(k) ?? 0) + Math.abs(p.y));
      }),
    );
  }

  const series: SeriesOption[] = [];
  const labelOpt = style.showDataLabels
    ? {
        show: true,
        position: horizontal ? ('right' as const) : ('top' as const),
        fontSize: Math.max(8, style.fontSize - 1),
        fontFamily: style.fontFamily,
        color: theme.textColor,
        formatter: usePercent ? '{@[1]}%' : undefined,
      }
    : { show: false };

  resolved.forEach((s, i) => {
    const m = s.mapping;
    const color = m.color || palette[i % palette.length];
    const fillColor = hexOpacity(color, m.opacity);
    const yAxisIndex = m.y2 ? 1 : 0;
    const symbol = m.symbol || (style.showSymbols ? 'circle' : 'none');

    const catValue = (p: XYPoint | undefined): number | null => {
      if (!p) return null;
      if (!usePercent) return p.y;
      const t = totals.get(String(p.x)) ?? 0;
      return t === 0 ? 0 : +((p.y / t) * 100).toFixed(2);
    };

    const data = categoryX
      ? categories!.map((c) => catValue(s.points.find((pt) => String(pt.x) === c)))
      : s.points.map((p) => [p.x as number, p.y, p.ri]);

    if (isBar) {
      series.push({
        type: 'bar',
        name: s.name,
        data: horizontal
          ? (data as (number | null)[]).map((v) => v) // same values; axes swapped below
          : data,
        yAxisIndex: horizontal ? undefined : yAxisIndex,
        stack: style.stack ? 'total' : undefined,
        barGap: `${style.barGap}%`,
        itemStyle: {
          color: fillColor,
          borderRadius: style.barBorderRadius
            ? horizontal
              ? [0, style.barBorderRadius, style.barBorderRadius, 0]
              : [style.barBorderRadius, style.barBorderRadius, 0, 0]
            : 0,
        },
        label: labelOpt,
      });
    } else if (chart.type === 'scatter') {
      const hasSize = s.points.some((p) => p.size !== undefined);
      const sizes = s.points.map((p) => p.size ?? 0);
      const smin = Math.min(...sizes);
      const smax = Math.max(...sizes);
      series.push({
        id: categoryX ? undefined : s.sid,
        type: 'scatter',
        name: s.name,
        data: categoryX ? data : s.points.map((p) => [p.x as number, p.y, p.ri, p.size ?? 0]),
        yAxisIndex,
        symbol: symbol === 'none' ? 'circle' : symbol,
        symbolSize: hasSize
          ? (v: number[]) => {
              const t = smax === smin ? 0.5 : (v[3] - smin) / (smax - smin);
              return style.symbolSize * (0.6 + t * 2.2);
            }
          : style.symbolSize,
        itemStyle: { color: fillColor },
        label: labelOpt,
      });
    } else {
      series.push({
        id: categoryX ? undefined : s.sid,
        type: 'line',
        name: s.name,
        data,
        yAxisIndex,
        smooth: style.smooth && !style.step,
        step: style.step ? ('middle' as const) : undefined,
        symbol,
        symbolSize: style.symbolSize,
        lineStyle: { width: style.lineWidth, color, type: LINE_TYPE[m.lineStyle] },
        itemStyle: { color },
        areaStyle:
          chart.type === 'area' ? { opacity: 0.25 * m.opacity, color } : undefined,
        stack: chart.type === 'area' && style.stack ? 'total' : undefined,
        label: labelOpt,
        connectNulls: true,
      });
    }

    // ---- error display: bars or shaded band ----
    if (!horizontal) {
      const withErr = s.points.filter((p) => p.err !== undefined);
      if (withErr.length > 0) {
        if (m.errorDisplay === 'band' && !categoryX && !isBar) {
          const sorted = [...withErr].sort((a, b) => (a.x as number) - (b.x as number));
          series.push(
            {
              type: 'line',
              name: `__band_lo_${s.sid}`,
              data: sorted.map((p) => [p.x as number, p.y - p.err!]),
              symbol: 'none',
              lineStyle: { width: 0 },
              stack: `__band_${s.sid}`,
              silent: true,
              tooltip: { show: false },
              z: 1,
            } as SeriesOption,
            {
              type: 'line',
              name: `__band_hi_${s.sid}`,
              data: sorted.map((p) => [p.x as number, 2 * p.err!]),
              symbol: 'none',
              lineStyle: { width: 0 },
              areaStyle: { color, opacity: 0.18 },
              stack: `__band_${s.sid}`,
              silent: true,
              tooltip: { show: false },
              z: 1,
            } as SeriesOption,
          );
        } else {
          const errData: [number | string, number, number][] = withErr.map((p) => [
            categoryX ? String(p.x) : (p.x as number),
            p.y - p.err!,
            p.y + p.err!,
          ]);
          series.push(errorBarSeries(errData, color, yAxisIndex, categoryX, style.lineWidth));
        }
      }
    }

    // ---- trendline ----
    if (m.trendline !== 'none' && !categoryX && !isBar) {
      const numeric = s.points
        .filter((p) => typeof p.x === 'number')
        .sort((a, b) => (a.x as number) - (b.x as number));
      if (numeric.length >= 3) {
        const xs = numeric.map((p) => p.x as number);
        const ys = numeric.map((p) => p.y);
        if (m.trendline === 'linear') {
          const fit = linearRegression(xs, ys);
          if (fit) {
            const x0 = xs[0];
            const x1 = xs[xs.length - 1];
            series.push({
              type: 'line',
              name: `${s.name} fit`,
              data: [
                [x0, fit.slope * x0 + fit.intercept],
                [x1, fit.slope * x1 + fit.intercept],
              ],
              symbol: 'none',
              lineStyle: { width: style.lineWidth, color, type: 'dashed' },
              silent: true,
              tooltip: { show: false },
              z: 4,
              endLabel: {
                show: true,
                formatter: `R²=${fit.r2.toFixed(3)}`,
                fontSize: Math.max(8, style.fontSize - 2),
                fontFamily: style.fontFamily,
                color,
              },
            } as SeriesOption);
          }
        } else {
          const ma = movingAverage(ys, Math.max(3, Math.round(ys.length / 5)));
          series.push({
            type: 'line',
            name: `${s.name} MA`,
            data: xs.map((x, k) => [x, ma[k]]),
            symbol: 'none',
            smooth: true,
            lineStyle: { width: style.lineWidth + 0.5, color, type: 'dashed' },
            silent: true,
            tooltip: { show: false },
            z: 4,
          } as SeriesOption);
        }
      }
    }
  });

  const valueAxis = [axisOption(chart.yAxis, chart, theme, false)];
  if (chart.series.some((s) => s.y2) && !horizontal) {
    valueAxis.push({
      ...axisOption(chart.y2Axis, chart, theme, false),
      splitLine: { show: false, lineStyle: { color: theme.gridColor, type: theme.gridType } },
    });
  }
  if (usePercent) {
    valueAxis[0] = {
      ...valueAxis[0],
      max: 100 as never,
      axisLabel: { ...valueAxis[0].axisLabel, formatter: (v: number) => `${v}%` },
    } as never;
  }

  const catAxis = axisOption(chart.xAxis, chart, theme, categoryX, categories);

  return {
    ...base,
    legend,
    xAxis: (horizontal ? valueAxis[0] : catAxis) as never,
    yAxis: (horizontal ? catAxis : valueAxis) as never,
    series,
    tooltip: {
      trigger: categoryX ? 'axis' : 'item',
      confine: true,
      axisPointer: { type: isBar ? ('shadow' as const) : ('line' as const) },
    },
  };
}

function errorBarSeries(
  data: [number | string, number, number][],
  color: string,
  yAxisIndex: number,
  onCategory: boolean,
  lineWidth: number,
): SeriesOption {
  return {
    type: 'custom',
    name: '__err__',
    silent: true,
    yAxisIndex,
    z: 5,
    renderItem: (_params: unknown, api: RenderApi) => {
      const lo = api.coord([api.value(0), api.value(1)]);
      const hi = api.coord([api.value(0), api.value(2)]);
      const halfW = onCategory ? Math.min(8, api.size([1, 0])[0] * 0.12) : 5;
      const style = { stroke: color, fill: undefined as undefined, lineWidth: Math.max(1, lineWidth * 0.8) };
      return {
        type: 'group',
        children: [
          { type: 'line', shape: { x1: lo[0], y1: lo[1], x2: hi[0], y2: hi[1] }, style },
          { type: 'line', shape: { x1: lo[0] - halfW, y1: lo[1], x2: lo[0] + halfW, y2: lo[1] }, style },
          { type: 'line', shape: { x1: hi[0] - halfW, y1: hi[1], x2: hi[0] + halfW, y2: hi[1] }, style },
        ],
      };
    },
    data,
  } as SeriesOption;
}

// ---------------------------------------------------------------- pie

function buildPie(
  chart: ChartConfig,
  datasets: Dataset[],
  base: EChartsOption,
  legend: object,
  palette: string[],
  theme: ChartTheme,
): EChartsOption {
  const { style } = chart;
  const mapping = chart.series[0];
  if (!mapping) return { ...base, legend };
  const ds = datasets.find((d) => d.id === mapping.datasetId);
  if (!ds) return { ...base, legend };

  // label column: groupCol if set, else xCol; value column: yCol
  const labelCol = mapping.groupCol >= 0 ? mapping.groupCol : mapping.xCol;
  const agg = new Map<string, number>();
  ds.rows.forEach((r, i) => {
    const v = r[mapping.yCol];
    if (typeof v !== 'number') return;
    const label = labelCol >= 0 ? String(r[labelCol] ?? `Item ${i + 1}`) : `Item ${i + 1}`;
    agg.set(label, (agg.get(label) ?? 0) + v);
  });

  const inner = style.pieDonut > 0 ? `${Math.round(style.pieDonut * 70)}%` : '0%';
  return {
    ...base,
    legend,
    series: [
      {
        type: 'pie',
        radius: [inner, '68%'],
        center: ['50%', '55%'],
        data: [...agg.entries()].map(([name, value], i) => ({
          name,
          value,
          itemStyle: { color: palette[i % palette.length] },
        })),
        label: {
          show: style.pieShowLabels,
          formatter: '{b}\n{d}%',
          fontSize: style.fontSize,
          fontFamily: style.fontFamily,
          color: theme.textColor,
        },
        labelLine: { show: style.pieShowLabels },
        itemStyle: {
          borderColor: theme.background,
          borderWidth: 1.5,
        },
        emphasis: {
          itemStyle: { shadowBlur: 8, shadowColor: 'rgba(0,0,0,0.25)' },
        },
      },
    ],
    tooltip: { trigger: 'item', confine: true, formatter: '{b}: {c} ({d}%)' },
  };
}

// ---------------------------------------------------------------- box / violin

/** Jittered raw data points over box/violin categories. */
function rawPointsSeries(
  groups: { name: string; values: number[] }[],
  symbolSize: number,
  theme: ChartTheme,
): SeriesOption {
  const pts: [number, number][] = [];
  groups.forEach((g, gi) => {
    g.values.forEach((v, k) => pts.push([gi + jitter(gi * 1000 + k) * 0.18, v]));
  });
  return {
    type: 'scatter',
    data: pts,
    symbolSize: Math.max(3, symbolSize * 0.55),
    itemStyle: {
      color: 'transparent',
      borderColor: theme.textColor,
      borderWidth: 0.8,
      opacity: 0.5,
    },
    silent: true,
    z: 4,
  } as SeriesOption;
}

function buildBox(
  chart: ChartConfig,
  datasets: Dataset[],
  base: EChartsOption,
  palette: string[],
  theme: ChartTheme,
): EChartsOption {
  const groups = chart.series.flatMap((m) => groupedValues(m, datasets));
  const categories = groups.map((g) => g.name);
  const boxData = groups.map((g, i) => {
    const s = boxStats(g.values);
    return {
      value: [s.low, s.q1, s.median, s.q3, s.high],
      itemStyle: {
        color: hexOpacity(palette[i % palette.length], 0.35),
        borderColor: palette[i % palette.length],
        borderWidth: chart.style.lineWidth,
      },
    };
  });
  const outliers: [number, number][] = [];
  groups.forEach((g, i) => boxStats(g.values).outliers.forEach((v) => outliers.push([i, v])));

  const series: SeriesOption[] = [
    { type: 'boxplot', data: boxData, boxWidth: ['25%', '55%'] },
  ];
  if (chart.style.boxShowPoints) {
    series.push(rawPointsSeries(groups, chart.style.symbolSize, theme));
  } else if (outliers.length) {
    series.push({
      type: 'scatter',
      data: outliers,
      symbolSize: chart.style.symbolSize * 0.8,
      itemStyle: { color: 'transparent', borderColor: theme.axisColor, borderWidth: 1 },
    });
  }

  return {
    ...base,
    legend: { show: false },
    xAxis: axisOption(chart.xAxis, chart, theme, true, categories) as never,
    yAxis: axisOption(chart.yAxis, chart, theme, false) as never,
    series,
    tooltip: { trigger: 'item', confine: true },
  };
}

function buildViolin(
  chart: ChartConfig,
  datasets: Dataset[],
  base: EChartsOption,
  palette: string[],
  theme: ChartTheme,
): EChartsOption {
  const groups = chart.series.flatMap((m) => groupedValues(m, datasets));
  const categories = groups.map((g) => g.name);

  const violinData = groups.map((g, gi) => {
    if (g.values.length < 2)
      return { gi, ys: [] as number[], ds: [] as number[], color: palette[gi % palette.length] };
    const min = Math.min(...g.values);
    const max = Math.max(...g.values);
    const pad = (max - min) * 0.15 || 1;
    const ys = linspace(min - pad, max + pad, 60);
    const ds = kde(g.values, ys);
    const dmax = Math.max(...ds) || 1;
    return { gi, ys, ds: ds.map((d) => d / dmax), color: palette[gi % palette.length] };
  });

  // median + quartile markers
  const medians: [number, number][] = [];
  const quartiles: { gi: number; q1: number; q3: number }[] = [];
  groups.forEach((g, gi) => {
    if (!g.values.length) return;
    const st = boxStats(g.values);
    medians.push([gi, st.median]);
    quartiles.push({ gi, q1: st.q1, q3: st.q3 });
  });

  const series: SeriesOption[] = [
    {
      type: 'custom',
      renderItem: (params: { dataIndex: number }, api: RenderApi) => {
        const item = violinData[params.dataIndex];
        if (item.ys.length === 0) return { type: 'group', children: [] };
        const halfBand = api.size([1, 0])[0] * 0.38;
        const right: number[][] = [];
        const left: number[][] = [];
        for (let i = 0; i < item.ys.length; i++) {
          const c = api.coord([item.gi, item.ys[i]]);
          right.push([c[0] + item.ds[i] * halfBand, c[1]]);
          left.push([c[0] - item.ds[i] * halfBand, c[1]]);
        }
        const points = [...right, ...left.reverse()];
        return {
          type: 'polygon',
          shape: { points, smooth: 0.2 },
          style: {
            fill: hexOpacity(item.color, 0.4),
            stroke: item.color,
            lineWidth: chart.style.lineWidth,
          },
        };
      },
      data: violinData.map((v) => [v.gi, 0]),
      z: 2,
    } as SeriesOption,
    // inner quartile sticks
    {
      type: 'custom',
      silent: true,
      renderItem: (params: { dataIndex: number }, api: RenderApi) => {
        const q = quartiles[params.dataIndex];
        if (!q) return { type: 'group', children: [] };
        const p1 = api.coord([q.gi, q.q1]);
        const p3 = api.coord([q.gi, q.q3]);
        return {
          type: 'line',
          shape: { x1: p1[0], y1: p1[1], x2: p3[0], y2: p3[1] },
          style: { stroke: theme.textColor, lineWidth: 3, lineCap: 'round' },
        };
      },
      data: quartiles.map((q) => [q.gi, 0]),
      z: 3,
    } as SeriesOption,
    {
      type: 'scatter',
      data: medians,
      symbolSize: chart.style.symbolSize * 0.9,
      itemStyle: { color: theme.background, borderColor: theme.textColor, borderWidth: 1.5 },
      silent: true,
      z: 4,
    },
  ];
  if (chart.style.boxShowPoints) {
    series.push(rawPointsSeries(groups, chart.style.symbolSize, theme));
  }

  return {
    ...base,
    legend: { show: false },
    xAxis: axisOption(chart.xAxis, chart, theme, true, categories) as never,
    yAxis: axisOption(chart.yAxis, chart, theme, false) as never,
    series,
    tooltip: { show: false },
  };
}

// ---------------------------------------------------------------- histogram / density

function buildHistogram(
  chart: ChartConfig,
  datasets: Dataset[],
  base: EChartsOption,
  legend: object,
  palette: string[],
  theme: ChartTheme,
): EChartsOption {
  const series: SeriesOption[] = [];
  const resolved = chart.series.flatMap((m) => groupedValues(m, datasets));
  resolved.forEach((g, i) => {
    if (!g.values.length) return;
    const bins = histogram(g.values, chart.style.histogramBins);
    const color = palette[i % palette.length];
    series.push({
      type: 'custom',
      name: g.name,
      renderItem: (_params: unknown, api: RenderApi) => {
        const x0 = api.value(0);
        const x1 = api.value(1);
        const c = api.value(2);
        const p0 = api.coord([x0, c]);
        const p1 = api.coord([x1, 0]);
        return {
          type: 'rect',
          shape: { x: p0[0], y: p0[1], width: p1[0] - p0[0], height: p1[1] - p0[1] },
          style: {
            fill: hexOpacity(color, resolved.length > 1 ? 0.6 : 0.8),
            stroke: color,
            lineWidth: 1,
          },
        };
      },
      data: bins.map((b) => [b.x0, b.x1, b.count]),
      z: 2,
    } as SeriesOption);

    // KDE overlay curve scaled to counts
    const min = Math.min(...g.values);
    const max = Math.max(...g.values);
    const pad = (max - min) * 0.05 || 1;
    const xs = linspace(min - pad, max + pad, 100);
    const dens = kde(g.values, xs);
    const binWidth = bins.length ? bins[0].x1 - bins[0].x0 : 1;
    const scale = g.values.length * binWidth;
    series.push({
      type: 'line',
      name: `${g.name} KDE`,
      data: xs.map((x, k) => [x, dens[k] * scale]),
      symbol: 'none',
      smooth: true,
      lineStyle: { width: chart.style.lineWidth, color, type: 'solid' },
      silent: true,
      tooltip: { show: false },
      z: 3,
    } as SeriesOption);
  });
  return {
    ...base,
    legend,
    xAxis: axisOption(chart.xAxis, chart, theme, false) as never,
    yAxis: axisOption(chart.yAxis, chart, theme, false) as never,
    series,
    tooltip: { show: false },
  };
}

function buildDensity(
  chart: ChartConfig,
  datasets: Dataset[],
  base: EChartsOption,
  legend: object,
  theme: ChartTheme,
): EChartsOption {
  const resolved = chart.series.flatMap((m) => groupedValues(m, datasets));
  const series: SeriesOption[] = resolved.map((g) => {
    if (g.values.length < 2) return { type: 'line', name: g.name, data: [] };
    const min = Math.min(...g.values);
    const max = Math.max(...g.values);
    const pad = (max - min) * 0.25 || 1;
    const xs = linspace(min - pad, max + pad, 120);
    const ds = kde(g.values, xs);
    return {
      type: 'line',
      name: g.name,
      data: xs.map((x, i) => [x, ds[i]]),
      smooth: true,
      symbol: 'none',
      lineStyle: { width: chart.style.lineWidth },
      areaStyle: { opacity: 0.2 },
    };
  });
  return {
    ...base,
    legend,
    xAxis: axisOption(chart.xAxis, chart, theme, false) as never,
    yAxis: axisOption(chart.yAxis, chart, theme, false) as never,
    series,
  };
}

// ---------------------------------------------------------------- heatmap / correlation

function buildHeatmap(
  chart: ChartConfig,
  datasets: Dataset[],
  base: EChartsOption,
  isCorrelation: boolean,
  theme: ChartTheme,
): EChartsOption {
  const mapping = chart.series[0];
  const ds = mapping ? datasets.find((d) => d.id === mapping.datasetId) : undefined;
  if (!ds) return base;
  const numCols = numericColumnIndices(ds);
  if (numCols.length === 0) return base;

  let xCats: string[];
  let yCats: string[];
  let data: [number, number, number][];
  let vmin: number;
  let vmax: number;

  if (isCorrelation) {
    const cols = numCols.map((i) => ({
      name: ds.columns[i],
      values: ds.rows.map((r) => (typeof r[i] === 'number' ? (r[i] as number) : NaN)),
    }));
    xCats = cols.map((c) => c.name);
    yCats = [...xCats];
    data = [];
    for (let i = 0; i < cols.length; i++) {
      for (let j = 0; j < cols.length; j++) {
        const pairs = cols[i].values
          .map((v, k) => [v, cols[j].values[k]])
          .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b));
        const r = pearson(
          pairs.map((p) => p[0]),
          pairs.map((p) => p[1]),
        );
        data.push([i, j, +r.toFixed(3)]);
      }
    }
    vmin = -1;
    vmax = 1;
  } else {
    const labelCol = ds.columns.findIndex((_, i) => !numCols.includes(i));
    yCats = ds.rows.map((r, ri) => (labelCol >= 0 ? String(r[labelCol] ?? ri + 1) : `R${ri + 1}`));
    xCats = numCols.map((i) => ds.columns[i]);
    data = [];
    const all: number[] = [];
    ds.rows.forEach((r, ri) => {
      numCols.forEach((ci, xi) => {
        const v = r[ci];
        if (typeof v === 'number') {
          data.push([xi, ri, v]);
          all.push(v);
        }
      });
    });
    if (all.length === 0) return base;
    vmin = Math.min(...all);
    vmax = Math.max(...all);
  }

  const fontStyle = {
    fontFamily: chart.style.fontFamily,
    fontSize: chart.style.fontSize,
    color: theme.textColor,
  };

  return {
    ...base,
    grid: { left: 12, right: 80, top: chart.title ? 50 : 25, bottom: 45, containLabel: true },
    xAxis: {
      type: 'category',
      data: xCats,
      axisLabel: { ...fontStyle, rotate: xCats.length > 8 ? 45 : 0 },
      axisTick: { show: false },
      axisLine: { show: false },
      name: chart.xAxis.label,
      nameLocation: 'middle',
      nameGap: 32,
      nameTextStyle: fontStyle,
    },
    yAxis: {
      type: 'category',
      data: yCats,
      inverse: true,
      axisLabel: fontStyle,
      axisTick: { show: false },
      axisLine: { show: false },
      name: chart.yAxis.label,
      nameLocation: 'middle',
      nameGap: 70,
      nameTextStyle: fontStyle,
    },
    visualMap: {
      min: vmin,
      max: vmax,
      calculable: false,
      orient: 'vertical',
      right: 5,
      top: 'center',
      itemHeight: 120,
      textStyle: { ...fontStyle, fontSize: Math.max(8, chart.style.fontSize - 1) },
      inRange: { color: isCorrelation ? DIVERGING_RAMP : HEATMAP_RAMP },
    },
    series: [
      {
        type: 'heatmap',
        data,
        label: {
          show: chart.style.showDataLabels || (isCorrelation && xCats.length <= 10),
          fontSize: Math.max(8, chart.style.fontSize - 2),
          fontFamily: chart.style.fontFamily,
        },
        itemStyle: { borderColor: theme.background, borderWidth: 1 },
      },
    ],
    legend: { show: false },
    tooltip: { trigger: 'item', confine: true },
  };
}

// ---------------------------------------------------------------- radar / polar

function buildRadar(
  chart: ChartConfig,
  datasets: Dataset[],
  base: EChartsOption,
  legend: object,
  theme: ChartTheme,
): EChartsOption {
  const mapping = chart.series[0];
  const ds = mapping ? datasets.find((d) => d.id === mapping.datasetId) : undefined;
  if (!ds) return base;
  const numCols = numericColumnIndices(ds);
  if (numCols.length < 3) return base;
  const labelCol = ds.columns.findIndex((_, i) => !numCols.includes(i));
  const indicators = numCols.map((i) => {
    const vals = numericColumn(ds, i);
    return { name: ds.columns[i], max: vals.length ? Math.max(...vals) * 1.1 : 1 };
  });
  const rows = ds.rows.slice(0, 8);
  const fontStyle = {
    fontFamily: chart.style.fontFamily,
    fontSize: chart.style.fontSize,
    color: theme.textColor,
  };
  return {
    ...base,
    legend,
    radar: {
      indicator: indicators,
      center: ['50%', '55%'],
      radius: '62%',
      axisName: fontStyle,
      splitLine: { lineStyle: { color: theme.gridColor } },
      splitArea: { show: false },
      axisLine: { lineStyle: { color: theme.gridColor } },
    },
    series: [
      {
        type: 'radar',
        data: rows.map((r, ri) => ({
          name: labelCol >= 0 ? String(r[labelCol] ?? `R${ri + 1}`) : `R${ri + 1}`,
          value: numCols.map((ci) => (typeof r[ci] === 'number' ? (r[ci] as number) : 0)),
          lineStyle: { width: chart.style.lineWidth },
          areaStyle: { opacity: 0.12 },
        })),
        symbolSize: chart.style.showSymbols ? chart.style.symbolSize * 0.7 : 0,
      },
    ],
  };
}

function buildPolar(
  chart: ChartConfig,
  datasets: Dataset[],
  base: EChartsOption,
  legend: object,
  theme: ChartTheme,
): EChartsOption {
  const resolved = chart.series.flatMap((m) => resolveSeries(m, datasets));
  const fontStyle = {
    fontFamily: chart.style.fontFamily,
    fontSize: chart.style.fontSize,
    color: theme.textColor,
  };
  // auto angle range from data
  const xsAll = resolved.flatMap((s) =>
    s.points.map((p) => (typeof p.x === 'number' ? p.x : 0)),
  );
  const angleMax = xsAll.length && Math.max(...xsAll) <= 360 ? 360 : undefined;
  return {
    ...base,
    legend,
    polar: { radius: '68%', center: ['50%', '55%'] },
    angleAxis: {
      type: 'value',
      min: 0,
      max: angleMax,
      axisLabel: fontStyle,
      splitLine: { lineStyle: { color: theme.gridColor } },
      axisLine: { lineStyle: { color: theme.axisColor } },
    },
    radiusAxis: {
      axisLabel: fontStyle,
      splitLine: { lineStyle: { color: theme.gridColor, type: theme.gridType } },
      axisLine: { show: false },
    },
    series: resolved.map((s, i) => ({
      type: 'line',
      name: s.name,
      coordinateSystem: 'polar',
      data: s.points.map((p) => [p.y, typeof p.x === 'number' ? p.x : 0]),
      smooth: chart.style.smooth,
      symbol: chart.style.showSymbols ? 'circle' : 'none',
      symbolSize: chart.style.symbolSize,
      lineStyle: {
        width: chart.style.lineWidth,
        color: s.mapping.color || undefined,
        type: LINE_TYPE[s.mapping.lineStyle],
      },
      itemStyle: s.mapping.color ? { color: s.mapping.color } : undefined,
      z: 2 + i,
    })),
  };
}
