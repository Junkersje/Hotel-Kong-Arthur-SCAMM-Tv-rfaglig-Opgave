/**
 * MVVM: ViewModel Layer - useDeleteBookingViewModel (SH-31 / T031)
 * Håndterer bekræftelse og afsendelse af DELETE /api/bookings/:id (soft delete til status 'cancelled').
 */

import { useState, useCallback } from 'react';
import { apiDelete } from '../services/api.js';

export function useDeleteBookingViewModel(booking, onSuccess, onCancel) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);

  const handleConfirm = useCallback(async () => {
    if (!booking?.id) return;
    setIsDeleting(true);
    setError(null);
    try {
      let response;
      try {
        response = await apiDelete(`/bookings/${booking.id}`);
      } catch (apiErr) {
        if (apiErr.status === 404) {
          response = { ...booking, status: 'cancelled' };
        } else {
          throw apiErr;
        }
      }
      if (typeof onSuccess === 'function') {
        onSuccess(response?.data || response || { ...booking, status: 'cancelled' });
      }
    } catch (err) {
      setError(err.message || 'Kunne ikke aflyse reservationen.');
    } finally {
      setIsDeleting(false);
    }
  }, [booking, onSuccess]);

  return {
    booking,
    isDeleting,
    error,
    handleConfirm,
    handleCancel: onCancel
  };
}

export default useDeleteBookingViewModel;
