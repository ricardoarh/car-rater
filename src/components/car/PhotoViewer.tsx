import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Photo } from '../../types/models';
import { useObjectUrl } from '../../hooks/useObjectUrl';
import { CheckIcon, CloseIcon, TrashIcon } from '../layout/Icons';
import './PhotoViewer.css';

export interface PhotoViewerProps {
  photos: Photo[];
  index: number | null;
  coverPhotoId: string | null;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  onSetCover: (photoId: string) => void | Promise<void>;
  onRemove: (photoId: string) => void | Promise<void>;
  onCaption: (photoId: string, caption: string) => void | Promise<void>;
}

export function PhotoViewer({
  photos,
  index,
  coverPhotoId,
  onClose,
  onIndexChange,
  onSetCover,
  onRemove,
  onCaption,
}: PhotoViewerProps) {
  const photo = index !== null ? photos[index] : undefined;
  const url = useObjectUrl(photo?.blob ?? null);
  const [caption, setCaption] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const touchStart = useRef<number | null>(null);

  useEffect(() => {
    setCaption(photo?.caption ?? '');
    setConfirmingDelete(false);
  }, [photo?.id, photo?.caption]);

  useEffect(() => {
    if (index === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight' && index < photos.length - 1) onIndexChange(index + 1);
      if (event.key === 'ArrowLeft' && index > 0) onIndexChange(index - 1);
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [index, photos.length, onClose, onIndexChange]);

  if (index === null || !photo) return null;

  const commitCaption = () => {
    if (caption !== photo.caption) void onCaption(photo.id, caption.slice(0, 80));
  };

  return createPortal(
    <div className="viewer" role="dialog" aria-modal="true" aria-label="Photo viewer">
      <div className="viewer__bar">
        <span className="viewer__count num">
          {index + 1} / {photos.length}
        </span>
        <button type="button" className="viewer__icon-btn" onClick={onClose} aria-label="Close">
          <CloseIcon />
        </button>
      </div>

      <div
        className="viewer__stage"
        onTouchStart={(event) => {
          touchStart.current = event.touches[0].clientX;
        }}
        onTouchEnd={(event) => {
          if (touchStart.current === null) return;
          const delta = event.changedTouches[0].clientX - touchStart.current;
          if (delta < -46 && index < photos.length - 1) onIndexChange(index + 1);
          if (delta > 46 && index > 0) onIndexChange(index - 1);
          touchStart.current = null;
        }}
      >
        {index > 0 && (
          <button
            type="button"
            className="viewer__nav viewer__nav--prev"
            onClick={() => onIndexChange(index - 1)}
            aria-label="Previous photo"
          >
            ‹
          </button>
        )}
        {url ? (
          <img src={url} alt={photo.caption || `Photo ${index + 1}`} className="viewer__img" />
        ) : (
          <p className="viewer__fallback">This photo could not be loaded.</p>
        )}
        {index < photos.length - 1 && (
          <button
            type="button"
            className="viewer__nav viewer__nav--next"
            onClick={() => onIndexChange(index + 1)}
            aria-label="Next photo"
          >
            ›
          </button>
        )}
      </div>

      <div className="viewer__panel">
        <label className="viewer__caption">
          <span className="visually-hidden">Photo caption</span>
          <input
            value={caption}
            maxLength={80}
            placeholder="Add a caption — e.g. Boot for Rio"
            onChange={(event) => setCaption(event.target.value)}
            onBlur={commitCaption}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.currentTarget.blur();
              }
            }}
          />
        </label>
        <div className="viewer__actions">
          <button
            type="button"
            className={`viewer__action${photo.id === coverPhotoId ? ' is-on' : ''}`}
            onClick={() => void onSetCover(photo.id)}
            disabled={photo.id === coverPhotoId}
          >
            <CheckIcon size={17} />
            {photo.id === coverPhotoId ? 'Cover photo' : 'Set as cover'}
          </button>
          {confirmingDelete ? (
            <span className="viewer__confirm">
              <button
                type="button"
                className="viewer__action viewer__action--danger"
                onClick={() => {
                  commitCaption();
                  void onRemove(photo.id);
                }}
              >
                Remove it
              </button>
              <button
                type="button"
                className="viewer__action"
                onClick={() => setConfirmingDelete(false)}
              >
                Keep
              </button>
            </span>
          ) : (
            <button
              type="button"
              className="viewer__action viewer__action--danger"
              onClick={() => setConfirmingDelete(true)}
            >
              <TrashIcon size={17} />
              Remove
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
