/**
 * MVVM: View Layer - AnalyticsOverviewView
 * Præsenterer hurtige overblikskort med nøgletal for ledelsen.
 * Delegerer datahentning til useAnalyticsViewModel.
 */

import React from 'react';
import { useAnalyticsViewModel } from '../viewmodels/useAnalyticsViewModel.js';
import { formatCurrency } from '../models/BookingModel.js';

export default function AnalyticsOverviewView() {
  const { summary, isLoading, error } = useAnalyticsViewModel();

  if (isLoading && !summary) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 animate-pulse h-24"></div>
        ))}
      </div>
    );
  }

  const totalRev = summary?.total_revenue_dkk || 0;
  const roomRev = summary?.room_revenue_dkk || 0;
  const barShare = summary?.bar_share_percentage || 0;
  const occupancy = summary?.occupancy_rate || 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Kort 1: Total omsætning */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
          Total Omsætning
        </div>
        <div className="text-2xl font-bold text-slate-900">
          {formatCurrency(totalRev)}
        </div>
        <div className="text-xs text-slate-400 mt-1">
          Værelser + Lobbybar
        </div>
      </div>

      {/* Kort 2: Værelsesindtægt */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
          Værelsesomsætning
        </div>
        <div className="text-2xl font-bold text-amber-700">
          {formatCurrency(roomRev)}
        </div>
        <div className="text-xs text-slate-400 mt-1">
          Ekskl. aflyste reservationer
        </div>
      </div>

      {/* Kort 3: Barandel */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
          Barandel af Omsætning
        </div>
        <div className="text-2xl font-bold text-emerald-700">
          {barShare}%
        </div>
        <div className="text-xs text-slate-400 mt-1">
          Lobbybar salg i alt
        </div>
      </div>

      {/* Kort 4: Belægningsgrad */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
          Belægningsgrad
        </div>
        <div className="text-2xl font-bold text-blue-700">
          {occupancy}%
        </div>
        <div className="text-xs text-slate-400 mt-1">
          Kapacitet: 214 værelser
        </div>
      </div>
    </div>
  );
}
