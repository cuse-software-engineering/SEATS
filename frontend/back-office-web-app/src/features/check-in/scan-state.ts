import type { VerificationResult } from '@seats/frontend-shared';

/** What the scanner hands to the result screen: the reference, the round, and the answer of the verification or why it failed. */
export interface ScanState { reference: string; roundId: string; result?: VerificationResult; error?: { status: number; error: string } }
