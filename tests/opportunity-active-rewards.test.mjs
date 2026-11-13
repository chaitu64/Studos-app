import test from 'node:test';
import assert from 'node:assert/strict';
import { activeOpportunities, getOpportunityReward, getOpportunityRewardAmount, isOpportunityActive } from '../src/services/opportunityUtils.ts';

const now = new Date('2026-11-12T12:00:00');

test('filters provider closed states and expired date variants while keeping current and undated opportunities', () => {
  const records = [
    { id: 'active', deadline: '2026-11-13' },
    { id: 'today', registration_end: '2026-11-12' },
    { id: 'undated', status: 'Open' },
    { id: 'closed', status: 'Registration Closed', deadline: '2026-12-01' },
    { id: 'old-deadline', application_deadline: '2026-11-11' },
    { id: 'old-end', date_end: '2026-11-10' },
    { id: 'old-submission', submission_end: '2026-11-10' },
  ];
  assert.deepEqual(activeOpportunities(records, now).map((item) => item.id), ['active', 'today', 'undated']);
  assert.equal(isOpportunityActive({ status: 'Expired' }, now), false);
});

test('normalizes common reward fields into short, labeled card metadata', () => {
  assert.deepEqual(getOpportunityReward({ prize_pool: '₹50,000 Prize Pool' }), { label: 'Prize', text: '₹50,000 Prize Pool' });
  assert.deepEqual(getOpportunityReward({ stipend_amount: 20000 }), { label: 'Stipend', text: '₹20,000/month' });
  assert.deepEqual(getOpportunityReward({ scholarship_amount: 'INR 100000' }), { label: 'Scholarship', text: '₹100000' });
  assert.equal(getOpportunityReward({ prizeOrCompensation: 'Not specified' }), undefined);
  assert.equal(getOpportunityRewardAmount({ prize: '₹2.5 lakh total rewards' }), 250000);
});
