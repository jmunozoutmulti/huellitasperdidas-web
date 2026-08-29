"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRequireAuth } from '@/hooks/useRequireAuth';
import {
  analyzeImage,
  searchPets,
  type AnalyzeImageResult,
  type SearchResult,
  type SearchMeta,
} from "@/lib/api";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_IMAGE_PX = 1024;
const IMAGE_QUALITY = 0.85;

function compressImage(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_IMAGE_PX / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", IMAGE_QUALITY));
    };
    img.src = dataUrl;
  });
}

const LIMA_DISTRICTS = [
  "Ancón", "Ate", "Barranco", "Breña", "Carabayllo", "Cercado de Lima",
  "Chaclacayo", "Chorrillos", "Cieneguilla", "Comas", "El Agustino",
  "Independencia", "Jesús María", "La Molina", "La Victoria", "Lince",
  "Los Olivos", "Lurigancho-Chosica", "Lurín", "Magdalena del Mar",
  "Miraflores", "Pachacámac", "Pueblo Libre", "Puente Piedra", "Rímac",
  "San Borja", "San Isidro", "San Juan de Lurigancho", "San Juan de Miraflores",
  "San Luis", "San Martín de Porres", "San Miguel", "Santa Anita",
  "Santiago de Surco", "Surquillo", "Villa El Salvador", "Villa María del Triunfo",
];

const TYPE_LABEL: Record<string, string> = {
  lost: "Perdido", found: "Encontrado", adoption: "Adopción",
  sighting: "Avistamiento", unknown: "Desconocido",
};
const TYPE_COLOR: Record<string, string> = {
  lost: "bg-red-100 text-red-700", found: "bg-green-100 text-green-700",
  adoption: "bg-blue-100 text-blue-700", sighting: "bg-yellow-100 text-yellow-700",
  unknown: "bg-gray-100 text-gray-500",
};
const COLOR_LABEL: Record<string, string> = {
  marron: "Marrón/Café", negro: "Negro", blanco: "Blanco", gris: "Gris",
  naranja: "Naranja", amarillo: "Amarillo/Dorado", tricolor: "Tricolor",
  manchas: "Con manchas", atigrado: "Atigrado",
};
const SIZE_LABEL: Record<string, string> = {
  small: "Pequeño", medium: "Mediano", large: "Grande",
};
const PET_TYPE_LABEL: Record<string, string> = {
  dog: "🐕 Perro", cat: "🐈 Gato", bird: "🦜 Ave",
  rabbit: "🐇 Conejo", hamster: "🐹 Hámster", other: "🐾 Otro",
};

const PET_TYPE_LABEL_PLAIN: Record<string, string> = {
  dog: "Perro", cat: "Gato", bird: "Ave",
  rabbit: "Conejo", hamster: "Hámster", other: "Otro",
};

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function ScanAnimation() {
  return (
    <div
      className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none"
      style={{ animation: "bracket-in 0.25s ease-out" }}
    >
      {/* Blue tint */}
      <div className="absolute inset-0 bg-blue-900/20" />
      {/* Corner brackets */}
      <div className="absolute top-3 left-3 w-6 h-6 border-t-[3px] border-l-[3px] border-blue-400" />
      <div className="absolute top-3 right-3 w-6 h-6 border-t-[3px] border-r-[3px] border-blue-400" />
      <div className="absolute bottom-3 left-3 w-6 h-6 border-b-[3px] border-l-[3px] border-blue-400" />
      <div className="absolute bottom-3 right-3 w-6 h-6 border-b-[3px] border-r-[3px] border-blue-400" />
      {/* Scan line */}
      <div
        className="absolute left-4 right-4 h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent"
        style={{ animation: "scan 1.8s ease-in-out infinite" }}
      />
      {/* Label */}
      <div className="absolute bottom-0 left-0 right-0 bg-blue-900/60 text-blue-100 text-[11px] font-medium text-center py-1.5 tracking-wide">
        Analizando mascota…
      </div>
    </div>
  );
}

