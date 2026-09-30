import { createRoot } from 'react-dom/client';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import App from './App';
import B1SignIn from './screens/B1SignIn';
import B2ZoneMapEditor from './screens/B2ZoneMapEditor';
import B3RoundEditor from './screens/B3RoundEditor';
import B4LiveView from './screens/B4LiveView';
import B5CheckInScanner from './screens/B5CheckInScanner';
import B6VerificationResultAndEntryConfirmed from './screens/B6VerificationResultAndEntryConfirmed';
import B7BusinessParametersAndStaffAccounts from './screens/B7BusinessParametersAndStaffAccounts';
import './styles.css';

// One route per screen of Table D.2 (Appendix D); App redirects to /sign-in without a session.
const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/rounds" replace /> },
      { path: 'sign-in', element: <B1SignIn /> },
      { path: 'zone-maps', element: <B2ZoneMapEditor /> },
      { path: 'rounds', element: <B3RoundEditor /> },
      { path: 'live', element: <B4LiveView /> },
      { path: 'check-in', element: <B5CheckInScanner /> },
      { path: 'check-in/result', element: <B6VerificationResultAndEntryConfirmed /> },
      { path: 'settings', element: <B7BusinessParametersAndStaffAccounts /> },
      { path: '*', element: <p className="muted">No such screen.</p> },
    ],
  },
], { future: { v7_relativeSplatPath: true } });

const root = document.getElementById('root');
if (!root) throw new Error('index.html has no #root');
createRoot(root).render(<RouterProvider router={router} future={{ v7_startTransition: true }} />);
