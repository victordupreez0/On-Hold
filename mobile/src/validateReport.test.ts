import { validateReport, type ReportDraft } from './validateReport';

const valid: ReportDraft = {
  channel: 'sms',
  scamType: 'bank',
  description: 'A message claiming to be from my bank asking for my card PIN.',
  sender: '0821234567',
  suburb: 'Bellville',
};

describe('validateReport', () => {
  it('passes a well-formed draft', () => {
    expect(validateReport(valid)).toEqual({});
  });

  it('requires a channel', () => {
    expect(validateReport({ ...valid, channel: null })).toHaveProperty('channel');
  });

  it('requires a scam type', () => {
    expect(validateReport({ ...valid, scamType: null })).toHaveProperty('scamType');
  });

  it('requires a suburb', () => {
    expect(validateReport({ ...valid, suburb: null })).toHaveProperty('suburb');
  });

  it('rejects a description under 10 characters', () => {
    expect(validateReport({ ...valid, description: 'too short' })).toHaveProperty('description');
  });

  it('accepts a description right up to 1000 characters (matches the backend cap)', () => {
    expect(validateReport({ ...valid, description: 'a'.repeat(1000) })).toEqual({});
  });

  it('rejects a description over 1000 characters', () => {
    expect(validateReport({ ...valid, description: 'a'.repeat(1001) })).toHaveProperty('description');
  });

  it('rejects a sender over 100 characters', () => {
    expect(validateReport({ ...valid, sender: 'x'.repeat(101) })).toHaveProperty('sender');
  });

  it('allows an empty sender (optional field)', () => {
    expect(validateReport({ ...valid, sender: '' })).toEqual({});
  });
});