function DetectedChips({ features }: { features: AnalyzeImageResult }) {
  const chips: string[] = [];
  if (features.pet_type) chips.push(PET_TYPE_LABEL[features.pet_type] ?? `🐾 ${features.pet_type}`);
  for (const c of features.colors) chips.push(COLOR_LABEL[c] ?? c);
  if (features.size) chips.push(SIZE_LABEL[features.size] ?? features.size);
  if (features.sex) chips.push(features.sex === "male" ? "Macho" : "Hembra");
  if (features.has_collar) chips.push(features.collar_color ? `Collar ${features.collar_color}` : "Con collar");
  for (const m of features.distinctive_marks.slice(0, 2)) chips.push(m);

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-semibold text-green-700 flex items-center gap-1.5">
        <span className="inline-flex items-center justify-center w-4 h-4 bg-green-500 text-white rounded-full text-[10px] shrink-0">
          ✓
        </span>
        Mascota detectada — usaremos esto para buscar
      </p>
      <div className="flex flex-wrap gap-1.5">
        {chips.map((c, i) => (
          <span
            key={i}
            className="bg-blue-50 border border-blue-200 text-blue-800 text-xs px-2.5 py-1 rounded-full font-medium"
          >
            {c}
          </span>
        ))}
      </div>
      {features.summary && (
        <p className="text-xs text-gray-400 italic leading-relaxed">{features.summary}</p>
      )}
    </div>
  );
}

