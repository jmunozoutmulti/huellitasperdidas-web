const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface Image {
  id: string;
  image_url: string;
  storage_url: string | null;
  width: number | null;
  height: number | null;
  detected_pet_type: string | null;
}

export interface Report {
  id: string;
  report_type: string;
  source_type: string;
  pet_type: string | null;
  title: string | null;
  description: string | null;
  district: string | null;
  region: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  event_date: string | null;
  published_at: string | null;
  source_url: string | null;
  has_video: boolean;
  status: string;
  created_at: string;
  images: Image[];
}

export interface ReportDetail extends Report {
  contact_name: string | null;
  contact_phone: string | null;
  contact_url: string | null;
  normalized_text: string | null;
  confidence_score: number | null;
  extracted_features: Record<string, unknown>;
  address_hint: string | null;
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

export async function fetchReports(params: {
  report_type?: string;
  pet_type?: string;
  district?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<Report>> {
  const qs = new URLSearchParams();
  if (params.report_type) qs.set("report_type", params.report_type);
  if (params.pet_type) qs.set("pet_type", params.pet_type);
  if (params.district) qs.set("district", params.district);
  if (params.search) qs.set("search", params.search);
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));

  const res = await fetch(`${API_BASE}/v1/reports?${qs}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function fetchReport(id: string): Promise<ReportDetail> {
  const res = await fetch(`${API_BASE}/v1/reports/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function fetchStats(): Promise<Stats> {
  const res = await fetch(`${API_BASE}/v1/stats`, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export interface SearchRequest {
  district: string;
  text?: string;
  image_base64?: string;
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
    has_collar?: boolean;
  };
  image_colors: string[];
  total_candidates: number;
  phash_matches: number;
}

export interface SearchResponse {
  results: SearchResult[];
  meta: SearchMeta;
}

// ---------------------------------------------------------------------------
// Developer debug
// ---------------------------------------------------------------------------

export interface DebugFetch {
  status_code: number | null;
  title: string | null;
  raw_text: string | null;
  og_description: string | null;
  requires_playwright: boolean;
  error: string | null;
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

export interface DebugResponse {
  url: string;
  is_feed: boolean;
  fetch: DebugFetch;
  classifier: DebugClassifier | null;
  llm_result: Record<string, unknown> | null;
  llm_available: boolean;
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
