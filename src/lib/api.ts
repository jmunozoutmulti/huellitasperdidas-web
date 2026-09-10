import { getAccessToken } from './auth';
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface Image {
  id: string;
  image_url: string;
  storage_url: string | null;
  width: number | null;
  height: number | null;
  detected_pet_type: string | null;
  is_flyer: boolean;
}

export interface ReportMeta {
  sex: string | null;
  is_neutered: boolean | null;
  size: string | null;
  breed: string | null;
  color: string | null;
  age: string | null;
  reward: string | null;
  reward_visible: boolean;
  adoption_extras: string | null;
  adoption_extras_visible: boolean;
}

export interface ReportMetaDetail extends ReportMeta { }

export interface Report {
  id: string;
  report_type: string;
  package_slug: string | null;
  source_type: string;
  pet_type: string | null;
  title: string | null;
  description: string | null;
  district: string | null;
  province: string | null;
  region: string | null;
  country: string | null;
  address_hint: string | null;
  lat: number | string | null;
  lng: number | string | null;
  event_date: string | null;
  published_at: string | null;
  source_url: string | null;
  has_video: boolean;
  status: string;
  created_at: string;
  meta: ReportMeta;
  images: Image[];
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  contact_url: string | null;
  likes_count: number;
  has_liked: boolean;
  is_favorited: boolean;
  views_count: number;
  shares_count: number;
  user_id: string | null;
  author_name: string | null;
  author_avatar: string | null;
  rejection_reason: string | null;
  stopped_by_user: boolean | null;
  expires_at: string | null;
  amount_paid: number | null;
  extra_reach: string | null;
  refund_amount: number | null;
  refund_status: string | null; // 'pending' | 'processed' | null
  stopped_at: string | null;
  reactivated_at: string | null;
  extra_reach_purchased_at: string | null;
  pending_reason: string | null;
  statistics_ads: {
    reach_actual?: number;
    reach_projected?: number;
    impressions?: number;
    clicks?: number;
    frequency?: number;
    facebook_post_url?: string;
  };
}

export interface ReportDetail extends Omit<Report, "meta"> {
  normalized_text: string | null;
  confidence_score: number | null;
  extracted_features: Record<string, unknown>;
  meta: ReportMetaDetail;
  package_name: string | null;
}

export interface FavoriteReportOut {
  id: string;
  report_type: string;
  title: string | null;
  district: string | null;
  published_at: string;
  cover_image_url: string | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface Stats {
  total: number;
  by_type: Record<string, number>;
  by_pet_type: Record<string, number>;
  by_district: Record<string, number>;
}


function optionalAuthHeaders(): HeadersInit {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchReports(params: {
  report_type?: string;
  pet_type?: string;
  district?: string;
  search?: string;
  page?: number;
  limit?: number;
  country_code?: string;
  status?: string;
}): Promise<PaginatedResponse<Report>> {
  const qs = new URLSearchParams();
  if (params.report_type) qs.set("report_type", params.report_type);
  if (params.pet_type) qs.set("pet_type", params.pet_type);
  if (params.district) qs.set("district", params.district);
  if (params.search) qs.set("search", params.search);
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.country_code) qs.set("country_code", params.country_code);
  if (params.status) qs.set("status", params.status);

  const res = await fetch(`${API_BASE}/v1/reports?${qs}`, {
    cache: "no-store",
    headers: optionalAuthHeaders(),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function fetchReport(id: string): Promise<ReportDetail> {
  const res = await fetch(`${API_BASE}/v1/reports/${id}`, {
    cache: "no-store",
    headers: optionalAuthHeaders(),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function fetchStats(): Promise<Stats> {
  const res = await fetch(`${API_BASE}/v1/stats`, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function registerReportView(id: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/v1/reports/${id}/view`, { method: 'POST' });
  } catch {
  }
}

export async function registerReportShare(id: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/v1/reports/${id}/share`, { method: 'POST' });
  } catch {
  }
}


export interface AnalyzeImageResult {
  is_pet: boolean;
  validation_error: string | null;
  pet_type: string | null;
  colors: string[];
  size: string | null;
  sex: string | null;
  has_collar: boolean;
  collar_color: string | null;
  distinctive_marks: string[];
  physical_traits: Record<string, string>;
  summary: string;
}

export interface SearchRequest {
  district: string;
  text?: string;
  image_base64?: string;
  image_features?: AnalyzeImageResult;
}

export interface SearchResult extends Report {
  match_score: number;
  match_pct: number;
}

export interface SearchMeta {
  extracted_features: {
    pet_type?: string | null;
    name?: string | null;
    colors?: string[];
    size?: string | null;
    sex?: string | null;
    has_collar?: boolean;
    collar_color?: string | null;
    distinctive_marks?: string[];
  };
  image_colors: string[];
  total_candidates: number;
  phash_matches: number;
  image_summary: string;
}

export interface SearchResponse {
  results: SearchResult[];
  meta: SearchMeta;
}

// ---------------------------------------------------------------------------
// Developer debug
// ---------------------------------------------------------------------------

export interface DebugImage {
  url: string;
  is_pet: boolean | null;
  score: number | null;
}

export interface DebugFetch {
  status_code: number | null;
  title: string | null;
  raw_text: string | null;
  og_description: string | null;
  is_partial: boolean;
  ocr_text: string | null;
  images: DebugImage[];
}

export interface DebugClassifier {
  is_relevant: boolean;
  confidence: number;
  rejection_reason: string | null;
  pos_hits: number;
  neg_hits: number;
  advice_hits: number;
  positive_matched: string[];
  negative_matched: string[];
  advice_matched: string[];
}

export interface DebugPostResult {
  url: string;
  error: string | null;
  fetch: DebugFetch | null;
  classifier: DebugClassifier | null;
  llm_result: Record<string, unknown> | null;
}

export interface DebugResponse {
  url: string;
  is_feed: boolean;
  llm_available: boolean;
  error?: string;
  results: DebugPostResult[];
}

export async function debugUrl(url: string, is_feed: boolean): Promise<DebugResponse> {
  const res = await fetch(`${API_BASE}/v1/admin/debug/process-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, is_feed }),
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? `API error: ${res.status}`);
  }
  return res.json();
}

export async function analyzeImage(image_base64: string): Promise<AnalyzeImageResult> {
  const res = await fetch(`${API_BASE}/v1/search/analyze-image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_base64 }),
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? `API error: ${res.status}`);
  }
  return res.json();
}

export async function searchPets(req: SearchRequest): Promise<SearchResponse> {
  const res = await fetch(`${API_BASE}/v1/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? `API error: ${res.status}`);
  }
  return res.json();
}


// "Mis avisos" — requiere sesión, trae TODOS los estados (menos deleted),
// a diferencia de fetchReports (público, solo trae 'active'). Nunca usar
// fetchReports con un filtro de usuario para esto — no expone avisos que
// no sean 'active', por diseño (evita enumerar avisos ajenos en revisión).
export async function fetchMyReports(status?: string): Promise<Report[]> {
  const qs = status ? `?status=${status}` : '';
  const res = await fetch(`${API_BASE}/v1/users/me/reports${qs}`, {
    cache: "no-store",
    headers: optionalAuthHeaders(),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}