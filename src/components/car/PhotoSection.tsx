import { useRef, useState } from 'react';
import type { Photo } from '../../types/models';
import { MAX_PHOTOS_PER_CAR } from '../../constants/app';
import { addPhotos, removePhoto, setCaption, setCoverPhoto } from '../../services/photoService';
import { useToast } from '../ui/toast-context';
import { useObjectUrl } from '../../hooks/useObjectUrl';
import { CameraIcon, ImageIcon } from '../layout/Icons';
import { PhotoViewer } from './PhotoViewer';
import { Button } from '../ui/Button';
import './PhotoSection.css';

export interface PhotoSectionProps {
  carId: string;
  photos: Photo[];
  coverPhotoId: string | null;
  /** 'add' shows the big first-photo tile from the concept's Add a Car screen. */
  layout?: 'add' | 'manage';
}

function PhotoTile({
  photo,
  isCover,
  onOpen,
}: {
  photo: Photo;
  isCover: boolean;
  onOpen: () => void;
}) {
  const url = useObjectUrl(photo.thumb);
  return (
    <button type="button" className="photo-tile" onClick={onOpen}>
      {url ? (
        <img
          src={url}
          alt={photo.caption || 'Car photo'}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <span className="photo-tile__loading" />
      )}
      {isCover && <span className="photo-tile__cover">Cover</span>}
      {photo.caption && <span className="photo-tile__caption">{photo.caption}</span>}
    </button>
  );
}

export function PhotoSection({
  carId,
  photos,
  coverPhotoId,
  layout = 'manage',
}: PhotoSectionProps) {
  const toast = useToast();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const full = photos.length >= MAX_PHOTOS_PER_CAR;
  const cover = coverPhotoId ?? photos[0]?.id ?? null;

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setBusy(true);
    try {
      const result = await addPhotos(carId, Array.from(fileList));
      if (result.added.length > 0) {
        toast.show(
          `${result.added.length} photo${result.added.length === 1 ? '' : 's'} added`,
          'success',
        );
      }
      if (result.skipped.length > 0) {
        toast.show(`${result.skipped[0].name}: ${result.skipped[0].reason}`, 'error');
      }
    } catch (error) {
      toast.error(error, 'Those photos could not be saved.');
    } finally {
      setBusy(false);
      if (cameraRef.current) cameraRef.current.value = '';
      if (galleryRef.current) galleryRef.current.value = '';
    }
  };

  return (
    <section className="photos" aria-label="Photos">
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="visually-hidden"
        onChange={(event) => void handleFiles(event.target.files)}
        aria-hidden="true"
        tabIndex={-1}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        className="visually-hidden"
        onChange={(event) => void handleFiles(event.target.files)}
        aria-hidden="true"
        tabIndex={-1}
      />

      {layout === 'add' && photos.length === 0 ? (
        <div className="photos__starter">
          <button
            type="button"
            className="photos__starter-tile"
            onClick={() => cameraRef.current?.click()}
            disabled={busy}
          >
            <CameraIcon size={30} />
            <span>
              Take a photo
              <small>(tap to open camera)</small>
            </span>
          </button>
          <button
            type="button"
            className="photos__starter-tile photos__starter-tile--alt"
            onClick={() => galleryRef.current?.click()}
            disabled={busy}
          >
            <ImageIcon size={30} />
            <span>
              Choose from gallery
              <small>(pick existing photos)</small>
            </span>
          </button>
        </div>
      ) : (
        <>
          <div className="photos__grid">
            {photos.map((photo, index) => (
              <PhotoTile
                key={photo.id}
                photo={photo}
                isCover={photo.id === cover}
                onOpen={() => setViewerIndex(index)}
              />
            ))}
          </div>
          <div className="photos__actions">
            <Button
              variant="secondary"
              size="sm"
              icon={<CameraIcon size={18} />}
              onClick={() => cameraRef.current?.click()}
              disabled={busy || full}
            >
              Take Photo
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<ImageIcon size={18} />}
              onClick={() => galleryRef.current?.click()}
              disabled={busy || full}
            >
              Choose from Gallery
            </Button>
          </div>
          <p className="photos__count muted">
            {busy
              ? 'Processing photos…'
              : `${photos.length} of ${MAX_PHOTOS_PER_CAR} photos`}
          </p>
        </>
      )}

      <PhotoViewer
        photos={photos}
        index={viewerIndex}
        coverPhotoId={cover}
        onClose={() => setViewerIndex(null)}
        onIndexChange={setViewerIndex}
        onSetCover={async (id) => {
          await setCoverPhoto(carId, id);
          toast.show('Cover photo updated', 'success');
        }}
        onRemove={async (id) => {
          await removePhoto(id);
          setViewerIndex(null);
          toast.show('Photo removed');
        }}
        onCaption={async (id, caption) => {
          await setCaption(id, caption);
        }}
      />
    </section>
  );
}
