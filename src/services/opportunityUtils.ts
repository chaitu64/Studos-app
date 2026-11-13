import type { Opportunity } from '../types';

type RecordValue = Record<string, unknown>;

const DATE_FIELDS = [
  'deadline', 'deadlineIso', 'application_deadline', 'applicationDeadline',
  'end_date', 'endDate', 'date_end', 'submission_end', 'submissionEnd',
  'submissionEndDate', 'registration_end', 'registrationEnd', 'registrationEndDate', 'registration_deadline', 'last_date',
];
const CLOSED_STATUS = /(?:closed|expired|ended|over|complete|completed|cancelled|canceled|inactive|not\s*open|registration\s*closed)/i;

function record(value: unknown): RecordValue {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : {};
}

function calendarDate(value: unknown): Date | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const raw = String(value).trim();
  if (!raw || /^(?:not specified|rolling|tba|open)$/i.test(raw)) return undefined;
  const dateOnly = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(raw);
  const parsed = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(raw);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function dateIsPast(value: unknown, today: Date): boolean {
  const date = calendarDate(value);
  if (!date) return false;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() < today.getTime();
}

/** Handles canonical records and provider payloads with common field-name variants. */
export function isOpportunityActive(value: unknown, now = new Date()): boolean {
  const item = record(value);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const statuses = [item.status, item.state, item.opportunity_status, item.registration_status]
    .filter((part): part is string => typeof part === 'string');
  if (statuses.some((status) => CLOSED_STATUS.test(status))) return false;
  if (typeof item.daysRemaining === 'number' && item.daysRemaining < 0) return false;
  return !DATE_FIELDS.some((field) => dateIsPast(item[field], today));
}

export function activeOpportunities(items: Opportunity[], now = new Date()): Opportunity[] {
  return items.filter((item) => isOpportunityActive(item, now));
}

const REWARD_FIELDS = [
  'prizeOrCompensation', 'prize', 'prize_pool', 'prizePool', 'cash_prize', 'cashPrize',
  'prize_money', 'prize_amount', 'prizeAmount', 'reward', 'rewards', 'stipend', 'stipend_amount', 'salary', 'salary_package',
  'scholarship_amount', 'scholarshipAmount', 'grant', 'grant_amount',
];

function cleanReward(value: unknown): string {
  if (typeof value === 'number') return value > 0 ? `₹${value.toLocaleString('en-IN')}` : '';
  if (typeof value === 'string') return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (Array.isArray(value)) return value.map(cleanReward).filter(Boolean).join(' · ');
  const obj = record(value);
  const nested = obj.amount ?? obj.value ?? obj.title ?? obj.name ?? obj.cash;
  return nested == null || nested === value ? '' : cleanReward(nested);
}

export function getOpportunityReward(value: unknown): { label: string; text: string } | undefined {
  const item = record(value);
  for (const field of REWARD_FIELDS) {
    const text = cleanReward(item[field]);
    if (!text || /^(?:not specified|none|n\/a|no prize|unpaid)$/i.test(text)) continue;
    const key = field.toLowerCase();
    const label = key.includes('stipend') || /\bstipend\b/i.test(text) ? 'Stipend'
      : key.includes('salary') ? 'Salary'
        : key.includes('scholarship') || /\bscholarship\b/i.test(text) ? 'Scholarship'
          : key.includes('grant') || /\bgrant\b/i.test(text) ? 'Grant'
            : /\bsalary\b/i.test(text) ? 'Salary'
            : key.includes('reward') ? 'Reward'
              : 'Prize';
    const normalized = text.replace(/\b(INR|Rs\.?)(\s*)/gi, '₹$2').replace(/₹\s+/g, '₹');
    const display = label === 'Stipend' && !/\b(month|monthly|per month|\/month)\b/i.test(normalized) && /\d/.test(normalized)
      ? `${normalized}/month` : normalized;
    return { label, text: display };
  }
  return undefined;
}

export function getOpportunityRewardAmount(value: unknown): number | undefined {
  const reward = getOpportunityReward(value);
  if (!reward) return undefined;
  const amountMatch = reward.text.replace(/,/g, '').match(/\d+(?:\.\d+)?/);
  if (!amountMatch) return undefined;
  let amount = Number(amountMatch[0]);
  if (/\b(crore|crores|cr)\b/i.test(reward.text)) amount *= 10_000_000;
  else if (/\b(lakh|lakhs|lac|lacs)\b/i.test(reward.text)) amount *= 100_000;
  else if (/\b(thousand|k)\b/i.test(reward.text)) amount *= 1_000;
  return Number.isFinite(amount) ? amount : undefined;
}
