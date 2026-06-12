import type { EChartsOption, SeriesOption } from 'echarts';
import type {
  AxisConfig,
  ChartConfig,
  Dataset,
  SeriesMapping,
} from '../types';
import { getPalette, HEATMAP_RAMP, DIVERGING_RAMP } from './palettes';
import { boxStats, histogram, kde, linspace, pearson } from './stats';
import { numericColumn, numericColumnIndices } from './parse';

const TEXT_COLOR = '#1a1d23';
const AXIS_COLOR = '#1a1d23';

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
  /** original row index in the dataset — used for drag-editing */
  ri: number;
}

interface ResolvedSeries {
  /** stable id: `m:<mappingId>` or `m:<mappingId>:<group>` */
  sid: string;
  name: string;
  points: XYPoint[];
  y2: boolean;
  color?: string;
}

function resolveSeries(mapping: SeriesMapping, datasets: Dataset[]): ResolvedSeries[] {
  const ds = datasets.find((d) => d.id === mapping.datasetId);
  if (!ds) return [];
  const indexed = ds.rows
    .map((r, idx) => ({ r, idx }))
    .filter(({ r }) => r[mapping.yCol] !== null);
  const mk = (rs: typeof indexed, name: string, sid: string): ResolvedSeries => ({
    sid,
    name,
    y2: mapping.y2,
    color: mapping.color,
    points: rs
      .map(({ r, idx }) => {
        const rawX = mapping.xCol >= 0 ? r[mapping.xCol] : null;
        const y = r[mapping.yCol];
        if (typeof y !== 'number') return null;
        const p: XYPoint = { x: rawX === null ? '' : (rawX as number | string), y, ri: idx };
        if (mapping.errCol >= 0 && typeof r[mapping.errCol] === 'number') {
          p.err = r[mapping.errCol] as number;
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

/** Values grouped by category — used by box / violin. */
function groupedValues(mapping: SeriesMapping, datasets: Dataset[]): { name: string; values: number[] }[] {
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
  return [{ name: mapping.name || ds.columns[mapping.yCol], values: numericColumn(ds, mapping.yCol) }];
}

function axisOption(cfg: AxisConfig, chart: ChartConfig, isCategory: boolean, categories?: string[]) {
  const fontStyle = {
    fontFamily: chart.style.fontFamily,
    fontSize: chart.style.fontSize,
    color: TEXT_COLOR,
  };
  return {
    type: isCategory ? ('category' as const) : cfg.scale === 'log' ? ('log' as const) : ('value' as const),
    name: cfg.label,
    nameLocation: 'middle' as const,
    nameGap: isCategory ? 28 : 35,
    nameTextStyle: { ...fontStyle, fontSize: chart.style.fontSize + 1 },
    min: cfg.min !== '' && !isCategory ? Number(cfg.min) : undefined,
    max: cfg.max !== '' && !isCategory ? Number(cfg.max) : undefined,
    data: categories,
    axisLine: { show: true, lineStyle: { color: AXIS_COLOR, width: 1 } },
    axisTick: { show: true, inside: cfg.tickInside, lineStyle: { color: AXIS_COLOR } },
    axisLabel: { ...fontStyle },
    splitLine: { show: cfg.showGrid, lineStyle: { color: '#e0e0e0', type: 'dashed' as const } },
  };
}

function errorBarSeries(
  data: [number | string, number, number][],
  color: string,
  yAxisIndex: number,
  onCategory: boolean,
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
      const style = { stroke: color, fill: undefined as undefined, lineWidth: 1.2 };
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

export function buildChartOption(chart: ChartConfig, datasets: Dataset[]): EChartsOption {
  const { style } = chart;
  const palette = getPalette(style.palette);
  const fontStyle = { fontFamily: style.fontFamily, fontSize: style.fontSize, color: TEXT_COLOR };

  const base: EChartsOption = {
    animation: false,
    backgroundColor: '#ffffff',
    color: palette,
    textStyle: { fontFamily: style.fontFamily, color: TEXT_COLOR },
    title: chart.title
      ? {
          text: chart.title,
          left: 'center',
          textStyle: { ...fontStyle, fontSize: style.fontSize + 3, fontWeight: 'bold' },
        }
      : undefined,
    tooltip: { trigger: 'item', confine: true },
    grid: {
      left: 50,
      right: chart.series.some((s) => s.y2) ? 55 : 25,
      top: chart.title ? 45 : 25,
      bottom: style.showLegend && style.legendPosition === 'bottom' ? 60 : 45,
      containLabel: false,
    },
  };

  const legend = style.showLegend
    ? {
        show: true,
        textStyle: fontStyle,
        itemWidth: 16,
        itemHeight: 9,
        top: style.legendPosition === 'top' ? (chart.title ? 24 : 4) : undefined,
        bottom: style.legendPosition === 'bottom' ? 4 : undefined,
        right: style.legendPosition === 'right' ? 4 : undefined,
        left: style.legendPosition === 'right' ? undefined : 'center',
        orient: style.legendPosition === 'right' ? ('vertical' as const) : ('horizontal' as const),
      }
    : { show: false };

  switch (chart.type) {
    case 'line':
    case 'area':
    case 'scatter':
    case 'bar':
      return buildXY(chart, datasets, base, legend, palette);
    case 'box':
      return buildBox(chart, datasets, base, legend, palette);
    case 'violin':
      return buildViolin(chart, datasets, base, legend, palette);
    case 'histogram':
      return buildHistogram(chart, datasets, base, legend, palette);
    case 'density':
      return buildDensity(chart, datasets, base, legend);
    case 'heatmap':
      return buildHeatmap(chart, datasets, base, false);
    case 'correlation':
      return buildHeatmap(chart, datasets, base, true);
    case 'radar':
      return buildRadar(chart, datasets, base, legend);
    case 'polar':
      return buildPolar(chart, datasets, base, legend);
    default:
      return base;
  }
}

function buildXY(
  chart: ChartConfig,
  datasets: Dataset[],
  base: EChartsOption,
  legend: object,
  palette: string[],
): EChartsOption {
  const { style } = chart;
  const resolved = chart.series.flatMap((m) => resolveSeries(m, datasets));
  const isBar = chart.type === 'bar';
  // Category x-axis whenever any x value is non-numeric, or bar chart
  const hasStringX = resolved.some((s) => s.points.some((p) => typeof p.x === 'string'));
  const categoryX = isBar || hasStringX;
  let categories: string[] | undefined;
  if (categoryX) {
    const set = new Set<string>();
    resolved.forEach((s) => s.points.forEach((p) => set.add(String(p.x))));
    categories = [...set];
  }

  const series: SeriesOption[] = [];
  resolved.forEach((s, i) => {
    const color = s.color ?? palette[i % palette.length];
    const yAxisIndex = s.y2 ? 1 : 0;
    const data = categoryX
      ? categories!.map((c) => {
          const p = s.points.find((pt) => String(pt.x) === c);
          return p ? p.y : null;
        })
      : s.points.map((p) => [p.x as number, p.y, p.ri]);

    if (isBar) {
      series.push({
        type: 'bar',
        name: s.name,
        data,
        yAxisIndex,
        stack: style.stack ? 'total' : undefined,
        barGap: `${style.barGap}%`,
        itemStyle: { color },
      });
    } else if (chart.type === 'scatter') {
      series.push({
        id: categoryX ? undefined : s.sid,
        type: 'scatter',
        name: s.name,
        data,
        yAxisIndex,
        symbolSize: style.symbolSize,
        itemStyle: { color },
      });
    } else {
      series.push({
        id: categoryX ? undefined : s.sid,
        type: 'line',
        name: s.name,
        data,
        yAxisIndex,
        smooth: style.smooth,
        symbol: style.showSymbols ? 'circle' : 'none',
        symbolSize: style.symbolSize,
        lineStyle: { width: style.lineWidth, color },
        itemStyle: { color },
        areaStyle: chart.type === 'area' ? { opacity: 0.25, color } : undefined,
        stack: chart.type === 'area' && style.stack ? 'total' : undefined,
      });
    }

    // error bars
    const errData: [number | string, number, number][] = [];
    s.points.forEach((p) => {
      if (p.err !== undefined) {
        errData.push([categoryX ? String(p.x) : (p.x as number), p.y - p.err, p.y + p.err]);
      }
    });
    if (errData.length > 0) {
      series.push(errorBarSeries(errData, color, yAxisIndex, categoryX));
    }
  });

  const yAxes = [axisOption(chart.yAxis, chart, false)];
  if (chart.series.some((s) => s.y2)) {
    yAxes.push({ ...axisOption(chart.y2Axis, chart, false), splitLine: { show: false } } as never);
  }

  return {
    ...base,
    legend,
    xAxis: axisOption(chart.xAxis, chart, categoryX, categories),
    yAxis: yAxes as never,
    series,
    tooltip: { trigger: categoryX ? 'axis' : 'item', confine: true },
  };
}

function buildBox(
  chart: ChartConfig,
  datasets: Dataset[],
  base: EChartsOption,
  _legend: object,
  palette: string[],
): EChartsOption {
  const groups = chart.series.flatMap((m) => groupedValues(m, datasets));
  const categories = groups.map((g) => g.name);
  const boxData = groups.map((g, i) => {
    const s = boxStats(g.values);
    return {
      value: [s.low, s.q1, s.median, s.q3, s.high],
      itemStyle: {
        color: `${palette[i % palette.length]}55`,
        borderColor: palette[i % palette.length],
        borderWidth: chart.style.lineWidth,
      },
    };
  });
  const outliers: [number, number][] = [];
  groups.forEach((g, i) => boxStats(g.values).outliers.forEach((v) => outliers.push([i, v])));

  return {
    ...base,
    legend: { show: false },
    xAxis: axisOption(chart.xAxis, chart, true, categories),
    yAxis: axisOption(chart.yAxis, chart, false),
    series: [
      { type: 'boxplot', data: boxData, boxWidth: ['25%', '55%'] },
      {
        type: 'scatter',
        data: outliers,
        symbolSize: chart.style.symbolSize * 0.8,
        itemStyle: { color: 'transparent', borderColor: '#555', borderWidth: 1 },
      },
    ],
    tooltip: { trigger: 'item', confine: true },
  };
}

function buildViolin(
  chart: ChartConfig,
  datasets: Dataset[],
  base: EChartsOption,
  _legend: object,
  palette: string[],
): EChartsOption {
  const groups = chart.series.flatMap((m) => groupedValues(m, datasets));
  const categories = groups.map((g) => g.name);

  const violinData = groups.map((g, gi) => {
    if (g.values.length < 2) return { gi, ys: [], ds: [], color: palette[gi % palette.length] };
    const min = Math.min(...g.values);
    const max = Math.max(...g.values);
    const pad = (max - min) * 0.15 || 1;
    const ys = linspace(min - pad, max + pad, 60);
    const ds = kde(g.values, ys);
    const dmax = Math.max(...ds) || 1;
    return { gi, ys, ds: ds.map((d) => d / dmax), color: palette[gi % palette.length] };
  });

  const medians = groups.map((g, gi) => {
    const sorted = [...g.values].sort((a, b) => a - b);
    return [gi, sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0];
  });

  return {
    ...base,
    legend: { show: false },
    xAxis: axisOption(chart.xAxis, chart, true, categories),
    yAxis: axisOption(chart.yAxis, chart, false),
    series: [
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
              fill: `${item.color}66`,
              stroke: item.color,
              lineWidth: chart.style.lineWidth,
            },
          };
        },
        data: violinData.map((v) => [v.gi, 0]),
        z: 2,
      } as SeriesOption,
      {
        type: 'scatter',
        data: medians,
        symbolSize: chart.style.symbolSize,
        itemStyle: { color: '#1a1d23' },
        z: 3,
      },
    ],
    tooltip: { show: false },
  };
}

function buildHistogram(
  chart: ChartConfig,
  datasets: Dataset[],
  base: EChartsOption,
  legend: object,
  palette: string[],
): EChartsOption {
  const series: SeriesOption[] = [];
  const resolved = chart.series.flatMap((m) => groupedValues(m, datasets));
  resolved.forEach((g, i) => {
    const bins = histogram(g.values, chart.style.histogramBins);
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
            fill: `${palette[i % palette.length]}${resolved.length > 1 ? '99' : 'CC'}`,
            stroke: palette[i % palette.length],
            lineWidth: 1,
          },
        };
      },
      data: bins.map((b) => [b.x0, b.x1, b.count]),
      z: 2,
    } as SeriesOption);
  });
  return {
    ...base,
    legend,
    xAxis: axisOption(chart.xAxis, chart, false),
    yAxis: axisOption(chart.yAxis, chart, false),
    series,
    tooltip: { show: false },
  };
}

