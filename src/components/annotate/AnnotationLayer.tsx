import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Annotation, AnnotationKind, AnnotationStyle } from '../../types';
import { useStore } from '../../store/useStore';
import { uid } from '../../lib/parse';

interface PanelLabel {
  x: number; // px
  y: number;
  label: string;
}

interface Props {
  width: number;
  height: number;
  annotations: Annotation[];
  /** When false the layer is purely decorative (pointer-events: none). */
  interactive: boolean;
  panelLabels?: PanelLabel[];
  labelFont?: string;
}

const DEFAULT_STYLE: AnnotationStyle = {
  stroke: '#1a1d23',
  strokeWidth: 1.5,
  fill: 'none',
  fontSize: 13,
  dash: false,
};

type DragState =
  | { kind: 'draw'; annotation: Annotation }
  | { kind: 'move'; id: string; startPoints: number[]; startX: number; startY: number }
  | { kind: 'handle'; id: string; pointIndex: number }
  | null;

export function AnnotationLayer({
  width,
  height,
  annotations,
  interactive,
  panelLabels = [],
  labelFont = 'Arial',
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tool = useStore((s) => s.tool);
  const selectedId = useStore((s) => s.selectedAnnotationId);
  const addAnnotation = useStore((s) => s.addAnnotation);
  const updateAnnotation = useStore((s) => s.updateAnnotation);
  const removeAnnotation = useStore((s) => s.removeAnnotation);
  const selectAnnotation = useStore((s) => s.selectAnnotation);
  const setTool = useStore((s) => s.setTool);

  const [drag, setDrag] = useState<DragState>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const toLocal = useCallback((e: { clientX: number; clientY: number }): [number, number] => {
    // Use the rendered rect so coordinates stay correct under CSS zoom
    const r = svgRef.current!.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
  }, []);

  // Delete key removes selection
  useEffect(() => {
    if (!interactive) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && !editingId) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        removeAnnotation(selectedId);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [interactive, selectedId, editingId, removeAnnotation]);

  const startDraw = (e: React.PointerEvent) => {
    if (!interactive || tool === 'select') return;
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const [x, y] = toLocal(e);
    const kind = tool as AnnotationKind;
    if (kind === 'text') {
      const a: Annotation = {
        id: uid('ann'),
        kind: 'text',
        points: [x, y],
        text: 'Text',
        style: { ...DEFAULT_STYLE },
      };
      addAnnotation(a);
      setEditingId(a.id);
      setTool('select');
      return;
    }
    const a: Annotation = {
      id: uid('ann'),
      kind,
      points: kind === 'pen' ? [x, y] : [x, y, x, y],
      text: kind === 'sig' ? '*' : '',
      style: { ...DEFAULT_STYLE, fill: kind === 'rect' || kind === 'ellipse' ? 'none' : 'none' },
    };
    setDrag({ kind: 'draw', annotation: a });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const [x, y] = toLocal(e);
    if (drag.kind === 'draw') {
      const a = drag.annotation;
      const points =
        a.kind === 'pen' ? [...a.points, x, y] : [a.points[0], a.points[1], x, y];
      setDrag({ kind: 'draw', annotation: { ...a, points } });
    } else if (drag.kind === 'move') {
      const dx = x - drag.startX;
      const dy = y - drag.startY;
      const points = drag.startPoints.map((v, i) => (i % 2 === 0 ? v + dx : v + dy));
      updateAnnotation(drag.id, { points });
    } else if (drag.kind === 'handle') {
      const a = annotations.find((an) => an.id === drag.id);
      if (!a) return;
      const points = [...a.points];
      points[drag.pointIndex] = x;
      points[drag.pointIndex + 1] = y;
      updateAnnotation(drag.id, { points });
    }
  };

  const onPointerUp = () => {
    if (drag?.kind === 'draw') {
      const a = drag.annotation;
      const [x1, y1, x2, y2] = [a.points[0], a.points[1], a.points[2] ?? a.points[0], a.points[3] ?? a.points[1]];
      const dist = Math.hypot((x2 - x1) * width, (y2 - y1) * height);
      if (a.kind === 'pen' ? a.points.length > 4 : dist > 5) {
        addAnnotation(a);
        setTool('select');
      }
    }
    setDrag(null);
  };

  const startMove = (e: React.PointerEvent, a: Annotation) => {
    if (!interactive || tool !== 'select') return;
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    selectAnnotation(a.id);
    const [x, y] = toLocal(e);
    setDrag({ kind: 'move', id: a.id, startPoints: [...a.points], startX: x, startY: y });
  };

  const startHandle = (e: React.PointerEvent, id: string, pointIndex: number) => {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    setDrag({ kind: 'handle', id, pointIndex });
  };

  const editing = annotations.find((a) => a.id === editingId);
  const drawing = drag?.kind === 'draw' ? drag.annotation : null;

  return (
    <>
      <svg
        ref={svgRef}
        data-overlay="true"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: interactive && tool !== 'select' ? 'all' : 'none',
          cursor: tool === 'select' ? 'default' : 'crosshair',
          zIndex: 10,
        }}
        onPointerDown={startDraw}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {panelLabels.map((p) => (
          <text
            key={p.label}
            x={p.x}
            y={p.y}
            fontSize={16}
            fontWeight="bold"
            fontFamily={labelFont}
            fill="#1a1d23"
          >
            {p.label}
          </text>
        ))}
        {annotations.map((a) => (
          <Shape
            key={a.id}
            a={a}
            w={width}
            h={height}
            selected={interactive && a.id === selectedId}
            selectable={interactive && tool === 'select'}
            onPointerDown={(e) => startMove(e, a)}
            onDoubleClick={() => {
              if ((a.kind === 'text' || a.kind === 'sig') && interactive) setEditingId(a.id);
            }}
            onHandleDown={startHandle}
          />
        ))}
        {drawing && (
          <Shape a={drawing} w={width} h={height} selected={false} selectable={false} />
        )}
      </svg>
      {editing && (
        <input
          autoFocus
          className="input"
          style={{
            position: 'absolute',
            left: editing.points[0] * width - 60,
            top:
              (editing.kind === 'sig'
                ? Math.min(editing.points[1], editing.points[3]) * height - 36
                : editing.points[1] * height - 30),
            width: 120,
            zIndex: 30,
            textAlign: 'center',
          }}
          defaultValue={editing.text}
          onBlur={(e) => {
            updateAnnotation(editing.id, { text: e.target.value });
            setEditingId(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') setEditingId(null);
          }}
        />
      )}
    </>
  );
}

