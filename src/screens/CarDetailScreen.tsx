import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCar, useCarPhotos } from '../hooks/useCars';
import { carsRepo } from '../services/carsRepo';
import { carTitle, formatScore } from '../services/ratingService';
import { carFactLines } from '../utils/format';
import { RATING_CATEGORIES } from '../constants/ratings';
import {
  DEALBREAKER_REASONS,
  HEADACHE_LABEL,
  POWERTRAIN_LABEL,
} from '../constants/app';
import { useObjectUrl } from '../hooks/useObjectUrl';
import { StarRating } from '../components/ui/StarRating';
import { DealbreakerFlag, VerdictPill } from '../components/ui/VerdictPill';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { PhotoViewer } from '../components/car/PhotoViewer';
import { FeatureChips } from '../components/car/FeaturesSection';
import { DuplicateSheet } from '../components/car/DuplicateSheet';
import { duplicateCar, type DuplicateOptions } from '../services/duplicateService';
import { RatingIcon } from '../components/car/RatingIcons';
import {
  BackIcon,
  CarIcon,
  CopyIcon,
  StarOutlineIcon,
  TrashIcon,
} from '../components/layout/Icons';
import { CarMissing, ScreenLoading } from '../components/layout/ScreenStates';
import { useToast } from '../components/ui/toast-context';
import {
  removePhoto,
  setCaption,
  setCoverPhoto,
} from '../services/photoService';
import './CarDetailScreen.css';

