export type CellValue = number | string | null;

export interface Dataset {
  id: string;
  name: string;
  columns: string[];
  rows: CellValue[][];
}

export type ChartType =
  | 'line'
  | 'scatter'
  | 'bar'
  | 'barh'
  | 'area'
  | 'pie'
  | 'box'
  | 'violin'
  | 'histogram'
  | 'density'
  | 'heatmap'
  | 'correlation'
  | 'radar'
  | 'polar';

export type LineStyleKind = 'solid' | 'dashed' | 'dotted';
export type SymbolKind = 'circle' | 'rect' | 'triangle' | 'diamond' | 'emptyCircle' | 'none';
export type TrendlineKind = 'none' | 'linear' | 'movingAverage';
export type ErrorDisplay = 'bars' | 'band';

export interface SeriesMapping {
  id: string;
  datasetId: string;
  name: string;
  xCol: number;
  yCol: number;
  errCol: number; // -1 = none
  groupCol: number; // -1 = none
  sizeCol: number; // -1 = none (bubble size for scatter)
  y2: boolean; // map to secondary y axis
  // per-series style overrides ('' / 0 = follow global)
  color: string; // '' = auto palette
  lineStyle: LineStyleKind;
  symbol: SymbolKind | ''; // '' = follow global
  opacity: number; // 0.1–1
  trendline: TrendlineKind;
  errorDisplay: ErrorDisplay;
}

export type AxisScale = 'linear' | 'log';
export type TickFormat = 'auto' | 'fixed0' | 'fixed1' | 'fixed2' | 'scientific' | 'percent';

export interface AxisConfig {
  label: string;
  scale: AxisScale;
  min: string; // '' = auto
  max: string;
  tickInside: boolean;
  showGrid: boolean;
  labelRotate: number; // degrees
  tickFormat: TickFormat;
}

export type LegendPosition = 'top' | 'bottom' | 'right' | 'insideTopLeft' | 'insideTopRight';

export interface ChartStyle {
  theme: string; // theme preset id
  fontFamily: string;
  fontSize: number;
  titleSize: number;
  lineWidth: number;
  symbolSize: number;
  showSymbols: boolean;
  smooth: boolean;
  step: boolean;
  palette: string;
  showLegend: boolean;
  legendPosition: LegendPosition;
  barGap: number; // percent
  stack: boolean;
  percentStack: boolean;
  barBorderRadius: number;
  histogramBins: number;
  pieDonut: number; // 0 = pie, 0.3–0.7 = donut inner radius ratio
  pieShowLabels: boolean;
  showDataLabels: boolean;
  boxShowPoints: boolean; // jittered raw points over box/violin
}

export interface ChartConfig {
  id: string;
  type: ChartType;
  title: string;
  subtitle: string;
  series: SeriesMapping[];
  xAxis: AxisConfig;
  yAxis: AxisConfig;
  y2Axis: AxisConfig;
  style: ChartStyle;
}

export type AnnotationKind =
  | 'arrow'
  | 'line'
  | 'rect'
  | 'ellipse'
  | 'text'
  | 'sig'
  | 'pen';

export interface AnnotationStyle {
  stroke: string;
  strokeWidth: number;
  fill: string; // 'none' allowed
  fontSize: number;
  dash: boolean;
}

export interface Annotation {
  id: string;
  kind: AnnotationKind;
  /** Normalized 0-1 figure coordinates: [x1,y1,x2,y2] or pen path points */
  points: number[];
  text: string;
  style: AnnotationStyle;
}

export type ToolId = 'select' | AnnotationKind;

export interface FigureLayout {
  rows: number;
  cols: number;
  showPanelLabels: boolean;
}

export interface JournalPreset {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
}

export interface ProjectFile {
  app: 'sciplot';
  version: 1 | 2;
  datasets: Dataset[];
  charts: ChartConfig[];
  layout: FigureLayout;
  annotations: Annotation[];
  canvasAnnotations: Annotation[];
  figureWidthMm: number;
  figureHeightMm: number;
}
