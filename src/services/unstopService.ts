import { Opportunity, OpportunityCategory, OpportunityType } from '../types';
import { Platform } from 'react-native';
import { isOpportunityActive } from './opportunityUtils';

const BASE_URL = 'https://unstop.com';
const API_URL = `${BASE_URL}/api/public/opportunity/search-result`;
const CDN_BASE = 'https://d8it4huxumps7.cloudfront.net';

// 8 Core Categories (Cultural Events removed as requested)
const UNSTOP_CATEGORIES: Record<OpportunityCategory, string> = {
  Hackathons: 'hackathons',
  Internships: 'internships',
  Jobs: 'jobs',
  Competitions: 'competitions',
  Quizzes: 'quizzes',
  Scholarships: 'scholarships',
  Workshops: 'workshops',
  'Conferences / Meets': 'conferences',
};

const TYPE_MAPPING: Record<OpportunityCategory, OpportunityType> = {
  Hackathons: 'Hackathon',
  Internships: 'Internship',
  Jobs: 'Job',
  Competitions: 'Competition',
  Quizzes: 'Quiz',
  Scholarships: 'Scholarship',
  Workshops: 'Workshop',
  'Conferences / Meets': 'Conference',
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

function resolveImageUrl(url: unknown): string | undefined {
  const clean = text(url);
  if (!clean || clean === 'null' || clean.endsWith('/')) {
    return undefined;
  }
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean;
  }
  if (clean.startsWith('//')) {
    return `https:${clean}`;
  }
  const cleanPath = clean.replace(/^\/+/, '');
  if (cleanPath.startsWith('images/') || cleanPath.startsWith('uploads/')) {
    return `${CDN_BASE}/${cleanPath}`;
  }
  return `${BASE_URL}/${cleanPath}`;
}

function absoluteUrl(value: unknown, fallbackId?: string): string {
  const url = text(value);
  if (url) {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `${BASE_URL}/${url.replace(/^\/+/, '')}`;
  }
  if (fallbackId) {
    return `${BASE_URL}/o/${fallbackId}`;
  }
  return '';
}

function parsePrizeAmount(prizeStr: string): number | undefined {
  if (!prizeStr) return undefined;
  const amount = prizeStr.replace(/,/g, '').match(/\d+(?:\.\d+)?/);
  if (!amount) return undefined;
  let value = Number(amount[0]);
  if (/\b(crore|crores|cr)\b/i.test(prizeStr)) value *= 10_000_000;
  else if (/\b(lakh|lakhs|lac|lacs)\b/i.test(prizeStr)) value *= 100_000;
  else if (/\b(thousand|k)\b/i.test(prizeStr)) value *= 1_000;
  return Number.isFinite(value) ? Math.round(value) : undefined;
}

export function calculateDaysRemaining(deadlineStr: string | null): number | undefined {
  if (!deadlineStr) return undefined;
  try {
    const deadlineDate = parseSourceDate(deadlineStr);
    if (isNaN(deadlineDate.getTime())) return undefined;
    const now = new Date();
    // Compare calendar dates in the source's local timezone, so a deadline
    // earlier today is still available through the end of that date.
    const deadlineDay = Date.UTC(deadlineDate.getFullYear(), deadlineDate.getMonth(), deadlineDate.getDate());
    const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((deadlineDay - today) / (1000 * 60 * 60 * 24));
  } catch {
    return undefined;
  }
}

function parseSourceDate(value: string): Date {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (dateOnly) return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
  return new Date(value);
}

