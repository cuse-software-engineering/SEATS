import { createBrowserRouter } from 'react-router-dom';
import { App } from './App';
import { NotFoundScreen } from './NotFoundScreen';
import { LoginScreen } from '../features/login/LoginScreen';
import { RoundListScreen } from '../features/rounds/RoundListScreen';
import { TableMapScreen } from '../features/rounds/TableMapScreen';
import { HoldSummaryScreen } from '../features/booking/HoldSummaryScreen';
import { ProfileScreen } from '../features/profile/ProfileScreen';
import { TermsScreen } from '../features/terms/TermsScreen';
import { PaymentScreen } from '../features/payment/PaymentScreen';
import { ConfirmationScreen } from '../features/confirmation/ConfirmationScreen';
import { MyBookingsScreen } from '../features/my-bookings/MyBookingsScreen';

// One route per screen; the booking screens hang under /bookings/:id in the order the customer walks them.
export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <RoundListScreen /> },
      { path: 'login', element: <LoginScreen /> },
      { path: 'rounds/:id', element: <TableMapScreen /> },
      { path: 'bookings/:id', element: <HoldSummaryScreen /> },
      { path: 'bookings/:id/profile', element: <ProfileScreen /> },
      { path: 'bookings/:id/terms', element: <TermsScreen /> },
      { path: 'bookings/:id/payment', element: <PaymentScreen /> },
      { path: 'bookings/:id/confirmation', element: <ConfirmationScreen /> },
      { path: 'my-bookings', element: <MyBookingsScreen /> },
      { path: '*', element: <NotFoundScreen /> },
    ],
  },
], { future: { v7_relativeSplatPath: true } });
