import assert from 'node:assert/strict';
import test from 'node:test';
import { entitlementFor, FAQ_APP_ID } from '../src/lib/faq-pricing.ts';
import { allQueryItems } from '../src/lib/faq-query.ts';

const basic = { instanceId: 'site-a', isFree: true, freeTrialAvailable: true };

test('Basic cannot display live FAQs and eligible users can start a trial', () => {
  const result = entitlementFor(basic);
  assert.equal(result.plan, 'basic');
  assert.equal(result.canUseLive, false);
  assert.equal(result.trialAvailable, true);
});

test('an active Wix trial grants all Pro access', () => {
  const result = entitlementFor({ ...basic, isFree: false, billing: { freeTrialInfo: { status: 'IN_PROGRESS', endDate: '2026-10-04T12:00:00Z' } } });
  assert.equal(result.plan, 'trial');
  assert.equal(result.canUseLive, true);
  assert.equal(result.trialAvailable, false);
  assert.equal(result.trialEndDate, '2026-10-04T12:00:00.000Z');
});

test('successful trial conversion stays Pro, even with past dates', () => {
  const result = entitlementFor({ ...basic, isFree: false, billing: { freeTrialInfo: { status: 'ENDED', endDate: '2020-01-01' } } });
  assert.equal(result.plan, 'pro');
  assert.equal(result.canUseLive, true);
  assert.equal(result.trialEndDate, null);
});

test('expired and ineligible installations return to Basic', () => {
  const result = entitlementFor({ ...basic, freeTrialAvailable: false, billing: { freeTrialInfo: { status: 'ENDED' } } });
  assert.equal(result.canUseLive, false);
  assert.equal(result.trialAvailable, false);
});

test('Wix owner emails get Pro without purchase or trial', () => {
  for (const email of ['owner@wix.com', ' Owner@WIX.COM ']) {
    const result = entitlementFor(basic, email);
    assert.equal(result.plan, 'pro');
    assert.equal(result.canUseLive, true);
    assert.equal(result.trialAvailable, false);
  }
});

test('missing owner data, subdomains, and lookalike domains do not bypass billing', () => {
  for (const email of [undefined, null, '', 'owner@example.com', 'owner@team.wix.com', 'owner@wix.com.evil.test', 'owner@fakewix.com', 'owner@@wix.com', '@wix.com']) {
    assert.equal(entitlementFor(basic, email).canUseLive, false);
  }
});

test('missing billing identity is an error, not a paid entitlement', () => {
  assert.throws(() => entitlementFor({ instanceId: 'site-a' }));
  assert.throws(() => entitlementFor({ isFree: false }));
});

test('upgrade URLs target the authenticated installation and escape its identifier', () => {
  const url = new URL(entitlementFor({ ...basic, instanceId: 'site-a&appInstanceId=site-b' }).upgradeUrl);
  assert.equal(url.pathname, `/apps/upgrade/${FAQ_APP_ID}`);
  assert.equal(url.searchParams.get('appInstanceId'), 'site-a&appInstanceId=site-b');
});

test('missing or malformed trial dates do not invent a deadline or remove access', () => {
  for (const endDate of [undefined, 'invalid-date']) {
    const result = entitlementFor({ ...basic, isFree: false, billing: { freeTrialInfo: { status: 'IN_PROGRESS', endDate } } });
    assert.equal(result.canUseLive, true);
    assert.equal(result.trialEndDate, null);
  }
});

test('FAQ pagination includes every page, preserving question order', async () => {
  const page3 = { items: [{ _id: 'last' }], hasNext: () => false };
  const page2 = { items: [{ _id: 'middle' }], hasNext: () => true, next: async () => page3 };
  const page1 = { items: [{ _id: 'first' }], hasNext: () => true, next: async () => page2 };
  const query = { limit: (limit) => { assert.equal(limit, 1000); return { find: async () => page1 }; } };
  assert.deepEqual((await allQueryItems(query)).map((item) => item._id), ['first', 'middle', 'last']);
});
