/**
 * MVVM: View Layer - EditBookingModalView (SH-26 / T026)
 * Præsenterer modal-dialog med præ-udfyldte bookingfelter, datovalidering,
 * advarsel ved forlænget ophold samt beregnet prisforskel.
 */

import React from 'react';
import { X, AlertTriangle, Calendar, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '../models/BookingModel.js';
import { useEditBookingViewModel } from '../viewmodels/useEditBookingViewModel.js';

export default function EditBookingModalView({ booking, onSuccess, onCancel }) {
  const {
    formData,
    roomTypes,
    nights,
    initialNights,
    initialTotalPrice,
    estimatedPrice,
    priceDifference,
    isStayExtended,
    errors,
    serverError,
    isSubmitting,
    handleChange,
    handleSubmit,
    handleCancel
  } = useEditBookingViewModel(booking, onSuccess, onCancel);

  if (!booking) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-booking-modal-title"
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white">
          <div>
            <h3 id="edit-booking-modal-title" className="text-lg font-bold">
              Redigér Booking #{booking.id}
            </h3>
            <p className="text-xs text-slate-400">
              Opdatér gæsteoplysninger, værelsestype eller opholdsperiode
            </p>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            aria-label="Luk modal"
            className="text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formular */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          {serverError && (
            <div
              role="alert"
              className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg"
            >
              {serverError}
            </div>
          )}

          {/* Fornavn og Efternavn */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Fornavn
              </label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-600"
              />
              {errors.first_name && (
                <p className="text-xs text-rose-600 mt-1">{errors.first_name}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Efternavn
              </label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-600"
              />
              {errors.last_name && (
                <p className="text-xs text-rose-600 mt-1">{errors.last_name}</p>
              )}
            </div>
          </div>

          {/* E-mail og Telefon */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                E-mail
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-600"
              />
              {errors.email && (
                <p className="text-xs text-rose-600 mt-1">{errors.email}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Telefon
              </label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-600"
              />
            </div>
          </div>

          {/* Land og Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Land
              </label>
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleChange}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-600"
              >
                <option value="confirmed">Bekræftet (confirmed)</option>
                <option value="checked_in">Indtjekket (checked_in)</option>
                <option value="checked_out">Udtjekket (checked_out)</option>
                <option value="cancelled">Annulleret (cancelled)</option>
              </select>
            </div>
          </div>

          {/* Værelsestype og Antal Gæster */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Værelsestype
              </label>
              <select
                name="room_type_id"
                value={formData.room_type_id}
                onChange={handleChange}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-600"
              >
                {roomTypes.map((rt) => (
                  <option key={rt.id} value={rt.id}>
                    {rt.name} (Maks. {rt.capacity} pers.)
                  </option>
                ))}
              </select>
              {errors.room_type_id && (
                <p className="text-xs text-rose-600 mt-1">{errors.room_type_id}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Antal Gæster
              </label>
              <select
                name="num_guests"
                value={formData.num_guests}
                onChange={handleChange}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-600"
              >
                <option value="1">1 person</option>
                <option value="2">2 personer</option>
                <option value="3">3 personer</option>
                <option value="4">4 personer</option>
              </select>
              {errors.num_guests && (
                <p className="text-xs text-rose-600 mt-1">{errors.num_guests}</p>
              )}
            </div>
          </div>

          {/* Ankomst- og Afrejsedato */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Ankomstdato
              </label>
              <input
                type="date"
                name="check_in_date"
                value={formData.check_in_date}
                onChange={handleChange}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-600"
              />
              {errors.check_in_date && (
                <p className="text-xs text-rose-600 mt-1">{errors.check_in_date}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Afrejsedato
              </label>
              <input
                type="date"
                name="check_out_date"
                value={formData.check_out_date}
                onChange={handleChange}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-600"
              />
              {errors.check_out_date && (
                <p className="text-xs text-rose-600 mt-1">{errors.check_out_date}</p>
              )}
            </div>
          </div>

          {/* Advarsel hvis datoerne forlænges */}
          {isStayExtended && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg flex items-start gap-2.5 text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Opholdet forlænges ({initialNights} &rarr; {nights} nætter)</p>
                <p className="text-amber-800 mt-0.5">
                  Bemærk: Forlængelsen medfører en merpris på{' '}
                  <strong>+{formatCurrency(Math.max(0, priceDifference))}</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Beregnet totalpris og prisforskel */}
          {nights > 0 && (
            <div className="bg-slate-50 rounded-lg p-3.5 text-xs text-slate-700 border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-slate-600">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Varighed: <strong>{nights}</strong> {nights === 1 ? 'overnatning' : 'overnatninger'}
                  </span>
                </span>
                <span className="text-slate-500">
                  Tidligere pris: {formatCurrency(initialTotalPrice)}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1.5 border-t border-slate-200">
                <span className="font-semibold text-slate-900">
                  Beregnet ny totalpris: {formatCurrency(estimatedPrice)}
                </span>
                <span
                  className={`font-semibold ${
                    priceDifference > 0
                      ? 'text-amber-700'
                      : priceDifference < 0
                      ? 'text-emerald-700'
                      : 'text-slate-500'
                  }`}
                >
                  Prisforskel: {priceDifference > 0 ? '+' : ''}
                  {formatCurrency(priceDifference)}
                </span>
              </div>
            </div>
          )}

          {/* Knapper */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="text-sm font-medium px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition"
            >
              Annuller
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 text-sm font-semibold px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm disabled:opacity-50 transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Gemmer...' : 'Gem ændringer'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
