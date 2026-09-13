import { useNavigate, useParams } from 'react-router-dom';
import { carsRepo } from '../services/carsRepo';
import { useCar } from '../hooks/useCars';
import { carTitle } from '../services/ratingService';
import { carFactLines } from '../utils/format';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { RatingsSection } from '../components/car/RatingsSection';
import { CarThumb } from '../components/car/CarThumb';
import { Button } from '../components/ui/Button';
import { CarMissing, ScreenLoading } from '../components/layout/ScreenStates';
import { useToast } from '../components/ui/toast-context';

export function RateCarScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const car = useCar(id);

  if (car === undefined) return <ScreenLoading />;
  if (car === null) return <CarMissing />;

  const title = carTitle(car);
  const facts = carFactLines(car);

  return (
    <div className="screen screen-enter">
      <ScreenHeader
        title="Rate This Car"
        titleLine2={title}
        subtitle={facts.primary || undefined}
        backTo={car.status === 'draft' ? '/new' : `/car/${car.id}`}
        aside={
          <CarThumb carId={car.id} coverPhotoId={car.coverPhotoId} size="fill" alt={title} />
        }
      />

      <RatingsSection
        car={car}
        onRate={(key, value) => {
          void carsRepo.setRating(car.id, key, value).catch((error) => {
            toast.error(error, 'That rating could not be saved.');
          });
        }}
      />

      <Button
        size="lg"
        full
        className="wizard-next"
        onClick={() => navigate(`/car/${car.id}/extras`)}
      >
        Next
      </Button>
    </div>
  );
}
