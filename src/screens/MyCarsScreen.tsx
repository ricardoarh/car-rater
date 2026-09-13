import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSavedCars } from '../hooks/useCars';
import {
  SORT_OPTIONS,
  VERDICT_FILTERS,
  filterCars,
  sortCars,
  type SortKey,
  type VerdictFilter,
} from '../services/sortService';
import { CarListItem } from '../components/car/CarListItem';
import { Button } from '../components/ui/Button';
import { Sheet } from '../components/ui/Sheet';
import { CheckIcon, ChevronDown, PlusIcon, SortIcon } from '../components/layout/Icons';
import './MyCarsScreen.css';

const SORT_STORAGE = 'car-rater:sort';

export function MyCarsScreen() {
  const navigate = useNavigate();
  const cars = useSavedCars();
  const [sort, setSort] = useState<SortKey>(
    () => (localStorage.getItem(SORT_STORAGE) as SortKey) || 'overall',
  );
  const [filter, setFilter] = useState<VerdictFilter>('all');
  const [sortOpen, setSortOpen] = useState(false);

  const list = useMemo(
    () => sortCars(filterCars(cars ?? [], filter), sort),
    [cars, filter, sort],
  );

  const activeLabel = SORT_OPTIONS.find((o) => o.key === sort)?.label ?? 'Overall score';
  const total = cars?.length ?? 0;

  const chooseSort = (key: SortKey) => {
    setSort(key);
    localStorage.setItem(SORT_STORAGE, key);
    setSortOpen(false);
  };

  return (
    <div className="screen screen-enter my-cars">
      <header className="my-cars__head">
        <h1 className="my-cars__title">My Cars</h1>
        <div className="my-cars__controls">
          <button
            type="button"
            className="my-cars__sort"
            onClick={() => setSortOpen(true)}
            aria-haspopup="dialog"
          >
            Sort by: <strong>{activeLabel}</strong>
            <ChevronDown size={16} />
          </button>
          <button
            type="button"
            className="my-cars__sort-icon"
            onClick={() => setSortOpen(true)}
            aria-label="Change sorting"
          >
            <SortIcon size={21} />
          </button>
        </div>
      </header>

      <div className="filters" role="group" aria-label="Filter by verdict">
        {VERDICT_FILTERS.map((option) => (
          <button
            key={option.key}
            type="button"
            className={`filter filter--${option.key}${filter === option.key ? ' is-on' : ''}`}
            aria-pressed={filter === option.key}
            onClick={() => setFilter(option.key)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {cars === undefined ? (
        <ul className="my-cars__list">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="car-skeleton" aria-hidden="true" />
          ))}
        </ul>
      ) : list.length === 0 ? (
        <div className="my-cars__empty">
          <h2 className="empty__title">
            {total === 0 ? 'No cars rated yet' : `Nothing marked ${filter.toUpperCase()}`}
          </h2>
          <p className="empty__body">
            {total === 0
              ? 'Time to find some contenders.'
              : 'Try another filter, or rate another car.'}
          </p>
        </div>
      ) : (
        <ul className="my-cars__list">
          {list.map((car) => (
            <li key={car.id}>
              <CarListItem car={car} />
            </li>
          ))}
        </ul>
      )}

      <Button
        size="lg"
        full
        icon={<PlusIcon size={19} />}
        onClick={() => navigate('/new')}
        className="my-cars__add"
      >
        Add Another Car
      </Button>

      <Sheet open={sortOpen} onClose={() => setSortOpen(false)} title="Sort by">
        <ul className="sort-list">
          {SORT_OPTIONS.map((option) => (
            <li key={option.key}>
              <button
                type="button"
                className={`sort-list__item${sort === option.key ? ' is-on' : ''}`}
                onClick={() => chooseSort(option.key)}
                aria-current={sort === option.key}
              >
                <span>{option.label}</span>
                {sort === option.key && <CheckIcon size={19} />}
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </div>
  );
}