function buildDensity(
  chart: ChartConfig,
  datasets: Dataset[],
  base: EChartsOption,
  legend: object,
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
    xAxis: axisOption(chart.xAxis, chart, false),
    yAxis: axisOption(chart.yAxis, chart, false),
    series,
  };
}

function buildHeatmap(
  chart: ChartConfig,
  datasets: Dataset[],
  base: EChartsOption,
  isCorrelation: boolean,
): EChartsOption {
  const mapping = chart.series[0];
  const ds = mapping ? datasets.find((d) => d.id === mapping.datasetId) : undefined;
  if (!ds) return base;
  const numCols = numericColumnIndices(ds);

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
        const r = pearson(pairs.map((p) => p[0]), pairs.map((p) => p[1]));
        data.push([i, j, +r.toFixed(3)]);
      }
    }
    vmin = -1;
    vmax = 1;
  } else {
    // first non-numeric column (if any) is row label
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
    vmin = Math.min(...all);
    vmax = Math.max(...all);
  }

  const fontStyle = {
    fontFamily: chart.style.fontFamily,
    fontSize: chart.style.fontSize,
    color: TEXT_COLOR,
  };

  return {
    ...base,
    grid: { left: 90, right: 80, top: chart.title ? 45 : 25, bottom: 45 },
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
      textStyle: { ...fontStyle, fontSize: chart.style.fontSize - 1 },
      inRange: { color: isCorrelation ? DIVERGING_RAMP : HEATMAP_RAMP },
    },
    series: [
      {
        type: 'heatmap',
        data,
        label: {
          show: isCorrelation && xCats.length <= 10,
          fontSize: Math.max(8, chart.style.fontSize - 2),
          fontFamily: chart.style.fontFamily,
          color: '#1a1d23',
        },
        itemStyle: { borderColor: '#ffffff', borderWidth: 1 },
      },
    ],
    legend: { show: false },
  };
}

