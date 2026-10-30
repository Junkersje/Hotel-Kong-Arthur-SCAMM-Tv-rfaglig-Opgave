/**
 * MVVM: ViewModel Layer - useBookingListViewModel
 * Knytter Booking-modellerne og API-servicen sammen med BookingListView.
 * Håndterer søgetilstand, filtrering, modalstyring og asynkron datahentning.
 */

import { useState, useEffect, useCallback } from 'react';
import { apiGet } from '../services/api.js';

export function useBookingListViewModel() {
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Modaltilstande
  const [editingBooking, setEditingBooking] = useState(null);
  const [deletingBooking, setDeletingBooking] = useState(null);

  const fetchBookings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('q', searchQuery.trim());
      if (statusFilter) params.append('status', statusFilter);

      const endpoint = `/bookings${params.toString() ? `?${params.toString()}` : ''}`;
      const data = await apiGet(endpoint);
      setBookings(Array.isArray(data) ? data : data?.data || []);
    } catch (err) {
      setError(err.message || 'Kunne ikke hente bookinger');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter]);

  // Hent data ved ændring i filtre
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBookings();
    }, 300); // 300ms debounce på søgning
    return () => clearTimeout(timer);
  }, [fetchBookings]);

  const openEditModal = (booking) => setEditingBooking(booking);
  const closeEditModal = () => setEditingBooking(null);

  const openDeleteDialog = (booking) => setDeletingBooking(booking);
  const closeDeleteDialog = () => setDeletingBooking(null);

  const onBookingUpdated = () => {
    closeEditModal();
    fetchBookings();
  };

  const onBookingDeleted = () => {
    closeDeleteDialog();
    fetchBookings();
  };

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
    openEditModal,
    closeEditModal,
    openDeleteDialog,
    closeDeleteDialog,
    onBookingUpdated,
    onBookingDeleted,
    refreshBookings: fetchBookings
  };
}
