"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Service definitions
// ---------------------------------------------------------------------------

interface Service {
  id: string;
  name: string;
  description: string;
  volumeLabel: string;
  unitLabel: string;
  defaultVolume: number;
  defaultPrice: number;
  isFixed: boolean;
  priceStep: number;
  volumeStep: number;
  pricingNote: string;
}

const SERVICES: Service[] = [
  {
    id: "brave",
    name: "Brave Search API",
    description: "Queries para descubrir posts nuevos de mascotas",
    volumeLabel: "queries / mes",
    unitLabel: "USD / query",
    defaultVolume: 500,
    defaultPrice: 0.001,
    isFixed: false,
    priceStep: 0.0001,
    volumeStep: 50,
    pricingNote:
      "Plan Data: 5,000 queries = $5/mes ($0.001/q) · Plan Pro: 20,000 queries = $9/mes ($0.00045/q)",
  },
  {
    id: "openai_text",
    name: "OpenAI gpt-4o-mini — Normalización",
    description: "Extrae atributos estructurados de cada post relevante",
    volumeLabel: "posts / mes",
    unitLabel: "USD / post",
    defaultVolume: 300,
    defaultPrice: 0.00025,
    isFixed: false,
    priceStep: 0.00001,
    volumeStep: 50,
    pricingNote:
      "Input $0.15/1M tok · Output $0.60/1M tok · ~900 tok in + ~200 tok out por post ≈ $0.000255",
  },
  {
    id: "openai_vision",
    name: "OpenAI gpt-4o-mini — Vision",
    description: "Clasifica imágenes: descarta banners/logos antes de guardar",
    volumeLabel: "imágenes / mes",
    unitLabel: "USD / imagen",
    defaultVolume: 900,
    defaultPrice: 0.000023,
    isFixed: false,
    priceStep: 0.000001,
    volumeStep: 100,
    pricingNote:
      "detail:low = 85 tok imagen · ~50 tok texto input · ~5 tok output · ≈ $0.000023/imagen",
  },
  {
    id: "proxy",
    name: "IPRoyal Proxy Residencial",
    description: "Tráfico para scraping de Facebook con Playwright",
    volumeLabel: "GB / mes",
    unitLabel: "USD / GB",
    defaultVolume: 2,
    defaultPrice: 3.5,
    isFixed: false,
    priceStep: 0.5,
    volumeStep: 0.5,
    pricingNote:
      "Precio residencial IPRoyal ~$3.00–$4.50/GB · ~2–3 GB/mes para 300 páginas FB",
  },
  {
    id: "lightsail",
    name: "AWS Lightsail",
    description: "Servidor: API + Worker + PostgreSQL",
    volumeLabel: "fijo mensual",
    unitLabel: "USD / mes",
    defaultVolume: 1,
    defaultPrice: 20,
    isFixed: true,
    priceStep: 5,
    volumeStep: 1,
    pricingNote:
      "Plan $20/mes: 2 GB RAM, 2 vCPU, 60 GB SSD, 3 TB transferencia incluida",
  },
  {
    id: "vercel",
    name: "Vercel (Web)",
    description: "Hosting del frontend Next.js",
    volumeLabel: "fijo mensual",
    unitLabel: "USD / mes",
    defaultVolume: 1,
    defaultPrice: 0,
    isFixed: true,
    priceStep: 1,
    volumeStep: 1,
    pricingNote: "Hobby plan gratuito para proyectos personales/open source",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtUSD(n: number): string {
  if (n === 0) return "$0.00";
  if (n >= 100) return `$${n.toFixed(0)}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(3)}`;
  return `$${n.toFixed(5)}`;
}

function fmtUnitPrice(n: number): string {
  if (n === 0) return "0";
  if (n >= 1) return n.toFixed(2);
  if (n >= 0.001) return n.toFixed(4);
  return n.toFixed(6);
}

function costColor(cost: number): string {
  if (cost >= 15) return "text-red-600";
  if (cost >= 5) return "text-yellow-600";
  return "text-green-700";
}

function totalColor(total: number): string {
  if (total >= 60) return "text-red-600";
  if (total >= 35) return "text-yellow-600";
  return "text-green-700";
}

// ---------------------------------------------------------------------------
// Input component
// ---------------------------------------------------------------------------

function NumInput({
  value,
  step,
  min = 0,
  onChange,
}: {
  value: number;
  step: number;
  min?: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      step={step}
      onChange={(e) => {
        const v = parseFloat(e.target.value);
        if (!isNaN(v) && v >= 0) onChange(v);
      }}
      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-right font-mono text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
    />
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CalculadoraPage() {
  const [volumes, setVolumes] = useState<Record<string, number>>(
    Object.fromEntries(SERVICES.map((s) => [s.id, s.defaultVolume]))
  );
  const [prices, setPrices] = useState<Record<string, number>>(
    Object.fromEntries(SERVICES.map((s) => [s.id, s.defaultPrice]))
  );
  const [showNotes, setShowNotes] = useState(false);

  const setVolume = useCallback(
    (id: string, v: number) => setVolumes((p) => ({ ...p, [id]: v })),
    []
  );
  const setPrice = useCallback(
    (id: string, v: number) => setPrices((p) => ({ ...p, [id]: v })),
    []
  );

  const rows = SERVICES.map((s) => ({
    ...s,
    cost: volumes[s.id] * prices[s.id],
  }));
  const total = rows.reduce((sum, r) => sum + r.cost, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <Link href="/" className="text-blue-600 hover:underline text-sm">
            ← Volver al listado
          </Link>
          <h1 className="text-xl font-bold text-gray-900 mt-0.5">
            Calculadora de costos
          </h1>
          <p className="text-sm text-gray-500">
            Estimación mensual de todos los servicios del proyecto · edita los
            valores para simular diferentes escenarios
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Main table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-5 py-3">Servicio</th>
                  <th className="text-right px-4 py-3 w-40">Volumen / mes</th>
                  <th className="text-right px-4 py-3 w-40">Precio unitario</th>
                  <th className="text-right px-5 py-3 w-32">Costo / mes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/60">
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-gray-900">{s.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {s.description}
                      </div>
                      {showNotes && (
                        <div className="mt-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded px-2 py-1">
                          {s.pricingNote}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 align-top">
                      {s.isFixed ? (
                        <div className="text-right text-xs text-gray-400 italic mt-1">
                          fijo
                        </div>
                      ) : (
                        <div>
                          <NumInput
                            value={volumes[s.id]}
                            step={s.volumeStep}
                            onChange={(v) => setVolume(s.id, v)}
                          />
                          <div className="text-xs text-gray-400 mt-0.5 text-right">
                            {s.volumeLabel}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 align-top">
                      <NumInput
                        value={prices[s.id]}
                        step={s.priceStep}
                        onChange={(v) => setPrice(s.id, v)}
                      />
                      <div className="text-xs text-gray-400 mt-0.5 text-right">
                        {s.unitLabel}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right align-top">
                      <span
                        className={`font-mono font-semibold text-base ${costColor(s.cost)}`}
                      >
                        {fmtUSD(s.cost)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-300">
                  <td
                    colSpan={3}
                    className="px-5 py-4 font-semibold text-gray-700 text-right text-base"
                  >
                    Total mensual estimado
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span
                      className={`font-mono font-bold text-2xl ${totalColor(total)}`}
                    >
                      {fmtUSD(total)}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Notes toggle */}
        <button
          onClick={() => setShowNotes(!showNotes)}
          className="text-sm text-blue-600 hover:underline"
        >
          {showNotes
            ? "Ocultar detalle de precios"
            : "¿Cómo se calculan los precios unitarios?"}
        </button>

        {/* Assumptions box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
          <p className="text-sm font-semibold text-blue-900">
            Supuestos del volumen por defecto
          </p>
          <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
            <li>
              <strong>500 queries Brave</strong> → ~5,000 URLs descubiertas (10
              resultados por query)
            </li>
            <li>
              <strong>300 posts normalizados</strong> → ~30% de las URLs
              descubiertas pasan el clasificador
            </li>
            <li>
              <strong>900 imágenes Vision</strong> → promedio 3 imágenes por
              post relevante
            </li>
            <li>
              <strong>2 GB proxy</strong> → ~300 páginas de Facebook con
              Playwright (~6 MB/página promedio)
            </li>
          </ul>
          <p className="text-xs text-blue-600 mt-1">
            Edita los campos directamente en la tabla para simular tu escenario
            real.
          </p>
        </div>

        {/* Reset */}
        <div className="text-right">
          <button
            onClick={() => {
              setVolumes(
                Object.fromEntries(SERVICES.map((s) => [s.id, s.defaultVolume]))
              );
              setPrices(
                Object.fromEntries(
                  SERVICES.map((s) => [s.id, s.defaultPrice])
                )
              );
            }}
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            Restablecer valores por defecto
          </button>
        </div>
      </main>
    </div>
  );
}