interface ShapeProps {
  a: Annotation;
  w: number;
  h: number;
  selected: boolean;
  selectable: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
  onDoubleClick?: () => void;
  onHandleDown?: (e: React.PointerEvent, id: string, pointIndex: number) => void;
}

function Shape({ a, w, h, selected, selectable, onPointerDown, onDoubleClick, onHandleDown }: ShapeProps) {
  const px = a.points.map((v, i) => (i % 2 === 0 ? v * w : v * h));
  const s = a.style;
  const dash = s.dash ? '6 4' : undefined;
  const common = {
    stroke: s.stroke,
    strokeWidth: s.strokeWidth,
    fill: 'none',
    strokeDasharray: dash,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  const interactProps = {
    onPointerDown: selectable ? onPointerDown : undefined,
    onDoubleClick,
    style: {
      pointerEvents: selectable ? ('all' as const) : ('none' as const),
      cursor: selectable ? 'move' : undefined,
    },
  };

  let body: React.ReactNode = null;
  let handlePoints: number[] = [];

  switch (a.kind) {
    case 'line':
    case 'arrow': {
      const [x1, y1, x2, y2] = px;
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const headLen = 6 + s.strokeWidth * 2.5;
      body = (
        <g {...interactProps}>
          <line x1={x1} y1={y1} x2={x2} y2={y2} {...common} />
          {a.kind === 'arrow' && (
            <path
              d={`M ${x2} ${y2} L ${x2 - headLen * Math.cos(angle - 0.45)} ${y2 - headLen * Math.sin(angle - 0.45)} M ${x2} ${y2} L ${x2 - headLen * Math.cos(angle + 0.45)} ${y2 - headLen * Math.sin(angle + 0.45)}`}
              {...common}
            />
          )}
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth={12} />
        </g>
      );
      handlePoints = [0, 2];
      break;
    }
    case 'rect': {
      const [x1, y1, x2, y2] = px;
      body = (
        <g {...interactProps}>
          <rect
            x={Math.min(x1, x2)}
            y={Math.min(y1, y2)}
            width={Math.abs(x2 - x1)}
            height={Math.abs(y2 - y1)}
            {...common}
            fill={s.fill === 'none' ? 'transparent' : s.fill}
            fillOpacity={s.fill === 'none' ? 0 : 0.35}
          />
        </g>
      );
      handlePoints = [0, 2];
      break;
    }
    case 'ellipse': {
      const [x1, y1, x2, y2] = px;
      body = (
        <g {...interactProps}>
          <ellipse
            cx={(x1 + x2) / 2}
            cy={(y1 + y2) / 2}
            rx={Math.abs(x2 - x1) / 2}
            ry={Math.abs(y2 - y1) / 2}
            {...common}
            fill={s.fill === 'none' ? 'transparent' : s.fill}
            fillOpacity={s.fill === 'none' ? 0 : 0.35}
          />
        </g>
      );
      handlePoints = [0, 2];
      break;
    }
    case 'text': {
      const [x, y] = px;
      body = (
        <g {...interactProps}>
          <text
            x={x}
            y={y}
            fontSize={s.fontSize}
            fill={s.stroke}
            textAnchor="middle"
            fontFamily="Arial"
          >
            {a.text}
          </text>
        </g>
      );
      break;
    }
    case 'sig': {
      const [x1, y1, x2] = [px[0], Math.min(px[1], px[3] ?? px[1]), px[2] ?? px[0]];
      const tick = 8;
      body = (
        <g {...interactProps}>
          <path
            d={`M ${x1} ${y1 + tick} L ${x1} ${y1} L ${x2} ${y1} L ${x2} ${y1 + tick}`}
            {...common}
          />
          <text
            x={(x1 + x2) / 2}
            y={y1 - 4}
            fontSize={s.fontSize}
            fill={s.stroke}
            textAnchor="middle"
            fontFamily="Arial"
          >
            {a.text}
          </text>
          <path
            d={`M ${x1} ${y1 + tick} L ${x1} ${y1} L ${x2} ${y1} L ${x2} ${y1 + tick}`}
            stroke="transparent"
            strokeWidth={12}
            fill="none"
          />
        </g>
      );
      handlePoints = [0, 2];
      break;
    }
    case 'pen': {
      let d = '';
      for (let i = 0; i < px.length; i += 2) {
        d += i === 0 ? `M ${px[i]} ${px[i + 1]}` : ` L ${px[i]} ${px[i + 1]}`;
      }
      body = (
        <g {...interactProps}>
          <path d={d} {...common} />
          <path d={d} stroke="transparent" strokeWidth={12} fill="none" />
        </g>
      );
      break;
    }
  }

  return (
    <g>
      {body}
      {selected && (
        <g>
          {/* selection outline for point-anchored shapes */}
          {a.kind === 'text' && (
            <rect
              x={px[0] - 40}
              y={px[1] - s.fontSize}
              width={80}
              height={s.fontSize + 8}
              fill="none"
              stroke="#4f7cff"
              strokeWidth={1}
              strokeDasharray="3 3"
              pointerEvents="none"
            />
          )}
          {handlePoints.map((pi) => (
            <circle
              key={pi}
              cx={px[pi]}
              cy={px[pi + 1]}
              r={5}
              fill="#ffffff"
              stroke="#4f7cff"
              strokeWidth={1.5}
              style={{ cursor: 'grab', pointerEvents: 'all' }}
              onPointerDown={(e) => onHandleDown?.(e, a.id, pi)}
            />
          ))}
        </g>
      )}
    </g>
  );
}
