'use client';

import TeamRow from './TeamRow';

function formatMatchDate(match) {
  if (!match?.date && !match?.time) return '';

  if (match?.date && match?.time) {
    return [match.date, match.time].join(' - ');
  }

  return match.date ?? match.time;
}

function getMatchStatus(match) {
  if (!match) return 'UPCOMING';

  if (match.status) {
    const status = match.status.toUpperCase();

    if (['FT', 'FULL_TIME', 'FULLTIME', 'FINISHED'].includes(status)) {
      return 'FINISHED';
    }

    if (['LIVE', 'IN_PLAY', 'INPLAY', '1H', '2H', 'HT'].includes(status)) {
      return 'LIVE';
    }

    if (['SCHEDULED', 'TIMED', 'TBD', 'UPCOMING'].includes(status)) {
      return 'UPCOMING';
    }

    return status;
  }

  if (
    match.homeScore != null &&
    match.awayScore != null
  ) {
    return 'FINISHED';
  }

  return 'UPCOMING';
}

function getStatusClass(status) {
  switch (status) {
    case 'LIVE':
      return 'match-card__status match-card__status--live';

    case 'FINISHED':
      return 'match-card__status match-card__status--finished';

    default:
      return 'match-card__status match-card__status--upcoming';
  }
}

export default function MatchCard({ match }) {
  const status = getMatchStatus(match);

  const homeScore =
    match?.homeScore ??
    match?.score?.home ??
    '-';

  const awayScore =
    match?.awayScore ??
    match?.score?.away ??
    '-';

  const homeWinner =
    homeScore !== '-' &&
    awayScore !== '-' &&
    Number(homeScore) > Number(awayScore);

  const awayWinner =
    homeScore !== '-' &&
    awayScore !== '-' &&
    Number(awayScore) > Number(homeScore);

  return (
    <article
      className="match-card"
      data-status={status.toLowerCase()}
    >
      <header className="match-card__header">

        <span className="match-card__date">
          {formatMatchDate(match)}
        </span>

        <span className={getStatusClass(status)}>
          {status}
        </span>

      </header>

      <div className="match-card__body">

        <TeamRow
          flag={match?.homeFlag}
          code={match?.homeCode ?? 'TBD'}
          score={homeScore}
          winner={homeWinner}
        />

        <TeamRow
          flag={match?.awayFlag}
          code={match?.awayCode ?? 'TBD'}
          score={awayScore}
          winner={awayWinner}
        />

      </div>

      {match?.venue && (
        <footer className="match-card__footer">

          <span
            className="material-symbols-outlined"
            aria-hidden="true"
          >
            location_on
          </span>

          <span>
            {match.venue}
          </span>

        </footer>
      )}
    </article>
  );
}
