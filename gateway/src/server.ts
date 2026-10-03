import { gatewayPort } from '@seats/config/src/index.js';
import { ADDRESSES } from './clients.js';
import { ROUTES } from './routes.js';
import { createApp } from './app.js';

const PORT = gatewayPort();
createApp().listen(PORT, () => console.log(`[gateway] REST on :${PORT}, gRPC to ${ROUTES.length} routes of ${Object.keys(ADDRESSES).length} services`));