function FeatureChips({ meta }: { meta: SearchMeta }) {
  const ef = meta.extracted_features;
  const chips: string[] = [];
  if (ef.pet_type) chips.push(PET_TYPE_LABEL[ef.pet_type] ?? `🐾 ${ef.pet_type}`);
  if (ef.name) chips.push(`Nombre: ${ef.name}`);
  for (const c of ef.colors ?? []) chips.push(COLOR_LABEL[c] ?? c);
  if (ef.size) chips.push(SIZE_LABEL[ef.size] ?? ef.size);
  if (ef.sex) chips.push(ef.sex === "male" ? "Macho" : "Hembra");
  if (ef.has_collar) chips.push(ef.collar_color ? `Collar ${ef.collar_color}` : "Con collar");
  for (const m of (ef.distinctive_marks ?? []).slice(0, 2)) chips.push(m);
  if (meta.phash_matches > 0) chips.push(`📸 ${meta.phash_matches} foto(s) visualmente similar(es)`);

  if (!chips.length && !meta.image_summary) return null;
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
      <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
        Entendimos de tu búsqueda
      </p>
      {meta.image_summary && (
        <p className="text-xs text-amber-800 italic">{meta.image_summary}</p>
      )}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <span key={c} className="bg-white border border-amber-300 text-amber-800 text-xs px-3 py-1 rounded-full">
              {c}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function matchBadge(pct: number) {
  if (pct >= 70) return { label: `${pct}% coincidencia`, cls: "bg-green-100 text-green-700 border-green-200" };
  if (pct >= 40) return { label: `${pct}% coincidencia`, cls: "bg-yellow-100 text-yellow-700 border-yellow-200" };
  return { label: `${pct}% coincidencia`, cls: "bg-gray-100 text-gray-500 border-gray-200" };
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
}

function ResultCard({ result }: { result: SearchResult }) {
  const image = result.images[0];
  const typeColor = TYPE_COLOR[result.report_type] ?? TYPE_COLOR.unknown;
  const typeLabel = TYPE_LABEL[result.report_type] ?? result.report_type;
  const badge = matchBadge(result.match_pct);

  return (
    <Link href={`/report?id=${result.id}`} className="block group">
      <div className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow bg-white">
        <div className="relative h-44 bg-gray-100 overflow-hidden">
          {image ? (
            <img
              src={image.storage_url ?? image.image_url}
              alt={result.title ?? "Mascota"}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">🐾</div>
          )}
          {result.match_pct > 0 && (
            <span className={`absolute top-2 right-2 text-xs font-semibold px-2 py-0.5 rounded-full border ${badge.cls}`}>
              {badge.label}
            </span>
          )}
        </div>
        <div className="p-3 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${typeColor}`}>{typeLabel}</span>
            {result.pet_type && (
              <span className="text-xs text-gray-500">
                {PET_TYPE_LABEL_PLAIN[result.pet_type.toLowerCase()] ?? result.pet_type}
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-gray-800 line-clamp-2 leading-snug">
            {result.title ?? "Sin título"}
          </p>
          <p className="text-xs text-gray-400">
            {result.district ?? result.region ?? "—"} · {formatDate(result.event_date ?? result.published_at)}
          </p>
        </div>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function BusquedaPage() {

  useRequireAuth();

  const [district, setDistrict] = useState("");
  const [text, setText] = useState("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [detectedFeatures, setDetectedFeatures] = useState<AnalyzeImageResult | null>(null);

  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [meta, setMeta] = useState<SearchMeta | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processImageFile = useCallback((file: File) => {
    if (file.size > 8 * 1024 * 1024) { setError("La imagen es muy grande. Máximo 8 MB."); return; }
    if (!file.type.startsWith("image/")) { setError("Solo se aceptan imágenes (JPEG, PNG, WEBP)."); return; }
    setError(null);
    setAnalyzeError(null);
    setDetectedFeatures(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      const raw = reader.result as string;
      compressImage(raw).then((b64) => {
        setImagePreview(b64);
        setImageBase64(b64);
        setAnalyzing(true);

        analyzeImage(b64)
          .then((result) => {
            if (!result.is_pet) {
              setAnalyzeError(result.validation_error ?? "La imagen no parece ser una mascota.");
              setImageBase64(null);
              setImagePreview(null);
            } else {
              setDetectedFeatures(result);
            }
          })
          .catch(() => {
            // API unavailable — keep image, proceed without LLM features
          })
          .finally(() => setAnalyzing(false));
      });
    };
    reader.readAsDataURL(file);
  }, []);

  // Paste from clipboard
  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) { processImageFile(file); e.preventDefault(); }
          break;
        }
      }
    }
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [processImageFile]);

  async function detectLocation() {
    if (!navigator.geolocation) { setError("Tu navegador no soporta geolocalización."); return; }
    setGeoLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { "User-Agent": "HuellitasPerdidas/1.0" } }
          );
          const data = await res.json();
          const addr = data.address ?? {};
          const detected = addr.suburb ?? addr.city_district ?? addr.county ?? addr.city ?? "";
          if (detected) {
            const normalized = detected.toLowerCase();
            const match = LIMA_DISTRICTS.find(
              (d) => d.toLowerCase().includes(normalized) || normalized.includes(d.toLowerCase())
            );
            setDistrict(match ?? detected);
          } else {
            setError("No pudimos determinar tu distrito. Selecciónalo manualmente.");
          }
        } catch {
          setError("No se pudo obtener tu ubicación.");
        } finally {
          setGeoLoading(false);
        }
      },
      () => { setError("Acceso a ubicación denegado."); setGeoLoading(false); },
      { timeout: 8000 }
    );
  }

  function removeImage() {
    setImageBase64(null);
    setImagePreview(null);
    setDetectedFeatures(null);
    setAnalyzeError(null);
    setAnalyzing(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function validate(): string | null {
    if (!district.trim()) return "Selecciona o detecta tu distrito.";
    if (analyzing) return "Espera, estamos analizando tu foto.";
    const hasText = text.trim().length >= 3;
    const hasImage = !!imageBase64;
    if (!hasText && !hasImage) return "Describe a tu mascota o sube una foto.";
    return null;
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const ve = validate();
    if (ve) { setError(ve); return; }
    setLoading(true);
    setError(null);
    setResults(null);
    setMeta(null);
    try {
      const data = await searchPets({
        district: district.trim(),
        ...(text.trim() ? { text: text.trim() } : {}),
        ...(imageBase64 ? { image_base64: imageBase64 } : {}),
        ...(detectedFeatures ? { image_features: detectedFeatures } : {}),
      });
      setResults(data.results);
      setMeta(data.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al realizar la búsqueda.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-blue-600 hover:underline text-sm">← Volver al listado</Link>
          <span className="text-xs text-gray-400">Huellitas Perdidas</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Busca a tu mascota</h1>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            Sube una foto y/o describe a tu mascota — la IA extrae sus características y busca en todos los reportes activos.
          </p>
        </div>

        <form onSubmit={handleSearch} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6 shadow-sm">

          {/* Foto — primera sección, es lo más importante */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              Foto de tu mascota
              {imageBase64 && !analyzing && (
                <span className="text-green-600 font-normal ml-1">✓ cargada</span>
              )}
            </label>

            {imagePreview ? (
              <div>
                <div className="relative inline-block">
                  <img
                    src={imagePreview}
                    alt="Vista previa"
                    className="w-48 h-48 object-cover rounded-xl border border-gray-200"
                  />
                  {analyzing && <ScanAnimation />}
                  {!analyzing && (
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs font-bold hover:bg-red-600 flex items-center justify-center shadow"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {analyzeError && !analyzing && (
                  <div className="mt-2 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <span className="text-red-500 text-sm shrink-0">✕</span>
                    <p className="text-xs text-red-700">{analyzeError}</p>
                  </div>
                )}

                {detectedFeatures && !analyzing && (
                  <DetectedChips features={detectedFeatures} />
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 rounded-xl py-10 text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors text-sm flex flex-col items-center gap-2"
              >
                <span className="text-4xl">📷</span>
                <span className="font-medium">Toca para subir foto</span>
                <span className="text-xs">o pega con Ctrl+V · JPEG, PNG, WEBP · máx. 8 MB</span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) processImageFile(f); }}
            />
          </div>

          {/* Separador */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">y/o</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              Describe a tu mascota
              {!imageBase64 && <span className="text-red-500"> *</span>}
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              placeholder={`Ej: "Mi perrito color café se llama Toby, tiene collar azul, es mediano y tiene una mancha blanca en la pata."`}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
            <p className="text-xs text-gray-400">
              Cuanto más detalles, mejor — la IA extrae tipo, colores, marcas y collar automáticamente.
            </p>
          </div>

          {/* Distrito */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              Distrito <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">Selecciona un distrito…</option>
                {LIMA_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <button
                type="button"
                onClick={detectLocation}
                disabled={geoLoading}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 whitespace-nowrap"
              >
                {geoLoading ? <span className="animate-spin inline-block">⟳</span> : "📍"} Detectar
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading || analyzing}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            {loading ? "Buscando…" : analyzing ? "Analizando foto…" : "Buscar mascota"}
          </button>
        </form>

        {/* Resultados */}
        {results !== null && meta !== null && (
          <div className="space-y-5">
            <FeatureChips meta={meta} />

            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">
                {results.length === 0
                  ? "Sin coincidencias"
                  : `${results.length} reporte${results.length !== 1 ? "s" : ""} encontrado${results.length !== 1 ? "s" : ""}`}
              </h2>
              <span className="text-xs text-gray-400">
                de {meta.total_candidates} activos en {district}
              </span>
            </div>

            {results.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center space-y-3">
                <p className="text-4xl">🔍</p>
                <p className="text-gray-600 font-medium">No encontramos coincidencias.</p>
                <p className="text-gray-400 text-sm">
                  Prueba con otro distrito o{" "}
                  <Link href="/" className="text-blue-600 hover:underline">explora todos los reportes activos</Link>.
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-400">
                  Si perdiste tu mascota, busca los de tipo{" "}
                  <span className="font-medium text-green-700">Encontrado</span>.
                  Si encontraste una, busca los de tipo{" "}
                  <span className="font-medium text-red-700">Perdido</span>.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {results.map((r) => <ResultCard key={r.id} result={r} />)}
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
