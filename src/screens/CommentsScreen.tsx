import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { carsRepo } from '../services/carsRepo';
import { useCar, useCarPhotos } from '../hooks/useCars';
import { useDebouncedSave } from '../hooks/useDebouncedSave';
import { carTitle } from '../services/ratingService';
import { COMMENT_MAX_LENGTH } from '../constants/app';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { CarThumb } from '../components/car/CarThumb';
import { TextAreaField } from '../components/ui/Field';
import { Button } from '../components/ui/Button';
import { CarMissing, ScreenLoading } from '../components/layout/ScreenStates';
import { useToast } from '../components/ui/toast-context';
import { requestPersistentStorageOnce } from '../services/storageService';
import './CommentsScreen.css';

export function CommentsScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const car = useCar(id);
  const photos = useCarPhotos(id) ?? [];
  const [text, setText] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (car && text === null) setText(car.comments);
  }, [car, text]);

  const persist = useDebouncedSave<string>(async (value) => {
    if (!id) return;
    await carsRepo.update(id, { comments: value });
  }, 500);

  if (car === undefined || text === null) return <ScreenLoading />;
  if (car === null) return <CarMissing />;

  const title = carTitle(car);

  const handleSave = async () => {
    setSaving(true);
    try {
      await carsRepo.update(car.id, { comments: text, status: 'saved' });
      localStorage.removeItem('car-rater:active-draft');
      void requestPersistentStorageOnce();
      toast.show(`${title} saved`, 'success');
      navigate(`/car/${car.id}`, { replace: true });
    } catch (error) {
      toast.error(error, 'That car could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="screen screen-enter">
      <ScreenHeader
        title="Comments"
        subtitle={title}
        backTo={`/car/${car.id}/extras`}
        aside={
          <CarThumb carId={car.id} coverPhotoId={car.coverPhotoId} size="fill" alt={title} />
        }
      />

      <TextAreaField
        label="What did we think?"
        placeholder={
          'Way nicer inside than expected.\nRio should fit easily in the back.\nSteering felt a little boring.'
        }
        value={text}
        maxLength={COMMENT_MAX_LENGTH}
        rows={9}
        counter={{ value: text.length, max: COMMENT_MAX_LENGTH }}
        onChange={(event) => {
          setText(event.target.value);
          persist(event.target.value);
        }}
      />

      {photos.length === 0 && (
        <p className="comments__nudge">
          <span aria-hidden="true">🐾</span> Don’t forget to add any photos!
        </p>
      )}

      <div className="wizard-actions">
        <Button variant="quiet" onClick={() => navigate(`/car/${car.id}/extras`)} full>
          Back
        </Button>
        <Button onClick={() => void handleSave()} disabled={saving} full size="lg">
          {saving ? 'Saving…' : 'Save Car'}
        </Button>
      </div>
      <p className="comments__autosave muted">Saved automatically as you type.</p>
    </div>
  );
}
