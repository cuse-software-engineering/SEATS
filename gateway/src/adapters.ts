// The LINE Login port of the API Gateway and its fake (Table 5.1, ADR-01, BRULE-12): the gateway verifies the ID token
// of the LIFF app and reads the LINE user id from it. The fake accepts the tokens `fake-line-<user id>`; LINE_LOGIN
// selects another implementation when one exists.
export interface LineLoginAdapter {
  /** The LINE user id behind a valid ID token, or null when the token does not verify. */
  verifyIdToken(idToken: string): Promise<{ userId: string } | null>;
}

export class FakeLineLogin implements LineLoginAdapter {
  async verifyIdToken(idToken: string): Promise<{ userId: string } | null> {
    const m = /^fake-line-([\w-]+)$/.exec(idToken);
    return m ? { userId: m[1] } : null;
  }
}

export function lineLoginFromEnv(): LineLoginAdapter {
  const kind = process.env.LINE_LOGIN ?? 'fake';
  if (kind === 'fake') return new FakeLineLogin();
  throw new Error(`LINE_LOGIN=${kind}: only "fake" is built; the adapter of LINE Login comes with the channel id`);
}

/** The adapter in use; tests replace it. */
export const adapters = { lineLogin: lineLoginFromEnv() };
