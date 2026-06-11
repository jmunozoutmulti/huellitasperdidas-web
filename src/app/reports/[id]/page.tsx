import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchReport } from "@/lib/api";

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
            <p className="text-gray-700 leading-relaxed">{report.description}</p>
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
