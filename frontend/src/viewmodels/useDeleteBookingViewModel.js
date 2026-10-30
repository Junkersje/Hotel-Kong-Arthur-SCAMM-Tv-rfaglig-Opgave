/**
 * MVVM: ViewModel Layer - useDeleteBookingViewModel
 * Håndterer bekræftelse og udførelse af soft delete (aflysning) af en booking.
 */

import { useState } from 'react';
import { apiDelete } from '../services/api.js';

export function useDeleteBookingViewModel(booking, onSuccess, onCancel) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);

  const handleConfirm = async () => {
    if (!booking) return;
    setIsDeleting(true);
    setError(null);
    try {
      await apiDelete(`/bookings/${booking.id}`);
      if (onSuccess) {
        onSuccess(booking);
      }
    } catch (err) {
      setError(err.message || 'Kunne ikke aflyse bookingen');
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    booking,
    isDeleting,
    error,
    handleConfirm,
    handleCancel: onCancel
  };
}
