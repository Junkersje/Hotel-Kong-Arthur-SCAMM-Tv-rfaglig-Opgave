/**
 * MVVM: ViewModel Layer - useBookingListViewModel
 * Knytter BookingModel og API-servicen sammen med BookingListView (SH-20 / T020).
 * Håndterer debounced søgetilstand, statusfiltrering, modalstyring og asynkron datahentning.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiGet } from '../services/api.js';
import { BookingModel } from '../models/BookingModel.js';

const DEBOUNCE_DELAY_MS = 300;

export function useBookingListViewModel(options = {}) {
  const { refreshTrigger = 0, onEdit, onDelete, enabled = true } = options;

  const [rawBookings, setRawBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Modal-/dialogtilstande (kobles til EditBookingModal i T027 og DeleteDialog i T032)
  const [editingBooking, setEditingBooking] = useState(null);
  const [deletingBooking, setDeletingBooking] = useState(null);

  const fetchBookings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const trimmedQuery = searchQuery.trim();
      const params = {};

      if (trimmedQuery) {
        params.q = trimmedQuery;
      }
      if (statusFilter) {
        params.status = statusFilter;
      } else {
        params.exclude_cancelled = 'true';
      }
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

      setRawBookings(list.map((item) => new BookingModel(item)));
    } catch (err) {
      setError(err.message || 'Kunne ikke hente bookinger fra serveren.');
      setRawBookings([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter, fromDate, toDate]);

  // Debounced API-kald ved ændring i søgefelt, statusfilter, datointerval eller ekstern refreshTrigger
  useEffect(() => {
    if (!enabled) return undefined;

    const timer = setTimeout(() => {
      fetchBookings();
    }, DEBOUNCE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [enabled, fetchBookings, refreshTrigger]);

  // Sikrer at visningen altid matcher aktive filtre og ekskluderer 'cancelled' fra den aktive liste (medmindre 'cancelled' vælges i filteret)
  const bookings = useMemo(() => {
    return rawBookings.filter((booking) => {
      if (statusFilter) {
        if (statusFilter === 'completed') {
          if (booking.status !== 'completed' && booking.status !== 'checked_out') {
            return false;
          }
        } else if (booking.status !== statusFilter) {
          return false;
        }
      } else if (booking.status === 'cancelled') {
        // Fjernes fra den aktive liste ved soft delete (US4 / SH-32)
        return false;
      }

      if (fromDate && booking.check_out_date && booking.check_out_date < fromDate) {
        return false;
      }
      if (toDate && booking.check_in_date && booking.check_in_date > toDate) {
        return false;
      }

      const query = searchQuery.trim().toLowerCase();
      if (!query) {
        return true;
      }
      const idMatch = String(booking.id ?? '').toLowerCase().includes(query);
      const nameMatch = (booking.guest_name || '').toLowerCase().includes(query);
      const emailMatch = (booking.email || '').toLowerCase().includes(query);
      const roomMatch = String(booking.room_number ?? '').toLowerCase().includes(query);
      const roomTypeMatch = (booking.room_type_name || '').toLowerCase().includes(query);
      const countryMatch = (booking.country || '').toLowerCase().includes(query);

      return idMatch || nameMatch || emailMatch || roomMatch || roomTypeMatch || countryMatch;
    });
  }, [rawBookings, searchQuery, statusFilter, fromDate, toDate]);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('');
    setFromDate('');
    setToDate('');
  }, []);

  const openEditModal = useCallback(
    (booking) => {
      setEditingBooking(booking);
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
      if (typeof onDelete === 'function') {
        onDelete(booking);
      }
    },
    [onDelete]
  );

  const closeDeleteDialog = useCallback(() => {
    setDeletingBooking(null);
  }, []);

  const onBookingUpdated = useCallback(() => {
    closeEditModal();
    fetchBookings();
  }, [closeEditModal, fetchBookings]);

  const onBookingDeleted = useCallback(
    (cancelledBooking) => {
      const targetId = cancelledBooking?.id ?? deletingBooking?.id;
      if (targetId !== undefined) {
        setRawBookings((prev) =>
          prev.map((item) =>
            item.id === targetId
              ? new BookingModel({ ...item, status: 'cancelled' })
              : item
          )
        );
      }
      closeDeleteDialog();
      fetchBookings();
    },
    [closeDeleteDialog, deletingBooking, fetchBookings]
  );

  return {
    // Observable State
    bookings,
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
    clearFilters,
    openEditModal,
    closeEditModal,
    openDeleteDialog,
    closeDeleteDialog,
    onBookingUpdated,
    onBookingDeleted,
    refreshBookings: fetchBookings
  };
}

export default useBookingListViewModel;
