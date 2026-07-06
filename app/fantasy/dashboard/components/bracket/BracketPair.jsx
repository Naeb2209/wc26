'use client';

import MatchCard from './MatchCard';

/**
 * BracketPair
 *
 * Represents one tournament fixture inside a stage.
 *
 * Responsibilities
 * ----------------
 * • Render one MatchCard
 * • Expose connector anchor elements
 * • Provide CSS hooks for connector rendering
 * • Expose metadata through data-* attributes
 *
 * Connector lines are rendered entirely by bracket.css.
 */

export default function BracketPair({
  match,
  round,
  side,
  slotIndex,
  connectorDirection = 'down',
  showIncomingConnector = true,
  showOutgoingConnector = true,
  connectsToCenter = false,
  isPathActive = false,
  onPathEnter,
  onPathLeave,
}) {
  const teamKey =
    [
      match?.homeCode,
      match?.awayCode,
    ]
      .filter(Boolean)
      .join('-')
      .toLowerCase();

  return (
    <section
      className={[
        'bracket-pair',
        `bracket-pair--${round}`,
        `bracket-pair--${side}`,
        connectsToCenter ? 'bracket-pair--connects-center' : '',
        isPathActive ? 'bracket-pair--path-active' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-round={round}
      data-side={side}
      data-slot={slotIndex}
      data-connector-direction={connectorDirection}
      data-match-id={match?.id ?? ''}
      data-teams={teamKey}
      data-connects-center={connectsToCenter}
      tabIndex={0}
      onMouseEnter={onPathEnter}
      onMouseLeave={onPathLeave}
      onFocus={onPathEnter}
      onBlur={onPathLeave}
    >
      {/* Incoming connector anchor */}
      {showIncomingConnector && (
        <span
          className="connector connector-start"
          aria-hidden="true"
        />
      )}

      {/* Match Card */}
      <div className="pair-node">
        <MatchCard match={match} />
      </div>

      {/* Outgoing connector anchor */}
      {showOutgoingConnector && (
        <span
          className="connector connector-end"
          aria-hidden="true"
        />
      )}
    </section>
  );
}
