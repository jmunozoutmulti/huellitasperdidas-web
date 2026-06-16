"use client";

import { useState } from "react";
import Link from "next/link";
import { debugUrl, DebugResponse, DebugPostResult, DebugClassifier } from "@/lib/api";

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function Badge({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
      {children}
    </span>
  );
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 flex items-baseline gap-2">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{title}</h3>
        {subtitle && <span className="text-xs text-gray-400">{subtitle}</span>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex gap-2 text-sm py-0.5">
      <span className="text-gray-400 shrink-0 w-32 text-right">{label}</span>
      <span className="text-gray-900 font-mono break-all">{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Classifier panel
// ---------------------------------------------------------------------------

function ClassifierPanel({ c }: { c: DebugClassifier }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <Badge ok={c.is_relevant}>{c.is_relevant ? "RELEVANTE" : "RECHAZADO"}</Badge>
        {c.rejection_reason && (
          <code className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded">{c.rejection_reason}</code>
        )}
        <span className="text-xs text-gray-500">confianza: {(c.confidence * 100).toFixed(0)}%</span>
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { count: c.pos_hits, label: "keywords +", color: "green" },
          { count: c.neg_hits, label: "keywords −", color: "red" },
          { count: c.advice_hits, label: "señales artículo", color: "yellow" },
        ].map(({ count, label, color }) => (
          <div key={label} className={`bg-${color}-50 rounded p-2`}>
            <div className={`text-2xl font-bold text-${color}-700`}>{count}</div>
            <div className={`text-xs text-${color}-600`}>{label}</div>
          </div>
        ))}
      </div>
      {[
        { list: c.positive_matched, label: "Positivos", colorClass: "bg-green-100 text-green-800" },
        { list: c.negative_matched, label: "Negativos", colorClass: "bg-red-100 text-red-800" },
        { list: c.advice_matched, label: "Artículo", colorClass: "bg-yellow-100 text-yellow-800" },
      ].filter(({ list }) => list.length > 0).map(({ list, label, colorClass }) => (
        <div key={label}>
          <p className="text-xs text-gray-400 mb-1">{label}:</p>
          <div className="flex flex-wrap gap-1">
            {list.map((kw) => (
              <span key={kw} className={`text-xs px-2 py-0.5 rounded font-mono ${colorClass}`}>{kw}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// LLM panel
// ---------------------------------------------------------------------------

function LlmPanel({ result }: { result: Record<string, unknown> }) {
  if (result.error) {
    return <p className="text-red-600 text-sm font-mono">{String(result.error)}</p>;
  }
  const relevant = Boolean(result.is_relevant);
  const rejectionReason = result.rejection_reason != null ? String(result.rejection_reason) : null;
  const confidence = typeof result.confidence === "number" ? result.confidence : 0;
  const colors = Array.isArray(result.colors) ? (result.colors as string[]) : [];
  const marks = Array.isArray(result.distinctive_marks) ? (result.distinctive_marks as string[]) : [];
  const hasCollar = result.has_collar != null ? Boolean(result.has_collar) : null;
  const collarColor = result.collar_color != null ? String(result.collar_color) : null;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <Badge ok={relevant}>{relevant ? "RELEVANTE" : "RECHAZADO"}</Badge>
        {rejectionReason && (
          <code className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded">{rejectionReason}</code>
        )}
        <span className="text-xs text-gray-500">confianza: {(confidence * 100).toFixed(0)}%</span>
      </div>
      <div className="space-y-0.5">
        <KV label="Tipo reporte" value={result.report_type != null ? String(result.report_type) : null} />
        <KV label="Mascota" value={result.pet_type != null ? String(result.pet_type) : null} />
        <KV label="Nombre" value={result.name != null ? String(result.name) : null} />
        <KV label="Colores" value={colors.join(", ") || null} />
        <KV label="Tamaño" value={result.size != null ? String(result.size) : null} />
        <KV label="Sexo" value={result.sex != null ? String(result.sex) : null} />
        <KV label="Collar" value={
          hasCollar != null
            ? hasCollar ? `Sí${collarColor ? ` (${collarColor})` : ""}` : "No"
            : null
        } />
        <KV label="Teléfono" value={result.contact_phone != null ? String(result.contact_phone) : null} />
        <KV label="Contacto" value={result.contact_name != null ? String(result.contact_name) : null} />
        <KV label="Distrito" value={result.district != null ? String(result.district) : null} />
        <KV label="Dirección" value={result.address_hint != null ? String(result.address_hint) : null} />
        <KV label="Fecha evento" value={result.event_date != null ? String(result.event_date) : null} />
        {marks.length > 0 && <KV label="Marcas" value={marks.join(", ")} />}
      </div>
      {result.description_clean != null && (
        <div>
          <p className="text-xs text-gray-400 mb-1">Descripción limpia:</p>
          <p className="text-sm text-gray-800 bg-blue-50 rounded p-3 whitespace-pre-wrap border border-blue-100">
            {String(result.description_clean)}
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single post result card
// ---------------------------------------------------------------------------

function PostResultCard({ post, index, total }: { post: DebugPostResult; index: number; total: number }) {
  const [expanded, setExpanded] = useState(index === 0);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs text-gray-400 shrink-0">Post {index + 1}/{total}</span>
          {post.error ? (
            <span className="text-red-600 text-xs font-mono truncate">{post.error}</span>
          ) : (
            <>
              {post.classifier && (
                <Badge ok={post.classifier.is_relevant}>
                  {post.classifier.is_relevant ? "RELEVANTE" : "RECHAZADO"}
                </Badge>
              )}
              {post.llm_result && !post.llm_result.error && (
                <Badge ok={Boolean(post.llm_result.is_relevant)}>
                  LLM: {post.llm_result.is_relevant ? "OK" : "NO"}
                </Badge>
              )}
              <span className="text-xs text-gray-500 truncate font-mono">{post.url}</span>
            </>
          )}
        </div>
        <span className="text-gray-400 text-xs shrink-0 ml-2">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="divide-y divide-gray-100">
          {post.error ? (
            <div className="p-4 bg-red-50 text-red-700 text-sm">
              <strong>Error:</strong> {post.error}
            </div>
          ) : (
            <>
              {/* Fetch */}
              <div className="p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Fetch</p>
                <div className="space-y-0.5">
                  <KV label="HTTP status" value={post.fetch?.status_code} />
                  <KV label="Título" value={post.fetch?.title} />
                  <KV label="OG description" value={post.fetch?.og_description} />
                  {post.fetch?.is_partial && (
                    <div className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">Contenido parcial</div>
                  )}
                </div>
                {post.fetch?.raw_text && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Texto extraído ({post.fetch.raw_text.length} chars):</p>
                    <pre className="text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded p-3 overflow-auto max-h-40 whitespace-pre-wrap">
                      {post.fetch.raw_text.slice(0, 1500)}{post.fetch.raw_text.length > 1500 ? "\n…" : ""}
                    </pre>
                  </div>
                )}
                {(post.fetch?.image_urls?.length ?? 0) > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {post.fetch!.image_urls.slice(0, 4).map((src, i) => (
                      <img key={i} src={src} alt="" className="w-20 h-20 object-cover rounded border border-gray-200" />
                    ))}
                  </div>
                )}
              </div>

              {/* Classifier */}
              {post.classifier && (
                <div className="p-4 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Clasificador</p>
                  <ClassifierPanel c={post.classifier} />
                </div>
              )}

              {/* LLM */}
              {post.llm_result ? (
                <div className="p-4 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">OpenAI LLM</p>
                  <LlmPanel result={post.llm_result} />
                </div>
              ) : null}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function DeveloperPage() {
  const [url, setUrl] = useState("");
  const [isFeed, setIsFeed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DebugResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const data = await debugUrl(url.trim(), isFeed);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <Link href="/" className="text-blue-600 hover:underline text-sm">← Volver al listado</Link>
            <h1 className="text-xl font-bold text-gray-900 mt-0.5">Developer Tool</h1>
            <p className="text-sm text-gray-500">Prueba una URL con el pipeline real del worker (Playwright incluido)</p>
          </div>
          <span className="text-xs bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full font-medium shrink-0">Admin only</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL a analizar</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.facebook.com/groups/... o cualquier URL"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                Facebook e Instagram usan Playwright automáticamente — puede tomar hasta 30 segundos.
              </p>
            </div>
            <div className="flex items-start gap-6 flex-wrap">
              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isFeed}
                  onChange={(e) => setIsFeed(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-gray-300 text-blue-600"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">Es un feed</span>
                  <p className="text-xs text-gray-400">Grupo / perfil con múltiples posts. Se rescrapea en cada corrida. Muestra hasta 5 posts de muestra.</p>
                </div>
              </label>
              <button
                type="submit"
                disabled={loading || !url.trim()}
                className="ml-auto px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Analizando…" : "Analizar URL"}
              </button>
            </div>
          </form>
        </div>

        {loading && (
          <div className="text-center py-10 text-gray-500 text-sm">
            Ejecutando el worker con esta URL… Facebook puede tomar hasta 30s.
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-800">
                {result.results.length} {result.is_feed ? "posts extraídos del feed" : "resultado"}
              </h2>
              <div className="flex gap-2 text-xs">
                <span className={`px-2 py-1 rounded ${result.llm_available ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  OpenAI: {result.llm_available ? "activo" : "sin clave"}
                </span>
                {result.error && (
                  <span className="bg-red-100 text-red-700 px-2 py-1 rounded">{result.error}</span>
                )}
              </div>
            </div>

            {result.results.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800 text-sm">
                No se extrajeron posts. {result.error ? `Error: ${result.error}` : "La URL podría requerir autenticación o tener contenido vacío."}
              </div>
            ) : (
              <div className="space-y-3">
                {result.results.map((post, i) => (
                  <PostResultCard key={i} post={post} index={i} total={result.results.length} />
                ))}
              </div>
            )}

            <div className={`rounded-lg border p-4 text-sm ${isFeed ? "bg-blue-50 border-blue-200 text-blue-800" : "bg-gray-50 border-gray-200 text-gray-600"}`}>
              {isFeed
                ? "Esta URL como feed será rescrapeada automáticamente en cada corrida del worker."
                : "Esta URL como post individual será procesada una sola vez."}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
