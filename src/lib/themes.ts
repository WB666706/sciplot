/** Visual theme presets that control the overall look of a chart. */

export interface ChartTheme {
  id: string;
  name: string;
  background: string;
  textColor: string;
  axisColor: string;
  gridColor: string;
  gridType: 'solid' | 'dashed';
  /** Draw top & right frame lines (classic publication box). */
  frame: boolean;
  /** Hide axis lines entirely and rely on grid (minimal style). */
  hideAxisLine: boolean;
  defaultGrid: boolean;
}

export const THEMES: ChartTheme[] = [
  {
    id: 'publication',
    name: 'Publication',
    background: '#ffffff',
    textColor: '#1a1d23',
    axisColor: '#1a1d23',
    gridColor: '#e0e0e0',
    gridType: 'dashed',
    frame: true,
    hideAxisLine: false,
    defaultGrid: false,
  },
  {
    id: 'minimal',
    name: 'Minimal',
    background: '#ffffff',
    textColor: '#37352f',
    axisColor: '#9b9a97',
    gridColor: '#ededec',
    gridType: 'solid',
    frame: false,
    hideAxisLine: false,
    defaultGrid: true,
  },
  {
    id: 'ggplot',
    name: 'ggplot2',
    background: '#ebebeb',
    textColor: '#2b2b2b',
    axisColor: '#2b2b2b',
    gridColor: '#ffffff',
    gridType: 'solid',
    frame: false,
    hideAxisLine: true,
    defaultGrid: true,
  },
  {
    id: 'seaborn',
    name: 'Seaborn',
    background: '#eaeaf2',
    textColor: '#262626',
    axisColor: '#262626',
    gridColor: '#ffffff',
    gridType: 'solid',
    frame: false,
    hideAxisLine: true,
    defaultGrid: true,
  },
  {
    id: 'dark',
    name: 'Dark',
    background: '#1c1e26',
    textColor: '#e8eaee',
    axisColor: '#a8aeb9',
    gridColor: '#33363f',
    gridType: 'solid',
    frame: false,
    hideAxisLine: false,
    defaultGrid: true,
  },
];

export function getTheme(id: string): ChartTheme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
