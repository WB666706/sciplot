import type { Dataset } from '../types';
import { uid } from './parse';

function gauss(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function makeSampleDatasets(): Dataset[] {
  // 1. Dose-response curves with error bars
  const doseRows: (number | string | null)[][] = [];
  for (let i = 0; i <= 10; i++) {
    const x = i * 10;
    const ctrl = 100 / (1 + Math.exp(-(x - 50) / 12));
    const trt = 100 / (1 + Math.exp(-(x - 35) / 10));
    doseRows.push([
      x,
      +(ctrl + gauss() * 2).toFixed(2),
      +(2 + Math.random() * 2).toFixed(2),
      +(trt + gauss() * 2).toFixed(2),
      +(2 + Math.random() * 2).toFixed(2),
    ]);
  }
  const dose: Dataset = {
    id: uid('ds'),
    name: 'Dose-Response',
    columns: ['Dose', 'Control', 'Control SEM', 'Treated', 'Treated SEM'],
    rows: doseRows,
  };

  // 2. Long-format group measurements (for box/violin)
  const groups = ['WT', 'KO', 'KO+Rescue'];
  const means = [5.2, 8.6, 5.9];
  const groupRows: (number | string | null)[][] = [];
  groups.forEach((g, gi) => {
    for (let i = 0; i < 30; i++) {
      groupRows.push([g, +(means[gi] + gauss() * 1.1).toFixed(3)]);
    }
  });
  const expression: Dataset = {
    id: uid('ds'),
    name: 'Gene Expression',
    columns: ['Genotype', 'Expression'],
    rows: groupRows,
  };

  // 3. Multivariate measurements (for correlation/heatmap/radar)
  const multiRows: (number | string | null)[][] = [];
  for (let i = 0; i < 25; i++) {
    const base = gauss();
    multiRows.push([
      `S${i + 1}`,
      +(10 + base * 2 + gauss() * 0.5).toFixed(2),
      +(20 + base * 3 + gauss() * 1.5).toFixed(2),
      +(5 - base * 1.2 + gauss() * 0.8).toFixed(2),
      +(50 + gauss() * 5).toFixed(2),
      +(8 + base * 1.5 + gauss()).toFixed(2),
    ]);
  }
  const multi: Dataset = {
    id: uid('ds'),
    name: 'Multivariate Panel',
    columns: ['Sample', 'Marker A', 'Marker B', 'Marker C', 'Marker D', 'Marker E'],
    rows: multiRows,
  };

  return [dose, expression, multi];
}
