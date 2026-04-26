import { describe, it, expect, beforeEach } from 'vitest';
import { setConsent, isConsentValid } from '../consent';

describe('consent lib', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('setConsent() writes a valid record to localStorage (T4)', () => {
    setConsent();
    const stored = localStorage.getItem('billi.consent.v1');
    expect(stored).not.toBeNull();
    
    const record = JSON.parse(stored!);
    expect(record.version).toBe(1);
    expect(typeof record.acceptedAt).toBe('number');
    expect(record.copyHash).toBeTruthy();
    expect(typeof record.copyHash).toBe('string');
  });

  it('isConsentValid() returns false when copyHash mismatches (T7)', () => {
    const staleRecord = {
      version: 1,
      acceptedAt: 1700000000,
      copyHash: 'stale-hash'
    };
    // @ts-expect-error - testing invalid record
    expect(isConsentValid(staleRecord)).toBe(false);
  });
});
