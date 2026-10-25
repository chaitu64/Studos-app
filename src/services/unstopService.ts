const BASE_URL = 'https://unstop.com';
const API_URL = `${BASE_URL}/api/public/opportunity/search-result`;

export type UnstopHackathon = {
  id: string;
  title: string;
  organizer: string;
  deadline: string | null;
  location: string;
  mode: string;
  prize: string;
  skills: string[];
  eligibility: string;
  description: string;
  registrationUrl: string;
  source: 'Unstop';
  daysRemaining?: number;
  prizeAmount?: number;
  isPaid?: boolean;
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function text(value: unknown): string {
  if (value == null) return '';

  if (Array.isArray(value)) {
    return value.map(text).filter(Boolean).join(', ');
  }

  if (typeof value === 'object') {
    const obj = asRecord(value);
    return text(obj.name ?? obj.title ?? obj.value ?? '');
  }

  return String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function absoluteUrl(value: unknown): string {
  const url = text(value);
  if (!url) return '';

  try {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return new URL(url.replace(/^\/+/, ''), `${BASE_URL}/`).toString();
  } catch {
    return '';
  }
}

function extractItems(payload: unknown): UnknownRecord[] {
  const root = asRecord(payload);
  const data = asRecord(root.data);

  const candidates = [
    data.data,
    data.items,
    data.results,
    root.results,
    root.items,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.map(asRecord);
    }
  }

  return [];
}

function parsePrizeAmount(prizeStr: string): number {
  if (!prizeStr) return 0;
  const digits = prizeStr.replace(/[^0-9]/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

function calculateDaysRemaining(deadlineStr: string | null): number | undefined {
  if (!deadlineStr) return undefined;
  try {
    const deadlineDate = new Date(deadlineStr);
    if (isNaN(deadlineDate.getTime())) return undefined;
    const now = new Date();
    const diffTime = deadlineDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch {
    return undefined;
  }
}

function normalizeHackathon(item: UnknownRecord): UnstopHackathon | null {
  const org =
    item.organisation ??
    item.organization ??
    item.organizer ??
    '';

  const address =
    item.address_with_country_logo ??
    item.address ??
    {};

  const addressRecord = asRecord(address);

  const location =
    typeof address === 'object' && address !== null
      ? [addressRecord.city, addressRecord.state, addressRecord.country]
          .map(text)
          .filter(Boolean)
          .join(', ')
      : text(address);

  const rawSkills = item.required_skills ?? item.skills ?? [];

  const skills = Array.isArray(rawSkills)
    ? rawSkills.map(text).filter(Boolean)
    : text(rawSkills)
        .split(',')
        .map((skill) => skill.trim())
        .filter(Boolean);

  const title = text(item.title ?? item.name);
  const registrationUrl = absoluteUrl(
    item.seo_url ?? item.url ?? item.public_url ?? item.short_url
  );

  const id = text(item.id ?? item.opportunity_id);

  if (!title) return null;

  const rawDeadline = text(
    item.end_date ?? item.registration_deadline ?? item.last_date
  ) || null;

  const prize = text(item.prize_money ?? item.prize ?? item.prizes);

  return {
    id: id || registrationUrl || title,
    title,
    organizer: text(org) || 'Unstop Verified Organizer',
    deadline: rawDeadline,
    location: location || 'Online',
    mode: text(item.region ?? item.mode) || 'Online',
    prize,
    prizeAmount: parsePrizeAmount(prize),
    skills,
    eligibility: text(item.eligibility ?? item.eligible_for) || 'Open to all college students',
    description: text(item.details ?? item.description) || 'Hackathon hosted on Unstop.',
    registrationUrl: registrationUrl || `https://unstop.com/o/${id}`,
    source: 'Unstop',
    daysRemaining: calculateDaysRemaining(rawDeadline),
    isPaid: Boolean(item.isPaid),
  };
}

let inFlightFetch: Promise<UnstopHackathon[]> | null = null;

export async function fetchUnstopHackathons(force = false): Promise<UnstopHackathon[]> {
  if (inFlightFetch && !force) {
    return inFlightFetch;
  }

  inFlightFetch = (async () => {
    const results = new Map<string, UnstopHackathon>();

    for (let page = 1; page <= 3; page += 1) {
      const url = new URL(API_URL);

      url.searchParams.set('opportunity', 'hackathons');
      url.searchParams.set('per_page', '20');
      url.searchParams.set('oppstatus', 'open');
      url.searchParams.set('page', String(page));

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);

      try {
        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            Accept: 'application/json, text/plain, */*',
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Referer: 'https://unstop.com/hackathons/',
          },
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          if (page === 1) {
            throw new Error(`Unstop returned HTTP ${response.status} on page 1`);
          }
          break;
        }

        const rawText = await response.text();
        if (!rawText || !rawText.trim()) {
          if (page === 1) {
            throw new Error('Unstop returned an empty response body on page 1');
          }
          break;
        }

        // Check if CDN or Cloudflare returned HTML challenge instead of JSON
        if (rawText.trim().startsWith('<')) {
          if (page === 1) {
            throw new Error('Unstop returned an HTML challenge instead of JSON data');
          }
          break;
        }

        const payload: unknown = JSON.parse(rawText);
        const items = extractItems(payload);

        if (items.length === 0) {
          if (page === 1) {
            throw new Error(
              'Unstop returned no recognizable listings. Its response structure may have changed.'
            );
          }
          break;
        }

        for (const item of items) {
          const opportunity = normalizeHackathon(item);
          if (!opportunity) continue;

          results.set(opportunity.id, opportunity);
        }

        if (items.length < 20) break;
      } catch (pageErr) {
        clearTimeout(timeout);
        // If we already successfully parsed Page 1, preserve the 20+ real listings
        if (results.size > 0) {
          console.warn(`Unstop page ${page} encountered an issue, returning ${results.size} fetched items:`, pageErr);
          break;
        }
        throw pageErr;
      }
    }

    if (results.size === 0) {
      throw new Error('No hackathons could be retrieved from Unstop.');
    }

    return Array.from(results.values());
  })().finally(() => {
    inFlightFetch = null;
  });

  return inFlightFetch;
}
