/**
 * MVVM: ViewModel Layer - useBookingListViewModel
 * Knytter BookingModel og API-servicen sammen med BookingListView (SH-20 / T020).
 * Håndterer debounced søgetilstand, statusfiltrering, modalstyring og asynkron datahentning.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiGet } from '../services/api.js';
import {
  BookingModel,
  filterBookingsList,
  sortBookingsByNewest
} from '../models/BookingModel.js';

const DEBOUNCE_DELAY_MS = 250;
const LOCAL_OVERRIDES_KEY = 'hka_booking_overrides_v1';

function loadLocalOverrides() {
  try {
    const raw = localStorage.getItem(LOCAL_OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveLocalBookingOverride(id, patch) {
  if (id === undefined || id === null) return;
  try {
    const current = loadLocalOverrides();
    current[String(id)] = { ...(current[String(id)] || {}), ...patch };
    localStorage.setItem(LOCAL_OVERRIDES_KEY, JSON.stringify(current));
  } catch {
    // Ignorer hvis localStorage ikke er tilgængelig
  }
}

export function useBookingListViewModel(options = {}) {
  const { refreshTrigger = 0, onEdit, onDelete, enabled = true } = options;

  const [rawBookings, setRawBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Valgt booking i sketchens højre detaljeboks & venstre redigeringsboks
  const [selectedBookingId, setSelectedBookingId] = useState(null);

  // Modal-/dialogtilstande (kobles til EditBookingModal i T027 og DeleteDialog i T032)
  const [editingBooking, setEditingBooking] = useState(null);
  const [deletingBooking, setDeletingBooking] = useState(null);

  const fetchBookings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = { limit: 100 };

      if (fromDate) {
        params.from = fromDate;
      }
      if (toDate) {
        params.to = toDate;
      }

      const response = await apiGet('/bookings', params);
      const list = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.bookings)
        ? response.bookings
        : [];

      const overrides = loadLocalOverrides();
      const mapped = list.map((item) => {
        const patch = overrides[String(item.id)] || {};
        return new BookingModel({ ...item, ...patch });
      });

      setRawBookings(sortBookingsByNewest(mapped));
    } catch (err) {
      setError(err.message || 'Kunne ikke hente bookinger fra serveren.');
      setRawBookings([]);
    } finally {
      setIsLoading(false);
    }
  }, [fromDate, toDate]);

  // Debounced API-kald ved ændring i datointerval eller ekstern refreshTrigger
  useEffect(() => {
    if (!enabled) return undefined;

    const timer = setTimeout(() => {
      fetchBookings();
    }, DEBOUNCE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [enabled, fetchBookings, refreshTrigger]);

  // Filtrerer på søgekriterier (ID, fulde navn, fornavn/efternavn, email, mobil nr.) og status, sorteret med nyeste først
  const bookings = useMemo(() => {
    const filtered = filterBookingsList(rawBookings, {
      searchQuery,
      statusFilter,
      fromDate,
      toDate,
      includeCancelled: statusFilter === 'all' || statusFilter === 'cancelled'
    });
    return sortBookingsByNewest(filtered);
  }, [rawBookings, searchQuery, statusFilter, fromDate, toDate]);

  // Optælling pr. status til farvekodede filtre i søgebjælken
  const statusCounts = useMemo(() => {
    const baseMatches = filterBookingsList(rawBookings, {
      searchQuery,
      statusFilter: 'all',
      fromDate,
      toDate,
      includeCancelled: true
    });

    const counts = {
      all: baseMatches.length,
      confirmed: 0,
      checked_in: 0,
      completed: 0,
      cancelled: 0
    };

    for (const b of baseMatches) {
      if (b.status === 'confirmed') counts.confirmed += 1;
      else if (b.status === 'checked_in') counts.checked_in += 1;
      else if (b.status === 'completed' || b.status === 'checked_out') counts.completed += 1;
      else if (b.status === 'cancelled') counts.cancelled += 1;
    }

    return counts;
  }, [rawBookings, searchQuery, fromDate, toDate]);

  // Sikr at der altid er en valgt booking når listen har elementer
  const selectedBooking = useMemo(() => {
    if (!bookings.length) return null;
    if (selectedBookingId !== null) {
      const found = bookings.find((b) => String(b.id) === String(selectedBookingId));
      if (found) return found;
    }
    return bookings[0];
  }, [bookings, selectedBookingId]);

  const selectBooking = useCallback((bookingOrId) => {
    const id = typeof bookingOrId === 'object' ? bookingOrId?.id : bookingOrId;
    setSelectedBookingId(id ?? null);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
    setFromDate('');
    setToDate('');
  }, []);

  const openEditModal = useCallback(
    (booking) => {
      setEditingBooking(booking);
      if (booking?.id !== undefined) {
        setSelectedBookingId(booking.id);
      }
      if (typeof onEdit === 'function') {
        onEdit(booking);
      }
    },
    [onEdit]
  );

  const closeEditModal = useCallback(() => {
    setEditingBooking(null);
  }, []);

  const openDeleteDialog = useCallback(
    (booking) => {
      setDeletingBooking(booking);
      if (booking?.id !== undefined) {
        setSelectedBookingId(booking.id);
      }
      if (typeof onDelete === 'function') {
        onDelete(booking);
      }
    },
    [onDelete]
  );

  const closeDeleteDialog = useCallback(() => {
    setDeletingBooking(null);
  }, []);

  const onBookingUpdated = useCallback(
    (updatedBooking) => {
      const targetId = updatedBooking?.id ?? editingBooking?.id ?? selectedBooking?.id;
      if (targetId !== undefined && updatedBooking) {
        saveLocalBookingOverride(targetId, updatedBooking);
        setRawBookings((prev) =>
          sortBookingsByNewest(
            prev.map((item) =>
              String(item.id) === String(targetId)
                ? new BookingModel({ ...item, ...updatedBooking })
                : item
            )
          )
        );
      }
      closeEditModal();
      fetchBookings();
    },
    [closeEditModal, editingBooking, selectedBooking, fetchBookings]
  );

  const onBookingDeleted = useCallback(
    (cancelledBooking) => {
      const targetId = cancelledBooking?.id ?? deletingBooking?.id ?? selectedBooking?.id;
      if (targetId !== undefined) {
        saveLocalBookingOverride(targetId, { status: 'cancelled' });
        setRawBookings((prev) =>
          sortBookingsByNewest(
            prev.map((item) =>
              String(item.id) === String(targetId)
                ? new BookingModel({ ...item, status: 'cancelled' })
                : item
            )
          )
        );
      }
      closeDeleteDialog();
      fetchBookings();
    },
    [closeDeleteDialog, deletingBooking, selectedBooking, fetchBookings]
  );

  const registerCreatedBooking = useCallback(
    (createdData) => {
      if (createdData?.id !== undefined) {
        saveLocalBookingOverride(createdData.id, createdData);
        const model = new BookingModel(createdData);
        setRawBookings((prev) => {
          const filtered = prev.filter((item) => String(item.id) !== String(model.id));
          return sortBookingsByNewest([model, ...filtered]);
        });
        setSelectedBookingId(model.id);
      }
      fetchBookings();
    },
    [fetchBookings]
  );

  return {
    // Observable State
    bookings,
    rawBookings,
    statusCounts,
    selectedBooking,
    isLoading,
    error,
    searchQuery,
    statusFilter,
    fromDate,
    toDate,
    editingBooking,
    deletingBooking,

    // Command Handlers
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
    registerCreatedBooking,
    refreshBookings: fetchBookings
  };
}

export default useBookingListViewModel;
