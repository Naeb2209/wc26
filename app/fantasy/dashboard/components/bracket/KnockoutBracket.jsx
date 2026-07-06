'use client';

import { useMemo, useState } from 'react';
import BracketSide from './BracketSide';
import CenterStage from './CenterStage';
import './bracket.css';

const BRACKET_ORDER = [
  { label: 'Vòng 32 Đội', key: 'r32' },
  { label: 'Vòng 16 Đội', key: 'r16' },
  { label: 'Tứ Kết', key: 'qf' },
  { label: 'Bán Kết', key: 'sf' },
];

function extractMatchesByStage(schedule = {}) {
  const stages = {
    r32: [],
    r16: [],
    qf: [],
    sf: [],
    tp: null,
    f: null,
  };

  BRACKET_ORDER.forEach(({ label, key }) => {
    const stage = schedule[label];

    if (!stage?.matches) return;

    stages[key] = Object.values(stage.matches).flat();
  });

  const thirdPlace = schedule['Tranh Hạng Ba'];
  if (thirdPlace?.matches) {
    stages.tp = Object.values(thirdPlace.matches).flat()[0] ?? null;
  }

  const final = schedule['Chung Kết'];
  if (final?.matches) {
    stages.f = Object.values(final.matches).flat()[0] ?? null;
  }

  return stages;
}

function splitBracket(matches = []) {
  const middle = Math.ceil(matches.length / 2);

  return {
    left: matches.slice(0, middle),
    right: matches.slice(middle).reverse(),
  };
}

export default function KnockoutBracket({ schedule }) {
  const [hoveredPath, setHoveredPath] = useState(null);

  const stages = useMemo(
    () => extractMatchesByStage(schedule),
    [schedule]
  );

  const hasData = Object.values(stages).some((value) =>
    Array.isArray(value) ? value.length > 0 : value !== null
  );

  if (!hasData) {
    return (
      <section className="knockout-empty-state">
        <header className="knockout-header">
          ROAD TO WORLD CUP 2026 FINAL
        </header>

        <div className="knockout-empty-state__body">
          <span
            className="material-symbols-outlined icon"
            aria-hidden="true"
          >
            schedule
          </span>

          <h3>Knockout Stage</h3>

          <p>
            The tournament bracket will automatically appear once
            qualification is complete.
          </p>
        </div>
      </section>
    );
  }

  const r32 = splitBracket(stages.r32);
  const r16 = splitBracket(stages.r16);
  const qf = splitBracket(stages.qf);
  const sf = splitBracket(stages.sf);

  return (
    <section className="knockout-shell">

      <header className="knockout-header">
        ROAD TO WORLD CUP 2026 FINAL
      </header>

      <div className="knockout-body">

        <div className="knockout-body__container">

          <BracketSide
            side="left"
            stages={{
              r32: r32.left,
              r16: r16.left,
              qf: qf.left,
              sf: sf.left,
            }}
            hoveredPath={hoveredPath}
            onPathHover={setHoveredPath}
          />

          <CenterStage
            finalMatch={stages.f}
            thirdPlaceMatch={stages.tp}
            activeSide={hoveredPath?.side}
          />

          <BracketSide
            side="right"
            stages={{
              r32: r32.right,
              r16: r16.right,
              qf: qf.right,
              sf: sf.right,
            }}
            hoveredPath={hoveredPath}
            onPathHover={setHoveredPath}
          />

        </div>

      </div>

      <footer className="knockout-footer">
        Hover or focus a match to highlight its tournament path.
      </footer>

    </section>
  );
}
