"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import ReportCard from "@/components/ReportCard";
import { fetchReports, type Report, type PaginatedResponse } from "@/lib/api";

const REPORT_TYPES = [
  { value: "", label: "Todos" },
  { value: "lost", label: "Perdidos" },
  { value: "found", label: "Encontrados" },
  { value: "adoption", label: "Adopción" },
  { value: "sighting", label: "Avistamientos" },
];

export default function HomePage() {
  const [data, setData] = useState<PaginatedResponse<Report> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reportType, setReportType] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchReports({
        report_type: reportType || undefined,
        search: search || undefined,
        page,
        limit: 24,
      });
      setData(result);
    } catch {
      setError("No se pudo conectar con la API. Verifica que esté corriendo.");
    } finally {
      setLoading(false);
    }
  }, [reportType, search, page]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">🐾 Huellitas Perdidas</h1>
            <Link
              href="/busqueda"
              className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              Buscar mi mascota
            </Link>
            <Link
              href="/developer"
              className="bg-gray-100 text-gray-600 text-sm font-medium px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
            >
              Dev
            </Link>
            <Link
              href="/calculadora"
              className="bg-gray-100 text-gray-600 text-sm font-medium px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
            >
              Costos
            </Link>
          </div>
          <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Buscar por título o descripción..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full sm:w-72 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
            >
              Buscar
            </button>
          </form>
        </div>
        <div className="max-w-6xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto">
          {REPORT_TYPES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => { setReportType(value); setPage(1); }}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                reportType === value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6 text-sm">
            {error}
          </div>
        )}

        {data && !loading && (
          <p className="text-sm text-gray-500 mb-4">
            {data.total} resultado{data.total !== 1 ? "s" : ""}
            {search && <> para <strong>&ldquo;{search}&rdquo;</strong></>}
          </p>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="border border-gray-200 rounded-lg overflow-hidden animate-pulse bg-white">
                <div className="h-48 bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-4 bg-gray-200 rounded w-full" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : data && data.items.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {data.items.map((report) => (
                <ReportCard key={report.id} report={report} />
              ))}
            </div>

            {data.pages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm disabled:opacity-40 hover:bg-gray-100 transition-colors"
                >
                  ← Anterior
                </button>
                <span className="text-sm text-gray-600">
                  Página {page} de {data.pages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                  disabled={page === data.pages}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm disabled:opacity-40 hover:bg-gray-100 transition-colors"
                >
                  Siguiente →
                </button>
              </div>
            )}
          </>
        ) : (
          !error && (
            <div className="text-center py-20 text-gray-400">
              <div className="text-5xl mb-4">🐾</div>
              <p className="text-lg font-medium">No se encontraron reportes</p>
              <p className="text-sm mt-1">Prueba con otros filtros</p>
            </div>
          )
        )}
      </main>
    </div>
  );
}