/** Preserve paragraph, heading, list and link boundaries from Unstop HTML/text. */
function normalizeDescription(value: unknown): string {
  if (value == null) return '';
  if (Array.isArray(value)) return value.map(normalizeDescription).filter(Boolean).join('\n\n');
  if (typeof value === 'object') {
    const record = asRecord(value);
    const title = text(record.title ?? record.name);
    const sectionContent = record.content ?? record.description ?? record.html ?? record.text;
    if (title && sectionContent != null) return `${title}\n\n${normalizeDescription(sectionContent)}`;
    const direct = record.html ?? record.content_html ?? record.content ?? record.description ?? record.text ?? record.value;
    if (direct != null) return normalizeDescription(direct);
    return Object.entries(record)
      .filter(([, content]) => content != null && typeof content !== 'object')
      .map(([heading, content]) => `${heading.replace(/[_-]/g, ' ')}\n${String(content)}`)
      .join('\n\n');
  }
  const raw = String(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
  return raw
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '$1 ($2)')
    .replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, '$1$2')
    .replace(/\*([^*]+)\*|_([^_]+)_/g, '$1$2')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<a\b[^>]*href=["'](https?:\/\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)')
    .replace(/<h[1-6]\b[^>]*>/gi, '\n\n')
    .replace(/<(?:p|div|section|article)\b[^>]*>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|section|article|h[1-6]|li|tr)>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '• ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function formatDaysRemaining(daysRemaining: number | undefined): {
  label: string;
  isUrgent: boolean;
  isExpired: boolean;
  isAvailable: boolean;
} {
  if (daysRemaining === undefined) {
    return {
      label: 'Rolling / TBA',
      isUrgent: false,
      isExpired: false,
      isAvailable: false,
    };
  }
  if (daysRemaining < 0) {
    return {
      label: 'Expired',
      isUrgent: false,
      isExpired: true,
      isAvailable: true,
    };
  }
  if (daysRemaining === 0) {
    return {
      label: 'Closing Today',
      isUrgent: true,
      isExpired: false,
      isAvailable: true,
    };
  }
  if (daysRemaining === 1) {
    return {
      label: '1 day remaining',
      isUrgent: true,
      isExpired: false,
      isAvailable: true,
    };
  }
  return {
    label: `${daysRemaining} days remaining`,
    isUrgent: daysRemaining <= 5,
    isExpired: false,
    isAvailable: true,
  };
}

function formatDeadlineDate(dateStr: string | null): string {
  if (!dateStr) return 'Not specified';
  try {
    const d = parseSourceDate(dateStr);
    if (isNaN(d.getTime())) return dateStr.slice(0, 10);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr.slice(0, 10);
  }
}

