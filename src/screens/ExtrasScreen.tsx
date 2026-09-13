import { useNavigate, useParams } from 'react-router-dom';
import { carsRepo } from '../services/carsRepo';
import { useCar } from '../hooks/useCars';
import { carTitle } from '../services/ratingService';
import { carFactLines } from '../utils/format';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { ExtrasSection, type ExtrasPatch } from '../components/car/ExtrasSection';
import { CarThumb } from '../components/car/CarThumb';
import { Button } from '../components/ui/Button';
import { CarMissing, ScreenLoading } from '../components/layout/ScreenStates';
import { useToast } from '../components/ui/toast-context';

export function ExtrasScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const car = useCar(id);

  if (car === undefined) return <ScreenLoading />;
  if (car === null) return <CarMissing />;

  const title = carTitle(car);
  const facts = carFactLines(car);

  const apply = (patch: ExtrasPatch) => {
    void carsRepo.update(car.id, patch).catch((error) => {
      toast.error(error, 'That change could not be saved.');
    });
  };

  return (
    <div className="screen screen-enter">
      <ScreenHeader
        title="Rate This Car"
        titleLine2={title}
        subtitle={facts.primary || undefined}
        backTo={`/car/${car.id}/rate`}
        aside={
          <CarThumb carId={car.id} coverPhotoId={car.coverPhotoId} size="fill" alt={title} />
        }
      />

      <ExtrasSection car={car} onChange={apply} />

      <Button
        size="lg"
        full
        className="wizard-next"
        onClick={() => navigate(`/car/${car.id}/comments`)}
      >
        Next
      </Button>
    </div>
  );
}
