'use client';

import MatchCard from './MatchCard';

/**
 * CenterStage
 *
 * Hero component of the tournament bracket.
 *
 * Responsibilities
 * ----------------
 * • Display World Cup Trophy
 * • Display Final Match
 * • Display Third Place Match
 * • Provide center anchor for connector system
 */

export default function CenterStage({
  finalMatch,
  thirdPlaceMatch,
  activeSide,
}) {
  return (
    <section
      className={[
        'center-stage',
        activeSide ? `center-stage--path-${activeSide}` : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Tournament Finals"
    >
      <span
        className="center-stage__connector center-stage__connector--left"
        aria-hidden="true"
      />

      <span
        className="center-stage__connector center-stage__connector--right"
        aria-hidden="true"
      />

      <div className="center-stage__content">

        {/* Trophy */}

        <div className="center-stage__hero">

          <div
            className="center-stage__trophy"
            aria-hidden="true"
          >
            🏆
          </div>

          <span className="center-stage__subtitle">
            FIFA WORLD CUP
          </span>

          <h2 className="center-stage__title">
            FINAL
          </h2>

        </div>

        {/* Final */}

        <div className="center-stage__match">

          {finalMatch ? (
            <MatchCard match={finalMatch} />
          ) : (
            <div className="center-stage__placeholder">

              <span
                className="material-symbols-outlined"
                aria-hidden="true"
              >

                schedule

              </span>

              <p>
                Final fixture will appear once confirmed.
              </p>

            </div>
          )}

        </div>

        {/* Third Place */}

        {thirdPlaceMatch && (
          <div className="center-stage__third">

            <span className="center-stage__third-label">
              THIRD PLACE
            </span>

            <MatchCard match={thirdPlaceMatch} />

          </div>
        )}

      </div>
    </section>
  );
}
