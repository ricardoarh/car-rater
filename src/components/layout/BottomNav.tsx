import { NavLink } from 'react-router-dom';
import { CarIcon, CompareIcon, HomeIcon, MoreIcon } from './Icons';
import './BottomNav.css';

const ITEMS = [
  { to: '/', label: 'Home', Icon: HomeIcon, end: true },
  { to: '/cars', label: 'My Cars', Icon: CarIcon, end: false },
  { to: '/compare', label: 'Compare', Icon: CompareIcon, end: false },
  { to: '/more', label: 'More', Icon: MoreIcon, end: false },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Main">
      <ul className="bottom-nav__list">
        {ITEMS.map(({ to, label, Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `bottom-nav__item${isActive ? ' is-active' : ''}`
              }
            >
              {({ isActive }) => (
                <>
                  <span className="bottom-nav__icon">
                    <Icon size={23} />
                  </span>
                  <span className="bottom-nav__label">{label}</span>
                  {isActive && <span className="visually-hidden">(current page)</span>}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
