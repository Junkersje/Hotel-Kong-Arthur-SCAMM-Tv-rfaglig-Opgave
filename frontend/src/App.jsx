import React from 'react';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-slate-900 text-white shadow-md border-b border-amber-600/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-amber-600 text-white font-bold flex items-center justify-center text-lg shadow-inner">
              KA
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Hotel Kong Arthur</h1>
              <p className="text-xs text-amber-400">Booking-CRUD & Analytics Platform</p>
            </div>
          </div>
          <div className="text-sm text-slate-400">
            Kapacitet: <span className="text-amber-400 font-semibold">214 værelser</span> | 8 værelsestyper
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Velkommen til Hotel Kong Arthur Management</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Systemet er initialiseret i overensstemmelse med den godkendte 3-lags arkitektur.
            Herfra vil receptionister kunne administrere reservationer og ledelsen overvåge kapacitets- og forretningsnøgletal.
          </p>
        </div>
      </main>

      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 text-xs py-4 text-center">
        Hotel Kong Arthur &bull; SCAMM Tværfaglig Opgave &bull; 3. Semester ITA
      </footer>
    </div>
  );
}
