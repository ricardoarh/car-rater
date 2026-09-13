import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { carsRepo } from '../services/carsRepo';
import { useCar, useCarPhotos } from '../hooks/useCars';
import { useDebouncedSave } from '../hooks/useDebouncedSave';
import { Button } from '../components/ui/Button';
import { CarBasicsFields } from '../components/car/CarBasicsFields';
import {
  basicsToPatch,
  carToBasics,
  emptyBasics,
  type CarBasics,
} from '../services/carBasics';
import { PhotoSection } from '../components/car/PhotoSection';
import { FeaturesSection } from '../components/car/FeaturesSection';
import { useFeatureActions } from '../hooks/useFeatureActions';
import { useToast } from '../components/ui/toast-context';
import './AddCarScreen.css';

const DRAFT_KEY = 'car-rater:active-draft';

export function AddCarScreen() {
  const navigate = useNavigate();
  const toast = useToast();
  const [carId, setCarId] = useState<string | null>(null);
  const car = useCar(carId ?? undefined);
  const photos = useCarPhotos(carId ?? undefined) ?? [];
  const creating = useRef(false);
  const featureActions = useFeatureActions(carId ?? undefined);

  const [form, setForm] = useState<CarBasics>(emptyBasics);
  const [hydrated, setHydrated] = useState(false);

  /**
   * Reuse the in-flight draft if there is one, so refreshing or backgrounding
   * the app never creates a second empty record.
   */
  useEffect(() => {
    if (creating.current) return;
    creating.current = true;
    void (async () => {
      try {
        const remembered = localStorage.getItem(DRAFT_KEY);
        let draft = remembered ? await carsRepo.get(remembered) : undefined;
        if (draft && draft.status !== 'draft') draft = undefined;
        if (!draft) draft = await carsRepo.latestDraft();
        if (!draft) draft = await carsRepo.create({});
        localStorage.setItem(DRAFT_KEY, draft.id);
        await carsRepo.pruneEmptyDrafts(draft.id);
        setCarId(draft.id);
      } catch (error) {
        toast.error(error, 'Car Rater could not open local storage on this device.');
      }
    })();
  }, [toast]);

  useEffect(() => {
    if (!car || hydrated) return;
    setForm(carToBasics(car));
    setHydrated(true);
  }, [car, hydrated]);

  const persist = useDebouncedSave<CarBasics>(async (value) => {
    if (!carId) return;
    await carsRepo.update(carId, basicsToPatch(value));
  }, 400);

  const update = (patch: Partial<CarBasics>) => {
    const next = { ...form, ...patch };
    setForm(next);
    persist(next);
  };

  const canContinue = form.make.trim().length > 0 || form.model.trim().length > 0;

  const handleNext = async () => {
    if (!carId) return;
    await carsRepo.update(carId, basicsToPatch(form));
    navigate(`/car/${carId}/rate`);
  };

  const handleCancel = async () => {
    if (carId) {
      localStorage.removeItem(DRAFT_KEY);
      await carsRepo.pruneEmptyDrafts();
    }
    navigate('/');
  };

  return (
    <div className="screen screen-enter add-car">
      <div className="add-car__bar">
        <button type="button" className="add-car__cancel" onClick={() => void handleCancel()}>
          Cancel
        </button>
        <Button size="sm" onClick={() => void handleNext()} disabled={!canContinue || !carId}>
          Next
        </Button>
      </div>

      <h1 className="add-car__title">Add a Car</h1>
      <p className="add-car__subtitle">Let’s start with the basics.</p>

      <form className="add-car__form" onSubmit={(event) => event.preventDefault()}>
        <CarBasicsFields
          basics={form}
          onChange={update}
          makesListId="makes-add"
          photos={
            carId ? (
              <div className="add-car__photos">
                <p className="field__label">Photos</p>
                <PhotoSection
                  carId={carId}
                  photos={photos}
                  coverPhotoId={car?.coverPhotoId ?? null}
                  layout={photos.length === 0 ? 'add' : 'manage'}
                />
              </div>
            ) : null
          }
        />

        {car && (
          <section className="add-car__features">
            <h2 className="field__label">Features</h2>
            <p className="add-car__features-hint">Tap what this car has</p>
            <FeaturesSection
              car={car}
              onToggle={featureActions.toggle}
              onAddCustom={featureActions.addCustom}
              onRenameCustom={featureActions.renameCustom}
              onRemoveCustom={featureActions.removeCustom}
            />
          </section>
        )}

        <Button
          size="lg"
          full
          onClick={() => void handleNext()}
          disabled={!canContinue || !carId}
          className="add-car__next"
        >
          Next — rate it
        </Button>
        {!canContinue && (
          <p className="add-car__hint muted">Add a make or model to carry on.</p>
        )}
      </form>
    </div>
  );
}
