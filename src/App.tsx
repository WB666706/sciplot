import { useStore } from './store/useStore';
import { TopBar } from './components/layout/TopBar';
import { RightPanel } from './components/layout/RightPanel';
import { DataPanel } from './components/data/DataPanel';
import { ChartCanvas } from './components/chart/ChartCanvas';
import { FreeCanvas } from './components/freecanvas/FreeCanvas';

export default function App() {
  const mode = useStore((s) => s.mode);

  return (
    <div className="flex flex-col h-full">
      <TopBar />
      <div className="flex flex-1 min-h-0">
        {mode === 'chart' && (
          <aside
            className="w-72 shrink-0 border-r flex flex-col min-h-0"
            style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)' }}
          >
            <DataPanel />
          </aside>
        )}
        <main className="flex-1 min-w-0">
          {mode === 'chart' ? <ChartCanvas /> : <FreeCanvas />}
        </main>
        <aside
          className="w-72 shrink-0 border-l flex flex-col min-h-0"
          style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)' }}
        >
          <RightPanel />
        </aside>
      </div>
    </div>
  );
}
