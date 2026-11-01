/**
 * MVVM: App Container (SH-22 / T022)
 * Samler Hotel Kong Arthur branding, navigation, BookingForm og BookingList i hovedapplikationen.
 * Sikrer automatisk genindlæsning (refresh) af BookingList når en ny reservation oprettes.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Hotel,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  PlusCircle,
  ListFilter,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { apiGet } from './services/api.js';
import { useBookingListViewModel } from './viewmodels/useBookingListViewModel.js';
import BookingList from './components/BookingList.jsx';

// Dynamisk opløsning af BookingForm (SH-21 / T021) så App.jsx bygger fejlfrit både før og efter merge af T021
const bookingFormModules = import.meta.glob(
  ['./components/BookingForm.jsx', './views/BookingFormView.jsx'],
  { eager: true }
);
const ResolvedBookingForm =
  bookingFormModules['./components/BookingForm.jsx']?.default ||
  bookingFormModules['./views/BookingFormView.jsx']?.default ||
  null;

export default function App() {
  const [health, setHealth] = useState({ status: 'checking', database: 'UNKNOWN' });
  const [healthLoading, setHealthLoading] = useState(true);
  const [showBookingForm, setShowBookingForm] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const bookingListViewModel = useBookingListViewModel({ refreshTrigger });

  const checkHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const data = await apiGet('/health');
      setHealth(data);
    } catch (err) {
      setHealth({ status: 'ERROR', database: 'DISCONNECTED', error: err.message });
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  // Callback der udløser øjeblikkelig genindlæsning af BookingList efter oprettelse i BookingForm
  const handleBookingCreated = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
    bookingListViewModel.refreshBookings();
  }, [bookingListViewModel]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      {/* Top Header med Hotel Kong Arthur Branding og Navigation */}
      <header className="bg-slate-900 text-white border-b border-amber-600/30 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white shadow">
              <Hotel className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white leading-tight">Hotel Kong Arthur</h1>
                <span className="hidden sm:inline-block text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  Reception &amp; Booking
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                SCAMM — Booking-CRUD &amp; Analytics Platform (214 værelser &bull; 8 værelsestyper)
              </p>
            </div>
          </div>

          {/* Navigation & System Status */}
          <nav aria-label="Hovednavigation" className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowBookingForm((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-md transition shadow-sm"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{showBookingForm ? 'Skjul formular' : 'Ny booking'}</span>
              {showBookingForm ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {/* System Status Pill */}
            <button
              type="button"
              onClick={checkHealth}
              title="Klik for at genindlæse API- og databasestatus"
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-800 border border-slate-700 hover:border-slate-600 transition"
            >
              {healthLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" />
                  <span className="text-slate-300">Tjekker API...</span>
                </>
              ) : health.status === 'UP' && health.database === 'CONNECTED' ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300">System &amp; DB Online</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-300">
                    API: {health.status} (DB: {health.database})
                  </span>
                </>
              )}
            </button>

            <a
              href="http://localhost:8080"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 border border-slate-700 rounded-md hover:bg-slate-700 transition shadow-sm"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Swagger Docs</span>
            </a>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Øverste sektion: BookingForm (Oprettelse af ny reservation) */}
        {showBookingForm && (
          <section aria-label="Opret ny reservation">
            {ResolvedBookingForm ? (
              <ResolvedBookingForm
                onBookingCreated={handleBookingCreated}
                onSuccess={handleBookingCreated}
              />
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                    <PlusCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Opret Ny Reservation (BookingForm)
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Formularen (<code className="font-mono text-slate-700">BookingForm.jsx</code>{' '}
                      — SH-21 / T021) kobles automatisk her med live-opdatering af reservationslisten.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleBookingCreated}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition shrink-0"
                >
                  <ListFilter className="w-3.5 h-3.5" />
                  <span>Synkronisér oversigt</span>
                </button>
              </div>
            )}
          </section>
        )}

        {/* Hovedvisning: BookingList (Søgning, filtrering og oversigt over reservationer) */}
        <BookingList
          viewModel={bookingListViewModel}
          refreshTrigger={refreshTrigger}
        />
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 py-4 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Hotel Kong Arthur System — SCAMM (Mathias, Simon, Amira, Christoffer, Maja)
          </span>
          <span className="text-slate-500">
            React 18 (MVVM) &bull; Node.js 3-Lags REST API &bull; MySQL 8.0
          </span>
        </div>
      </footer>
    </div>
  );
}
