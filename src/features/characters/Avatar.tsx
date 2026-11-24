import type { Character } from './registry';

/** Original flat 2D avatar. `mouth` is 0..1 openness, driven by playback loudness. */
export function Avatar({ character, mouth, size = 120 }: { character: Character; mouth: number; size?: number }) {
  const { skin, accent, hair } = character.colors;
  const isMax = character.id === 'max-blaze';
  const open = 4 + mouth * 22;
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} role="img" aria-label={`${character.displayName} avatar`}>
      <circle cx="100" cy="100" r="96" fill={accent} opacity="0.18" />
      {isMax ? (
        <path d="M45 85 L55 40 L75 60 L90 30 L105 58 L125 32 L135 62 L155 45 L155 88 Z" fill={hair} />
      ) : (
        <path d="M35 120 C20 60 60 20 100 22 C140 20 180 60 165 120 C160 160 150 175 150 175 L50 175 C50 175 40 160 35 120 Z" fill={hair} />
      )}
      <ellipse cx="100" cy="108" rx="58" ry="64" fill={skin} stroke="#2b2140" strokeWidth="4" />
      {isMax ? (
        <g>
          <rect x="56" y="86" width="38" height="24" rx="10" fill="#2b2140" />
          <rect x="106" y="86" width="38" height="24" rx="10" fill="#2b2140" />
          <rect x="92" y="92" width="16" height="5" fill="#2b2140" />
          <rect x="62" y="90" width="12" height="5" rx="2" fill="#fff" opacity="0.5" />
        </g>
      ) : (
        <g>
          <ellipse cx="78" cy="98" rx="8" ry="10" fill="#2b2140" />
          <ellipse cx="122" cy="98" rx="8" ry="10" fill="#2b2140" />
          <path d="M66 84 Q78 76 90 84 M110 84 Q122 76 134 84" stroke="#2b2140" strokeWidth="4" fill="none" strokeLinecap="round" />
          <circle cx="138" cy="130" r="3" fill="#2b2140" />
        </g>
      )}
      <ellipse cx="100" cy="140" rx={isMax ? 20 : 16} ry={open / 2} fill={isMax ? '#2b2140' : accent} stroke="#2b2140" strokeWidth="3" />
    </svg>
  );
}
