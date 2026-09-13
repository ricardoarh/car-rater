import { useLiveQuery } from 'dexie-react-hooks';
import { getCoverThumb } from '../../services/photoService';
import { useObjectUrl } from '../../hooks/useObjectUrl';
import { CarIcon } from '../layout/Icons';
import './CarThumb.css';

export interface CarThumbProps {
  carId: string;
  coverPhotoId: string | null;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'fill';
  rounded?: boolean;
}

/** Cover thumbnail for a car, with a tasteful placeholder when there is none. */
export function CarThumb({
  carId,
  coverPhotoId,
  alt = '',
  size = 'md',
  rounded = true,
}: CarThumbProps) {
  const blob = useLiveQuery(
    () => getCoverThumb({ id: carId, coverPhotoId }),
    [carId, coverPhotoId],
  );
  const url = useObjectUrl(blob ?? null);

  return (
    <div
      className={`car-thumb car-thumb--${size}${rounded ? ' car-thumb--rounded' : ''}`}
      aria-hidden={alt ? undefined : true}
    >
      {url ? (
        <img src={url} alt={alt} loading="lazy" decoding="async" />
      ) : (
        <span className="car-thumb__placeholder">
          <CarIcon size={size === 'sm' ? 20 : 26} />
        </span>
      )}
    </div>
  );
}
