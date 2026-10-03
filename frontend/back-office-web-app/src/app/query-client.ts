// The one QueryClient of the app, created here so that sign-out can clear it and a mutation can put its answer
// straight into the cache (the saved round, the saved map) instead of reading it back.
import { createQueryClient } from '@seats/frontend-shared';

export const queryClient = createQueryClient();
