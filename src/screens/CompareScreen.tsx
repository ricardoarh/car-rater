import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSavedCars } from '../hooks/useCars';
import { RATING_CATEGORIES } from '../constants/ratings';
import { CAR_FEATURE_BY_KEY } from '../constants/features';
import {
  carCustomFeatures,
  hasFeature,
  retiredCarFeatures,
} from '../services/featuresService';
import {
  useActiveFeatureOrder,
  useActiveFeatures,
} from '../hooks/feature-preferences-context';
import { HEADACHE_LABEL, MAX_COMPARE, MIN_COMPARE } from '../constants/app';
import { carTitle, formatScore } from '../services/ratingService';
import {
  carFactLines,
  formatMileage,
  formatPrice,
  formatTransmission,
  formatYear,
} from '../utils/format';
import { sortCars } from '../services/sortService';
import type { Car } from '../types/models';
import { CarThumb } from '../components/car/CarThumb';
import { VerdictPill } from '../components/ui/VerdictPill';
import { Button } from '../components/ui/Button';
import { Sheet } from '../components/ui/Sheet';
import { CheckIcon } from '../components/layout/Icons';
import './CompareScreen.css';

const STORAGE_KEY = 'car-rater:compare';

function readStored(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

/** Best value in a row gets the subtle highlight, but only when there is a winner. */
function bestIndexes(values: (number | null)[]): Set<number> {
  const present = values.filter((v): v is number => v !== null);
  if (present.length < 2) return new Set();
  const max = Math.max(...present);
  const winners = values.reduce<number[]>(
    (acc, value, index) => (value === max ? [...acc, index] : acc),
    [],
  );
  return winners.length === values.filter((v) => v !== null).length
    ? new Set()
    : new Set(winners);
}

/**
 * Factual rows shown above the subjective ratings.
 *
 * These are never highlighted as a "winner": lower mileage is not automatically
 * better (it may be a worse car), and a lower price is not automatically better
 * (it may be a lesser spec). Car Rater states the facts and leaves the judging
 * to the star categories.
 */
const FACT_ROWS: { key: string; label: string; value: (car: Car) => string | null }[] = [
  { key: 'year', label: 'Year', value: (car) => formatYear(car.year) },
  {
    key: 'transmission',
    label: 'Transmission',
    value: (car) => formatTransmission(car.transmission),
  },
  { key: 'mileage', label: 'Mileage', value: (car) => formatMileage(car.mileage) },
  { key: 'price', label: 'Price', value: (car) => formatPrice(car.price) },
];

export function CompareScreen() {
  const cars = useSavedCars();
  const activeFeatures = useActiveFeatures();
  const activeOrder = useActiveFeatureOrder();
  const [selected, setSelected] = useState<string[]>(readStored);
  const [picking, setPicking] = useState(false);

  const available = useMemo(() => sortCars(cars ?? [], 'overall'), [cars]);

  // Drop ids for cars that no longer exist.
  useEffect(() => {
    if (!cars) return;
    const live = new Set(cars.map((c) => c.id));
    setSelected((current) => {
      const next = current.filter((id) => live.has(id));
      return next.length === current.length ? current : next;
    });
  }, [cars]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selected));
  }, [selected]);

  const chosen: Car[] = selected
    .map((id) => available.find((c) => c.id === id))
    .filter((c): c is Car => Boolean(c));

  const toggle = (id: string) => {
    setSelected((current) => {
      if (current.includes(id)) return current.filter((c) => c !== id);
      if (current.length >= MAX_COMPARE) return current;
      return [...current, id];
    });
  };

  const ready = chosen.length >= MIN_COMPARE;

  /*
   * The "Also has" cell: this car's own extras — its custom features, plus any
   * built-in feature it recorded before that feature left the checklist. Both
   * are things one car has and the matrix has no row for, so they belong in the
   * same place. Still purely factual — nothing here is scored or highlighted.
   */
  const extrasFor = (car: Car): string[] => [
    ...retiredCarFeatures(car, activeOrder).map((key) => CAR_FEATURE_BY_KEY[key].shortLabel),
    ...carCustomFeatures(car),
  ];

  return (
    <div className="screen screen--wide screen-enter compare">
      <header className="compare__head">
        <div>
          <h1 className="compare__title">Compare</h1>
          <p className="compare__subtitle">
            {chosen.length === 0
              ? 'Pick two to four cars'
              : `${chosen.length} car${chosen.length === 1 ? '' : 's'} selected`}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setPicking(true)}>
          {chosen.length === 0 ? 'Choose cars' : 'Edit'}
        </Button>
      </header>

      {!ready ? (
        <div className="compare__empty">
          <h2 className="empty__title">
            {available.length < MIN_COMPARE ? 'Not enough cars yet' : 'Choose cars to compare'}
          </h2>
          <p className="empty__body">
            {available.length < MIN_COMPARE
              ? `Rate at least ${MIN_COMPARE} cars and they will show up here side by side.`
              : `Pick ${MIN_COMPARE}–${MAX_COMPARE} cars to see them side by side.`}
          </p>
          {available.length >= MIN_COMPARE && (
            <Button onClick={() => setPicking(true)}>Choose cars</Button>
          )}
        </div>
      ) : (
        <div className="compare__scroller">
          <table
            className="compare__table"
            style={{ ['--cols' as string]: String(chosen.length) }}
          >
            <caption className="visually-hidden">
              Side-by-side comparison of {chosen.map(carTitle).join(', ')}
            </caption>
            <thead>
              <tr>
                <th scope="col">
                  <span className="visually-hidden">Category</span>
                </th>
                {chosen.map((car) => (
                  <th scope="col" key={car.id}>
                    <Link to={`/car/${car.id}`} className="compare__car">
                      <CarThumb
                        carId={car.id}
                        coverPhotoId={car.coverPhotoId}
                        size="fill"
                        alt=""
                      />
                      <span className="compare__car-name">{carTitle(car)}</span>
                      {car.dealbreaker && (
                        <span className="compare__flag" title="Dealbreaker">
                          🚩<span className="visually-hidden">Dealbreaker</span>
                        </span>
                      )}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FACT_ROWS.map((row) => (
                <tr key={row.key} className="compare__fact">
                  <th scope="row">{row.label}</th>
                  {chosen.map((car) => {
                    const value = row.value(car);
                    return (
                      <td key={car.id} className="num">
                        {value ?? (
                          <span aria-hidden="true">—</span>
                        )}
                        {value === null && (
                          <span className="visually-hidden">Not recorded</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {RATING_CATEGORIES.map((category, categoryIndex) => {
                const values = chosen.map((car) => car.ratings[category.key]);
                const best = bestIndexes(values);
                return (
                  <tr
                    key={category.key}
                    className={categoryIndex === 0 ? 'compare__divider' : undefined}
                  >
                    <th scope="row">{category.shortLabel}</th>
                    {values.map((value, index) => (
                      <td
                        key={chosen[index].id}
                        className={`num${best.has(index) ? ' is-best' : ''}`}
                      >
                        {value === null ? '—' : value.toFixed(1)}
                        {best.has(index) && <span className="visually-hidden"> (highest)</span>}
                      </td>
                    ))}
                  </tr>
                );
              })}

              {(activeFeatures.length > 0 || chosen.some((car) => extrasFor(car).length > 0)) && (
                <tr className="compare__section">
                  <th scope="rowgroup" colSpan={chosen.length + 1}>
                    Features
                  </th>
                </tr>
              )}
              {/* Rows follow the user's own checklist order. A feature they have
                  retired is not a row — comparing every car against something
                  they stopped tracking is noise — but it is not lost either: it
                  reappears per car in "Also has" below. */}
              {activeFeatures.map((feature) => (
                <tr key={feature.key} className="compare__fact">
                  <th scope="row" title={feature.label}>
                    {feature.shortLabel}
                  </th>
                  {chosen.map((car) => {
                    const has = hasFeature(car, feature.key);
                    return (
                      <td key={car.id} className={`compare__has${has ? ' is-yes' : ''}`}>
                        <span aria-hidden="true">{has ? '✓' : '—'}</span>
                        <span className="visually-hidden">
                          {has ? 'Yes' : 'Not recorded'}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {chosen.some((car) => extrasFor(car).length > 0) && (
                <tr className="compare__fact compare__custom">
                  <th scope="row">Also has</th>
                  {chosen.map((car) => {
                    const extras = extrasFor(car);
                    return (
                      <td key={car.id}>
                        {extras.length === 0 ? (
                          <>
                            <span aria-hidden="true">—</span>
                            <span className="visually-hidden">Nothing recorded</span>
                          </>
                        ) : (
                          <span className="compare__custom-list">
                            {extras.map((name) => (
                              <span className="compare__custom-chip" key={name}>
                                {name}
                              </span>
                            ))}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              )}

              <tr className="compare__divider">
                <th scope="row">Headache</th>
                {chosen.map((car) => (
                  <td key={car.id}>
                    <span className={`headache headache--${car.headachePotential}`}>
                      {HEADACHE_LABEL[car.headachePotential]}
                    </span>
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row">Euro NCAP</th>
                {chosen.map((car) => (
                  <td key={car.id} className="num">
                    {car.euroNcapStars ? `${car.euroNcapStars}★` : '—'}
                    {car.euroNcapYear ? (
                      <span className="compare__sub num"> {car.euroNcapYear}</span>
                    ) : null}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row">Dealbreaker</th>
                {chosen.map((car) => (
                  <td key={car.id}>
                    {car.dealbreaker ? (
                      <span className="compare__yes-flag">🚩 Yes</span>
                    ) : (
                      <span className="muted">No</span>
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row">Verdict</th>
                {chosen.map((car) => (
                  <td key={car.id}>
                    <VerdictPill verdict={car.verdict} size="sm" />
                  </td>
                ))}
              </tr>

              <tr className="compare__overall">
                <th scope="row">Overall</th>
                {chosen.map((car) => (
                  <td key={car.id}>
                    <span
                      className={`compare__score compare__score--${car.verdict ?? 'none'}`}
                    >
                      {formatScore(car.overallScore)}
                    </span>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <Sheet
        open={picking}
        onClose={() => setPicking(false)}
        title={`Choose up to ${MAX_COMPARE} cars`}
      >
        {available.length === 0 ? (
          <p className="muted">Rate a car first and it will appear here.</p>
        ) : (
          <ul className="pick-list">
            {available.map((car) => {
              const on = selected.includes(car.id);
              const disabled = !on && selected.length >= MAX_COMPARE;
              return (
                <li key={car.id}>
                  <button
                    type="button"
                    className={`pick-list__item${on ? ' is-on' : ''}`}
                    onClick={() => toggle(car.id)}
                    disabled={disabled}
                    aria-pressed={on}
                  >
                    <CarThumb carId={car.id} coverPhotoId={car.coverPhotoId} size="sm" />
                    <span className="pick-list__text">
                      <span className="pick-list__name">{carTitle(car)}</span>
                      {carFactLines(car).primary && (
                        <span className="pick-list__trim">{carFactLines(car).primary}</span>
                      )}
                    </span>
                    <span className="pick-list__score num">
                      {formatScore(car.overallScore)}
                    </span>
                    <span className="pick-list__check">{on && <CheckIcon size={18} />}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <Button full className="pick-list__done" onClick={() => setPicking(false)}>
          {selected.length < MIN_COMPARE
            ? `Pick at least ${MIN_COMPARE}`
            : `Compare ${selected.length} cars`}
        </Button>
      </Sheet>
    </div>
  );
}
