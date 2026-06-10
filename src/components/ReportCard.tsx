import Link from "next/link";
import type { Report } from "@/lib/api";

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
    month: "short",
    year: "numeric",
  });
}

export default function ReportCard({ report }: { report: Report }) {
  const image = report.images[0];
  const typeColor = TYPE_COLOR[report.report_type] ?? TYPE_COLOR.unknown;
  const typeLabel = TYPE_LABEL[report.report_type] ?? report.report_type;

  return (
    <Link href={`/reports/${report.id}`} className="block group">
      <div className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow bg-white">
        {image ? (
          <div className="h-48 bg-gray-100 overflow-hidden">
            <img
              src={image.storage_url ?? image.image_url}
              alt={report.title ?? "Mascota"}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
          </div>
        ) : (
          <div className="h-48 bg-gray-100 flex items-center justify-center text-gray-400 text-4xl">
            🐾
          </div>
        )}

        <div className="p-4 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${typeColor}`}>
              {typeLabel}
            </span>
            {report.pet_type && (
              <span className="text-xs text-gray-500 capitalize">{report.pet_type}</span>
            )}
            {report.has_video && (
              <span className="text-xs text-gray-400">▶ Video</span>
            )}
          </div>

          <h3 className="font-medium text-gray-900 line-clamp-2 text-sm leading-snug">
            {report.title ?? "Sin título"}
          </h3>

          {report.description && (
            <p className="text-xs text-gray-500 line-clamp-2">{report.description}</p>
          )}

          <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
            <span>{report.district ?? report.region ?? "Lima"}</span>
            <span>{formatDate(report.published_at ?? report.created_at)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
