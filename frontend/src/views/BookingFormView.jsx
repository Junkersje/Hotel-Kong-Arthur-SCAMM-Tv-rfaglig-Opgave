/**
 * MVVM: View Layer - BookingFormView
 * Præsenterer formularen til registrering af nye reservationer.
 * Delegerer all tilstand og validering til useBookingFormViewModel.
 */

import React from 'react';
import { useBookingFormViewModel } from '../viewmodels/useBookingFormViewModel.js';
import { formatCurrency } from '../models/BookingModel.js';

export default function BookingFormView({ onBookingCreated }) {
  const {
    formData,
    errors,
    isSubmitting,
    apiError,
    successMessage,
    nights,
    estimatedPrice,
    roomTypes,
    handleChange,
    handleSubmit,
    resetForm
  } = useBookingFormViewModel(onBookingCreated);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
      <div className="border-b border-slate-200 pb-4 mb-6">
        <h2 className="text-xl font-bold text-slate-900">Opret Ny Reservation</h2>
        <p className="text-sm text-slate-500">Registrér gæst, værelsestype og ankomstperiode i overensstemmelse med hotellets kapacitet (214 værelser)</p>
      </div>

      {apiError && (
        <div className="mb-4 p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg">
          {apiError}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg">
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Række 1: Gæsteoplysninger */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Fornavn *</label>
            <input
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              placeholder="F.eks. Mette"
              className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 ${errors.first_name ? 'border-rose-400' : 'border-slate-300'}`}
            />
            {errors.first_name && <p className="text-xs text-rose-600 mt-1">{errors.first_name}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Efternavn *</label>
            <input
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              placeholder="F.eks. Frederiksen"
              className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 ${errors.last_name ? 'border-rose-400' : 'border-slate-300'}`}
            />
            {errors.last_name && <p className="text-xs text-rose-600 mt-1">{errors.last_name}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">E-mail *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="mette@example.dk"
              className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 ${errors.email ? 'border-rose-400' : 'border-slate-300'}`}
            />
            {errors.email && <p className="text-xs text-rose-600 mt-1">{errors.email}</p>}
          </div>
        </div>

        {/* Række 2: Kontakt & Nationalitet */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Telefon</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+45 12 34 56 78"
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Gæstens Land</label>
            <input
              type="text"
              name="country"
              value={formData.country}
              onChange={handleChange}
              placeholder="Danmark"
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Antal Gæster (1-4) *</label>
            <select
              name="num_guests"
              value={formData.num_guests}
              onChange={handleChange}
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="1">1 person</option>
              <option value="2">2 personer</option>
              <option value="3">3 personer</option>
              <option value="4">4 personer</option>
            </select>
          </div>
        </div>

        {/* Række 3: Værelsestype & Datoer */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Værelsestype (8 officielle) *</label>
            <select
              name="room_type_id"
              value={formData.room_type_id}
              onChange={handleChange}
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {roomTypes.map(rt => (
                <option key={rt.id} value={rt.id}>
                  {rt.name} (fra {formatCurrency(rt.basePrice)}/nat)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Ankomstdato *</label>
            <input
              type="date"
              name="check_in_date"
              value={formData.check_in_date}
              onChange={handleChange}
              className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 ${errors.check_in_date ? 'border-rose-400' : 'border-slate-300'}`}
            />
            {errors.check_in_date && <p className="text-xs text-rose-600 mt-1">{errors.check_in_date}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Afrejsedato *</label>
            <input
              type="date"
              name="check_out_date"
              value={formData.check_out_date}
              onChange={handleChange}
              className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 ${errors.check_out_date ? 'border-rose-400' : 'border-slate-300'}`}
            />
            {errors.check_out_date && <p className="text-xs text-rose-600 mt-1">{errors.check_out_date}</p>}
          </div>
        </div>

        {/* Forhåndsvisning af overnatninger og pris */}
        {nights > 0 && (
          <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 flex items-center justify-between">
            <div>
              <span className="font-semibold">{nights} {nights === 1 ? 'overnatning' : 'overnatninger'}</span> valgt.
            </div>
            <div className="text-sm font-bold text-amber-950">
              Estimeret pris: {formatCurrency(estimatedPrice)}
            </div>
          </div>
        )}

        {/* Handlingsknapper */}
        <div className="flex justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={resetForm}
            className="text-sm px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition"
          >
            Nulstil
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="text-sm px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
          >
            {isSubmitting ? 'Opretter reservation...' : 'Bekræft & Opret Booking'}
          </button>
        </div>
      </form>
    </div>
  );
}
