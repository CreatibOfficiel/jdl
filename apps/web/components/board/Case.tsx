import type { BoardCase, CaseType } from '@jeu-soiree/shared';
import type { CaseGeometry } from './boardGeometry';

const CASE_COLORS: Record<CaseType, { bg: string; fg: string; stroke: string }> = {
  neutral: { bg: '#F5F5F5', fg: '#1A1A1A', stroke: '#D4D4D4' },
  red_number: { bg: '#E63946', fg: '#FFFFFF', stroke: '#B82C38' },
  green_number: { bg: '#06A77D', fg: '#FFFFFF', stroke: '#04835F' },
  spades: { bg: '#1A1A1A', fg: '#FFFFFF', stroke: '#000000' },
  hearts: { bg: '#FFFFFF', fg: '#E63946', stroke: '#E63946' },
  diamonds: { bg: '#FFFFFF', fg: '#E63946', stroke: '#E63946' },
  clubs: { bg: '#1A1A1A', fg: '#FFFFFF', stroke: '#000000' },
  shop: { bg: '#F4A261', fg: '#1A1A1A', stroke: '#D88646' },
  formule1: { bg: '#FB5607', fg: '#FFFFFF', stroke: '#C84405' },
  usain: { bg: '#FFD60A', fg: '#1A1A1A', stroke: '#D9B500' },
  prison: { bg: '#6F4E37', fg: '#FFFFFF', stroke: '#503626' },
  hole: { bg: '#2B2D42', fg: '#FFFFFF', stroke: '#1A1B2E' },
  vacances: { bg: '#00B4D8', fg: '#1A1A1A', stroke: '#0090AE' },
  witch: { bg: '#7209B7', fg: '#FFFFFF', stroke: '#5A0791' },
  bromance: { bg: '#FF006E', fg: '#FFFFFF', stroke: '#CC0058' },
  pills: { bg: '#FB5607', fg: '#FFFFFF', stroke: '#C84405' },
  rail_de_bus: { bg: '#1D3557', fg: '#FFFFFF', stroke: '#0F1F36' },
  portal: { bg: '#4361EE', fg: '#FFFFFF', stroke: '#2944C7' },
};

const CASE_ICONS: Partial<Record<CaseType, string>> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  shop: '🛒',
  formule1: '🏎',
  usain: '⚡',
  prison: '🔒',
  hole: '🕳',
  vacances: '🌴',
  witch: '🧙',
  bromance: '💪',
  pills: '💊',
  rail_de_bus: '🎴',
  portal: '🌀',
};

const PORTAL_PAIR_LABELS = ['A', 'B'] as const;

interface CaseProps {
  geometry: CaseGeometry;
  data: BoardCase;
  isTreasure: boolean;
  isInThirstZone: boolean;
  highlight?: 'red' | 'blue' | 'green' | 'gold' | null;
}

export function Case({ geometry, data, isTreasure, isInThirstZone, highlight }: CaseProps) {
  const colors = CASE_COLORS[data.type];
  const icon = CASE_ICONS[data.type];
  const showsNumber = data.type === 'red_number' || data.type === 'green_number';
  const portalLabel =
    data.type === 'portal' && data.portalPairId !== undefined
      ? PORTAL_PAIR_LABELS[data.portalPairId]
      : undefined;

  return (
    <g>
      {highlight && (
        <circle
          cx={geometry.centerX}
          cy={geometry.centerY}
          r={28}
          fill="none"
          stroke={
            highlight === 'red'
              ? '#ef4444'
              : highlight === 'blue'
                ? '#3b82f6'
                : highlight === 'green'
                  ? '#22c55e'
                  : '#eab308'
          }
          strokeWidth={2.5}
          className="animate-case-glow"
        />
      )}
      <path d={geometry.path} fill={colors.bg} stroke={colors.stroke} strokeWidth={1.5} />
      {isInThirstZone && (
        <path
          d={geometry.path}
          fill="none"
          stroke="#E63946"
          strokeWidth={2}
          strokeDasharray="3 2"
          opacity={0.55}
        />
      )}
      {isTreasure && (
        <circle
          cx={geometry.centerX}
          cy={geometry.centerY}
          r={7}
          fill="#FFD60A"
          stroke="#1A1A1A"
          strokeWidth={1.5}
        />
      )}
      {showsNumber && data.numberValue !== undefined && (
        <text
          x={geometry.centerX}
          y={geometry.centerY + 6}
          textAnchor="middle"
          fill={colors.fg}
          fontSize={18}
          fontWeight={700}
        >
          {data.numberValue}
        </text>
      )}
      {icon && !portalLabel && (
        <text
          x={geometry.centerX}
          y={geometry.centerY + 6}
          textAnchor="middle"
          fill={colors.fg}
          fontSize={16}
        >
          {icon}
        </text>
      )}
      {portalLabel && (
        <text
          x={geometry.centerX}
          y={geometry.centerY + 6}
          textAnchor="middle"
          fill={colors.fg}
          fontSize={16}
          fontWeight={700}
        >
          🌀{portalLabel}
        </text>
      )}
      <text
        x={geometry.centerX}
        y={geometry.centerY - 10}
        textAnchor="middle"
        fill={colors.fg}
        fontSize={10}
        opacity={0.7}
      >
        {data.index}
      </text>
    </g>
  );
}
