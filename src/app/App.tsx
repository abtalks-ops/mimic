import { useEffect, useState } from 'react';
import { HistoryScreen } from '../features/history/HistoryScreen';
import { HomeScreen } from '../features/home/HomeScreen';
import { Onboarding } from '../features/onboarding/Onboarding';
import { SettingsScreen } from '../features/settings/SettingsScreen';
import { loadModels, modelsWereDownloaded, useEngine } from './engine';

type Tab = 'talk' | 'clips' | 'settings';
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'talk', label: 'Talk', icon: '🎙️' },
  { id: 'clips', label: 'Clips', icon: '🎞️' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

export function App() {
  const { status } = useEngine();
  const [tab, setTab] = useState<Tab>('talk');
  const returning = modelsWereDownloaded();

  // Models are cached after the first download, so returning users skip the download screen.
  useEffect(() => {
    if (returning) void loadModels();
  }, [returning]);

  const ready = status === 'ready';

  return (
    <div className="shell">
      <header className="top">
        <h1>Mimic</h1>
      </header>
      <main className="app" id="main">
        {!ready ? <Onboarding returning={returning} /> : tab === 'talk' ? <HomeScreen /> : tab === 'clips' ? <HistoryScreen /> : <SettingsScreen />}
      </main>
      {ready && (
        <nav className="tabs" aria-label="Main">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? 'active' : ''} aria-current={tab === t.id ? 'page' : undefined} onClick={() => setTab(t.id)}>
              <span aria-hidden="true">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
