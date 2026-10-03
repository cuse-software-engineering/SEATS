import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { AppProviders } from '@seats/frontend-shared';
import { router } from './app/router';
import '@seats/frontend-shared/src/kit.css';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('index.html has no #root');
createRoot(root).render(
  <AppProviders>
    <RouterProvider router={router} future={{ v7_startTransition: true }} />
  </AppProviders>,
);
