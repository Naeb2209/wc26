'use client';

/**
 * TeamRow
 *
 * Atomic component used across the Dashboard.
 *
 * Responsibilities
 * ----------------
 * • Display national flag
 * • Display team code / short name
 * • Display score
 * • Highlight winner
 *
 * No business logic.
 */

export default function TeamRow({
  flag,
  code = 'TBD',
  score = '-',
  winner = false,
}) {
  return (
    <div
      className={[
        'team-row',
        winner ? 'team-row--winner' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-winner={winner}
    >
      <div className="team-row__team">

        {flag ? (
          <img
            src={flag}
            alt=""
            className="team-row__flag"
            loading="lazy"
            draggable={false}
          />
        ) : (
          <div
            className="team-row__flag-placeholder"
            aria-hidden="true"
          />
        )}

        <span className="team-row__code">
          {code}
        </span>

      </div>

      <div className="team-row__score">
        {score}
      </div>
    </div>
  );
}
