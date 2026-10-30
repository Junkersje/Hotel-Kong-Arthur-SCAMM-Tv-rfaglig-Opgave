/**
 * MVVM: ViewModel Layer - useBookingFormViewModel
 * Håndterer input-tilstand, feltvalidering, prisberegning og oprettelse af nye bookinger.
 */

import { useState, useMemo } from 'react';
import { apiPost } from '../services/api.js';
import { validateBookingInput, calculateNights } from '../models/BookingModel.js';
import { getRoomTypeById, OFFICIAL_ROOM_TYPES } from '../models/RoomTypeModel.js';

export function useBookingFormViewModel(onSuccess) {
  const initialForm = {
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    country: 'Danmark',
    room_type_id: '3', // Default: Standard Dobbeltværelse
    num_guests: '2',
    check_in_date: '',
    check_out_date: ''
  };

  const [formData, setFormData] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Beregn overnatninger reaktivt
  const nights = useMemo(() => {
    return calculateNights(formData.check_in_date, formData.check_out_date);
  }, [formData.check_in_date, formData.check_out_date]);

  // Beregn vejledende totalpris reaktivt
  const estimatedPrice = useMemo(() => {
    if (nights <= 0) return 0;
    const roomType = getRoomTypeById(formData.room_type_id);
    return roomType ? roomType.basePrice * nights : 0;
  }, [nights, formData.room_type_id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Ryd feltfejl når brugeren taster
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setApiError(null);
    setSuccessMessage(null);

    // Valider via Model-laget
    const validation = validateBookingInput(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
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
        check_out_date: formData.check_out_date
      };

      const result = await apiPost('/bookings', payload);
      setSuccessMessage(`Booking #${result.id || ''} oprettet succesfuldt!`);
      setFormData(initialForm);
      setErrors({});

      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
      setApiError(err.message || 'Kunne ikke oprette reservationen');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    // State
    formData,
    errors,
    isSubmitting,
    apiError,
    successMessage,
    nights,
    estimatedPrice,
    roomTypes: OFFICIAL_ROOM_TYPES,

    // Commands
    handleChange,
    handleSubmit,
    resetForm: () => setFormData(initialForm)
  };
}
