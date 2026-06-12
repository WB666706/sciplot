import { create } from 'zustand';
import type {
  Annotation,
  AxisConfig,
  CellValue,
  ChartConfig,
  ChartType,
  Dataset,
  FigureLayout,
  ProjectFile,
  SeriesMapping,
  ToolId,
} from '../types';
import { uid } from '../lib/parse';

export type AppMode = 'chart' | 'canvas';

function defaultAxis(label = ''): AxisConfig {
  return { label, scale: 'linear', min: '', max: '', tickInside: false, showGrid: false };
}

export function defaultChart(): ChartConfig {
  return {
    id: uid('chart'),
    type: 'line',
    title: '',
    series: [],
    xAxis: defaultAxis(),
    yAxis: defaultAxis(),
    y2Axis: defaultAxis(),
    style: {
      fontFamily: 'Arial',
      fontSize: 11,
      lineWidth: 1.5,
      symbolSize: 6,
      showSymbols: true,
      smooth: false,
      palette: 'okabe-ito',
      showLegend: true,
      legendPosition: 'top',
      barGap: 10,
      stack: false,
      histogramBins: 20,
    },
  };
}

export function defaultSeries(datasetId: string): SeriesMapping {
  return {
    id: uid('ser'),
    datasetId,
    name: '',
    xCol: 0,
    yCol: 1,
    errCol: -1,
    groupCol: -1,
    y2: false,
  };
}

interface State {
  datasets: Dataset[];
  charts: ChartConfig[];
  layout: FigureLayout;
  activeChartId: string;
  annotations: Annotation[];
  canvasAnnotations: Annotation[];
  selectedAnnotationId: string | null;
  tool: ToolId;
  editPoints: boolean;
  mode: AppMode;
  figureWidthMm: number;
  figureHeightMm: number;
  exportDpi: number;
  activeDatasetId: string | null;

  // dataset actions
  addDatasets: (ds: Dataset[]) => void;
  removeDataset: (id: string) => void;
  renameDataset: (id: string, name: string) => void;
  setActiveDataset: (id: string | null) => void;
  updateCell: (dsId: string, row: number, col: number, value: CellValue) => void;
  updateColumnName: (dsId: string, col: number, name: string) => void;
  addRow: (dsId: string) => void;
  addColumn: (dsId: string) => void;
  deleteRow: (dsId: string, row: number) => void;

  // chart actions
  setActiveChart: (id: string) => void;
  addChart: () => void;
  removeChart: (id: string) => void;
  updateChart: (id: string, patch: Partial<ChartConfig>) => void;
  setChartType: (id: string, type: ChartType) => void;
  addSeries: (chartId: string) => void;
  updateSeries: (chartId: string, seriesId: string, patch: Partial<SeriesMapping>) => void;
  removeSeries: (chartId: string, seriesId: string) => void;
  setLayout: (patch: Partial<FigureLayout>) => void;

  // annotation actions
  addAnnotation: (a: Annotation) => void;
  updateAnnotation: (id: string, patch: Partial<Annotation>) => void;
  removeAnnotation: (id: string) => void;
  clearAnnotations: () => void;
  selectAnnotation: (id: string | null) => void;
  setTool: (t: ToolId) => void;
  setEditPoints: (v: boolean) => void;

  // app
  setMode: (m: AppMode) => void;
  setFigureSize: (w: number, h: number) => void;
  setExportDpi: (dpi: number) => void;
  loadProject: (p: ProjectFile) => void;
  serializeProject: () => ProjectFile;
}

const firstChart = defaultChart();

