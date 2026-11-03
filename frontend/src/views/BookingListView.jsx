/**
 * MVVM: View Layer - BookingListView (SH-20 / T020)
 * Implementerer de to midterste bokse fra Messenger-sketchen:
 * 1) Øverste midterboks: Søgebjælke med søgning på email, mobil nr., fornavn/efternavn og booking ID,
 *    samt farvekodet statusfiltrering og relevansindikator.
 * 2) Nederste midterboks: Rækker med fremsøgte bookinger sorteret med nyeste (created_at) først,
 *    hvor hver række tydeligt viser farvekode, Booking ID og kundens fulde navn.
 */

import React from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  Edit3,
  Trash2,
  AlertCircle,
  X,
  Clock,
  Sparkles
} from 'lucide-react';
import {
  BookingModel,
  STATUS_LABELS,
  getBookingMatchReason
} from '../models/BookingModel.js';
import { useBookingListViewModel } from '../viewmodels/useBookingListViewModel.js';
import EditBookingModal from '../components/EditBookingModal.jsx';
import DeleteDialog from '../components/DeleteDialog.jsx';

const COLOR_FILTER_PILLS = [
  {
    value: 'all',
    label: 'Alle',
    dotClass: 'bg-slate-800',
    activeClass: 'bg-slate-900 text-white border-slate-900 shadow-sm',
    inactiveClass: 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
  },
  {
    value: 'confirmed',
    label: 'Aktiv / Bekræftet (Gul)',
    dotClass: 'bg-amber-400',
    activeClass: 'bg-amber-200 text-amber-950 border-amber-500 font-bold shadow-sm',
    inactiveClass: 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
  },
  {
    value: 'checked_in',
    label: 'Indtjekket (Grøn)',
    dotClass: 'bg-emerald-500',
    activeClass: 'bg-emerald-200 text-emerald-950 border-emerald-600 font-bold shadow-sm',
    inactiveClass: 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
  },
  {
    value: 'completed',
    label: 'Gennemført (Blå)',
    dotClass: 'bg-sky-500',
    activeClass: 'bg-sky-200 text-sky-950 border-sky-600 font-bold shadow-sm',
    inactiveClass: 'bg-sky-50 text-sky-900 border-sky-300 hover:bg-sky-100'
  },
  {
    value: 'cancelled',
    label: 'Cancelled (Grå)',
    dotClass: 'bg-slate-400',
    activeClass: 'bg-slate-300 text-slate-900 border-slate-600 font-bold shadow-sm',
    inactiveClass: 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
  }
];

