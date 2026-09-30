import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import C1RichMenuAndLineLogin from './screens/C1RichMenuAndLineLogin';
import C2ConcertRounds from './screens/C2ConcertRounds';
import C3TableMap from './screens/C3TableMap';
import C4HoldAndBookingSummary from './screens/C4HoldAndBookingSummary';
import C5CustomerProfileAndConsent from './screens/C5CustomerProfileAndConsent';
import C6BookingTerms from './screens/C6BookingTerms';
import C7Payment from './screens/C7Payment';
import C8ConfirmationAndETicket from './screens/C8ConfirmationAndETicket';
import C9MyBookings from './screens/C9MyBookings';
import './styles.css';

// One route per screen of Table D.1 (Appendix D).
const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <C2ConcertRounds /> },
      { path: 'login', element: <C1RichMenuAndLineLogin /> },
      { path: 'rounds/:id', element: <C3TableMap /> },
      { path: 'bookings/:id', element: <C4HoldAndBookingSummary /> },
      { path: 'bookings/:id/profile', element: <C5CustomerProfileAndConsent /> },
      { path: 'bookings/:id/terms', element: <C6BookingTerms /> },
      { path: 'bookings/:id/payment', element: <C7Payment /> },
      { path: 'bookings/:id/confirmation', element: <C8ConfirmationAndETicket /> },
      { path: 'my-bookings', element: <C9MyBookings /> },
      { path: '*', element: <p className="muted">No such screen.</p> },
    ],
  },
], { future: { v7_relativeSplatPath: true } });

const root = document.getElementById('root');
if (!root) throw new Error('index.html has no #root');
createRoot(root).render(<RouterProvider router={router} future={{ v7_startTransition: true }} />);
