/**
 * MVVM: ViewModel Layer - useBookingListViewModel
 * Knytter BookingModel og API-servicen sammen med BookingListView (SH-20 / T020).
 * Håndterer debounced søgetilstand, statusfiltrering, modalstyring og asynkron datahentning.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiGet } from '../services/api.js';
import { BookingModel, filterBookingsList } from '../models/BookingModel.js';

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
  const bookings = useMemo(
    () =>
      filterBookingsList(rawBookings, {
        searchQuery,
        statusFilter,
        fromDate,
        toDate
      }),
    [rawBookings, searchQuery, statusFilter, fromDate, toDate]
  );

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
