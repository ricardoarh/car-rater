import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { carsRepo } from '../services/carsRepo';
import { useCar, useCarPhotos } from '../hooks/useCars';
import { useDebouncedSave } from '../hooks/useDebouncedSave';
import { carTitle } from '../services/ratingService';
import { COMMENT_MAX_LENGTH } from '../constants/app';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { RatingsSection } from '../components/car/RatingsSection';
import { ExtrasSection, type ExtrasPatch } from '../components/car/ExtrasSection';
import { PhotoSection } from '../components/car/PhotoSection';
import { FeaturesSection } from '../components/car/FeaturesSection';
import { useFeatureActions } from '../hooks/useFeatureActions';
import { TextAreaField } from '../components/ui/Field';
import { CarBasicsFields } from '../components/car/CarBasicsFields';
import { basicsToPatch, carToBasics, type CarBasics } from '../services/carBasics';
import { Button } from '../components/ui/Button';
import { CarMissing, ScreenLoading } from '../components/layout/ScreenStates';
import { useToast } from '../components/ui/toast-context';
import './EditCarScreen.css';

/**
 * One scrolling page holding every section, reusing the same components as the
 * rating wizard. Everything autosaves — "Done" is just a way out.
 */
export function EditCarScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const car = useCar(id);
  const photos = useCarPhotos(id) ?? [];
  const featureActions = useFeatureActions(id);

  const [basics, setBasics] = useState<CarBasics | null>(null);
  const [comments, setComments] = useState<string | null>(null);

  useEffect(() => {
    if (!car || basics !== null) return;
    setBasics(carToBasics(car));
    setComments(car.comments);
  }, [car, basics]);

  const saveBasics = useDebouncedSave<CarBasics>(async (value) => {
    if (!id) return;
    await carsRepo.update(id, basicsToPatch(value));
  }, 450);

  const saveComments = useDebouncedSave<string>(async (value) => {
    if (!id) return;
    await carsRepo.update(id, { comments: value });
  }, 500);

  if (car === undefined || basics === null || comments === null) return <ScreenLoading />;
  if (car === null) return <CarMissing />;

  const updateBasics = (patch: Partial<CarBasics>) => {
    const next = { ...basics, ...patch };
    setBasics(next);
    saveBasics(next);
  };

  const applyExtras = (patch: ExtrasPatch) => {
    void carsRepo.update(car.id, patch).catch((error) =>
      toast.error(error, 'That change could not be saved.'),
    );
  };

  const finish = async () => {
    try {
      await carsRepo.update(car.id, {
        ...basicsToPatch(basics),
        comments,
        status: 'saved',
      });
      navigate(`/car/${car.id}`, { replace: true });
    } catch (error) {
      toast.error(error, 'Those changes could not be saved.');
    }
  };

  return (
    <div className="screen screen-enter edit-car">
      <ScreenHeader
        title="Edit"
        titleLine2={carTitle(car)}
        subtitle="Everything saves as you go."
        backTo={`/car/${car.id}`}
        action={
          <Button size="sm" onClick={() => void finish()}>
            Done
          </Button>
        }
      />

      <section className="edit-car__block">
        <h2 className="section-title">Basics</h2>
        <div className="edit-car__fields">
          <CarBasicsFields
            basics={basics}
            onChange={updateBasics}
            makesListId="makes-edit"
            photos={
              <div className="edit-car__photos">
                <p className="field__label">Photos</p>
                <PhotoSection
                  carId={car.id}
                  photos={photos}
                  coverPhotoId={car.coverPhotoId}
                  layout={photos.length === 0 ? 'add' : 'manage'}
                />
              </div>
            }
          />
        </div>
      </section>

      <section className="edit-car__block">
        <h2 className="section-title">Features</h2>
        <p className="edit-car__hint">Tap what this car has</p>
        <FeaturesSection
          car={car}
          onToggle={featureActions.toggle}
          onAddCustom={featureActions.addCustom}
          onRenameCustom={featureActions.renameCustom}
          onRemoveCustom={featureActions.removeCustom}
        />
      </section>

      <section className="edit-car__block">
        <h2 className="section-title">Ratings</h2>
        <RatingsSection
          car={car}
          onRate={(key, value) => {
            void carsRepo.setRating(car.id, key, value).catch((error) =>
              toast.error(error, 'That rating could not be saved.'),
            );
          }}
        />
      </section>

      <section className="edit-car__block">
        <h2 className="section-title">Verdict &amp; extras</h2>
        <ExtrasSection car={car} onChange={applyExtras} />
      </section>

      <section className="edit-car__block">
        <h2 className="section-title">Comments</h2>
        <TextAreaField
          label="What did we think?"
          value={comments}
          rows={8}
          maxLength={COMMENT_MAX_LENGTH}
          counter={{ value: comments.length, max: COMMENT_MAX_LENGTH }}
          onChange={(event) => {
            setComments(event.target.value);
            saveComments(event.target.value);
          }}
        />
      </section>

      <Button size="lg" full className="wizard-next" onClick={() => void finish()}>
        Done
      </Button>
    </div>
  );
}
