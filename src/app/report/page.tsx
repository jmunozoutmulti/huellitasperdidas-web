"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { fetchReport, type ReportDetail } from "@/lib/api";

const SIZE_LABEL: Record<string, string> = {
  small: "Pequeño",
  medium: "Mediano",
  large: "Grande",
};

const AGE_LABEL: Record<string, string> = {
  puppy: "Cachorro",
  adult: "Adulto",
  senior: "Senior",
};

const SEX_LABEL: Record<string, string> = {
  male: "Macho",
  female: "Hembra",
};

const COLOR_LABEL: Record<string, string> = {
  blanco: "Blanco / Crema",
  negro: "Negro",
  marron: "Marrón / Caramelo",
  amarillo: "Amarillo / Dorado / Rubio",
  gris: "Gris / Plateado",
  naranja: "Naranja / Rojizo",
  tricolor: "Tricolor",
  manchas: "Con manchas",
  atigrado: "Atigrado",
};

const NEUTERED_LABEL: Record<string, string> = {
  true: "Sí",
  false: "No",
};

const PKG_SLUG_COLOR: Record<string, string> = {
  pro: "bg-blue-100 text-blue-800",
  max: "bg-amber-100 text-amber-800",
};

interface ExtractedFeatures {
  name?: string | null;
  colors?: string[];
  size?: string | null;
  age?: string | null;
  sex?: string | null;
  has_collar?: boolean;
  collar_color?: string | null;
  distinctive_marks?: string[];
  physical_traits?: Record<string, string>;
}

