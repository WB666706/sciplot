/** Colorblind-safe and journal-style palettes commonly used in publications. */

export interface Palette {
  id: string;
  name: string;
  colors: string[];
}

export const PALETTES: Palette[] = [
  {
    id: 'okabe-ito',
    name: 'Okabe-Ito (colorblind safe)',
    colors: ['#0072B2', '#E69F00', '#009E73', '#D55E00', '#CC79A7', '#56B4E9', '#F0E442', '#000000'],
  },
  {
    id: 'npg',
    name: 'NPG (Nature)',
    colors: ['#E64B35', '#4DBBD5', '#00A087', '#3C5488', '#F39B7F', '#8491B4', '#91D1C2', '#DC0000'],
  },
  {
    id: 'lancet',
    name: 'Lancet',
    colors: ['#00468B', '#ED0000', '#42B540', '#0099B4', '#925E9F', '#FDAF91', '#AD002A', '#ADB6B6'],
  },
  {
    id: 'jama',
    name: 'JAMA',
    colors: ['#374E55', '#DF8F44', '#00A1D5', '#B24745', '#79AF97', '#6A6599', '#80796B'],
  },
  {
    id: 'viridis',
    name: 'Viridis (sampled)',
    colors: ['#440154', '#46327E', '#365C8D', '#277F8E', '#1FA187', '#4AC16D', '#A0DA39', '#FDE725'],
  },
  {
    id: 'tab10',
    name: 'Tableau 10',
    colors: ['#4E79A7', '#F28E2B', '#E15759', '#76B7B2', '#59A14F', '#EDC948', '#B07AA1', '#FF9DA7'],
  },
  {
    id: 'grayscale',
    name: 'Grayscale',
    colors: ['#000000', '#525252', '#969696', '#BDBDBD', '#737373', '#252525', '#D9D9D9'],
  },
];

export function getPalette(id: string): string[] {
  return (PALETTES.find((p) => p.id === id) ?? PALETTES[0]).colors;
}

/** Sequential ramp for heatmaps (viridis-like). */
export const HEATMAP_RAMP = ['#440154', '#414487', '#2A788E', '#22A884', '#7AD151', '#FDE725'];
/** Diverging ramp for correlation matrices. */
export const DIVERGING_RAMP = ['#2166AC', '#67A9CF', '#D1E5F0', '#F7F7F7', '#FDDBC7', '#EF8A62', '#B2182B'];
