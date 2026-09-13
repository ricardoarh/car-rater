import { useEffect, useState } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { BottomNav } from './components/layout/BottomNav';
import { ToastProvider } from './components/ui/Toast';
import { FeaturePreferencesProvider } from './hooks/FeaturePreferencesProvider';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { ErrorState } from './components/layout/ScreenStates';
import { Button } from './components/ui/Button';
import { isStorageAvailable } from './db/database';
import { HomeScreen } from './screens/HomeScreen';
import { AddCarScreen } from './screens/AddCarScreen';
import { RateCarScreen } from './screens/RateCarScreen';
import { ExtrasScreen } from './screens/ExtrasScreen';
import { CommentsScreen } from './screens/CommentsScreen';
import { MyCarsScreen } from './screens/MyCarsScreen';
import { CarDetailScreen } from './screens/CarDetailScreen';
import { EditCarScreen } from './screens/EditCarScreen';
import { CompareScreen } from './screens/CompareScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { ManageFeaturesScreen } from './screens/ManageFeaturesScreen';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeScreen />} />
      <Route path="/new" element={<AddCarScreen />} />
      <Route path="/cars" element={<MyCarsScreen />} />
      <Route path="/compare" element={<CompareScreen />} />
      <Route path="/more" element={<SettingsScreen />} />
      <Route path="/more/features" element={<ManageFeaturesScreen />} />
      <Route path="/car/:id" element={<CarDetailScreen />} />
      <Route path="/car/:id/rate" element={<RateCarScreen />} />
      <Route path="/car/:id/extras" element={<ExtrasScreen />} />
      <Route path="/car/:id/comments" element={<CommentsScreen />} />
      <Route path="/car/:id/edit" element={<EditCarScreen />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  const [storageOk, setStorageOk] = useState<boolean | null>(null);

  useEffect(() => {
    void isStorageAvailable().then(setStorageOk);
  }, []);

  return (
    <ToastProvider>
      <FeaturePreferencesProvider>
        <HashRouter>
        <ScrollToTop />
        <main>
          {storageOk === false ? (
            <ErrorState
              title="Car Rater can’t save on this device"
              body="Local storage is blocked here — private browsing mode is the usual cause. Open Car Rater in a normal window and your cars will save properly."
              action={
                <Button onClick={() => window.location.reload()}>Try again</Button>
              }
            />
          ) : (
            <ErrorBoundary>
              <AppRoutes />
            </ErrorBoundary>
          )}
        </main>
          <BottomNav />
        </HashRouter>
      </FeaturePreferencesProvider>
    </ToastProvider>
  );
}
