import test from 'node:test';
import assert from 'node:assert/strict';
import { activeOpportunities, getOpportunityReward, getOpportunityRewardAmount, isOpportunityActive } from '../src/services/opportunityUtils.ts';

const now = new Date('2026-11-12T12:00:00');

test('filters closed states and expired application deadlines without treating event dates as deadlines', () => {
  const records = [
    { id: 'active', deadline: '2026-11-13' },
    { id: 'today', registration_end: '2026-11-12' },
    { id: 'undated', status: 'Open' },
    { id: 'closed', status: 'Registration Closed', deadline: '2026-12-01' },
    { id: 'old-deadline', application_deadline: '2026-11-11' },
    { id: 'event-ended', date_end: '2026-11-10' },
    { id: 'old-submission', submission_end: '2026-11-10' },
  ];
  assert.deepEqual(activeOpportunities(records, now).map((item) => item.id), ['active', 'today', 'undated', 'event-ended']);
  assert.equal(isOpportunityActive({ status: 'Expired' }, now), false);
});

test('formats explicit INR prizes, keeps unqualified compensation currency-free, and avoids comparing unrelated compensation', () => {
  assert.deepEqual(getOpportunityReward({ prize_pool: '₹50000 Prize Pool' }), { label: 'Prize', text: '₹50,000 Prize Pool' });
  assert.deepEqual(getOpportunityReward({ stipend_amount: 20000 }), { label: 'Stipend', text: '20,000/month' });
  assert.deepEqual(getOpportunityReward({ scholarship_amount: 'INR 100000' }), { label: 'Scholarship', text: '₹1,00,000' });
  assert.equal(getOpportunityReward({ prizeOrCompensation: 'Not specified' }), undefined);
  assert.equal(getOpportunityReward({ prize: 'INR 7000' })?.text, '₹7,000');
  assert.equal(getOpportunityRewardAmount({ prize: '₹2.5 lakh total rewards' }), 250000);
  assert.equal(getOpportunityRewardAmount({ prize: 'USD 500' }), undefined);
  assert.equal(getOpportunityRewardAmount({ salary: 90000 }), undefined);
  assert.equal(getOpportunityRewardAmount({ stipend: 20000 }), undefined);
});
