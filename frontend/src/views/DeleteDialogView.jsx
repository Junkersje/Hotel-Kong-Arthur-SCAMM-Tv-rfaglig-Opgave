/**
 * MVVM: View Layer - DeleteDialogView (SH-31 / T031)
 * Præsenterer bekræftelsesdialog ("Er du sikker på, at du vil aflyse denne reservation?")
 * med knapperne "Annuller" og "Ja, aflys reservation" før soft delete udføres.
 */

import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { getGuestDisplayName, formatDate } from '../models/BookingModel.js';
import { useDeleteBookingViewModel } from '../viewmodels/useDeleteBookingViewModel.js';

export default function DeleteDialogView({ booking, onSuccess, onCancel }) {
  const {
    isDeleting,
    error,
    handleConfirm,
    handleCancel
  } = useDeleteBookingViewModel(booking, onSuccess, onCancel);

  if (!booking) return null;

  const guestName = getGuestDisplayName(booking);
  const checkIn = formatDate(booking.check_in_date);
  const checkOut = formatDate(booking.check_out_date);

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-booking-dialog-title"
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 p-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 id="delete-booking-dialog-title" className="text-lg font-bold text-slate-900">
                Aflys Reservation
              </h3>
              <p className="text-xs text-slate-500">
                Soft delete — reservationen markeres som <code className="font-mono">cancelled</code>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isDeleting}
            aria-label="Luk dialog"
            className="text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-slate-700 mb-3">
          Er du sikker på, at du vil aflyse denne reservation{' '}
          <strong className="text-slate-900">#{booking.id}</strong> for{' '}
          <strong className="text-slate-900">{guestName}</strong>?
        </p>

        <div className="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-lg border border-slate-200 mb-5 space-y-1">
          <div>
            <span className="text-slate-400">Periode:</span> {checkIn} &rarr; {checkOut}
          </div>
          {booking.room_type_name && (
            <div>
              <span className="text-slate-400">Værelse:</span> {booking.room_type_name}
              {booking.room_number ? ` (Vær. ${booking.room_number})` : ''}
            </div>
          )}
          <p className="pt-1 text-slate-500">
            Værelset frigives straks til nye bookinger, mens rækken bevares i MySQL med status{' '}
            <code className="text-rose-600 font-semibold">&apos;cancelled&apos;</code>.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg"
          >
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isDeleting}
            className="text-sm font-medium px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition"
          >
            Annuller
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm disabled:opacity-50 transition"
          >
            <Trash2 className="w-4 h-4" />
            <span>{isDeleting ? 'Aflyser...' : 'Ja, aflys reservation'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