function normalizeUnstopItem(
  item: UnknownRecord,
  categoryName: OpportunityCategory
): Opportunity | null {
  const rawTitle = item.title ?? item.name;
  const title = text(rawTitle);
  if (!title) return null;

  const id = text(item.id ?? item.opportunity_id);

  // Organizer info
  const orgObj = asRecord(item.organisation ?? item.organization ?? item.organizer);
  let organizerName = text(orgObj.name) || text(item.organizer);
  let rawLogo = orgObj.logo ?? orgObj.logoUrl ?? orgObj.logoUrl2;

  if (!organizerName) {
    const fest = asRecord(item.festival);
    const festOrg = asRecord(fest.organisation);
    organizerName = text(festOrg.name);
    rawLogo = rawLogo ?? festOrg.logo;
  }

  if (!organizerName) {
    organizerName = 'Organizer not specified';
  }

  // Separate organizer logo and opportunity banner
  const organizerLogo = resolveImageUrl(rawLogo ?? item.logoUrl2 ?? item.logoUrl);

  const festObj = asRecord(item.festival);
  const rawBanner = item.thumb ?? item.banner_mobile ?? item.banner ?? festObj.logoUrl2;
  const bannerImage = resolveImageUrl(rawBanner);

  // Mode and Location
  const rawRegion = text(item.region ?? item.mode).toLowerCase();
  let format: 'In-Person' | 'Online' | 'Hybrid' = 'Online';
  if (rawRegion.includes('in-person') || rawRegion.includes('offline')) {
    format = 'In-Person';
  } else if (rawRegion.includes('hybrid')) {
    format = 'Hybrid';
  }

  const address = asRecord(item.address_with_country_logo ?? item.address);
  const city = text(address.city);
  const state = text(address.state);
  const country = text(address.country);
  const locParts = [city, state, country].filter(Boolean);
  const location = locParts.length > 0 ? locParts.join(', ') : format;

  // Registration Requirements (team sizes, deadlines, eligibility)
  const regnReq = asRecord(item.regnRequirements);
  const rawDeadline = text(
    item.deadline ?? item.application_deadline ?? item.submission_end ?? item.registration_end
      ?? regnReq.end_regn_dt ?? item.registration_deadline ?? item.last_date
  ) || null;

  // Days remaining calculation
  let daysRemaining: number | undefined;
  const remDaysArr = asRecord(regnReq.remainingDaysArray);
  if (remDaysArr.durations != null && !isNaN(Number(remDaysArr.durations)) && Number(remDaysArr.durations) >= 0) {
    daysRemaining = Number(remDaysArr.durations);
  } else {
    daysRemaining = calculateDaysRemaining(rawDeadline);
  }

  // Team size
  const minTeamRaw = regnReq.min_team_size;
  const maxTeamRaw = regnReq.max_team_size;
  const minTeamSize = typeof minTeamRaw === 'number' ? minTeamRaw : undefined;
  const maxTeamSize = typeof maxTeamRaw === 'number' ? maxTeamRaw : undefined;

  let teamSize = 'Not specified';
  if (minTeamSize && maxTeamSize) {
    teamSize = minTeamSize === maxTeamSize
      ? minTeamSize === 1 ? 'Individual' : `${minTeamSize} members`
      : `${minTeamSize}–${maxTeamSize} members`;
  } else if (maxTeamSize) {
    teamSize = maxTeamSize === 1 ? 'Individual' : `Up to ${maxTeamSize} members`;
  } else if (minTeamSize) {
    teamSize = `Min ${minTeamSize} members`;
  }

  // Eligibility
  let eligibility = '';
  const filters = Array.isArray(item.filters) ? item.filters : [];
  for (const f of filters) {
    const fRec = asRecord(f);
    if (fRec.type === 'eligible' && fRec.name) {
      const eText = text(fRec.name);
      if (eText && eText.toLowerCase() !== 'all') {
        eligibility = eText;
      }
      break;
    }
  }
  if (!eligibility && regnReq.eligibility) {
    const regnElig = text(regnReq.eligibility);
    if (regnElig) eligibility = regnElig;
  }

  // Tags & Skills
  const tags: string[] = [];
  const wf = Array.isArray(item.workfunction) ? item.workfunction : [];
  for (const w of wf) {
    const name = text(asRecord(w).name);
    if (name) tags.push(name);
  }

  const skills: string[] = [];
  const rawSkills = item.required_skills ?? item.skills ?? [];
  if (Array.isArray(rawSkills)) {
    for (const s of rawSkills) {
      if (typeof s === 'object') {
        const sRec = asRecord(s);
        const name = text(sRec.skill ?? sRec.skill_name ?? sRec.name);
        if (name) skills.push(name);
      } else {
        const name = text(s);
        if (name) skills.push(name);
      }
    }
  } else if (typeof rawSkills === 'string') {
    skills.push(...rawSkills.split(',').map((s) => s.trim()).filter(Boolean));
  }

  // Prizes
  const prizesList = Array.isArray(item.prizes) ? item.prizes : [];
  let prizeText = '';
  if (prizesList.length > 0) {
    const firstP = asRecord(prizesList[0]);
    prizeText = text(firstP.cash ?? firstP.title);
  }
  if (!prizeText) prizeText = text(item.cash_prize ?? item.prize_pool ?? item.prize_money ?? item.prize ?? item.reward ?? item.rewards ?? item.scholarship_amount ?? item.grant_amount ?? item.salary_package ?? item.salary ?? item.stipend ?? item.stipend_amount ?? item.prizes);
  const prizeAmount = parsePrizeAmount(prizeText);

  // Registration URL
  const regUrl = absoluteUrl(
    item.seo_url ?? item.url ?? item.public_url ?? item.short_url,
    id
  );

  const isPaid = Boolean(item.isPaid);
  const isVerified = Boolean(
    orgObj.is_verified || orgObj.verified || item.is_verified || item.verified
  );

  const providerStatus = text(item.status ?? item.state ?? item.opportunity_status ?? item.registration_status);
  let status: 'Open' | 'Closing Soon' | 'Closed' | 'Expired' = /closed|expired|ended|complete|cancelled|inactive/i.test(providerStatus) ? 'Closed' : 'Open';
  if (daysRemaining !== undefined && status !== 'Closed') {
    if (daysRemaining < 0) {
      status = 'Expired';
    } else if (daysRemaining <= 5) {
      status = 'Closing Soon';
    }
  }

  const opportunity: Opportunity = {
    id: id || regUrl || title,
    title,
    organizer: organizerName,
    organizerLogo,
    bannerImage,
    type: TYPE_MAPPING[categoryName] || 'Hackathon',
    category: categoryName,
    format,
    location,
    deadline: formatDeadlineDate(rawDeadline),
    deadlineIso: rawDeadline || undefined,
    daysRemaining: daysRemaining,
    eligibility,
    prizeOrCompensation: prizeText || 'Not specified',
    prizeAmount,
    stipend: text(item.stipend ?? item.stipend_amount ?? item.stipend_details) || undefined,
    registrationFee: isPaid ? 'Paid' : 'Free',
    teamSize,
    minTeamSize,
    maxTeamSize,
    isVerified,
    tags,
    requiredSkills: Array.from(new Set(skills.length > 0 ? skills : tags)).slice(0, 6),
    description: normalizeDescription(item.details) || normalizeDescription(item.description),
    officialUrl: regUrl,
    checklist: [],
    source: 'Unstop',
    status,
    isSaved: false,
    featured: (prizeAmount && prizeAmount > 50000) || false,
    publishedAt: text(item.approved_date ?? item.created_at ?? item.published_at ?? item.updated_at) || undefined,
  };
  return isOpportunityActive(opportunity) ? opportunity : null;
}

