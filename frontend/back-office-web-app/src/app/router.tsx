import { createBrowserRouter, Navigate } from 'react-router-dom';
import { useSession } from '@seats/frontend-shared';
import { App } from './App';
import { landingOf } from './landing';
import SignInPage from '../features/sign-in/SignInPage';
import ZoneMapsPage from '../features/zone-maps/ZoneMapsPage';
import RoundsPage from '../features/rounds/RoundsPage';
import LiveViewPage from '../features/live-view/LiveViewPage';
import CheckInPage from '../features/check-in/CheckInPage';
import VerificationResultPage from '../features/check-in/VerificationResultPage';
import SettingsPage from '../features/settings/SettingsPage';

/** The index route: the landing screen of the signed-in role (App sends a visitor without a session to the sign-in). */
function Landing() {
  const session = useSession();
  return <Navigate to={session ? landingOf(session.role) : '/sign-in'} replace />;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Landing /> },
      { path: 'sign-in', element: <SignInPage /> },
      { path: 'zone-maps', element: <ZoneMapsPage /> },
      { path: 'rounds', element: <RoundsPage /> },
      { path: 'live', element: <LiveViewPage /> },
      { path: 'check-in', element: <CheckInPage /> },
      { path: 'check-in/result', element: <VerificationResultPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <p className="muted">There is no such screen.</p> },
    ],
  },
], { future: { v7_relativeSplatPath: true } });
