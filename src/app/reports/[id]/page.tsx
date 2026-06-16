import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchReport } from "@/lib/api";

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
  blanco: "Blanco",
  negro: "Negro",
  marron: "Marrón",
  amarillo: "Amarillo / Dorado",
  gris: "Gris",
  naranja: "Naranja",
  tricolor: "Tricolor",
  manchas: "Con manchas",
  atigrado: "Atigrado",
};

interface ExtractedFeatures {
  colors?: string[];
  size?: string | null;
  age?: string | null;
  sex?: string | null;
  has_collar?: boolean;
  collar_color?: string | null;
  distinctive_marks?: string[];
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

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let report;
  try {
    report = await fetchReport(id);
  } catch {
    notFound();
  }

  const typeColor = TYPE_COLOR[report.report_type] ?? TYPE_COLOR.unknown;
  const typeLabel = TYPE_LABEL[report.report_type] ?? report.report_type;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href="/" className="text-blue-600 hover:underline text-sm">
            ← Volver al listado
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`text-sm font-semibold px-3 py-1 rounded-full ${typeColor}`}>
              {typeLabel}
            </span>
            {report.pet_type && (
              <span className="text-sm text-gray-600 capitalize bg-gray-100 px-3 py-1 rounded-full">
                {report.pet_type}
              </span>
            )}
            {report.has_video && (
              <span className="text-sm text-gray-500">▶ Tiene video</span>
            )}
          </div>

          <h1 className="text-2xl font-bold text-gray-900">
            {report.title ?? "Sin título"}
          </h1>

          {report.description && (
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{report.description}</p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm pt-2">
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
                <span className="text-gray-400 block text-xs uppercase tracking-wide">Fecha</span>
                <span className="font-medium text-gray-800">
                  {formatDate(report.event_date ?? report.published_at)}
                </span>
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
          </div>

          {report.source_url && (
            <div className="pt-2">
              <a
                href={report.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-sm"
              >
                Ver publicación original →
              </a>
            </div>
          )}
        </div>

        <FeaturesSection features={report.extracted_features as ExtractedFeatures} />

        {report.images.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-800">Imágenes</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {report.images.map((img) => (
                <div key={img.id} className="rounded-lg overflow-hidden bg-gray-100 aspect-square">
                  <img
                    src={img.storage_url ?? img.image_url}
                    alt="Mascota"
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
