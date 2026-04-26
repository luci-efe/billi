export interface ConsentRecord {
  version: 1;
  acceptedAt: number;
  copyHash: string;
}

export const CONSENT_KEY = 'billi.consent.v1';

// This hash represents the current version of the consent copy.
// It should be updated whenever the copy in docs/specs/cycle-01/BIL-1-onboarding-consent.md changes.
export const COPY_HASH = '80932c668612140f2203f750c822e4c840c836920f269472314649f878937617';

export function getConsent(): ConsentRecord | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(CONSENT_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as ConsentRecord;
  } catch {
    return null;
  }
}

export function setConsent(): void {
  if (typeof window === 'undefined') return;
  const record: ConsentRecord = {
    version: 1,
    acceptedAt: Math.floor(Date.now() / 1000),
    copyHash: COPY_HASH,
  };
  localStorage.setItem(CONSENT_KEY, JSON.stringify(record));
}

export function isConsentValid(record: ConsentRecord | null): record is ConsentRecord {
  return (
    record !== null &&
    record.version === 1 &&
    record.copyHash === COPY_HASH
  );
}
