/**
 * MVVM: View Layer - EditBookingModalView
 * Præsenterer redigeringsdialogen for en booking.
 * Delegerer data og handlinger til useEditBookingViewModel.
 */

import React from 'react';
import { useEditBookingViewModel } from '../viewmodels/useEditBookingViewModel.js';
import { formatCurrency } from '../models/BookingModel.js';

export default function EditBookingModalView({ booking, onSuccess, onCancel }) {
  const {
    formData,
    errors,
    isSubmitting,
    apiError,
    nights,
    estimatedPrice,
    roomTypes,
    handleChange,
    handleSubmit,
    handleCancel
  } = useEditBookingViewModel(booking, onSuccess, onCancel);

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Redigér Reservation #{booking.id}
            </h3>
            <p className="text-xs text-slate-500">Opdater datoer, gæsteoplysninger eller værelsestype</p>
          </div>
          <button
            onClick={handleCancel}
            className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
          >
            &times;
          </button>
        </div>

        {apiError && (
          <div className="m-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Gæst Fornavn</label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Gæst Efternavn</label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">E-mail</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-amber-500"
              >
                <option value="confirmed">Bekræftet</option>
                <option value="checked_in">Indtjekket</option>
                <option value="checked_out">Udtjekket</option>
                <option value="cancelled">Annulleret</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Værelsestype</label>
              <select
                name="room_type_id"
                value={formData.room_type_id}
                onChange={handleChange}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-amber-500"
              >
                {roomTypes.map(rt => (
                  <option key={rt.id} value={rt.id}>{rt.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Antal Gæster</label>
              <select
                name="num_guests"
                value={formData.num_guests}
                onChange={handleChange}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-amber-500"
              >
                <option value="1">1 person</option>
                <option value="2">2 personer</option>
                <option value="3">3 personer</option>
                <option value="4">4 personer</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Ankomstdato</label>
              <input
                type="date"
                name="check_in_date"
                value={formData.check_in_date}
                onChange={handleChange}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
              />
              {errors.check_in_date && <p className="text-xs text-rose-600 mt-1">{errors.check_in_date}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Afrejsedato</label>
              <input
                type="date"
                name="check_out_date"
                value={formData.check_out_date}
                onChange={handleChange}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
              />
              {errors.check_out_date && <p className="text-xs text-rose-600 mt-1">{errors.check_out_date}</p>}
            </div>
          </div>

          {nights > 0 && (
            <div className="bg-amber-50 rounded-lg p-3 text-xs text-amber-900 flex justify-between items-center border border-amber-200">
              <span>{nights} {nights === 1 ? 'overnatning' : 'overnatninger'}</span>
              <span className="font-bold">Beregnet ny pris: {formatCurrency(estimatedPrice)}</span>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={handleCancel}
              className="text-sm px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
            >
              Annuller
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="text-sm px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Gemmer...' : 'Gem Ændringer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
