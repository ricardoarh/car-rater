import { Link, useNavigate } from 'react-router-dom';
import { APP_NAME, APP_TAGLINE } from '../constants/app';
import { useLatestDraft, useSavedCars } from '../hooks/useCars';
import { carTitle, pickFavourite } from '../services/ratingService';
import { CarListItem } from '../components/car/CarListItem';
import { Button } from '../components/ui/Button';
import { CarRaterLogo, ChevronRight, GearIcon, HeartIcon, PlusIcon } from '../components/layout/Icons';
import { HeroBanner } from '../components/layout/HeroBanner';
import './HomeScreen.css';

export function HomeScreen() {
  const navigate = useNavigate();
  const cars = useSavedCars();
  const draft = useLatestDraft();

  const loading = cars === undefined;
  const list = cars ?? [];
  const recent = [...list].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3);
  const favourite = pickFavourite(list);
  const dealbreakers = list.filter((c) => c.dealbreaker).length;

  return (
    <div className="screen screen-enter">
      <header className="home-header">
        <div className="home-header__brand">
          <CarRaterLogo size={46} />
          <div>
            <h1 className="home-header__title">{APP_NAME}</h1>
            <p className="home-header__tagline">{APP_TAGLINE}</p>
          </div>
        </div>
        <Link to="/more" className="home-header__settings" aria-label="Settings">
          <GearIcon size={23} />
        </Link>
      </header>

      <HeroBanner />

      <ul className="stats" aria-label="Your shortlist so far">
        <li className="stat">
          <span className="stat__value num">{loading ? '–' : list.length}</span>
          <span className="stat__label">Cars rated</span>
        </li>
        <li className="stat">
          <span className="stat__value stat__value--text">
            {favourite ? carTitle(favourite) : '—'}
          </span>
          <span className="stat__label">Favourite</span>
        </li>
        <li className="stat">
          <span className="stat__value num">{loading ? '–' : dealbreakers}</span>
          <span className="stat__label">Dealbreakers</span>
        </li>
      </ul>

      <Button
        size="lg"
        full
        icon={<PlusIcon size={19} />}
        onClick={() => navigate('/new')}
        className="home-cta"
      >
        Rate a Car
      </Button>

      {draft && (
        <Link to={`/car/${draft.id}/rate`} className="draft-banner">
          <span className="draft-banner__text">
            <strong>Carry on where you left off</strong>
            <span>{carTitle(draft)} is still a draft</span>
          </span>
          <ChevronRight />
        </Link>
      )}

      {list.length === 0 && !loading ? (
        <section className="empty">
          <span className="empty__art" aria-hidden="true">
            <HeartIcon size={30} />
          </span>
          <h2 className="empty__title">No cars rated yet</h2>
          <p className="empty__body">Time to find some contenders.</p>
          <Button onClick={() => navigate('/new')} icon={<PlusIcon size={18} />}>
            Rate your first car
          </Button>
        </section>
      ) : (
        <section className="home-recent">
          <div className="home-recent__head">
            <h2 className="section-title">Recent Cars</h2>
            <Link to="/cars" className="see-all">
              See all <ChevronRight size={16} />
            </Link>
          </div>
          <ul>
            {recent.map((car) => (
              <li key={car.id}>
                <CarListItem car={car} variant="compact" />
              </li>
            ))}
            {loading &&
              [0, 1, 2].map((i) => <li key={i} className="car-skeleton" aria-hidden="true" />)}
          </ul>
        </section>
      )}
    </div>
  );
}
