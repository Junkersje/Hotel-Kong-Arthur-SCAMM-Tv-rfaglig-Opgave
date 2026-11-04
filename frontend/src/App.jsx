/**
 * MVVM: App Container (SH-22 / T022)
 * Samler Hotel Kong Arthur Welcome-banner, faneblade (recep | Data) og 3-kolonne receptionsboks
 * i overensstemmelse med Messenger-sketchen.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Hotel,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  PlusCircle,
  Edit3,
  Trash2,
  User,
  Mail,
  Phone,
  Globe,
  BedDouble,
  Calendar,
  Clock,
  BarChart3
} from 'lucide-react';
import { apiGet } from './services/api.js';
import { useBookingListViewModel } from './viewmodels/useBookingListViewModel.js';
import BookingList from './components/BookingList.jsx';
import BookingForm from './components/BookingForm.jsx';
import AnalyticsOverview from './components/AnalyticsOverview.jsx';

export default function App() {
  const [health, setHealth] = useState({ status: 'checking', database: 'UNKNOWN' });
  const [healthLoading, setHealthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('recep'); // 'recep' | 'data'
  const [formMode, setFormMode] = useState('create'); // 'create' | 'edit'
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRowEditRequested = useCallback((booking) => {
    if (booking) {
      setFormMode('edit');
    }
  }, []);

  const bookingListViewModel = useBookingListViewModel({
    refreshTrigger,
    onEdit: handleRowEditRequested
  });

  const {
    selectedBooking,
    selectBooking,
    openEditModal,
    openDeleteDialog,
    onBookingUpdated,
    registerCreatedBooking
  } = bookingListViewModel;

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

  // Callback der udløser øjeblikkelig opdatering af BookingList efter oprettelse i BookingForm
  const handleBookingCreated = useCallback(
    (createdBooking) => {
      if (createdBooking && typeof registerCreatedBooking === 'function') {
        registerCreatedBooking(createdBooking);
      } else {
        setRefreshTrigger((prev) => prev + 1);
      }
    },
    [registerCreatedBooking]
  );

  const handleInlineBookingUpdated = useCallback(
    (updatedBooking) => {
      onBookingUpdated(updatedBooking);
    },
    [onBookingUpdated]
  );

  const handleSelectBookingFromList = useCallback(
    (booking) => {
      selectBooking(booking);
    },
    [selectBooking]
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900 font-sans">
      {/* Top Header med Hotel Kong Arthur Branding og Systemstatus */}
      <header className="bg-slate-900 text-white border-b border-amber-600/30 sticky top-0 z-40 shadow-md">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white shadow">
              <Hotel className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white leading-tight">Hotel Kong Arthur</h1>
                <span className="hidden sm:inline-block text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  Reception &amp; Booking Portal
                </span>
              </div>
            </div>
          </div>

          {/* System Status & Swagger */}
          <nav aria-label="Hovednavigation" className="flex items-center gap-3">
            <button
              type="button"
              onClick={checkHealth}
              title="Klik for at genindlæse API- og databasestatus"
              className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 border border-slate-700 hover:border-slate-600 transition"
            >
              {healthLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" />
                  <span className="text-slate-300">Tjekker API...</span>
                </>
              ) : health.status === 'UP' && health.database === 'CONNECTED' ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">System &amp; DB Online</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
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
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-200 bg-slate-800 border border-slate-700 rounded-md hover:bg-slate-700 transition shadow-sm"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Swagger Docs</span>
            </a>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Øverste Hero Banner (som i sketchen) */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-6 sm:p-8 text-white shadow-lg">
          <div className="max-w-3xl">
            <span className="inline-block px-3 py-1 bg-amber-500/20 text-amber-300 text-xs font-semibold rounded-full mb-3 border border-amber-400/30">
              3-Lags Softwarearkitektur &amp; Tableau Prototype
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
              Velkommen til Hotel Kong Arthur Management Portal
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              Dette system orkestrerer 214 værelser, 8 værelsestyper, hotellets receptionsdrift og
              lobbybarens salgstransaktioner for ledelsesanalyser.
            </p>
          </div>
        </div>

        {/* Portal Box med 'recep' og 'Data' faneblade i overensstemmelse med Messenger-sketchen */}
        <div>
          {/* Faneblade øverst til venstre på hovedboksen: [ recep | Data ] */}
          <div className="flex items-end" role="tablist" aria-label="Portal sektioner">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'recep'}
              onClick={() => setActiveTab('recep')}
              className={`px-6 py-2.5 text-sm font-extrabold tracking-wide border-t-2 border-l-2 border-r-2 border-slate-900 rounded-tl-lg transition ${
                activeTab === 'recep'
                  ? 'bg-white text-slate-900 -mb-[2px] z-10'
                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
              }`}
            >
              recep (Reception)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'data'}
              onClick={() => setActiveTab('data')}
              className={`px-6 py-2.5 text-sm font-extrabold tracking-wide border-t-2 border-r-2 border-slate-900 rounded-tr-lg transition inline-flex items-center gap-1.5 ${
                activeTab === 'data'
                  ? 'bg-white text-slate-900 -mb-[2px] z-10'
                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Data</span>
            </button>
          </div>

          {/* Den store hovedboks under fanerne */}
          <div className="bg-slate-50 border-2 border-slate-900 rounded-b-xl rounded-tr-xl p-4 sm:p-6 shadow-md">
            {activeTab === 'recep' ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                {/* VENSTRE KOLONNE (Dropdown boks øverst + Opret/Rediger formularboks nederst) */}
                <div className="lg:col-span-4 flex flex-col gap-4">
                  {/* Øverste venstre boks: 'dropdown' (Hurtigt skift mellem Opret & Rediger med 1 klik) */}
                  <div className="bg-white rounded-lg border-2 border-slate-800 p-3.5 shadow-sm">
                    <label
                      htmlFor="reception-action-dropdown"
                      className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5"
                    >
                      Receptionshandling (Dropdown)
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        id="reception-action-dropdown"
                        value={formMode}
                        onChange={(e) => setFormMode(e.target.value)}
                        className="flex-1 text-sm font-semibold border-2 border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="create">+ Opret ny booking</option>
                        <option value="edit" disabled={!selectedBooking}>
                          {selectedBooking
                            ? `✎ Redigér valgt booking (#${selectedBooking.id} - ${selectedBooking.guest_name})`
                            : '✎ Redigér valgt booking (vælg i listen)'}
                        </option>
                      </select>

                      <button
                        type="button"
                        onClick={() =>
                          setFormMode((prev) =>
                            prev === 'create' && selectedBooking ? 'edit' : 'create'
                          )
                        }
                        title="Skift hurtigt mellem Opret og Rediger (1 klik)"
                        className="px-3 py-2 text-xs font-bold rounded-lg border-2 border-slate-800 bg-amber-400 hover:bg-amber-300 text-slate-900 transition shrink-0"
                      >
                        {formMode === 'create' ? 'Redigér' : '+ Ny'}
                      </button>
                    </div>
                  </div>

                  {/* Nederste venstre boks: Opret / Rediger Booking Formular */}
                  <BookingForm
                    compact
                    mode={formMode}
                    bookingToEdit={selectedBooking}
                    onBookingCreated={handleBookingCreated}
                    onBookingUpdated={handleInlineBookingUpdated}
                  />
                </div>

                {/* MIDTERSTE KOLONNE (Øverste boks: Søgebar + farvekodefilter | Nederste boks: Fremsøgte rækker) */}
                <div className="lg:col-span-5 flex flex-col">
                  <BookingList
                    viewModel={bookingListViewModel}
                    refreshTrigger={refreshTrigger}
                    onSelectBooking={handleSelectBookingFromList}
                  />
                </div>

                {/* HØJRE KOLONNE (Detaljeboks for valgt booking + Rød cirkel Slet-knap nederst til højre) */}
                <div className="lg:col-span-3 flex flex-col justify-between gap-4">
                  {/* Højre boks: Valgt booking-detaljer */}
                  <section
                    aria-label="Valgt booking detaljer"
                    className="bg-white rounded-lg border-2 border-slate-800 p-4 shadow-sm flex-1 flex flex-col justify-between"
                  >
                    {selectedBooking ? (
                      <div className="space-y-3.5">
                        <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-200">
                          <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                              Valgt Booking
                            </span>
                            <h3 className="text-lg font-extrabold font-mono text-slate-900">
                              #{selectedBooking.id}
                            </h3>
                          </div>
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${selectedBooking.statusColorClass}`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${selectedBooking.statusDotClass}`}
                            />
                            {selectedBooking.statusLabel}
                          </span>
                        </div>

                        {/* Gæsteoplysninger */}
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center gap-2 text-slate-800">
                            <User className="w-4 h-4 text-amber-600 shrink-0" />
                            <div>
                              <div className="text-[10px] uppercase text-slate-400 font-semibold">
                                Kundens fulde navn
                              </div>
                              <div className="font-bold text-sm text-slate-900">
                                {selectedBooking.guest_name}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-slate-700">
                            <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                            <div className="min-w-0">
                              <div className="text-[10px] uppercase text-slate-400 font-semibold">
                                E-mail
                              </div>
                              <div className="font-medium truncate">
                                {selectedBooking.email || 'Ikke oplyst'}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-slate-700">
                            <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                            <div>
                              <div className="text-[10px] uppercase text-slate-400 font-semibold">
                                Mobil nr.
                              </div>
                              <div className="font-mono font-medium">
                                {selectedBooking.phone || 'Ikke oplyst'}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-slate-700">
                            <Globe className="w-4 h-4 text-slate-400 shrink-0" />
                            <div>
                              <div className="text-[10px] uppercase text-slate-400 font-semibold">
                                Land
                              </div>
                              <div className="font-medium">{selectedBooking.country}</div>
                            </div>
                          </div>
                        </div>

                        {/* Værelse & Ophold */}
                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800">
                              <BedDouble className="w-4 h-4 text-amber-700" />
                              {selectedBooking.room_type_name}
                            </span>
                            {selectedBooking.room_number && (
                              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-white border border-slate-200 font-semibold">
                                Vær. {selectedBooking.room_number}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-slate-600">
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {selectedBooking.check_in_date} &rarr; {selectedBooking.check_out_date}
                            </span>
                            <span>
                              {selectedBooking.nights}{' '}
                              {selectedBooking.nights === 1 ? 'nat' : 'nætter'} &bull;{' '}
                              {selectedBooking.num_guests} pers.
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-1.5 border-t border-slate-200">
                            <span className="text-slate-500">Totalpris:</span>
                            <span className="text-sm font-extrabold text-slate-900">
                              {selectedBooking.formattedPrice}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Oprettet:
                            </span>
                            <span className="font-mono">
                              {selectedBooking.formattedCreatedAt !== '—'
                                ? selectedBooking.formattedCreatedAt
                                : selectedBooking.check_in_date}
                            </span>
                          </div>
                        </div>

                        {/* Hurtig 1-kliks statusopdatering og redigering */}
                        <div className="pt-2 space-y-2">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Hurtig handling (1 klik)
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setFormMode('edit')}
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-amber-950 bg-amber-300 hover:bg-amber-400 border border-amber-500 rounded-lg transition shadow-sm"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Ret i boks</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal(selectedBooking)}
                              disabled={selectedBooking.isCancelled}
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg disabled:opacity-40 transition"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Pop-up ret</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="py-12 text-center text-slate-400 text-xs">
                        Vælg en booking i rækkerne til venstre for at se detaljer eller slette.
                      </div>
                    )}
                  </section>

                  {/* NEDERST TIL HØJRE: Den røde cirkel-knap fra Messenger-sketchen til Slet / Aflys */}
                  <div className="flex items-center justify-end gap-3 pt-1">
                    {selectedBooking && (
                      <span className="text-xs font-semibold text-slate-600">
                        {selectedBooking.isCancelled
                          ? `Booking #${selectedBooking.id} er annulleret`
                          : `Slet / aflys #${selectedBooking.id}`}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => selectedBooking && openDeleteDialog(selectedBooking)}
                      disabled={!selectedBooking || selectedBooking.isCancelled}
                      aria-label="Slet valgt booking"
                      title={
                        selectedBooking
                          ? `Slet / aflys booking #${selectedBooking.id}`
                          : 'Vælg en booking for at slette'
                      }
                      className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-lg border-2 border-red-800 flex flex-col items-center justify-center transition shrink-0"
                    >
                      <Trash2 className="w-5 h-5" />
                      <span className="text-[10px] font-extrabold uppercase tracking-tight mt-0.5">
                        Slet
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* 'Data' fanebladet: Nøgletal og Analytics */
              <div className="space-y-4">
                <AnalyticsOverview />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 py-4 text-xs mt-8">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Hotel Kong Arthur System — SCAMM (Mathias, Simon, Amira, Christoffer, Maja)
          </span>
          <span className="text-slate-500">
            React 18 (MVVM) &bull; Node.js 3-Lags REST API &bull; PostgreSQL
          </span>
        </div>
      </footer>
    </div>
  );
}
