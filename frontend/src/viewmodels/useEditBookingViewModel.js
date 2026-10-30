/**
 * MVVM: ViewModel Layer - useEditBookingViewModel
 * Håndterer tilstand og handlinger for redigering af en eksisterende booking.
 */

import { useState, useMemo } from 'react';
import { apiPut } from '../services/api.js';
import { calculateNights } from '../models/BookingModel.js';
import { OFFICIAL_ROOM_TYPES, getRoomTypeById } from '../models/RoomTypeModel.js';

export function useEditBookingViewModel(booking, onSuccess, onCancel) {
  const [formData, setFormData] = useState({
    first_name: booking?.first_name || '',
    last_name: booking?.last_name || '',
    email: booking?.email || '',
    phone: booking?.phone || '',
    country: booking?.country || '',
    room_type_id: String(booking?.room_type_id || '3'),
    num_guests: String(booking?.num_guests || '2'),
    check_in_date: booking?.check_in_date ? booking.check_in_date.substring(0, 10) : '',
    check_out_date: booking?.check_out_date ? booking.check_out_date.substring(0, 10) : '',
    status: booking?.status || 'confirmed'
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);

  const nights = useMemo(() => {
    return calculateNights(formData.check_in_date, formData.check_out_date);
  }, [formData.check_in_date, formData.check_out_date]);

  const estimatedPrice = useMemo(() => {
    if (nights <= 0) return 0;
    const roomType = getRoomTypeById(formData.room_type_id);
    return roomType ? roomType.basePrice * nights : 0;
  }, [nights, formData.room_type_id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setApiError(null);

    // Validering
    const newErrors = {};
    if (!formData.check_in_date) newErrors.check_in_date = 'Vælg ankomstdato';
    if (!formData.check_out_date) newErrors.check_out_date = 'Vælg afrejsedato';
    if (formData.check_in_date && formData.check_out_date <= formData.check_in_date) {
      newErrors.check_out_date = 'Afrejse skal være efter ankomst';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        country: formData.country.trim() || undefined,
        room_type_id: parseInt(formData.room_type_id, 10),
        num_guests: parseInt(formData.num_guests, 10),
        check_in_date: formData.check_in_date,
        check_out_date: formData.check_out_date,
        status: formData.status
      };

      const result = await apiPut(`/bookings/${booking.id}`, payload);
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
      setApiError(err.message || 'Kunne ikke opdatere bookingen');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    formData,
    errors,
    isSubmitting,
    apiError,
    nights,
    estimatedPrice,
    roomTypes: OFFICIAL_ROOM_TYPES,
    handleChange,
    handleSubmit,
    handleCancel: onCancel
  };
}
