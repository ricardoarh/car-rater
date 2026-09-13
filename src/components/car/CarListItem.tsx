import { Link } from 'react-router-dom';
import type { Car } from '../../types/models';
import { carTitle, formatScore } from '../../services/ratingService';
import { carFactLines, joinFacts } from '../../utils/format';
import { formatFeatureCount } from '../../services/featuresService';
import { useActiveFeatureOrder } from '../../hooks/feature-preferences-context';
import { CarThumb } from './CarThumb';
import { DealbreakerFlag, VerdictPill } from '../ui/VerdictPill';
import { StarOutlineIcon } from '../layout/Icons';
import './CarListItem.css';

export interface CarListItemProps {
  car: Car;
  /** 'compact' is the Home "Recent Cars" row; 'full' is the My Cars row. */
  variant?: 'compact' | 'full';
}

export function CarListItem({ car, variant = 'full' }: CarListItemProps) {
  const activeOrder = useActiveFeatureOrder();
  const title = carTitle(car);
  const facts = carFactLines(car);
  // Metadata, never a score — hidden entirely when nothing is recorded.
  const features = formatFeatureCount(car, activeOrder);
  const spoken = joinFacts([facts.primary, facts.secondary, features]);

  return (
    <Link
      to={`/car/${car.id}`}
      className={`car-item car-item--${variant}`}
      aria-label={`${title}.${spoken ? ` ${spoken}.` : ''} Score ${formatScore(
        car.overallScore,
      )} out of 5. Verdict ${car.verdict ? car.verdict.toUpperCase() : 'not set'}.${
        car.dealbreaker ? ' Has a dealbreaker.' : ''
      }`}
    >
      <CarThumb carId={car.id} coverPhotoId={car.coverPhotoId} size="md" />
      <div className="car-item__text">
        <p className="car-item__title">{title}</p>
        {variant === 'full' ? (
          <>
            {facts.primary && <p className="car-item__facts">{facts.primary}</p>}
            {facts.secondary && (
              <p className="car-item__facts car-item__facts--money num">
                {facts.secondary}
              </p>
            )}
            {features && <p className="car-item__features">{features}</p>}
          </>
        ) : (
          <p className="car-item__score num">
            {formatScore(car.overallScore)} <StarOutlineIcon size={15} />
            {car.ratingIncomplete && car.overallScore !== null && (
              <span className="car-item__partial">so far</span>
            )}
          </p>
        )}
        {car.dealbreaker && (
          <span className="car-item__flag">
            <DealbreakerFlag withText={variant === 'full'} />
          </span>
        )}
      </div>
      <div className="car-item__right">
        {variant === 'full' && (
          <p className="car-item__score num">
            {formatScore(car.overallScore)} <StarOutlineIcon size={15} />
          </p>
        )}
        <VerdictPill verdict={car.verdict} size={variant === 'full' ? 'sm' : 'md'} />
      </div>
    </Link>
  );
}
