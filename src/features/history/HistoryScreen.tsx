import { useEffect, useRef, useState } from 'react';
import { db, MAX_CLIPS, type Clip } from '../../core/storage/db';
import { Avatar } from '../characters/Avatar';
import { characterById } from '../characters/registry';

export function HistoryScreen() {
  const [clips, setClips] = useState<Clip[] | undefined>();
  const [playing, setPlaying] = useState<number | undefined>();
  const [notice, setNotice] = useState('');
  const audio = useRef<HTMLAudioElement | null>(null);

  const refresh = () => db.clips.orderBy('createdAt').reverse().toArray().then(setClips);
  useEffect(() => {
    void refresh();
    return () => audio.current?.pause();
  }, []);

  function play(clip: Clip) {
    audio.current?.pause();
    const url = URL.createObjectURL(clip.wav);
    const a = new Audio(url);
    audio.current = a;
    setPlaying(clip.id);
    a.onended = () => {
      setPlaying(undefined);
      URL.revokeObjectURL(url);
    };
    void a.play();
  }

  async function share(clip: Clip) {
    const name = `${characterById(clip.characterId).displayName} - ${clip.text.slice(0, 30)}`.replace(/[^\w\- ]+/g, '').trim();
    const file = new File([clip.wav], `${name || 'mimic-clip'}.wav`, { type: 'audio/wav' });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Mimic clip', text: `“${clip.text}”` });
        return;
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return; // user closed the share sheet
    }
    // Fallback: download the file.
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    setNotice('Sharing isn’t available here, so the clip was downloaded instead.');
  }

  async function remove(clip: Clip) {
    if (clip.id === undefined) return;
    await db.clips.delete(clip.id);
    void refresh();
  }

  if (!clips) return <p className="muted">Loading clips…</p>;
  if (!clips.length)
    return (
      <section className="panel empty">
        <h2>No clips yet</h2>
        <p>Everything a character says is saved here, so you can replay it or share it. Only on this phone.</p>
      </section>
    );

  return (
    <section aria-label="Saved clips">
      <p className="muted">
        Your last {MAX_CLIPS} clips are kept on this device. Older ones are removed automatically.
      </p>
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      <ul className="clips">
        {clips.map((clip) => {
          const c = characterById(clip.characterId);
          return (
            <li key={clip.id} className="clip">
              <Avatar character={c} mouth={playing === clip.id ? 0.5 : 0} size={48} />
              <div className="clip-text">
                <strong>“{clip.text}”</strong>
                <span>
                  {c.displayName} · {new Date(clip.createdAt).toLocaleString()} · {clip.durationSec.toFixed(1)} s
                </span>
              </div>
              <div className="clip-actions">
                <button onClick={() => play(clip)} aria-label={`Play “${clip.text}”`}>
                  ▶
                </button>
                <button onClick={() => share(clip)} aria-label={`Share “${clip.text}”`}>
                  Share
                </button>
                <button onClick={() => remove(clip)} aria-label={`Delete “${clip.text}”`}>
                  🗑
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
