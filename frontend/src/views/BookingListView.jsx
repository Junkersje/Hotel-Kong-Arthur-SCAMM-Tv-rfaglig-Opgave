/**
 * MVVM: View Layer - BookingListView (SH-20 / T020)
 * Præsenterer interaktiv bookingtabel med søgefelt, statusfilter, loading-state og handlingsknapper.
 * Indeholder ingen direkte API-kald eller forretningslogik — alt tilstandsflow går gennem ViewModel.
 */

import React from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  Edit3,
  Trash2,
  Calendar,
  Users,
  BedDouble,
  AlertCircle,
  X
} from 'lucide-react';
import {
  STATUS_LABELS,
  STATUS_COLORS,
  formatCurrency,
  formatDate,
  calculateNights,
  getGuestDisplayName,
  getBookingTotalPrice
} from '../models/BookingModel.js';
import { useBookingListViewModel } from '../viewmodels/useBookingListViewModel.js';
import EditBookingModal from '../components/EditBookingModal.jsx';
import DeleteDialog from '../components/DeleteDialog.jsx';

export default function BookingListView({
  viewModel: externalViewModel,
  refreshTrigger = 0,
  onEdit,
  onDelete
}) {
  const internalViewModel = useBookingListViewModel({
    refreshTrigger,
    onEdit,
    onDelete
  });

  const vm = externalViewModel || internalViewModel;

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
    clearFilters,
    openEditModal,
    closeEditModal,
    openDeleteDialog,
    closeDeleteDialog,
    onBookingUpdated,
    onBookingDeleted,
    refreshBookings
  } = vm;

  const hasActiveFilters = Boolean(searchQuery.trim() || statusFilter);

  return (
    <section
      aria-label="Bookingoversigt"
      className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
    >
      {/* Header med titel, søgefelt og statusfilter */}
      <div className="p-6 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Aktuelle Reservationer</h2>
          <p className="text-sm text-slate-500">
            Fremsøg og filtrér reservationer på booking-ID, gæstens navn eller status
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Søge-inputfelt */}
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              aria-label="Søg i bookinger"
              placeholder="Søg på ID eller gæstens navn..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 pl-9 pr-8 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-amber-600 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Ryd søgefelt"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Dropdown for statusfilter */}
          <div className="relative">
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              aria-label="Filtrér på bookingstatus"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm border border-slate-300 rounded-lg pl-8 pr-8 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-amber-600 transition"
            >
              <option value="">Alle statusser</option>
              <option value="confirmed">Bekræftet (confirmed)</option>
              <option value="checked_in">Indtjekket (checked_in)</option>
              <option value="checked_out">Udtjekket (checked_out)</option>
              <option value="cancelled">Annulleret (cancelled)</option>
            </select>
          </div>

          {/* Nulstil filtre knap hvis filtre er aktive */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-medium px-3 py-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
              Nulstil filter
            </button>
          )}

          {/* Opdater-knap */}
          <button
            type="button"
            onClick={refreshBookings}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 border border-slate-300 rounded-lg text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 transition shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-600' : 'text-slate-500'}`} />
            <span>{isLoading ? 'Henter...' : 'Opdater'}</span>
          </button>
        </div>
      </div>

      {/* Fejlbesked ved API-fejl */}
      {error && (
        <div
          role="alert"
          className="m-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={refreshBookings}
            className="text-xs font-semibold underline hover:text-rose-900 shrink-0"
          >
            Prøv igen
          </button>
        </div>
      )}

      {/* Bookingtabel */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-xs tracking-wider font-semibold">
              <th className="py-3.5 px-4">Booking ID</th>
              <th className="py-3.5 px-4">Gæstens navn</th>
              <th className="py-3.5 px-4">Værelsestype</th>
              <th className="py-3.5 px-4">Værelsesnr.</th>
              <th className="py-3.5 px-4">Ankomst</th>
              <th className="py-3.5 px-4">Afrejse</th>
              <th className="py-3.5 px-4">Gæster</th>
              <th className="py-3.5 px-4">Pris</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Handlinger</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 text-slate-700">
            {isLoading && bookings.length === 0 ? (
              <tr>
                <td colSpan="10" className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-amber-600" />
                    <span className="font-medium">Indlæser bookinger...</span>
                  </div>
                </td>
              </tr>
            ) : bookings.length === 0 ? (
              <tr>
                <td colSpan="10" className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <p className="font-semibold text-slate-700">Ingen bookinger fundet</p>
                    <p className="text-xs text-slate-400">
                      Ingen resultater fundet for de valgte søgekriterier.
                    </p>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="mt-2 text-xs font-medium text-amber-700 hover:text-amber-900 underline"
                      >
                        Ryd søgning og filtre
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              bookings.map((booking) => {
                const guestName = getGuestDisplayName(booking);
                const checkIn = formatDate(booking.check_in_date);
                const checkOut = formatDate(booking.check_out_date);
                const nights = booking.nights ?? calculateNights(checkIn, checkOut);
                const totalPrice = getBookingTotalPrice(booking);
                const statusColor =
                  STATUS_COLORS[booking.status] || 'bg-slate-100 text-slate-800 border-slate-200';
                const statusLabel = STATUS_LABELS[booking.status] || booking.status;
                const isCancelled = booking.status === 'cancelled';

                return (
                  <tr key={booking.id} className="hover:bg-slate-50/80 transition">
                    {/* Booking ID */}
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 whitespace-nowrap">
                      #{booking.id}
                    </td>

                    {/* Gæstens navn, email & land */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{guestName}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-2">
                        {booking.country && <span>{booking.country}</span>}
                        {booking.email && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[180px]">{booking.email}</span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Værelsestype */}
                    <td className="py-3.5 px-4">
                      <div className="inline-flex items-center gap-1.5 font-medium text-slate-900">
                        <BedDouble className="w-4 h-4 text-amber-700 shrink-0" />
                        <span>{booking.room_type_name || `Type #${booking.room_type_id}`}</span>
                      </div>
                    </td>

                    {/* Værelsesnr. */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {booking.room_number ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          Vær. {booking.room_number}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Ikke tildelt</span>
                      )}
                    </td>

                    {/* Ankomst */}
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-700 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{checkIn}</span>
                      </div>
                    </td>

                    {/* Afrejse */}
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-700 whitespace-nowrap">
                      <div>{checkOut}</div>
                      {nights > 0 && (
                        <div className="text-[11px] font-sans text-slate-400">
                          {nights} {nights === 1 ? 'nat' : 'nætter'}
                        </div>
                      )}
                    </td>

                    {/* Antal gæster */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1 text-xs text-slate-700">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>{booking.num_guests || 1} pers.</span>
                      </div>
                    </td>

                    {/* Pris */}
                    <td className="py-3.5 px-4 font-medium text-slate-900 whitespace-nowrap">
                      {formatCurrency(totalPrice)}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColor}`}
                      >
                        {statusLabel}
                      </span>
                    </td>

                    {/* Handlingsknapper (Rediger, Slet) */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(booking)}
                          disabled={isCancelled}
                          title="Rediger booking"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Rediger</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openDeleteDialog(booking)}
                          disabled={isCancelled}
                          title="Slet eller aflys booking"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Slet</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Tabel-footer med antal visninger */}
      <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
        <span>
          Viser <strong className="text-slate-700">{bookings.length}</strong>{' '}
          {bookings.length === 1 ? 'reservation' : 'reservationer'}
        </span>
        {hasActiveFilters && (
          <span>
            Aktive filtre:{' '}
            {searchQuery.trim() && <strong className="text-slate-700">&ldquo;{searchQuery.trim()}&rdquo;</strong>}
            {searchQuery.trim() && statusFilter && ' • '}
            {statusFilter && <strong className="text-slate-700">{STATUS_LABELS[statusFilter] || statusFilter}</strong>}
          </span>
        )}
      </div>

      {/* EditBookingModal koblet til Rediger-knap med automatisk refresh (SH-27 / T027) */}
      {editingBooking && (
        <EditBookingModal
          booking={editingBooking}
          onSuccess={onBookingUpdated}
          onCancel={closeEditModal}
        />
      )}

      {/* DeleteDialog koblet til Slet-knap med øjeblikkelig fjernelse fra aktiv liste (SH-32 / T032) */}
      {deletingBooking && (
        <DeleteDialog
          booking={deletingBooking}
          onSuccess={onBookingDeleted}
          onCancel={closeDeleteDialog}
        />
      )}
    </section>
  );
}
