import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { buildChartOption } from '../../lib/echartsOption';
import { useStore } from '../../store/useStore';
import type { ChartConfig } from '../../types';

interface Props {
  chart: ChartConfig;
  width: number;
  height: number;
}

export function ChartPanel({ chart, width, height }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const instRef = useRef<echarts.ECharts | null>(null);
  const datasets = useStore((s) => s.datasets);
  const editPoints = useStore((s) => s.editPoints);
  const activeChartId = useStore((s) => s.activeChartId);

  useEffect(() => {
    const inst = echarts.init(ref.current!, undefined, {
      renderer: 'svg',
      width,
      height,
    });
    instRef.current = inst;
    return () => inst.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    instRef.current?.resize({ width, height });
  }, [width, height]);

  useEffect(() => {
    instRef.current?.setOption(buildChartOption(chart, datasets), { notMerge: true });
  }, [chart, datasets]);

  // ---- drag-edit data points ----
  useEffect(() => {
    const inst = instRef.current;
    const el = ref.current;
    if (!inst || !el || !editPoints) return;
    const editable = chart.type === 'line' || chart.type === 'scatter' || chart.type === 'area';
    if (!editable) return;

    let dragging: { mappingId: string; rowIndex: number; seriesIndex: number } | null = null;

    const onDown = (params: echarts.ECElementEvent) => {
      const sid = params.seriesId;
      if (typeof sid !== 'string' || !sid.startsWith('m:')) return;
      const value = params.value as number[];
      if (!Array.isArray(value) || value.length < 3) return;
      dragging = {
        mappingId: sid.split(':')[1],
        rowIndex: value[2],
        seriesIndex: params.seriesIndex ?? 0,
      };
    };

    const onMove = (e: MouseEvent) => {
      if (!dragging) return;
      const rect = el.getBoundingClientRect();
      const scale = rect.width / el.offsetWidth || 1;
      const px = (e.clientX - rect.left) / scale;
      const py = (e.clientY - rect.top) / scale;
      const coord = inst.convertFromPixel({ seriesIndex: dragging.seriesIndex }, [px, py]);
      if (!coord) return;
      const state = useStore.getState();
      const mapping = chart.series.find((m) => m.id === dragging!.mappingId);
      if (!mapping) return;
      const ds = state.datasets.find((d) => d.id === mapping.datasetId);
      if (!ds) return;
      const row = ds.rows[dragging.rowIndex];
      if (!row) return;
      if (mapping.xCol >= 0 && typeof row[mapping.xCol] === 'number') {
        state.updateCell(ds.id, dragging.rowIndex, mapping.xCol, +coord[0].toFixed(4));
      }
      state.updateCell(ds.id, dragging.rowIndex, mapping.yCol, +coord[1].toFixed(4));
    };

    const onUp = () => {
      dragging = null;
    };

    inst.on('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      inst.off('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [editPoints, chart]);

  const isActive = chart.id === activeChartId;

  return (
    <div
      data-chart-panel="true"
      ref={ref}
      style={{
        width,
        height,
        outline: isActive ? '1.5px solid var(--color-accent)' : '1px solid transparent',
        outlineOffset: -1,
        cursor: editPoints ? 'crosshair' : 'default',
      }}
      onMouseDown={() => useStore.getState().setActiveChart(chart.id)}
    />
  );
}
