'use client';

import BracketPair from './BracketPair';

/**
 * Virtual slot count for each tournament round.
 *
 * These slots are only used for vertical positioning.
 * Connector rendering is handled completely by CSS.
 */
const SLOT_COUNT = 16;

const ROUND_SPAN = {
  r32: 2,
  r16: 4,
  qf: 8,
  sf: 16,
};

const ROUND_MAP = {
  R32: 'r32',
  R16: 'r16',
  QF: 'qf',
  SF: 'sf',
};

/**
 * Calculate the virtual slot position of each match.
 *
 * Example
 *
 * R32
 * slot 1
 * slot 2
 * ...
 *
 * R16
 * slot 2
 * slot 6
 * slot 10
 * ...
 */
function createSlots(round, matches) {
  if (!matches.length) {
    return [];
  }

  const span = ROUND_SPAN[round] ?? Math.max(1, Math.floor(SLOT_COUNT / matches.length));

  return matches.map((_, index) => ({
    slot: index * span + 1,
    span,
    connectorDirection: index % 2 === 0 ? 'down' : 'up',
    pathStart: index * span,
    pathEnd: index * span + span - 1,
  }));
}

function pathsOverlap(path, slot) {
  if (!path || path.side !== slot.side) return false;

  return path.start <= slot.pathEnd && path.end >= slot.pathStart;
}

export default function StageColumn({
  title,
  round: roundKey,
  matches = [],
  side = 'left',
  isOuterStage = false,
  connectsToCenter = false,
  hoveredPath = null,
  onPathHover,
}) {
  const round = roundKey ?? ROUND_MAP[title] ?? title.toLowerCase();

  const slots = createSlots(round, matches);
  const showIncomingConnector = !isOuterStage;
  const showOutgoingConnector = matches.length > 0;

  return (
    <section
      className={`stage-column stage-column--${round} stage-column--${side}`}
      data-round={round}
      data-side={side}
    >
      <header className="stage-column__header">
        <span className="stage-column__title">
          {title}
        </span>
      </header>

      <div
        className={`stage-column__pairs stage-column__pairs--${round}`}
        style={{
          '--slot-count': SLOT_COUNT,
        }}
      >
        {matches.map((match, index) => {
          const slot = {
            side,
            ...(slots[index] ?? {
              slot: 1,
              span: 1,
              connectorDirection: 'down',
              pathStart: index,
              pathEnd: index,
            }),
          };
          const isPathActive = pathsOverlap(hoveredPath, slot);

          return (
            <div
              key={match?.id ?? `${round}-${index}`}
              className="stage-slot"
              style={{
                gridRow: `${slot.slot} / span ${slot.span}`,
                '--connector-span': slot.span,
              }}
            >
              <BracketPair
                match={match}
                round={round}
                side={side}
                slotIndex={slot.slot}
                connectorDirection={slot.connectorDirection}
                showIncomingConnector={showIncomingConnector}
                showOutgoingConnector={showOutgoingConnector}
                connectsToCenter={connectsToCenter}
                isPathActive={isPathActive}
                onPathEnter={() =>
                  onPathHover?.({
                    side,
                    start: slot.pathStart,
                    end: slot.pathEnd,
                  })
                }
                onPathLeave={() => onPathHover?.(null)}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
