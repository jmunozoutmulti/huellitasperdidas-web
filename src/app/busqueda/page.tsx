"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { searchPets, type SearchResult, type SearchMeta } from "@/lib/api";

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
    <Link href={`/reports/${result.id}`} className="block group">
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
            {result.pet_type && <span className="text-xs text-gray-500 capitalize">{result.pet_type}</span>}
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

function FeatureChips({ meta }: { meta: SearchMeta }) {
  const ef = meta.extracted_features;
  const chips: string[] = [];
  if (ef.pet_type) chips.push(ef.pet_type === "perro" ? "🐶 Perro" : "🐱 Gato");
  if (ef.name) chips.push(`Nombre: ${ef.name}`);
  for (const c of ef.colors ?? []) chips.push(COLOR_LABEL[c] ?? c);
  if (ef.size) chips.push(SIZE_LABEL[ef.size] ?? ef.size);
  if (ef.has_collar) chips.push("Tiene collar");
  if (meta.phash_matches > 0) chips.push(`📸 ${meta.phash_matches} imagen(es) similar(es)`);
  if (chips.length === 0) return null;
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <p className="text-xs text-amber-700 font-medium mb-2 uppercase tracking-wide">Entendimos de tu búsqueda</p>
      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <span key={c} className="bg-white border border-amber-300 text-amber-800 text-xs px-3 py-1 rounded-full">{c}</span>
        ))}
      </div>
    </div>
  );
}

export default function BusquedaPage() {
  const [district, setDistrict] = useState("");
  const [text, setText] = useState("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [meta, setMeta] = useState<SearchMeta | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Procesa un archivo de imagen (reutilizado por file input y paste)
  const processImageFile = useCallback((file: File) => {
    if (file.size > 8 * 1024 * 1024) { setError("La imagen es muy grande. Máximo 8 MB."); return; }
    if (!file.type.startsWith("image/")) { setError("Solo se aceptan imágenes (JPEG, PNG, WEBP)."); return; }
    setError(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      const b64 = reader.result as string;
      setImageBase64(b64);
      setImagePreview(b64);
    };
    reader.readAsDataURL(file);
  }, []);

  // Paste desde portapapeles (Ctrl+V en cualquier parte de la página)
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
          setError("No se pudo obtener tu ubicación. Selecciona el distrito manualmente.");
        } finally {
          setGeoLoading(false);
        }
      },
      () => { setError("Acceso a ubicación denegado. Selecciona tu distrito manualmente."); setGeoLoading(false); },
      { timeout: 8000 }
    );
  }

  function removeImage() {
    setImageBase64(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function validate(): string | null {
    if (!district.trim()) return "Selecciona o detecta tu distrito.";
    const hasText = text.trim().length >= 30;
    const hasImage = !!imageBase64;
    if (!hasText && !hasImage) return "Describe a tu mascota (mínimo 30 caracteres) o sube una foto.";
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
      });
      setResults(data.results);
      setMeta(data.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al realizar la búsqueda.");
    } finally {
      setLoading(false);
    }
  }

  const textLength = text.trim().length;
  const textMissingChars = !imageBase64 ? Math.max(0, 30 - textLength) : 0;

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
            Describe a tu mascota o sube una foto y buscamos en todos nuestros reportes activos.
          </p>
        </div>

        <form onSubmit={handleSearch} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6 shadow-sm">

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

          {/* Descripción */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              Describe a tu mascota{!imageBase64 && <span className="text-red-500"> *</span>}
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder={`Ej: "Mi perrito color café se llama Toby, tiene collar azul y es mediano. Se perdió ayer en el parque."`}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
            {textMissingChars > 0 && textLength > 0 && (
              <p className="text-xs text-amber-600">Faltan {textMissingChars} caracteres para una búsqueda útil.</p>
            )}
            {!imageBase64 && textLength === 0 && (
              <p className="text-xs text-gray-400">Mínimo 30 caracteres, o sube una foto.</p>
            )}
          </div>

          {/* Separador */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">y/o</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Foto */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              Foto de tu mascota
              {imageBase64 && <span className="text-green-600 font-normal ml-1">✓ cargada</span>}
            </label>
            {imagePreview ? (
              <div className="relative inline-block">
                <img src={imagePreview} alt="Vista previa" className="w-40 h-40 object-cover rounded-xl border border-gray-200" />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs font-bold hover:bg-red-600 flex items-center justify-center"
                >✕</button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 rounded-xl py-8 text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors text-sm flex flex-col items-center gap-2"
              >
                <span className="text-3xl">📷</span>
                <span>Toca para subir · o pega con Ctrl+V</span>
                <span className="text-xs">JPEG, PNG, WEBP · máx. 8 MB</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) processImageFile(f); }}
            />
            <p className="text-xs text-gray-400">
              Compara tu foto contra todas las imágenes de reportes activos para encontrar coincidencias visuales.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            {loading ? "Buscando…" : "Buscar mascota"}
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
                  Si perdiste tu mascota, busca los de tipo <span className="font-medium text-green-700">Encontrado</span>.
                  Si encontraste una, busca los de tipo <span className="font-medium text-red-700">Perdido</span>.
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
