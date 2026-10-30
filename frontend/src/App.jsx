/**
 * MVVM: App Container
 * Samler MVVM-lagene (Models, ViewModels og Views) i en samlet, intuitiv brugergrænseflade.
 */

import React from 'react';
import { useBookingListViewModel } from './viewmodels/useBookingListViewModel.js';
import BookingListView from './views/BookingListView.jsx';
import BookingFormView from './views/BookingFormView.jsx';
import AnalyticsOverviewView from './views/AnalyticsOverviewView.jsx';

export default function App() {
  const bookingListViewModel = useBookingListViewModel();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-slate-900 text-white shadow-md border-b border-amber-600/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 text-white font-bold flex items-center justify-center text-lg shadow">
              KA
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Hotel Kong Arthur
                <span className="text-xs font-normal px-2 py-0.5 rounded bg-amber-900/60 text-amber-300 border border-amber-600/40">
                  MVVM Architecture
                </span>
              </h1>
              <p className="text-xs text-amber-400">Booking-CRUD & Analytics Platform</p>
            </div>
          </div>
          <div className="flex items-center space-x-6 text-xs text-slate-300">
            <div>
              Kapacitet: <span className="text-amber-400 font-semibold">214 værelser</span>
            </div>
            <div>
              Typer: <span className="text-amber-400 font-semibold">8 officielle</span>
            </div>
            <div>
              Lobbybar: <span className="text-amber-400 font-semibold">Helene Christine (HC01)</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hurtige KPI Overblikskort */}
        <AnalyticsOverviewView />

        {/* Opret Ny Booking Formular */}
        <BookingFormView onBookingCreated={bookingListViewModel.refreshBookings} />

        {/* Reservationsoversigt & CRUD Tabel */}
        <BookingListView viewModel={bookingListViewModel} />
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 text-xs py-5 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Hotel Kong Arthur &bull; SCAMM Tværfaglig Opgave &bull; 3. Semester ITA</span>
          <span className="text-slate-500">React 18 (MVVM Pattern) &bull; Node.js 3-Lag &bull; MySQL 8.0</span>
        </div>
      </footer>
    </div>
  );
}
