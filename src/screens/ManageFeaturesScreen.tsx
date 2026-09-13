import { useRef, useState } from 'react';
import { CAR_FEATURES } from '../constants/features';
import type { CarFeature } from '../constants/features';
import type { CarFeatureKey } from '../types/models';
import { settingsRepo } from '../services/settingsRepo';
import { useFeaturePreferences } from '../hooks/feature-preferences-context';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/toast-context';
import { CloseIcon, DragHandleIcon, MoveDownIcon, MoveUpIcon } from '../components/layout/Icons';
import './ManageFeaturesScreen.css';

export function ManageFeaturesScreen() {
  const toast = useToast();
  const { activeFeatures } = useFeaturePreferences();
  const [confirmRemove, setConfirmRemove] = useState<CarFeature | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);

  const listRef = useRef<HTMLUListElement>(null);
  /** Live preview while a finger is down; null when not dragging. */
  const [drag, setDrag] = useState<{
    key: CarFeatureKey;
    order: CarFeatureKey[];
    offset: number;
  } | null>(null);
  const geometry = useRef<{ key: CarFeatureKey; top: number; height: number }[]>([]);
  const startY = useRef(0);

  const order = drag ? drag.order : activeFeatures.map((f) => f.key);
  const rows = order
    .map((key) => CAR_FEATURES.find((f) => f.key === key))
    .filter((f): f is CarFeature => Boolean(f));

  const fail = (error: unknown) =>
    toast.error(error, 'That change could not be saved.');

  const nudge = (key: CarFeatureKey, delta: -1 | 1) => {
    void settingsRepo.nudgeFeature(key, delta).catch(fail);
  };

  // ---- pointer drag ------------------------------------------------------
  // Pointer Events rather than HTML5 drag-and-drop, which does not fire on
  // touch at all. `touch-action: none` on the handle stops the page scrolling
  // underneath the finger mid-drag.

  const onHandleDown = (event: React.PointerEvent, key: CarFeatureKey) => {
    const list = listRef.current;
    if (!list) return;
    event.preventDefault();
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
    const items = [...list.querySelectorAll<HTMLElement>('[data-key]')];
    geometry.current = items.map((el) => ({
      key: el.dataset.key as CarFeatureKey,
      top: el.getBoundingClientRect().top,
      height: el.getBoundingClientRect().height,
    }));
    startY.current = event.clientY;
    setDrag({ key, order: activeFeatures.map((f) => f.key), offset: 0 });
  };

  const onHandleMove = (event: React.PointerEvent) => {
    if (!drag) return;
    event.preventDefault();
    const delta = event.clientY - startY.current;
    const slots = geometry.current;
    const from = slots.findIndex((s) => s.key === drag.key);
    if (from === -1) return;

    // Which slot is the dragged row's centre currently over?
    const centre = slots[from].top + slots[from].height / 2 + delta;
    let to = from;
    for (let i = 0; i < slots.length; i += 1) {
      const slotCentre = slots[i].top + slots[i].height / 2;
      if (i < from && centre < slotCentre) {
        to = i;
        break;
      }
      if (i > from && centre > slotCentre) to = i;
    }

    if (to !== from) {
      const next = [...drag.order];
      const at = next.indexOf(drag.key);
      next.splice(at, 1);
      next.splice(to, 0, drag.key);
      setDrag({ key: drag.key, order: next, offset: delta });
    } else {
      setDrag({ ...drag, offset: delta });
    }
  };

  const onHandleUp = () => {
    if (!drag) return;
    const finalOrder = drag.order;
    const at = finalOrder.indexOf(drag.key);
    const anchor = at >= 0 && at + 1 < finalOrder.length ? finalOrder[at + 1] : null;
    const key = drag.key;
    setDrag(null);
    geometry.current = [];
    // Committed against a neighbour, not an index, so a concurrent removal
    // elsewhere in the list cannot land this in the wrong place.
    void settingsRepo.moveFeatureBefore(key, anchor).catch(fail);
  };

  return (
    <div className="screen screen-enter manage-features">
      <ScreenHeader
        title="Manage Features"
        subtitle="Choose which features appear when rating a car. Drag to reorder or remove ones you don’t need."
        backTo="/more"
      />

      {rows.length === 0 ? (
        <p className="manage-features__empty muted">
          You’ve removed every feature. Cars you have already rated keep what was
          recorded — restore the defaults below to start tracking features again.
        </p>
      ) : (
        <ul
          className={`manage-features__list${drag ? ' is-dragging' : ''}`}
          ref={listRef}
          aria-label="Active features"
        >
          {rows.map((feature, index) => {
            const dragging = drag?.key === feature.key;
            return (
              <li
                key={feature.key}
                data-key={feature.key}
                className={`manage-row${dragging ? ' is-dragging' : ''}`}
                style={dragging ? { transform: `translateY(${drag.offset}px)` } : undefined}
              >
                <span
                  className="manage-row__handle"
                  aria-hidden="true"
                  onPointerDown={(event) => onHandleDown(event, feature.key)}
                  onPointerMove={onHandleMove}
                  onPointerUp={onHandleUp}
                  onPointerCancel={onHandleUp}
                >
                  <DragHandleIcon size={20} />
                </span>

                <span className="manage-row__label" title={feature.label}>
                  {feature.shortLabel}
                  <span className="visually-hidden">
                    , position {index + 1} of {rows.length}
                  </span>
                </span>

                <span className="manage-row__actions">
                  <button
                    type="button"
                    className="manage-row__btn"
                    aria-label={`Move ${feature.shortLabel} up`}
                    disabled={index === 0}
                    onClick={() => nudge(feature.key, -1)}
                  >
                    <MoveUpIcon size={18} />
                  </button>
                  <button
                    type="button"
                    className="manage-row__btn"
                    aria-label={`Move ${feature.shortLabel} down`}
                    disabled={index === rows.length - 1}
                    onClick={() => nudge(feature.key, 1)}
                  >
                    <MoveDownIcon size={18} />
                  </button>
                  <button
                    type="button"
                    className="manage-row__btn manage-row__btn--remove"
                    aria-label={`Remove ${feature.shortLabel}`}
                    onClick={() => setConfirmRemove(feature)}
                  >
                    <CloseIcon size={18} />
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <section className="manage-features__restore">
        <Button
          variant="secondary"
          full
          onClick={() => setConfirmRestore(true)}
          disabled={
            activeFeatures.length === CAR_FEATURES.length &&
            activeFeatures.every((f, i) => f.key === CAR_FEATURES[i].key)
          }
        >
          Restore default features
        </Button>
        <p className="manage-features__note muted">
          Restore all {CAR_FEATURES.length} original features and their original order.
        </p>
      </section>

      <ConfirmDialog
        open={confirmRemove !== null}
        title={`Remove ${confirmRemove?.shortLabel ?? ''}?`}
        body="This will remove it from your feature checklist. Existing cars that already have it recorded will keep that information."
        confirmLabel="Remove"
        onCancel={() => setConfirmRemove(null)}
        onConfirm={() => {
          const feature = confirmRemove;
          setConfirmRemove(null);
          if (!feature) return;
          void settingsRepo
            .removeFeature(feature.key)
            .then(() => toast.show(`${feature.shortLabel} removed from the checklist`))
            .catch(fail);
        }}
      />

      <ConfirmDialog
        open={confirmRestore}
        title="Restore defaults?"
        body="This will restore the original feature list and order. Your saved cars will not be changed."
        confirmLabel="Restore"
        onCancel={() => setConfirmRestore(false)}
        onConfirm={() => {
          setConfirmRestore(false);
          void settingsRepo
            .restoreDefaultFeatures()
            .then(() => toast.show('Default features restored', 'success'))
            .catch(fail);
        }}
      />
    </div>
  );
}
