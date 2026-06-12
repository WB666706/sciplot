import type { JournalPreset } from '../types';

export const JOURNAL_PRESETS: JournalPreset[] = [
  { id: 'nature-1col', name: 'Nature · single column (89 mm)', widthMm: 89, heightMm: 89 },
  { id: 'nature-2col', name: 'Nature · double column (183 mm)', widthMm: 183, heightMm: 120 },
  { id: 'science-1col', name: 'Science · single column (55 mm)', widthMm: 55, heightMm: 55 },
  { id: 'science-2col', name: 'Science · double column (120 mm)', widthMm: 120, heightMm: 90 },
  { id: 'cell-1col', name: 'Cell · single column (85 mm)', widthMm: 85, heightMm: 85 },
  { id: 'cell-2col', name: 'Cell · double column (174 mm)', widthMm: 174, heightMm: 120 },
  { id: 'ieee-1col', name: 'IEEE · single column (88 mm)', widthMm: 88, heightMm: 66 },
  { id: 'ieee-2col', name: 'IEEE · double column (181 mm)', widthMm: 181, heightMm: 110 },
  { id: 'pnas-1col', name: 'PNAS · single column (87 mm)', widthMm: 87, heightMm: 87 },
  { id: 'a4-full', name: 'A4 · full width (170 mm)', widthMm: 170, heightMm: 130 },
];

export const MM_TO_PX = 96 / 25.4; // CSS px per mm

export const FONT_OPTIONS = [
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Georgia',
  'Calibri',
  'Verdana',
];
