import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { AppProviders } from '@seats/frontend-shared';
import '@seats/frontend-shared/src/kit.css';
import { queryClient } from './app/query-client';
import { router } from './app/router';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('index.html has no #root');
createRoot(root).render(
  <AppProviders client={queryClient}>
    <RouterProvider router={router} future={{ v7_startTransition: true }} />
  </AppProviders>,
);
