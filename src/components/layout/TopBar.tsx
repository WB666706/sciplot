import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStoreWithEqualityFn } from 'zustand/traditional';
import { GITHUB_REPO } from '../../config';
import { useStore } from '../../store/useStore';

function useUndoRedo() {
  const temporal = useStore.temporal;
  const { pastStates, futureStates } = useStoreWithEqualityFn(
    temporal,
    (s) => ({ pastStates: s.pastStates, futureStates: s.futureStates }),
    (a, b) => a.pastStates.length === b.pastStates.length && a.futureStates.length === b.futureStates.length,
  );
  return {
    canUndo: pastStates.length > 0,
    canRedo: futureStates.length > 0,
    undo: () => temporal.getState().undo(),
    redo: () => temporal.getState().redo(),
  };
}

export function TopBar() {
  const { t, i18n } = useTranslation();
  const mode = useStore((s) => s.mode);
  const setMode = useStore((s) => s.setMode);
  const [dark, setDark] = useState(() => localStorage.getItem('sciplot-theme') === 'dark');
  const { canUndo, canRedo, undo, redo } = useUndoRedo();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('sciplot-theme', dark ? 'dark' : 'light');
  }, [dark]);

  // Ctrl+Z / Ctrl+Y (or Ctrl+Shift+Z) keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  const toggleLang = () => {
    const next = i18n.language === 'zh' ? 'en' : 'zh';
    void i18n.changeLanguage(next);
    localStorage.setItem('sciplot-lang', next);
  };

  return (
    <div
      className="flex items-center gap-3 px-3 h-12 border-b shrink-0"
      style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)' }}
    >
      {/* logo */}
      <div className="flex items-center gap-2">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="2" width="20" height="20" rx="5" fill="var(--color-accent)" />
          <path d="M6 16l4-5 3 2.5L18 8" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <circle cx="18" cy="8" r="1.6" fill="#fff" />
        </svg>
        <div className="leading-tight">
          <div className="font-bold text-[13px]">{t('app.title')}</div>
          <div className="text-[9.5px]" style={{ color: 'var(--text-3)' }}>
            {t('app.subtitle')}
          </div>
        </div>
      </div>

      {/* mode switch */}
      <div className="flex rounded-lg p-0.5 ml-4" style={{ background: 'var(--bg-subtle)' }}>
        {(['chart', 'canvas'] as const).map((m) => (
          <button
            key={m}
            className="px-4 py-1 rounded-md text-[11.5px] font-medium cursor-pointer transition-colors"
            style={{
              background: mode === m ? 'var(--bg-panel)' : 'transparent',
              color: mode === m ? 'var(--text-1)' : 'var(--text-3)',
              boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
            }}
            onClick={() => setMode(m)}
          >
            {t(`mode.${m}`)}
          </button>
        ))}
      </div>

      {/* undo / redo */}
      <div className="flex items-center gap-0.5 ml-2">
        <button
          className="tool-btn"
          title={`${t('app.undo')} (Ctrl+Z)`}
          disabled={!canUndo}
          style={{ opacity: canUndo ? 1 : 0.35 }}
          onClick={undo}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 14L4 9l5-5" />
            <path d="M4 9h10.5a5.5 5.5 0 010 11H11" />
          </svg>
        </button>
        <button
          className="tool-btn"
          title={`${t('app.redo')} (Ctrl+Y)`}
          disabled={!canRedo}
          style={{ opacity: canRedo ? 1 : 0.35 }}
          onClick={redo}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 14l5-5-5-5" />
            <path d="M20 9H9.5a5.5 5.5 0 000 11H13" />
          </svg>
        </button>
      </div>

      <div className="flex-1" />

      <button className="btn !px-2.5" onClick={toggleLang} title="中文 / English">
        {i18n.language === 'zh' ? 'EN' : '中'}
      </button>
      <button className="btn !px-2.5" onClick={() => setDark(!dark)} title="Theme">
        {dark ? '☀' : '☾'}
      </button>
      <a
        className="btn !px-2.5"
        href={GITHUB_REPO}
        target="_blank"
        rel="noreferrer"
        title="GitHub"
      >
        <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.42 7.42 0 012-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
        </svg>
      </a>
    </div>
  );
}
