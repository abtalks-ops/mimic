import type { Character } from './registry';

/** Original flat 2D avatar. `mouth` is 0..1 openness, driven by playback loudness. */
export function Avatar({ character, mouth, size = 120 }: { character: Character; mouth: number; size?: number }) {
  const { skin, accent, hair } = character.colors;
  const open = 4 + mouth * 22;
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} aria-hidden="true">
      <circle cx="100" cy="100" r="96" fill={accent} opacity="0.18" />
      <Hair look={character.look} color={hair} />
      <ellipse cx="100" cy="108" rx="58" ry="64" fill={skin} stroke="#2b2140" strokeWidth="4" />
      <Eyes look={character.look} accent={accent} />
      <Extras look={character.look} accent={accent} />
      <ellipse
        cx="100"
        cy="140"
        rx={character.look === 'shades' || character.look === 'headset' ? 20 : 16}
        ry={open / 2}
        fill={character.look === 'glam' || character.look === 'popstar' ? accent : '#2b2140'}
        stroke="#2b2140"
        strokeWidth="3"
      />
    </svg>
  );
}

function Hair({ look, color }: { look: Character['look']; color: string }) {
  switch (look) {
    case 'shades':
      return <path d="M45 85 L55 40 L75 60 L90 30 L105 58 L125 32 L135 62 L155 45 L155 88 Z" fill={color} />;
    case 'glam':
      return (
        <path
          d="M35 120 C20 60 60 20 100 22 C140 20 180 60 165 120 C160 160 150 175 150 175 L50 175 C50 175 40 160 35 120 Z"
          fill={color}
        />
      );
    case 'headset':
      return <path d="M48 90 C48 50 70 38 100 38 C130 38 152 50 152 90 Z" fill={color} />;
    case 'popstar':
      return (
        <g fill={color}>
          <circle cx="52" cy="62" r="26" />
          <circle cx="148" cy="62" r="26" />
          <path d="M50 95 C50 50 75 40 100 40 C125 40 150 50 150 95 Z" />
        </g>
      );
  }
}

function Eyes({ look, accent }: { look: Character['look']; accent: string }) {
  if (look === 'shades')
    return (
      <g>
        <rect x="56" y="86" width="38" height="24" rx="10" fill="#2b2140" />
        <rect x="106" y="86" width="38" height="24" rx="10" fill="#2b2140" />
        <rect x="92" y="92" width="16" height="5" fill="#2b2140" />
        <rect x="62" y="90" width="12" height="5" rx="2" fill="#fff" opacity="0.5" />
      </g>
    );
  if (look === 'popstar')
    return (
      <g>
        <path d="M70 88 l6 12 l13 2 l-10 8 l3 13 l-12 -7 l-12 7 l3 -13 l-10 -8 l13 -2 Z" fill={accent} />
        <ellipse cx="124" cy="100" rx="8" ry="10" fill="#2b2140" />
      </g>
    );
  return (
    <g>
      <ellipse cx="78" cy="98" rx="8" ry="10" fill="#2b2140" />
      <ellipse cx="122" cy="98" rx="8" ry="10" fill="#2b2140" />
      <path
        d={look === 'headset' ? 'M64 82 L92 86 M108 86 L136 82' : 'M66 84 Q78 76 90 84 M110 84 Q122 76 134 84'}
        stroke="#2b2140"
        strokeWidth={look === 'headset' ? 7 : 4}
        fill="none"
        strokeLinecap="round"
      />
    </g>
  );
}

function Extras({ look, accent }: { look: Character['look']; accent: string }) {
  if (look === 'glam') return <circle cx="138" cy="130" r="3" fill="#2b2140" />;
  if (look === 'headset')
    return (
      <g stroke="#2b2140" strokeWidth="4">
        <path d="M40 110 C40 50 160 50 160 110" fill="none" stroke={accent} strokeWidth="8" />
        <rect x="30" y="100" width="18" height="30" rx="6" fill={accent} />
        <rect x="152" y="100" width="18" height="30" rx="6" fill={accent} />
        <path d="M40 130 Q55 160 82 146" fill="none" />
        <circle cx="84" cy="145" r="5" fill="#2b2140" />
      </g>
    );
  if (look === 'popstar')
    return (
      <g fill={accent}>
        <circle cx="70" cy="128" r="6" opacity="0.4" />
        <circle cx="132" cy="128" r="6" opacity="0.4" />
      </g>
    );
  return null;
}
