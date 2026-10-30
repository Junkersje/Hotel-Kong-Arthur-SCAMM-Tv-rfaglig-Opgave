import React, { useState, useEffect } from 'react';
import { apiGet } from './services/api';
import { Hotel, BookOpen, BarChart3, Database, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const [health, setHealth] = useState({ status: 'checking', database: 'UNKNOWN' });
  const [loading, setLoading] = useState(true);

  const checkHealth = async () => {
    setLoading(true);
    try {
      const data = await apiGet('/health');
      setHealth(data);
    } catch (err) {
      setHealth({ status: 'ERROR', database: 'DISCONNECTED', error: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-700 flex items-center justify-center text-white shadow">
              <Hotel className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">Hotel Kong Arthur</h1>
              <p className="text-xs text-slate-500 font-medium">SCAMM — Booking & Analytics Platform</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* System Status Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 border border-slate-200">
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" />
                  <span className="text-slate-500">Tjekker API...</span>
                </>
              ) : health.status === 'UP' && health.database === 'CONNECTED' ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">System & DB Online</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span className="text-amber-700">API: {health.status} (DB: {health.database})</span>
                </>
              )}
            </div>

            <a
              href="http://localhost:8080"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition shadow-sm"
            >
              <BookOpen className="w-3.5 h-3.5 text-slate-500" />
              Swagger Docs
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-8 text-white mb-8 shadow-lg">
          <div className="max-w-3xl">
            <span className="inline-block px-3 py-1 bg-amber-500/20 text-amber-300 text-xs font-semibold rounded-full mb-3 border border-amber-400/30">
              3-Lags Softwarearkitektur & Tableau Prototype
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
              Velkommen til Hotel Kong Arthur Management Portal
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              Dette system orkestrerer 214 værelser, 8 værelsestyper, hotellets receptionsdrift og lobbybarens salgstransaktioner for ledelsesanalyser.
            </p>
          </div>
        </div>

        {/* Team SCAMM Responsibility Hub */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Team SCAMM — Udviklingsspor</h3>
              <p className="text-xs text-slate-500">Fundamentet (SH 1-12) er etableret. De 5 individuelle spor kan nu implementeres:</p>
            </div>
            <button
              onClick={checkHealth}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1 px-2.5 py-1.5 rounded bg-white border border-slate-200 hover:bg-slate-50 shadow-sm"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              Genindlæs status
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Spor 1 */}
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm hover:border-slate-300 transition">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">Amira</span>
                <span className="text-xs text-slate-400 font-mono">SH-13 - SH-21</span>
              </div>
              <h4 className="font-semibold text-slate-900 text-sm mb-1">Receptionsskranke & Oprettelse (MVP)</h4>
              <p className="text-xs text-slate-500">Booking-oprettelse med Zod-validering, værelsestyper og gæstetilknytning.</p>
            </div>

            {/* Spor 2 */}
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm hover:border-slate-300 transition">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">Christoffer</span>
                <span className="text-xs text-slate-400 font-mono">SH-20 - SH-32</span>
              </div>
              <h4 className="font-semibold text-slate-900 text-sm mb-1">Booking Directory & Livscyklus</h4>
              <p className="text-xs text-slate-500">Fuld CRUD: Reaktiv søgning, redigering af datoer/gæster og soft delete.</p>
            </div>

            {/* Spor 3 */}
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm hover:border-slate-300 transition">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">Simon</span>
                <span className="text-xs text-slate-400 font-mono">SH-33 - SH-42</span>
              </div>
              <h4 className="font-semibold text-slate-900 text-sm mb-1">Hotel Finance & Belægningsanalyse</h4>
              <p className="text-xs text-slate-500">KPI-beregninger: Værelsesomsætning, sæsoninddeling og belægningsprocent.</p>
            </div>

            {/* Spor 4 */}
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm hover:border-slate-300 transition">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">Maja</span>
                <span className="text-xs text-slate-400 font-mono">SH-43 - SH-50</span>
              </div>
              <h4 className="font-semibold text-slate-900 text-sm mb-1">Lobby Bar Analytics & Tableau WDC</h4>
              <p className="text-xs text-slate-500">Baromsætning, Helene Christine cocktail/kaffesalg og Tableau Web Connector.</p>
            </div>

            {/* Spor 5 */}
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm hover:border-slate-300 transition md:col-span-2 lg:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">Mathias</span>
                <span className="text-xs text-slate-400 font-mono">SH-1 - SH-12, SH-51 - SH-54</span>
              </div>
              <h4 className="font-semibold text-slate-900 text-sm mb-1">DevOps, Infrastruktur & End-to-End QA</h4>
              <p className="text-xs text-slate-500">Container-orkestrering, MySQL database-persistens, Swagger UI og samlet verifikation.</p>
            </div>
          </div>
        </div>

        {/* Database Verification Status */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-700">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Database & Miljøforbindelse</h3>
              <p className="text-xs text-slate-500">214 værelser, 30 lobbybar-produkter og historiske bookinger indlæses automatisk via Docker.</p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-4 font-mono text-xs text-slate-700 border border-slate-200 space-y-1">
            <div><span className="text-slate-400">Backend status:</span> {health.status}</div>
            <div><span className="text-slate-400">MySQL Connection:</span> {health.database}</div>
            {health.timestamp && <div><span className="text-slate-400">Sidste tjek:</span> {health.timestamp}</div>}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        Hotel Kong Arthur System — SCAMM (Mathias, Simon, Amira, Christoffer, Maja) — 3. Semester Tværfaglig Opgave
      </footer>
    </div>
  );
}