function FeaturesSection({ features }: { features: ExtractedFeatures }) {
  const colors = features.colors ?? [];
  const marks = features.distinctive_marks ?? [];
  const hasAnything =
    colors.length > 0 ||
    features.size ||
    features.age ||
    (features.sex && features.sex !== "unknown") ||
    features.has_collar ||
    marks.length > 0;

  if (!hasAnything) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">Características físicas</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
        {features.size && (
          <div>
            <span className="text-gray-400 block text-xs uppercase tracking-wide">Tamaño</span>
            <span className="font-medium text-gray-800">{SIZE_LABEL[features.size] ?? features.size}</span>
          </div>
        )}
        {features.age && (
          <div>
            <span className="text-gray-400 block text-xs uppercase tracking-wide">Edad aprox.</span>
            <span className="font-medium text-gray-800">{AGE_LABEL[features.age] ?? features.age}</span>
          </div>
        )}
        {features.sex && features.sex !== "unknown" && (
          <div>
            <span className="text-gray-400 block text-xs uppercase tracking-wide">Sexo</span>
            <span className="font-medium text-gray-800">{SEX_LABEL[features.sex] ?? features.sex}</span>
          </div>
        )}
        {features.has_collar && (
          <div>
            <span className="text-gray-400 block text-xs uppercase tracking-wide">Collar</span>
            <span className="font-medium text-gray-800">
              {features.collar_color ? `Sí, color ${features.collar_color}` : "Sí"}
            </span>
          </div>
        )}
      </div>
      {colors.length > 0 && (
        <div>
          <span className="text-gray-400 block text-xs uppercase tracking-wide mb-2">Colores</span>
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => (
              <span key={c} className="bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full capitalize">
                {COLOR_LABEL[c] ?? c}
              </span>
            ))}
          </div>
        </div>
      )}
      {marks.length > 0 && (
        <div>
          <span className="text-gray-400 block text-xs uppercase tracking-wide mb-2">Marcas distintivas</span>
          <ul className="text-sm text-gray-700 space-y-1">
            {marks.map((m, i) => (
              <li key={i} className="capitalize">• {m}</li>
            ))}
          </ul>
        </div>
      )}
      {features.physical_traits && Object.keys(features.physical_traits).length > 0 && (
        <div>
          <span className="text-gray-400 block text-xs uppercase tracking-wide mb-2">Características adicionales</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            {Object.entries(features.physical_traits).map(([k, v]) => (
              <div key={k}>
                <span className="text-gray-400 block text-xs capitalize">{k.replace(/_/g, " ")}</span>
                <span className="font-medium text-gray-800 capitalize">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const TYPE_LABEL: Record<string, string> = {
  lost: "Perdido",
  found: "Encontrado",
  adoption: "Adopción",
  sighting: "Avistamiento",
  unknown: "Desconocido",
};

const TYPE_COLOR: Record<string, string> = {
  lost: "bg-red-100 text-red-800",
  found: "bg-green-100 text-green-800",
  adoption: "bg-blue-100 text-blue-800",
  sighting: "bg-yellow-100 text-yellow-800",
  unknown: "bg-gray-100 text-gray-600",
};

const DATE_LABEL: Record<string, string> = {
  lost: "Fecha de la pérdida",
  found: "Fecha de lo encontrado",
  sighting: "Fecha del avistamiento",
  adoption: "Fecha de publicación",
  unknown: "Fecha de la pérdida",
};

const LOCATION_LABEL: Record<string, string> = {
  found: "Dónde lo encontraste exactamente",
  adoption: "Lugar de entrega",
  lost: "Dónde fue vista por última vez",
  sighting: "Dónde fue vista por última vez",
  unknown: "Dónde fue vista por última vez",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

const LoadingSkeleton = () => (
  <div className="min-h-screen bg-gray-50">
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <Link href="/" className="text-blue-600 hover:underline text-sm">← Volver al listado</Link>
      </div>
    </header>
    <main className="max-w-4xl mx-auto px-4 py-8 space-y-4 animate-pulse">
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div className="h-6 bg-gray-200 rounded w-1/4" />
        <div className="h-8 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
      </div>
    </main>
  </div>
);

function ReportContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) { setLoading(false); setError(true); return; }
    fetchReport(id)
      .then(setReport)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSkeleton />;

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center px-4">
        <div className="text-5xl mb-4">🐾</div>
        <h1 className="text-xl font-bold text-gray-800 mb-2">Reporte no encontrado</h1>
        <p className="text-gray-500 text-sm mb-6">Es posible que este reporte haya sido eliminado o la URL no sea válida.</p>
        <Link href="/" className="text-blue-600 hover:underline text-sm">← Volver al listado</Link>
      </div>
    );
  }

  const typeColor = TYPE_COLOR[report.report_type] ?? TYPE_COLOR.unknown;
  const typeLabel = TYPE_LABEL[report.report_type] ?? report.report_type;
  const features = report.extracted_features as ExtractedFeatures;
  const petName = features.name;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href="/" className="text-blue-600 hover:underline text-sm">← Volver al listado</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`text-sm font-semibold px-3 py-1 rounded-full ${typeColor}`}>{typeLabel}</span>
            {report.package_name && (
              <span className={`text-sm font-semibold px-3 py-1 rounded-full ${PKG_SLUG_COLOR[report.package_slug ?? ""] ?? "bg-purple-100 text-purple-800"}`}>
                ★ {report.package_name}
              </span>
            )}
            {report.pet_type && (
              <span className="text-sm text-gray-600 capitalize bg-gray-100 px-3 py-1 rounded-full">{report.pet_type}</span>
            )}
            {report.has_video && <span className="text-sm text-gray-500">▶ Tiene video</span>}
          </div>

          {petName && <p className="text-3xl font-bold text-gray-900">{petName}</p>}

          <h1 className={`font-bold text-gray-900 ${petName ? "text-base text-gray-500 font-normal" : "text-2xl"}`}>
            {report.title ?? "Sin título"}
          </h1>

          {report.description && (
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{report.description}</p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm pt-2">
            {report.package_name && (
              <div>
                <span className="text-gray-400 block text-xs uppercase tracking-wide">Plan de publicación</span>
                <span className="font-medium text-gray-800">{report.package_name}</span>
              </div>
            )}
            {report.district && (
              <div>
                <span className="text-gray-400 block text-xs uppercase tracking-wide">Distrito</span>
                <span className="font-medium text-gray-800">{report.district}</span>
              </div>
            )}
            {report.region && (
              <div>
                <span className="text-gray-400 block text-xs uppercase tracking-wide">Región</span>
                <span className="font-medium text-gray-800">{report.region}</span>
              </div>
            )}
            {(report.event_date ?? report.published_at) && (
              <div>
                <span className="text-gray-400 block text-xs uppercase tracking-wide">
                  {DATE_LABEL[report.report_type] ?? "Fecha"}
                </span>
                <span className="font-medium text-gray-800">{formatDate(report.event_date ?? report.published_at)}</span>
              </div>
            )}
            {report.sex && (
              <div>
                <span className="text-gray-400 block text-xs uppercase tracking-wide">Macho / Hembra</span>
                <span className="font-medium text-gray-800">{SEX_LABEL[report.sex] ?? report.sex}</span>
              </div>
            )}
            {report.is_neutered != null && (
              <div>
                <span className="text-gray-400 block text-xs uppercase tracking-wide">Castrado</span>
                <span className="font-medium text-gray-800">{NEUTERED_LABEL[String(report.is_neutered)]}</span>
              </div>
            )}
            {report.size && (
              <div>
                <span className="text-gray-400 block text-xs uppercase tracking-wide">Tamaño</span>
                <span className="font-medium text-gray-800">{SIZE_LABEL[report.size] ?? report.size}</span>
              </div>
            )}
            {report.breed && (
              <div>
                <span className="text-gray-400 block text-xs uppercase tracking-wide">Raza o especie</span>
                <span className="font-medium text-gray-800">{report.breed}</span>
              </div>
            )}
            {report.color && (
              <div>
                <span className="text-gray-400 block text-xs uppercase tracking-wide">Color / Pelaje</span>
                <span className="font-medium text-gray-800">{report.color}</span>
              </div>
            )}
            {report.contact_name && (
              <div>
                <span className="text-gray-400 block text-xs uppercase tracking-wide">Contacto</span>
                <span className="font-medium text-gray-800">{report.contact_name}</span>
              </div>
            )}
            {report.contact_phone && (
              <div>
                <span className="text-gray-400 block text-xs uppercase tracking-wide">Teléfono</span>
                <a
                  href={`https://wa.me/${report.contact_phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-green-700 hover:underline"
                >
                  {report.contact_phone}
                </a>
              </div>
            )}
            {report.address_hint && (
              <div className="col-span-2 sm:col-span-3">
                <span className="text-gray-400 block text-xs uppercase tracking-wide">Referencia de ubicación</span>
                <span className="font-medium text-gray-800">{report.address_hint}</span>
              </div>
            )}
            {report.last_seen_location && (
              <div className="col-span-2 sm:col-span-3">
                <span className="text-gray-400 block text-xs uppercase tracking-wide">
                  {LOCATION_LABEL[report.report_type] ?? "Dónde fue vista por última vez"}
                </span>
                <span className="font-medium text-gray-800">{report.last_seen_location}</span>
              </div>
            )}
            {report.reward && (
              <div>
                <span className="text-gray-400 block text-xs uppercase tracking-wide">Recompensa</span>
                <span className="font-medium text-gray-800">{report.reward}</span>
              </div>
            )}
            {report.age && (
              <div>
                <span className="text-gray-400 block text-xs uppercase tracking-wide">Edad</span>
                <span className="font-medium text-gray-800">{AGE_LABEL[report.age] ?? report.age}</span>
              </div>
            )}
            {report.adoption_extras && (
              <div className="col-span-2 sm:col-span-3">
                <span className="text-gray-400 block text-xs uppercase tracking-wide">Extras de adopción</span>
                <span className="font-medium text-gray-800 whitespace-pre-wrap">{report.adoption_extras}</span>
              </div>
            )}
          </div>

          {report.source_url && (
            <div className="pt-2">
              <a href={report.source_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                Ver publicación original →
              </a>
            </div>
          )}
        </div>

        <FeaturesSection features={features} />

        {report.images.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-800">Imágenes</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {report.images.map((img) => (
                <div key={img.id} className="rounded-lg overflow-hidden bg-gray-100 aspect-square">
                  <img src={img.storage_url ?? img.image_url} alt="Mascota" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <ReportContent />
    </Suspense>
  );
}
