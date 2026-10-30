/**
 * MVVM: View Layer - BookingListView
 * Præsenterer bookingtabel, søgefelt og statusfiltre.
 * Indeholder INGEN forretningslogik eller direkte API-kald – alt styres via ViewModel.
 */

import React from 'react';
import { STATUS_LABELS, STATUS_COLORS, formatCurrency } from '../models/BookingModel.js';
import EditBookingModalView from './EditBookingModalView.jsx';
import DeleteDialogView from './DeleteDialogView.jsx';

export default function BookingListView({ viewModel }) {
  const {
    bookings,
    isLoading,
    error,
    searchQuery,
    statusFilter,
    editingBooking,
    deletingBooking,
    setSearchQuery,
    setStatusFilter,
    openEditModal,
    closeEditModal,
    openDeleteDialog,
    closeDeleteDialog,
    onBookingUpdated,
    onBookingDeleted,
    refreshBookings
  } = viewModel;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header med søgning og filter */}
      <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Aktuelle Reservationer</h2>
          <p className="text-sm text-slate-500">Søg blandt gæster, værelser og reservationsstatus</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Søgefelt */}
          <div className="relative">
            <input
              type="text"
              placeholder="Søg gæst, ID eller email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 pl-3 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">Alle statusser</option>
            <option value="confirmed">Bekræftet</option>
            <option value="checked_in">Indtjekket</option>
            <option value="checked_out">Udtjekket</option>
            <option value="cancelled">Annulleret</option>
          </select>

          {/* Opdater-knap */}
          <button
            onClick={refreshBookings}
            disabled={isLoading}
            className="text-sm px-3 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition"
          >
            {isLoading ? 'Henter...' : 'Genindlæs'}
          </button>
        </div>
      </div>

      {/* Fejlvisning */}
      {error && (
        <div className="m-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg">
          {error}
        </div>
      )}

      {/* Tabel */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-xs tracking-wider font-semibold">
              <th className="py-3.5 px-4">ID</th>
              <th className="py-3.5 px-4">Gæst</th>
              <th className="py-3.5 px-4">Land</th>
              <th className="py-3.5 px-4">Værelse</th>
              <th className="py-3.5 px-4">Periode</th>
              <th className="py-3.5 px-4">Pris</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Handlinger</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-700">
            {isLoading && bookings.length === 0 ? (
              <tr>
                <td colSpan="8" className="py-8 text-center text-slate-400">
                  Indlæser reservationer...
                </td>
              </tr>
            ) : bookings.length === 0 ? (
              <tr>
                <td colSpan="8" className="py-8 text-center text-slate-400">
                  Ingen reservationer fundet.
                </td>
              </tr>
            ) : (
              bookings.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50 transition">
                  <td className="py-3.5 px-4 font-mono font-medium text-slate-900">
                    #{b.id}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900">
                      {b.first_name} {b.last_name}
                    </div>
                    <div className="text-xs text-slate-400">{b.email}</div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">
                    {b.country || <span className="italic text-slate-400">Ukendt</span>}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-medium text-slate-900">
                      {b.room_type_name || `Type #${b.room_type_id}`}
                    </span>
                    {b.room_number && (
                      <span className="ml-1.5 text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        Vær. {b.room_number}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-xs font-mono text-slate-600">
                    <div>{b.check_in_date ? b.check_in_date.substring(0, 10) : ''}</div>
                    <div className="text-slate-400">&rarr; {b.check_out_date ? b.check_out_date.substring(0, 10) : ''}</div>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-900">
                    {formatCurrency(b.total_price_dkk)}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[b.status] || 'bg-slate-100 text-slate-800'}`}>
                      {STATUS_LABELS[b.status] || b.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-2">
                    <button
                      onClick={() => openEditModal(b)}
                      disabled={b.status === 'cancelled'}
                      className="text-xs font-medium text-amber-700 hover:text-amber-900 disabled:opacity-30 disabled:cursor-not-allowed transition"
                    >
                      Redigér
                    </button>
                    <button
                      onClick={() => openDeleteDialog(b)}
                      disabled={b.status === 'cancelled'}
                      className="text-xs font-medium text-rose-600 hover:text-rose-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
                    >
                      Aflys
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Booking Modal View */}
      {editingBooking && (
        <EditBookingModalView
          booking={editingBooking}
          onSuccess={onBookingUpdated}
          onCancel={closeEditModal}
        />
      )}

      {/* Delete Confirmation Dialog View */}
      {deletingBooking && (
        <DeleteDialogView
          booking={deletingBooking}
          onSuccess={onBookingDeleted}
          onCancel={closeDeleteDialog}
        />
      )}
    </div>
  );
}