export default function BookingListView({
  viewModel: externalViewModel,
  refreshTrigger = 0,
  onEdit,
  onDelete,
  onSelectBooking
}) {
  const internalViewModel = useBookingListViewModel({
    refreshTrigger,
    onEdit,
    onDelete,
    enabled: !externalViewModel
  });

  const vm = externalViewModel || internalViewModel;

  const {
    bookings,
    statusCounts = { all: bookings.length, confirmed: 0, checked_in: 0, completed: 0, cancelled: 0 },
    selectedBooking,
    isLoading,
    error,
    searchQuery,
    statusFilter,
    fromDate,
    toDate,
    editingBooking,
    deletingBooking,
    setSearchQuery,
    setStatusFilter,
    setFromDate,
    setToDate,
    selectBooking,
    clearFilters,
    openEditModal,
    closeEditModal,
    openDeleteDialog,
    closeDeleteDialog,
    onBookingUpdated,
    onBookingDeleted,
    refreshBookings
  } = vm;

  const hasActiveFilters = Boolean(
    searchQuery.trim() || (statusFilter && statusFilter !== 'all') || fromDate || toDate
  );

  const handleRowSelect = (booking) => {
    if (typeof selectBooking === 'function') {
      selectBooking(booking);
    }
    if (typeof onSelectBooking === 'function') {
      onSelectBooking(booking);
    }
  };

  return (
    <div aria-label="Booking søgning og resultatliste" className="flex flex-col gap-4 h-full">
      {/* ØVERSTE MIDTERBOKS: Søgebjælke med farvekode-filtrering og søgekriterier */}
      <section
        aria-label="Søgebjælke og statusfilter"
        className="bg-white rounded-lg border-2 border-slate-800 p-4 shadow-sm space-y-3"
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Søg i Bookinger
            </h2>
            <p className="text-xs text-slate-500">
              Søg på booking ID, fornavn/efternavn, e-mail eller mobil nr.
            </p>
          </div>

          <button
            type="button"
            onClick={refreshBookings}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 border border-slate-300 rounded-md text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 transition"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-600' : 'text-slate-500'}`}
            />
            <span>{isLoading ? 'Henter...' : 'Opdater'}</span>
          </button>
        </div>

        {/* Søgefelt + Status Dropdown */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              aria-label="Søg i bookinger"
              placeholder="Søg på ID (#), fornavn/efternavn, email eller mobil nr..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Ryd søgefelt"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Dropdown for statusfilter */}
          <div className="relative shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              aria-label="Filtrér på bookingstatus"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto text-xs font-medium border-2 border-slate-300 rounded-lg pl-8 pr-7 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
            >
              <option value="all">Alle statusser ({statusCounts.all})</option>
              <option value="confirmed">Gul: Aktiv / Bekræftet ({statusCounts.confirmed})</option>
              <option value="checked_in">Grøn: Indtjekket ({statusCounts.checked_in})</option>
              <option value="completed">Blå: Gennemført / Udtjekket ({statusCounts.completed})</option>
              <option value="cancelled">Grå: Cancelled / Annulleret ({statusCounts.cancelled})</option>
            </select>
          </div>
        </div>

        {/* Farvekode-knapper i søgebjælken (både til farvekode-overblik og 1-kliks filtreret søgning) */}
        <div className="pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {COLOR_FILTER_PILLS.map((pill) => {
              const isSelected = (statusFilter || 'all') === pill.value;
              const count = statusCounts[pill.value] ?? 0;
              return (
                <button
                  key={pill.value}
                  type="button"
                  onClick={() => setStatusFilter(pill.value)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition ${
                    isSelected ? pill.activeClass : pill.inactiveClass
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${pill.dotClass}`} />
                  <span>{pill.label}</span>
                  <span className="text-[11px] opacity-80">({count})</span>
                </button>
              );
            })}

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="ml-auto text-xs font-semibold text-amber-800 hover:text-amber-950 underline px-1.5 py-0.5"
              >
                Nulstil
              </button>
            )}
          </div>
        </div>

        {/* Kompakt datointerval-filter hvis receptionisten vil indsnævre periode */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Sorteret: <strong>Nyeste oprettede bookinger først</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400">Periode:</span>
            <input
              type="date"
              aria-label="Fra dato"
              value={fromDate || ''}
              onChange={(e) => setFromDate && setFromDate(e.target.value)}
              className="text-xs border border-slate-200 rounded px-1.5 py-0.5 bg-slate-50 text-slate-700"
            />
            <span>–</span>
            <input
              type="date"
              aria-label="Til dato"
              value={toDate || ''}
              onChange={(e) => setToDate && setToDate(e.target.value)}
              className="text-xs border border-slate-200 rounded px-1.5 py-0.5 bg-slate-50 text-slate-700"
            />
          </div>
        </div>
      </section>

      {/* NEDERSTE MIDTERBOKS: Rækker med fremsøgte bookinger (Booking ID + Kundens fulde navn + Farvekode) */}
      <section
        aria-label="Fremsøgte bookinger"
        className="bg-white rounded-lg border-2 border-slate-800 shadow-sm flex-1 flex flex-col overflow-hidden min-h-[340px]"
      >
        <div className="px-4 py-2.5 bg-slate-900 text-white flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-6">
            <span className="w-20">BOOKING ID</span>
            <span>KUNDENS FULDE NAVN</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-slate-300">OPRETTET (NYESTE FØRST)</span>
            <span className="bg-amber-500/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded">
              {bookings.length} {bookings.length === 1 ? 'række' : 'rækker'}
            </span>
          </div>
        </div>

        {/* Fejlbesked ved API-fejl */}
        {error && (
          <div
            role="alert"
            className="m-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={refreshBookings}
              className="font-semibold underline hover:text-rose-900 shrink-0"
            >
              Prøv igen
            </button>
          </div>
        )}

        {/* Rækkeliste under søgebaren */}
        <div className="divide-y divide-slate-200 overflow-y-auto max-h-[430px] flex-1">
          {isLoading && bookings.length === 0 ? (
            <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-600" />
              <span className="text-sm font-medium">Indlæser bookinger...</span>
            </div>
          ) : bookings.length === 0 ? (
            <div className="py-12 px-4 text-center text-slate-500 flex flex-col items-center justify-center gap-1.5">
              <p className="text-sm font-semibold text-slate-700">Ingen bookinger fundet</p>
              <p className="text-xs text-slate-400">
                Ingen bookinger matcher dine søgekriterier ({searchQuery || STATUS_LABELS[statusFilter] || 'filter'}).
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-2 text-xs font-semibold text-amber-700 hover:text-amber-900 underline"
                >
                  Vis alle bookinger
                </button>
              )}
            </div>
          ) : (
            bookings.map((rawBooking) => {
              const booking =
                rawBooking instanceof BookingModel ? rawBooking : new BookingModel(rawBooking);
              const isSelected =
                selectedBooking && String(selectedBooking.id) === String(booking.id);
              const matchReason = getBookingMatchReason(booking, searchQuery);

              return (
                <div
                  key={booking.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleRowSelect(booking)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleRowSelect(booking);
                    }
                  }}
                  className={`px-4 py-3 flex items-center justify-between gap-3 cursor-pointer transition ${
                    booking.statusRowClass
                  } ${
                    isSelected
                      ? 'ring-2 ring-inset ring-slate-900 font-semibold'
                      : ''
                  }`}
                >
                  {/* Venstre del af rækken: Farvekode-prik + Booking ID + Kundens fulde navn */}
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="flex items-center gap-2 w-20 shrink-0">
                      <span
                        className={`w-3 h-3 rounded-full shrink-0 border border-black/10 ${booking.statusDotClass}`}
                        title={`Status: ${booking.statusLabel}`}
                      />
                      <span className="font-mono text-sm font-bold text-slate-900">
                        #{booking.id}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-sm font-bold truncate ${
                            booking.isCancelled ? 'line-through text-slate-500' : 'text-slate-900'
                          }`}
                        >
                          {booking.guest_name}
                        </span>

                        {/* Relevans-badge ved aktiv søgning */}
                        {matchReason && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-200/80 text-amber-950 border border-amber-400">
                            <Sparkles className="w-2.5 h-2.5" />
                            {matchReason}
                          </span>
                        )}
                      </div>

                      {/* Sekundær linje til hurtig verifikation ved søgning på email/mobil */}
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 truncate">
                        {booking.email && <span className="truncate">{booking.email}</span>}
                        {booking.phone && (
                          <>
                            <span>•</span>
                            <span className="font-mono">{booking.phone}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Højre del af rækken: Oprettelsesdato + Farvekodet statusbadge + 1-kliks knapper */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="hidden md:inline-block text-[11px] font-mono text-slate-500"
                      title="Dato hvor kunden lavede bookingen"
                    >
                      {booking.formattedCreatedAt !== '—'
                        ? booking.formattedCreatedAt
                        : booking.check_in_date}
                    </span>

                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${booking.statusColorClass}`}
                    >
                      {booking.statusLabel}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRowSelect(booking);
                        if (typeof onEdit === 'function') {
                          onEdit(booking);
                        } else {
                          openEditModal(booking);
                        }
                      }}
                      title="Rediger booking med 1 klik"
                      className="p-1.5 text-amber-800 bg-amber-100/80 hover:bg-amber-200 border border-amber-300 rounded-md transition"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteDialog(booking);
                      }}
                      disabled={booking.isCancelled}
                      title="Slet / aflys booking"
                      className="p-1.5 text-rose-700 bg-rose-100/80 hover:bg-rose-200 border border-rose-300 rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer i rækkeboksen */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <span>
            Viser <strong className="text-slate-800">{bookings.length}</strong> fremsøgte bookinger (nyeste først)
          </span>
          <span>Klik på en række for at se/redigere</span>
        </div>
      </section>

      {/* EditBookingModal koblet til Rediger-knap med automatisk refresh (SH-27 / T027) */}
      {editingBooking && (
        <EditBookingModal
          booking={editingBooking}
          onSuccess={onBookingUpdated}
          onCancel={closeEditModal}
        />
      )}

      {/* DeleteDialog koblet til Slet-knap (SH-32 / T032) */}
      {deletingBooking && (
        <DeleteDialog
          booking={deletingBooking}
          onSuccess={onBookingDeleted}
          onCancel={closeDeleteDialog}
        />
      )}
    </div>
  );
}
