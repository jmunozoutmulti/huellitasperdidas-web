"use client";

import { useState } from "react";
import Link from "next/link";
import { debugUrl, DebugResponse, DebugClassifier } from "@/lib/api";

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Badge({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
      {children}
    </span>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function KeyValue({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-gray-500 shrink-0 w-36">{label}</span>
      <span className="text-gray-900 font-mono break-all">{value ?? <span className="text-gray-400 italic">null</span>}</span>
    </div>
  );
}

function ClassifierPanel({ c }: { c: DebugClassifier }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Badge ok={c.is_relevant}>{c.is_relevant ? "RELEVANTE" : "RECHAZADO"}</Badge>
        {c.rejection_reason && (
          <span className="text-xs text-red-600 font-mono bg-red-50 px-2 py-0.5 rounded">{c.rejection_reason}</span>
        )}
        <span className="text-xs text-gray-500">confianza: {(c.confidence * 100).toFixed(0)}%</span>
      </div>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="bg-green-50 rounded p-2">
          <div className="text-2xl font-bold text-green-700">{c.pos_hits}</div>
          <div className="text-xs text-green-600">keywords +</div>
        </div>
        <div className="bg-red-50 rounded p-2">
          <div className="text-2xl font-bold text-red-700">{c.neg_hits}</div>
          <div className="text-xs text-red-600">keywords −</div>
        </div>
        <div className="bg-yellow-50 rounded p-2">
          <div className="text-2xl font-bold text-yellow-700">{c.advice_hits}</div>
          <div className="text-xs text-yellow-600">señales artículo</div>
        </div>
      </div>
      {c.positive_matched.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-1">Positivos encontrados:</p>
          <div className="flex flex-wrap gap-1">
            {c.positive_matched.map((kw) => (
              <span key={kw} className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded font-mono">{kw}</span>
            ))}
          </div>
        </div>
      )}
      {c.negative_matched.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-1">Negativos encontrados:</p>
          <div className="flex flex-wrap gap-1">
            {c.negative_matched.map((kw) => (
              <span key={kw} className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded font-mono">{kw}</span>
            ))}
          </div>
        </div>
      )}
      {c.advice_matched.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-1">Señales de artículo encontradas:</p>
          <div className="flex flex-wrap gap-1">
            {c.advice_matched.map((kw) => (
              <span key={kw} className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded font-mono">{kw}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LlmPanel({ result }: { result: Record<string, unknown> }) {
  if (result.error) {
    return <p className="text-red-600 text-sm font-mono">{String(result.error)}</p>;
  }
  const relevant = result.is_relevant as boolean;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Badge ok={relevant}>{relevant ? "RELEVANTE" : "RECHAZADO"}</Badge>
        {result.rejection_reason && (
          <span className="text-xs text-red-600 font-mono bg-red-50 px-2 py-0.5 rounded">{String(result.rejection_reason)}</span>
        )}
        <span className="text-xs text-gray-500">confianza: {((result.confidence as number || 0) * 100).toFixed(0)}%</span>
      </div>
      <div className="grid grid-cols-1 gap-1.5">
        <KeyValue label="Tipo reporte" value={result.report_type as string} />
        <KeyValue label="Tipo mascota" value={result.pet_type as string} />
        <KeyValue label="Nombre" value={result.name as string} />
        <KeyValue label="Colores" value={(result.colors as string[] || []).join(", ") || null} />
        <KeyValue label="Tamaño" value={result.size as string} />
        <KeyValue label="Sexo" value={result.sex as string} />
        <KeyValue label="Collar" value={result.has_collar != null ? (result.has_collar ? `Sí${result.collar_color ? ` (${result.collar_color})` : ""}` : "No") : null} />
        <KeyValue label="Teléfono" value={result.contact_phone as string} />
        <KeyValue label="Contacto" value={result.contact_name as string} />
        <KeyValue label="Distrito" value={result.district as string} />
        <KeyValue label="Dirección" value={result.address_hint as string} />
        <KeyValue label="Fecha evento" value={result.event_date as string} />
        {(result.distinctive_marks as string[] || []).length > 0 && (
          <KeyValue label="Marcas" value={(result.distinctive_marks as string[]).join(", ")} />
        )}
      </div>
      {result.description_clean && (
        <div>
          <p className="text-xs text-gray-500 mb-1">Descripción limpia:</p>
          <p className="text-sm text-gray-800 bg-gray-50 rounded p-3 whitespace-pre-wrap border border-gray-200">
            {String(result.description_clean)}
          </p>
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
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <Link href="/" className="text-blue-600 hover:underline text-sm">← Volver al listado</Link>
            <h1 className="text-xl font-bold text-gray-900 mt-1">Developer Tool</h1>
            <p className="text-sm text-gray-500">Prueba una URL y ve qué extraería el worker</p>
          </div>
          <span className="text-xs bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full font-medium">Solo admin</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Input form */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL a analizar</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.facebook.com/groups/... o cualquier URL"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isFeed}
                  onChange={(e) => setIsFeed(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600"
                />
                <span className="text-sm text-gray-700">
                  Es un <strong>feed</strong> (grupo/perfil con múltiples posts — se rescrapea en cada corrida)
                </span>
              </label>
              <button
                type="submit"
                disabled={loading || !url.trim()}
                className="ml-auto px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Analizando…" : "Analizar URL"}
              </button>
            </div>
          </form>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
        )}

        {result && (
          <div className="space-y-4">
            {/* Fetch result */}
            <SectionCard title="1. Fetch — contenido descargado">
              {result.fetch.requires_playwright ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-yellow-800 text-sm">
                  <strong>Requiere Playwright:</strong> {result.fetch.error}
                </div>
              ) : result.fetch.error ? (
                <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700 text-sm">
                  <strong>Error:</strong> {result.fetch.error}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-1.5">
                    <KeyValue label="HTTP status" value={result.fetch.status_code} />
                    <KeyValue label="Título" value={result.fetch.title} />
                    <KeyValue label="OG description" value={result.fetch.og_description} />
                  </div>
                  {result.fetch.raw_text && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Texto extraído ({result.fetch.raw_text.length} chars):</p>
                      <pre className="text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded p-3 overflow-auto max-h-48 whitespace-pre-wrap">
                        {result.fetch.raw_text.slice(0, 2000)}{result.fetch.raw_text.length > 2000 ? "\n…(truncado)" : ""}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </SectionCard>

            {/* Classifier */}
            {result.classifier ? (
              <SectionCard title="2. Clasificador — ¿es un anuncio real?">
                <ClassifierPanel c={result.classifier} />
              </SectionCard>
            ) : (
              !result.fetch.requires_playwright && (
                <SectionCard title="2. Clasificador">
                  <p className="text-sm text-gray-500">No hay texto para clasificar.</p>
                </SectionCard>
              )
            )}

            {/* LLM */}
            {result.llm_available ? (
              result.llm_result ? (
                <SectionCard title="3. OpenAI — normalización LLM">
                  <LlmPanel result={result.llm_result} />
                </SectionCard>
              ) : (
                !result.fetch.requires_playwright && (
                  <SectionCard title="3. OpenAI — normalización LLM">
                    <p className="text-sm text-gray-500">No se ejecutó (sin texto).</p>
                  </SectionCard>
                )
              )
            ) : (
              <SectionCard title="3. OpenAI — normalización LLM">
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-yellow-800 text-sm">
                  OpenAI no configurado. Agrega <code className="font-mono">OPENAI_API_KEY</code> en el .env del servidor para activarlo.
                </div>
              </SectionCard>
            )}

            {/* Feed note */}
            <div className={`rounded-lg border p-4 text-sm ${isFeed ? "bg-blue-50 border-blue-200 text-blue-800" : "bg-gray-50 border-gray-200 text-gray-600"}`}>
              {isFeed
                ? "Esta URL está marcada como feed — el worker la rescrapeará en cada corrida automáticamente."
                : "Esta URL NO es un feed — el worker la procesará una sola vez."}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
