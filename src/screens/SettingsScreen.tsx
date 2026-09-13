import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { APP_NAME, APP_VERSION } from '../constants/app';
import { carsRepo } from '../services/carsRepo';
import {
  downloadBlob,
  exportBackup,
  importBackup,
  type ImportMode,
} from '../services/backupService';
import {
  formatBytes,
  getStorageInfo,
  type StorageEstimateInfo,
} from '../services/storageService';
import { seedDemoData } from '../services/seedService';
import { useSavedCars } from '../hooks/useCars';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Sheet } from '../components/ui/Sheet';
import { useToast } from '../components/ui/toast-context';
import { CarRaterLogo, ChevronRight } from '../components/layout/Icons';
import './SettingsScreen.css';

const isDev = import.meta.env.DEV;

export function SettingsScreen() {
  const toast = useToast();
  const cars = useSavedCars();
  const fileRef = useRef<HTMLInputElement>(null);
  const [storage, setStorage] = useState<StorageEstimateInfo | null>(null);
  const [busy, setBusy] = useState<'export' | 'import' | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);

  useEffect(() => {
    void getStorageInfo().then(setStorage);
  }, [cars]);

  const handleExport = async () => {
    setBusy('export');
    try {
      const { blob, fileName } = await exportBackup();
      downloadBlob(blob, fileName);
      toast.show(`Backup saved as ${fileName}`, 'success');
    } catch (error) {
      toast.error(error, 'The backup could not be created.');
    } finally {
      setBusy(null);
    }
  };

  const runImport = async (file: File, mode: ImportMode) => {
    setBusy('import');
    try {
      const result = await importBackup(file, mode);
      const missing =
        result.photosMissing > 0 ? `, ${result.photosMissing} photo file(s) missing` : '';
      toast.show(
        `Restored ${result.carsImported} car${result.carsImported === 1 ? '' : 's'} and ${
          result.photosImported
        } photo${result.photosImported === 1 ? '' : 's'}${missing}`,
        'success',
      );
    } catch (error) {
      toast.error(error, 'That backup could not be restored.');
    } finally {
      setBusy(null);
      setPendingFile(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="screen screen-enter settings">
      <header className="settings__head">
        <h1 className="settings__title">More</h1>
        <p className="settings__subtitle">Backups, storage and the boring bits.</p>
      </header>

      <section className="settings__group" aria-labelledby="rating-heading">
        <h2 className="settings__group-title" id="rating-heading">
          Rating
        </h2>
        <Link className="settings__row" to="/more/features">
          <span className="settings__row-text">
            <strong>Manage Features</strong>
            <span>Choose which features you want to track and their order.</span>
          </span>
          <ChevronRight />
        </Link>
      </section>

      <section className="settings__group" aria-labelledby="backup-heading">
        <h2 className="settings__group-title" id="backup-heading">
          Backup &amp; Restore
        </h2>
        <p className="settings__note">
          Everything lives on this device only. A backup is the only copy that survives a
          lost phone or a cleared browser.
        </p>
        <div className="settings__actions">
          <Button full onClick={() => void handleExport()} disabled={busy !== null}>
            {busy === 'export' ? 'Preparing…' : 'Export Backup'}
          </Button>
          <Button
            variant="secondary"
            full
            onClick={() => fileRef.current?.click()}
            disabled={busy !== null}
          >
            {busy === 'import' ? 'Restoring…' : 'Import Backup'}
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".zip,application/zip"
          className="visually-hidden"
          aria-hidden="true"
          tabIndex={-1}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) setPendingFile(file);
          }}
        />
      </section>

      <section className="settings__group" aria-labelledby="storage-heading">
        <h2 className="settings__group-title" id="storage-heading">
          Storage
        </h2>
        <dl className="settings__facts">
          <div>
            <dt>Cars saved</dt>
            <dd className="num">{cars?.length ?? '—'}</dd>
          </div>
          <div>
            <dt>Space used</dt>
            <dd className="num">
              {storage?.supported ? formatBytes(storage.usage) : 'Not reported'}
            </dd>
          </div>
          {storage?.supported && storage.quota ? (
            <div>
              <dt>Space available</dt>
              <dd className="num">{formatBytes(storage.quota - (storage.usage ?? 0))}</dd>
            </div>
          ) : null}
          <div>
            <dt>Kept by the browser</dt>
            <dd>{storage?.persisted ? 'Yes — marked persistent' : 'Best effort'}</dd>
          </div>
        </dl>
      </section>

      {isDev && (
        <section className="settings__group" aria-labelledby="dev-heading">
          <h2 className="settings__group-title" id="dev-heading">
            Development only
          </h2>
          <p className="settings__note">
            Seeds five example cars. This block does not exist in a production build.
          </p>
          <Button
            variant="secondary"
            full
            onClick={async () => {
              const n = await seedDemoData();
              toast.show(`Seeded ${n} demo cars`, 'success');
            }}
          >
            Load demo data
          </Button>
        </section>
      )}

      <section className="settings__group settings__group--danger" aria-labelledby="danger-heading">
        <h2 className="settings__group-title" id="danger-heading">
          Danger zone
        </h2>
        <Button variant="danger" full onClick={() => setConfirmClear(true)}>
          Clear all data
        </Button>
      </section>

      <footer className="settings__footer">
        <CarRaterLogo size={38} />
        <p>
          {APP_NAME} <span className="num">v{APP_VERSION}</span>
        </p>
        <p className="muted">Works offline. No account, no server, no tracking.</p>
      </footer>

      <Sheet
        open={pendingFile !== null && !confirmReplace}
        onClose={() => {
          setPendingFile(null);
          if (fileRef.current) fileRef.current.value = '';
        }}
        title="Restore this backup"
      >
        <p className="settings__note">
          <strong>{pendingFile?.name}</strong>
        </p>
        <div className="settings__restore">
          <button
            type="button"
            className="settings__restore-option"
            onClick={() => pendingFile && void runImport(pendingFile, 'merge')}
          >
            <strong>Merge</strong>
            <span>Keep what is already here and add the cars from the backup.</span>
          </button>
          <button
            type="button"
            className="settings__restore-option settings__restore-option--danger"
            onClick={() => setConfirmReplace(true)}
          >
            <strong>Replace</strong>
            <span>Delete everything on this device first, then restore the backup.</span>
          </button>
        </div>
      </Sheet>

      <ConfirmDialog
        open={confirmReplace}
        title="Replace everything?"
        body="Every car, photo and feature preference currently on this device will be permanently deleted and replaced with the contents of this backup."
        confirmLabel="Replace all data"
        destructive
        requirePhrase="REPLACE"
        onCancel={() => setConfirmReplace(false)}
        onConfirm={() => {
          setConfirmReplace(false);
          if (pendingFile) void runImport(pendingFile, 'replace');
        }}
      />

      <ConfirmDialog
        open={confirmClear}
        title="Clear all data?"
        body="This will permanently delete all cars and photos stored on this device. Export a backup first if you want to keep them."
        confirmLabel="Delete everything"
        destructive
        requirePhrase="DELETE"
        onCancel={() => setConfirmClear(false)}
        onConfirm={async () => {
          setConfirmClear(false);
          try {
            await carsRepo.clearAll();
            localStorage.removeItem('car-rater:compare');
            localStorage.removeItem('car-rater:active-draft');
            toast.show('All data cleared');
          } catch (error) {
            toast.error(error, 'The data could not be cleared.');
          }
        }}
      />
    </div>
  );
}