function buildRadar(
  chart: ChartConfig,
  datasets: Dataset[],
  base: EChartsOption,
  legend: object,
): EChartsOption {
  const mapping = chart.series[0];
  const ds = mapping ? datasets.find((d) => d.id === mapping.datasetId) : undefined;
  if (!ds) return base;
  const numCols = numericColumnIndices(ds);
  const labelCol = ds.columns.findIndex((_, i) => !numCols.includes(i));
  const indicators = numCols.map((i) => {
    const vals = numericColumn(ds, i);
    return { name: ds.columns[i], max: Math.max(...vals) * 1.1 };
  });
  const rows = ds.rows.slice(0, 8); // keep readable
  const fontStyle = {
    fontFamily: chart.style.fontFamily,
    fontSize: chart.style.fontSize,
    color: TEXT_COLOR,
  };
  return {
    ...base,
    legend,
    radar: {
      indicator: indicators,
      axisName: fontStyle,
      splitLine: { lineStyle: { color: '#d8d8d8' } },
      splitArea: { show: false },
      axisLine: { lineStyle: { color: '#d8d8d8' } },
    },
    series: [
      {
        type: 'radar',
        data: rows.map((r, ri) => ({
          name: labelCol >= 0 ? String(r[labelCol] ?? `R${ri + 1}`) : `R${ri + 1}`,
          value: numCols.map((ci) => (typeof r[ci] === 'number' ? (r[ci] as number) : 0)),
          lineStyle: { width: chart.style.lineWidth },
          areaStyle: { opacity: 0.1 },
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
): EChartsOption {
  const resolved = chart.series.flatMap((m) => resolveSeries(m, datasets));
  const fontStyle = {
    fontFamily: chart.style.fontFamily,
    fontSize: chart.style.fontSize,
    color: TEXT_COLOR,
  };
  return {
    ...base,
    legend,
    polar: { radius: '70%' },
    angleAxis: {
      type: 'value',
      min: 0,
      max: 360,
      axisLabel: fontStyle,
      splitLine: { lineStyle: { color: '#e0e0e0' } },
    },
    radiusAxis: {
      axisLabel: fontStyle,
      splitLine: { lineStyle: { color: '#e0e0e0', type: 'dashed' } },
    },
    series: resolved.map((s) => ({
      type: 'line',
      name: s.name,
      coordinateSystem: 'polar',
      data: s.points.map((p) => [p.y, typeof p.x === 'number' ? p.x : 0]),
      smooth: chart.style.smooth,
      symbol: chart.style.showSymbols ? 'circle' : 'none',
      symbolSize: chart.style.symbolSize,
      lineStyle: { width: chart.style.lineWidth },
    })),
  };
}
