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
  const { refreshTrigger = 0, onEdit, onDelete } = options;

  const [rawBookings, setRawBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

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
        params.search = trimmedQuery;
      }
      if (statusFilter) {
        params.status = statusFilter;
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
  }, [searchQuery, statusFilter]);

  // Debounced API-kald ved ændring i søgefelt, statusfilter eller ekstern refreshTrigger
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBookings();
    }, DEBOUNCE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [fetchBookings, refreshTrigger]);

  // Sikrer at visningen altid matcher aktive filtre (også hvis backend returnerer ufiltreret liste)
  const bookings = useMemo(() => {
    return rawBookings.filter((booking) => {
      if (statusFilter && booking.status !== statusFilter) {
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
  }, [rawBookings, searchQuery, statusFilter]);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('');
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

  const onBookingDeleted = useCallback(() => {
    closeDeleteDialog();
    fetchBookings();
  }, [closeDeleteDialog, fetchBookings]);

  return {
    // Observable State
    bookings,
    isLoading,
    error,
    searchQuery,
    statusFilter,
    editingBooking,
    deletingBooking,

    // Command Handlers
    setSearchQuery,
    setStatusFilter,
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