export const useStore = create<State>((set, get) => ({
  datasets: [],
  charts: [firstChart],
  layout: { rows: 1, cols: 1, showPanelLabels: true },
  activeChartId: firstChart.id,
  annotations: [],
  canvasAnnotations: [],
  selectedAnnotationId: null,
  tool: 'select',
  editPoints: false,
  mode: 'chart',
  figureWidthMm: 120,
  figureHeightMm: 90,
  exportDpi: 300,
  activeDatasetId: null,

  addDatasets: (ds) =>
    set((s) => ({
      datasets: [...s.datasets, ...ds],
      activeDatasetId: ds[ds.length - 1]?.id ?? s.activeDatasetId,
    })),
  removeDataset: (id) =>
    set((s) => ({
      datasets: s.datasets.filter((d) => d.id !== id),
      activeDatasetId: s.activeDatasetId === id ? null : s.activeDatasetId,
      charts: s.charts.map((c) => ({
        ...c,
        series: c.series.filter((m) => m.datasetId !== id),
      })),
    })),
  renameDataset: (id, name) =>
    set((s) => ({ datasets: s.datasets.map((d) => (d.id === id ? { ...d, name } : d)) })),
  setActiveDataset: (id) => set({ activeDatasetId: id }),
  updateCell: (dsId, row, col, value) =>
    set((s) => ({
      datasets: s.datasets.map((d) => {
        if (d.id !== dsId) return d;
        const rows = d.rows.map((r, ri) =>
          ri === row ? r.map((c, ci) => (ci === col ? value : c)) : r,
        );
        return { ...d, rows };
      }),
    })),
  updateColumnName: (dsId, col, name) =>
    set((s) => ({
      datasets: s.datasets.map((d) =>
        d.id === dsId
          ? { ...d, columns: d.columns.map((c, ci) => (ci === col ? name : c)) }
          : d,
      ),
    })),
  addRow: (dsId) =>
    set((s) => ({
      datasets: s.datasets.map((d) =>
        d.id === dsId ? { ...d, rows: [...d.rows, d.columns.map(() => null)] } : d,
      ),
    })),
  addColumn: (dsId) =>
    set((s) => ({
      datasets: s.datasets.map((d) =>
        d.id === dsId
          ? {
              ...d,
              columns: [...d.columns, `Col${d.columns.length + 1}`],
              rows: d.rows.map((r) => [...r, null]),
            }
          : d,
      ),
    })),
  deleteRow: (dsId, row) =>
    set((s) => ({
      datasets: s.datasets.map((d) =>
        d.id === dsId ? { ...d, rows: d.rows.filter((_, ri) => ri !== row) } : d,
      ),
    })),

  setActiveChart: (id) => set({ activeChartId: id }),
  addChart: () =>
    set((s) => {
      const c = defaultChart();
      const n = s.charts.length + 1;
      const cols = n <= 1 ? 1 : 2;
      const rows = Math.ceil(n / cols);
      return {
        charts: [...s.charts, c],
        activeChartId: c.id,
        layout: { ...s.layout, rows, cols },
      };
    }),
  removeChart: (id) =>
    set((s) => {
      if (s.charts.length <= 1) return s;
      const charts = s.charts.filter((c) => c.id !== id);
      const n = charts.length;
      const cols = n <= 1 ? 1 : 2;
      const rows = Math.ceil(n / cols);
      return {
        charts,
        activeChartId: s.activeChartId === id ? charts[0].id : s.activeChartId,
        layout: { ...s.layout, rows, cols },
      };
    }),
  updateChart: (id, patch) =>
    set((s) => ({ charts: s.charts.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
  setChartType: (id, type) =>
    set((s) => ({ charts: s.charts.map((c) => (c.id === id ? { ...c, type } : c)) })),
  addSeries: (chartId) =>
    set((s) => {
      const ds = s.datasets.find((d) => d.id === s.activeDatasetId) ?? s.datasets[0];
      if (!ds) return s;
      return {
        charts: s.charts.map((c) =>
          c.id === chartId ? { ...c, series: [...c.series, defaultSeries(ds.id)] } : c,
        ),
      };
    }),
  updateSeries: (chartId, seriesId, patch) =>
    set((s) => ({
      charts: s.charts.map((c) =>
        c.id === chartId
          ? {
              ...c,
              series: c.series.map((m) => (m.id === seriesId ? { ...m, ...patch } : m)),
            }
          : c,
      ),
    })),
  removeSeries: (chartId, seriesId) =>
    set((s) => ({
      charts: s.charts.map((c) =>
        c.id === chartId ? { ...c, series: c.series.filter((m) => m.id !== seriesId) } : c,
      ),
    })),
  setLayout: (patch) => set((s) => ({ layout: { ...s.layout, ...patch } })),

  addAnnotation: (a) =>
    set((s) =>
      s.mode === 'chart'
        ? { annotations: [...s.annotations, a], selectedAnnotationId: a.id }
        : { canvasAnnotations: [...s.canvasAnnotations, a], selectedAnnotationId: a.id },
    ),
  updateAnnotation: (id, patch) =>
    set((s) => {
      const key = s.mode === 'chart' ? 'annotations' : 'canvasAnnotations';
      return {
        [key]: s[key].map((a) => (a.id === id ? { ...a, ...patch } : a)),
      } as Partial<State>;
    }),
  removeAnnotation: (id) =>
    set((s) => {
      const key = s.mode === 'chart' ? 'annotations' : 'canvasAnnotations';
      return {
        [key]: s[key].filter((a) => a.id !== id),
        selectedAnnotationId: s.selectedAnnotationId === id ? null : s.selectedAnnotationId,
      } as Partial<State>;
    }),
  clearAnnotations: () =>
    set((s) =>
      s.mode === 'chart'
        ? { annotations: [], selectedAnnotationId: null }
        : { canvasAnnotations: [], selectedAnnotationId: null },
    ),
  selectAnnotation: (id) => set({ selectedAnnotationId: id }),
  setTool: (t) => set({ tool: t, editPoints: false }),
  setEditPoints: (v) => set({ editPoints: v, tool: 'select' }),

  setMode: (m) => set({ mode: m, selectedAnnotationId: null, tool: 'select' }),
  setFigureSize: (w, h) => set({ figureWidthMm: w, figureHeightMm: h }),
  setExportDpi: (dpi) => set({ exportDpi: dpi }),

  loadProject: (p) =>
    set({
      datasets: p.datasets,
      charts: p.charts.length > 0 ? p.charts : [defaultChart()],
      layout: p.layout,
      annotations: p.annotations,
      canvasAnnotations: p.canvasAnnotations,
      figureWidthMm: p.figureWidthMm,
      figureHeightMm: p.figureHeightMm,
      activeChartId: p.charts[0]?.id ?? '',
      activeDatasetId: p.datasets[0]?.id ?? null,
      selectedAnnotationId: null,
    }),
  serializeProject: () => {
    const s = get();
    return {
      app: 'sciplot',
      version: 1,
      datasets: s.datasets,
      charts: s.charts,
      layout: s.layout,
      annotations: s.annotations,
      canvasAnnotations: s.canvasAnnotations,
      figureWidthMm: s.figureWidthMm,
      figureHeightMm: s.figureHeightMm,
    };
  },
}));
