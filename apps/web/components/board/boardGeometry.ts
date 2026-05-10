export const VIEWBOX_SIZE = 600;
export const CENTER = VIEWBOX_SIZE / 2;

interface Ring {
  innerRadius: number;
  outerRadius: number;
  startCase: number;
  endCase: number;
}

const RING_OUTER: Ring = { innerRadius: 195, outerRadius: 285, startCase: 1, endCase: 27 };
const RING_MIDDLE: Ring = { innerRadius: 112, outerRadius: 195, startCase: 28, endCase: 55 };
const RING_INNER: Ring = { innerRadius: 37, outerRadius: 112, startCase: 56, endCase: 63 };

const RINGS: ReadonlyArray<Ring> = [RING_OUTER, RING_MIDDLE, RING_INNER];

export interface CaseGeometry {
  index: number;
  ring: 'outer' | 'middle' | 'inner';
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
  midAngle: number;
  centerX: number;
  centerY: number;
  path: string;
}

function ringFor(caseIndex: number): { ring: Ring; ringName: 'outer' | 'middle' | 'inner' } {
  for (const r of RINGS) {
    if (caseIndex >= r.startCase && caseIndex <= r.endCase) {
      const ringName = r === RING_OUTER ? 'outer' : r === RING_MIDDLE ? 'middle' : 'inner';
      return { ring: r, ringName };
    }
  }
  throw new Error(`Case index ${caseIndex} out of board range`);
}

function arcPath(
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number,
): string {
  const x1 = CENTER + innerRadius * Math.cos(startAngle);
  const y1 = CENTER + innerRadius * Math.sin(startAngle);
  const x2 = CENTER + outerRadius * Math.cos(startAngle);
  const y2 = CENTER + outerRadius * Math.sin(startAngle);
  const x3 = CENTER + outerRadius * Math.cos(endAngle);
  const y3 = CENTER + outerRadius * Math.sin(endAngle);
  const x4 = CENTER + innerRadius * Math.cos(endAngle);
  const y4 = CENTER + innerRadius * Math.sin(endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return [
    `M ${x1.toFixed(2)} ${y1.toFixed(2)}`,
    `L ${x2.toFixed(2)} ${y2.toFixed(2)}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x3.toFixed(2)} ${y3.toFixed(2)}`,
    `L ${x4.toFixed(2)} ${y4.toFixed(2)}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x1.toFixed(2)} ${y1.toFixed(2)}`,
    'Z',
  ].join(' ');
}

export function getCaseGeometry(caseIndex: number): CaseGeometry {
  const { ring, ringName } = ringFor(caseIndex);
  const ringSize = ring.endCase - ring.startCase + 1;
  const localIndex = caseIndex - ring.startCase;
  const segmentAngle = (2 * Math.PI) / ringSize;
  // Case 1 of each ring is centered at angle π/2 (bottom of viewport).
  // Cases progress clockwise (increasing angle in SVG coordinates).
  const startAngle = Math.PI / 2 + (localIndex - 0.5) * segmentAngle;
  const endAngle = startAngle + segmentAngle;
  const midAngle = (startAngle + endAngle) / 2;
  const midRadius = (ring.innerRadius + ring.outerRadius) / 2;
  const centerX = CENTER + midRadius * Math.cos(midAngle);
  const centerY = CENTER + midRadius * Math.sin(midAngle);
  return {
    index: caseIndex,
    ring: ringName,
    innerRadius: ring.innerRadius,
    outerRadius: ring.outerRadius,
    startAngle,
    endAngle,
    midAngle,
    centerX,
    centerY,
    path: arcPath(ring.innerRadius, ring.outerRadius, startAngle, endAngle),
  };
}

export function getAllCaseGeometries(): CaseGeometry[] {
  return Array.from({ length: 63 }, (_, i) => getCaseGeometry(i + 1));
}