// Memory Cache with 15-minute TTL
interface CacheEntry {
  data: Opportunity[];
  timestamp: number;
}
const memoryCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000;

// In-flight request deduplication map
const inFlightRequests = new Map<string, Promise<Opportunity[]>>();

async function fetchCategoryFromUnstop(
  category: OpportunityCategory,
  page = 1,
  perPage = 20
): Promise<Opportunity[]> {
  const slug = UNSTOP_CATEGORIES[category];
  if (!slug) return [];

  const url = new URL(API_URL);
  url.searchParams.set('opportunity', slug);
  url.searchParams.set('per_page', String(perPage));
  url.searchParams.set('oppstatus', 'open');
  url.searchParams.set('page', String(page));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json, text/plain, */*',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: `${BASE_URL}/${slug}/`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Unstop HTTP error ${response.status} for category ${category}`);
    }

    const rawText = await response.text();
    if (!rawText || rawText.trim().startsWith('<')) {
      throw new Error(`Unstop returned HTML challenge or empty body for ${category}`);
    }

    const payload = JSON.parse(rawText) as UnknownRecord;
    const dataBlock = asRecord(payload.data);

    let items: UnknownRecord[] = [];
    const candidates = [
      dataBlock.data,
      dataBlock.items,
      dataBlock.results,
      payload.results,
      payload.items,
    ];

    for (const c of candidates) {
      if (Array.isArray(c)) {
        items = c.map(asRecord);
        break;
      }
    }

    const normalized: Opportunity[] = [];
    for (const it of items) {
      const opp = normalizeUnstopItem(it, category);
      if (opp) normalized.push(opp);
    }

    return normalized;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

export async function fetchLiveOpportunities(options?: {
  category?: OpportunityCategory | 'All';
  categories?: OpportunityCategory[];
  forceRefresh?: boolean;
}): Promise<Opportunity[]> {
  const cacheKey = options?.category || (options?.categories ? options.categories.join(',') : 'All');
  const now = Date.now();

  if (!options?.forceRefresh) {
    const cached = memoryCache.get(cacheKey);
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
  }

  // Deduplicate in-flight requests
  const flightKey = `${cacheKey}_${Boolean(options?.forceRefresh)}`;
  const ongoing = inFlightRequests.get(flightKey);
  if (ongoing) return ongoing;

  const promise = (async () => {
    // Attempt to fetch from local/hosted StudOs backend first if available
    const configuredBackendUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
    const backendUrl = (configuredBackendUrl || (Platform.OS === 'web' ? 'http://localhost:5001' : '')).replace(/\/+$/, '');
    if (backendUrl) try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000);
      const url = new URL(`${backendUrl}/api/opportunities`);
      if (options?.category && options.category !== 'All') {
        url.searchParams.set('category', options.category);
      }
      url.searchParams.set('per_page', '50');
      if (options?.forceRefresh) {
        url.searchParams.set('force_refresh', 'true');
      }

      let backendRes: Response;
      try {
        backendRes = await fetch(url.toString(), { signal: controller.signal });
      } finally {
        clearTimeout(timeout);
      }
      if (backendRes.ok) {
        const json = (await backendRes.json()) as { data?: Opportunity[] };
        if (json?.data && Array.isArray(json.data)) {
          const active = json.data.filter((item) => isOpportunityActive(item));
          memoryCache.set(cacheKey, { data: active, timestamp: now });
          return active;
        }
      }
      if (Platform.OS === 'web') {
        throw new Error(`Opportunities backend returned HTTP ${backendRes.status}.`);
      }
    } catch (backendError) {
      // Native fetch can fall back to Unstop; web requires the CORS-enabled proxy.
      if (Platform.OS === 'web') {
        if (backendError instanceof Error && backendError.message.startsWith('Opportunities backend returned HTTP')) {
          throw backendError;
        }
        throw new Error(`Cannot reach the opportunities backend at ${backendUrl}. Start it with "python backend/server.py" and retry.`);
      }
    }

    // Unstop blocks browser-origin requests. Web must use the CORS-enabled
    // backend proxy instead of issuing eight failing requests from the client.
    if (Platform.OS === 'web') {
      throw new Error('Set EXPO_PUBLIC_API_URL to a reachable StudOs opportunities backend.');
    }

    const targetCategories: OpportunityCategory[] = [];

    if (options?.category && options.category !== 'All') {
      targetCategories.push(options.category);
    } else if (options?.categories && options.categories.length > 0) {
      targetCategories.push(...options.categories);
    } else {
      // Default: fetch top active opportunities across core categories
      targetCategories.push(
        'Hackathons',
        'Internships',
        'Jobs',
        'Competitions',
        'Quizzes',
        'Scholarships',
        'Workshops',
        'Conferences / Meets'
      );
    }

    const resultsMap = new Map<string, Opportunity>();
    const errors: Error[] = [];

    // Fetch categories with bounded concurrency
    const perCategoryLimit = targetCategories.length === 1 ? 25 : 8;

    await Promise.allSettled(
      targetCategories.map(async (cat) => {
        try {
          const items = await fetchCategoryFromUnstop(cat, 1, perCategoryLimit);
          for (const item of items) {
            if (!resultsMap.has(item.id)) {
              resultsMap.set(item.id, item);
            }
          }
        } catch (catErr) {
          console.warn(`Unstop category ${cat} fetch failed:`, catErr);
          errors.push(catErr as Error);
        }
      })
    );

    const aggregated = Array.from(resultsMap.values()).filter((item) => isOpportunityActive(item));

    if (aggregated.length === 0 && errors.length > 0) {
      // If all requests failed, throw honest error so the UI shows retry action
      throw new Error('Unable to connect to live opportunity sources. Please check your internet connection.');
    }

    // Sort default by deadline
    aggregated.sort((a, b) => (a.daysRemaining || 999) - (b.daysRemaining || 999));

    memoryCache.set(cacheKey, { data: aggregated, timestamp: now });
    return aggregated;
  })().finally(() => {
    inFlightRequests.delete(flightKey);
  });

  inFlightRequests.set(flightKey, promise);
  return promise;
}
