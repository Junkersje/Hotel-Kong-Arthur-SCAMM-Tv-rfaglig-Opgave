/**
 * MVVM: View Layer - DeleteDialogView
 * Præsenterer bekræftelsesdialogen for aflysning (soft-delete).
 * Delegerer til useDeleteBookingViewModel.
 */

import React from 'react';
import { useDeleteBookingViewModel } from '../viewmodels/useDeleteBookingViewModel.js';

export default function DeleteDialogView({ booking, onSuccess, onCancel }) {
  const {
    isDeleting,
    error,
    handleConfirm,
    handleCancel
  } = useDeleteBookingViewModel(booking, onSuccess, onCancel);

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 p-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center space-x-3 text-rose-600 mb-4">
          <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center font-bold text-lg">
            !
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Aflys Reservation</h3>
            <p className="text-xs text-slate-500">Soft delete &ndash; data bevares til regnskab</p>
          </div>
        </div>

        <p className="text-sm text-slate-600 mb-4">
          Er du sikker på, at du vil aflyse reservation <span className="font-semibold text-slate-900">#{booking.id}</span> for <span className="font-semibold text-slate-900">{booking.first_name} {booking.last_name}</span>?
        </p>

        <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200 mb-6">
          Værelset vil straks blive frigivet til nye reservationer. Reservationen forbliver i databasen med status <code className="text-rose-600 font-semibold">'cancelled'</code>.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isDeleting}
            className="text-sm px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
          >
            Fortryd
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="text-sm px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg shadow-sm disabled:opacity-50"
          >
            {isDeleting ? 'Aflyser...' : 'Ja, Aflys Reservation'}
          </button>
        </div>
      </div>
    </div>
  );
}
