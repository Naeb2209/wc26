'use client';

import StageColumn from './StageColumn';

/**
 * Tournament stages rendered on each side.
 *
 * Left:
 * R32 → R16 → QF → SF
 *
 * Right:
 * SF ← QF ← R16 ← R32
 */

const STAGE_CONFIG = [
  {
    key: 'r32',
    title: 'R32',
  },
  {
    key: 'r16',
    title: 'R16',
  },
  {
    key: 'qf',
    title: 'QF',
  },
  {
    key: 'sf',
    title: 'SF',
  },
];

export default function BracketSide({
  side = 'left',
  stages = {},
  hoveredPath = null,
  onPathHover,
}) {
  const orderedStages =
    side === 'right'
      ? [...STAGE_CONFIG].reverse()
      : STAGE_CONFIG;

  return (
    <aside
      className={`bracket-side bracket-side--${side}`}
      data-side={side}
    >
      {orderedStages.map((stage) => (
        <StageColumn
          key={stage.key}
          title={stage.title}
          round={stage.key}
          side={side}
          matches={stages[stage.key] ?? []}
          isOuterStage={stage.key === 'r32'}
          connectsToCenter={stage.key === 'sf'}
          hoveredPath={hoveredPath}
          onPathHover={onPathHover}
        />
      ))}
    </aside>
  );
}