export function CarDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const car = useCar(id);
  const photos = useCarPhotos(id) ?? [];
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [duplicateBusy, setDuplicateBusy] = useState(false);

  const coverPhoto =
    photos.find((p) => p.id === car?.coverPhotoId) ?? photos[0] ?? null;
  const coverUrl = useObjectUrl(coverPhoto?.blob ?? null);

  if (car === undefined) return <ScreenLoading />;
  if (car === null) return <CarMissing />;

  const title = carTitle(car);
  const strip = photos.slice(0, 4);
  const extra = photos.length - strip.length;

  // Trim is deliberately not shown — it was retired from the UI in v1.1,
  // though the stored value is still carried through saves and backups.
  const facts = carFactLines(car, {
    includePowertrain: true,
    powertrainLabel: car.powertrain ? POWERTRAIN_LABEL[car.powertrain] : null,
  });

  return (
    <div className="screen screen-enter detail">
      <div className="detail__bar">
        <button
          type="button"
          className="screen-header__back"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <BackIcon />
        </button>
        <Link to={`/car/${car.id}/edit`} className="detail__edit">
          Edit
        </Link>
      </div>

      <button
        type="button"
        className="detail__cover"
        onClick={() => photos.length > 0 && setViewerIndex(0)}
        disabled={photos.length === 0}
        aria-label={photos.length > 0 ? `View ${photos.length} photos` : 'No photos yet'}
      >
        {coverUrl ? (
          <img src={coverUrl} alt={`${title} cover photo`} />
        ) : (
          <span className="detail__cover-empty">
            <CarIcon size={40} />
            <span>No photos yet</span>
          </span>
        )}
        {photos.length > 0 && (
          <span className="detail__cover-count num">1/{photos.length}</span>
        )}
      </button>

      <div className="detail__headline">
        <div className="detail__names">
          <h1 className="detail__title">{title}</h1>
          {facts.primary && <p className="detail__spec">{facts.primary}</p>}
          {facts.secondary && (
            <p className="detail__spec detail__spec--money num">{facts.secondary}</p>
          )}
        </div>
        <div className="detail__score-block">
          <p className="detail__score num">
            {formatScore(car.overallScore)} <StarOutlineIcon size={19} />
          </p>
          <VerdictPill verdict={car.verdict} />
        </div>
      </div>

      {car.ratingIncomplete && car.overallScore !== null && (
        <p className="detail__incomplete">
          Provisional — not every category has been rated yet.
        </p>
      )}
      {car.dealbreaker && (
        <div className="detail__dealbreaker">
          <DealbreakerFlag withText />
          <span>
            {car.dealbreakerReasons.length > 0
              ? car.dealbreakerReasons
                  .map((r) => DEALBREAKER_REASONS.find((d) => d.value === r)?.label ?? r)
                  .join(', ')
              : 'Marked as a dealbreaker'}
            {car.dealbreakerComment ? ` — ${car.dealbreakerComment}` : ''}
          </span>
        </div>
      )}

      {photos.length > 0 && (
        <div className="detail__strip">
          {strip.map((photo, index) => (
            <StripThumb
              key={photo.id}
              blobRef={photo.thumb}
              caption={photo.caption}
              badge={index === strip.length - 1 && extra > 0 ? `+${extra}` : undefined}
              onClick={() => setViewerIndex(index)}
            />
          ))}
        </div>
      )}

      <section className="detail__section">
        <h2 className="section-title">Ratings</h2>
        <ul className="detail__ratings">
          {RATING_CATEGORIES.map((category) => (
            <li key={category.key}>
              <span className="detail__rating-icon" aria-hidden="true">
                <RatingIcon category={category.key} size={19} />
              </span>
              <span className="detail__rating-label">{category.label}</span>
              <StarRating
                label={category.label}
                value={car.ratings[category.key]}
                readOnly
                size="sm"
              />
              <span className="detail__rating-value num">
                {car.ratings[category.key] === null
                  ? '—'
                  : car.ratings[category.key]!.toFixed(1)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="detail__section">
        <h2 className="section-title">Features</h2>
        <FeatureChips car={car} />
      </section>

      <section className="detail__section">
        <h2 className="section-title">The rest of it</h2>
        <dl className="detail__facts">
          <div>
            <dt>
              <span aria-hidden="true">🔧</span> Headache Potential
            </dt>
            <dd>
              <span className={`headache headache--${car.headachePotential}`}>
                {HEADACHE_LABEL[car.headachePotential]}
              </span>
            </dd>
          </div>
          <div>
            <dt>
              <span aria-hidden="true">🛡️</span> Euro NCAP
            </dt>
            <dd>
              {car.euroNcapStars ? (
                <span className="detail__ncap">
                  <StarRating
                    label="Euro NCAP"
                    value={car.euroNcapStars as 1 | 2 | 3 | 4 | 5}
                    readOnly
                    size="sm"
                  />
                  {car.euroNcapYear && (
                    <span className="muted num">Tested: {car.euroNcapYear}</span>
                  )}
                </span>
              ) : (
                <span className="muted">Not entered</span>
              )}
            </dd>
          </div>
          <div>
            <dt>
              <span aria-hidden="true">🚩</span> Dealbreaker
            </dt>
            <dd>{car.dealbreaker ? 'Yes' : 'No'}</dd>
          </div>
        </dl>
      </section>

      <section className="detail__section">
        <h2 className="section-title">Thoughts</h2>
        {car.comments.trim() ? (
          <p className="detail__comments">{car.comments}</p>
        ) : (
          <p className="muted detail__comments detail__comments--empty">
            Nothing written down yet.
          </p>
        )}
        {car.notes.trim() && <p className="detail__notes muted">{car.notes}</p>}
      </section>

      <div className="detail__actions">
        <Button full onClick={() => navigate(`/car/${car.id}/edit`)}>
          Edit this car
        </Button>
        {/* Secondary to Edit on purpose: useful, but not what most people came
            to this screen to do. */}
        <Button
          variant="secondary"
          full
          icon={<CopyIcon size={18} />}
          onClick={() => setDuplicating(true)}
        >
          Duplicate Car
        </Button>
        <Button
          variant="danger"
          full
          icon={<TrashIcon size={18} />}
          onClick={() => setConfirmDelete(true)}
        >
          Delete
        </Button>
      </div>

      <DuplicateSheet
        open={duplicating}
        car={car}
        busy={duplicateBusy}
        onCancel={() => {
          if (!duplicateBusy) setDuplicating(false);
        }}
        onConfirm={(options: DuplicateOptions) => {
          setDuplicateBusy(true);
          void duplicateCar(car.id, options)
            .then((copy) => {
              setDuplicating(false);
              toast.show('Car duplicated', 'success');
              // Straight into Edit: the whole point is to change what differs.
              navigate(`/car/${copy.id}/edit`);
            })
            .catch((error) => {
              // The sheet stays open and the original is untouched, so the user
              // can simply try again.
              toast.error(error, 'Couldn’t duplicate this car. Please try again.');
            })
            .finally(() => setDuplicateBusy(false));
        }}
      />

      <PhotoViewer
        photos={photos}
        index={viewerIndex}
        coverPhotoId={car.coverPhotoId ?? photos[0]?.id ?? null}
        onClose={() => setViewerIndex(null)}
        onIndexChange={setViewerIndex}
        onSetCover={async (photoId) => {
          await setCoverPhoto(car.id, photoId);
          toast.show('Cover photo updated', 'success');
        }}
        onRemove={async (photoId) => {
          await removePhoto(photoId);
          setViewerIndex(null);
          toast.show('Photo removed');
        }}
        onCaption={(photoId, caption) => setCaption(photoId, caption)}
      />

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${title}?`}
        body="This removes the car, its ratings and all of its photos from this device. It cannot be undone."
        confirmLabel="Delete car"
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          setConfirmDelete(false);
          try {
            await carsRepo.remove(car.id);
            toast.show(`${title} deleted`);
            navigate('/cars', { replace: true });
          } catch (error) {
            toast.error(error, 'That car could not be deleted.');
          }
        }}
      />
    </div>
  );
}

function StripThumb({
  blobRef,
  caption,
  badge,
  onClick,
}: {
  blobRef: Blob;
  caption: string;
  badge?: string;
  onClick: () => void;
}) {
  const url = useObjectUrl(blobRef);
  return (
    <button type="button" className="detail__strip-item" onClick={onClick}>
      {url && <img src={url} alt={caption || 'Car photo'} loading="lazy" decoding="async" />}
      {badge && <span className="detail__strip-badge">{badge}</span>}
    </button>
  );
}
