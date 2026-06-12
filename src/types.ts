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
  | 'area'
  | 'box'
  | 'violin'
  | 'histogram'
  | 'density'
  | 'heatmap'
  | 'correlation'
  | 'radar'
  | 'polar';

export interface SeriesMapping {
  id: string;
  datasetId: string;
  name: string;
  xCol: number;
  yCol: number;
  errCol: number; // -1 = none
  groupCol: number; // -1 = none
  y2: boolean; // map to secondary y axis
  color?: string;
}

export type AxisScale = 'linear' | 'log';

export interface AxisConfig {
  label: string;
  scale: AxisScale;
  min: string; // '' = auto
  max: string;
  tickInside: boolean;
  showGrid: boolean;
}

export interface ChartStyle {
  fontFamily: string;
  fontSize: number;
  lineWidth: number;
  symbolSize: number;
  showSymbols: boolean;
  smooth: boolean;
  palette: string;
  showLegend: boolean;
  legendPosition: 'top' | 'bottom' | 'right';
  barGap: number; // percent
  stack: boolean;
  histogramBins: number;
}

export interface ChartConfig {
  id: string;
  type: ChartType;
  title: string;
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
  version: 1;
  datasets: Dataset[];
  charts: ChartConfig[];
  layout: FigureLayout;
  annotations: Annotation[];
  canvasAnnotations: Annotation[];
  figureWidthMm: number;
  figureHeightMm: number;
}
