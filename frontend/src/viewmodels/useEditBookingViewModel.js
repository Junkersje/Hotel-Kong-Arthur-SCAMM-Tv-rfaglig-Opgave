/**
 * MVVM: ViewModel Layer - useEditBookingViewModel (SH-26 / T026)
 * Håndterer præ-udfyldning, datovalidering, beregning af prisforskel ved forlænget ophold
 * samt PUT-kald mod /api/bookings/:id.
 */

import { useState, useEffect, useMemo } from 'react';
import { apiGet, apiPut } from '../services/api.js';
import {
  calculateNights,
  validateBookingInput,
  getGuestDisplayName,
  getBookingTotalPrice,
  formatDate
} from '../models/BookingModel.js';
import { DEFAULT_ROOM_TYPES, RoomTypeModel } from '../models/RoomTypeModel.js';

function buildInitialFormData(booking) {
  const initialGuestName = getGuestDisplayName(booking);
  const initialParts = initialGuestName.split(/\s+/);
  const initialFirstName = booking?.first_name || initialParts[0] || '';
  const initialLastName = booking?.last_name || initialParts.slice(1).join(' ') || '';
  const initialCheckIn = formatDate(booking?.check_in_date);
  const initialCheckOut = formatDate(booking?.check_out_date);

  return {
    guest_name: initialGuestName,
    first_name: initialFirstName,
    last_name: initialLastName,
    email: booking?.email || '',
    phone: booking?.phone || '',
    country: booking?.country || 'Danmark',
    room_type_id: booking?.room_type_id ? String(booking.room_type_id) : '1',
    check_in_date: initialCheckIn !== '—' ? initialCheckIn : '',
    check_out_date: initialCheckOut !== '—' ? initialCheckOut : '',
    num_guests: String(booking?.num_guests || 1),
    status: booking?.status || 'confirmed'
  };
}

export function useEditBookingViewModel(booking, onSuccess, onCancel) {
  const initialCheckIn = formatDate(booking?.check_in_date);
  const initialCheckOut = formatDate(booking?.check_out_date);
  const initialTotalPrice = getBookingTotalPrice(booking);
  const initialNights = calculateNights(initialCheckIn, initialCheckOut);

  const [roomTypes, setRoomTypes] = useState(
    DEFAULT_ROOM_TYPES.map((rt) => new RoomTypeModel(rt))
  );

  const [formData, setFormData] = useState(() => buildInitialFormData(booking));

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setFormData(buildInitialFormData(booking));
    setErrors({});
    setServerError(null);
  }, [booking]);

  useEffect(() => {
    let isMounted = true;
    async function loadRoomTypes() {
      try {
        const data = await apiGet('/room-types');
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setRoomTypes(data.map((rt) => new RoomTypeModel(rt)));
        }
      } catch {
        // Fallback til DEFAULT_ROOM_TYPES hvis endpoint ikke svarer
      }
    }
    loadRoomTypes();
    return () => {
      isMounted = false;
    };
  }, []);

  const nights = useMemo(
    () => calculateNights(formData.check_in_date, formData.check_out_date),
    [formData.check_in_date, formData.check_out_date]
  );

  const selectedRoomType = useMemo(
    () => roomTypes.find((rt) => String(rt.id) === String(formData.room_type_id)) || null,
    [roomTypes, formData.room_type_id]
  );

  // Beregn ny totalpris og prisforskel ved ændret periode eller værelsestype
  const { estimatedPrice, priceDifference, isStayExtended } = useMemo(() => {
    if (nights <= 0) {
      return {
        estimatedPrice: initialTotalPrice,
        priceDifference: 0,
        isStayExtended: false
      };
    }

    const roomTypeChanged =
      String(formData.room_type_id) !== String(booking?.room_type_id);
    const datesChanged =
      formData.check_in_date !== initialCheckIn ||
      formData.check_out_date !== initialCheckOut;

    let nextPrice = initialTotalPrice;
    if (roomTypeChanged || datesChanged) {
      const baseRate = selectedRoomType?.base_price_dkk || 1500;
      const nightlyRate =
        !roomTypeChanged && initialNights > 0 && initialTotalPrice > 0
          ? initialTotalPrice / initialNights
          : baseRate;

      nextPrice = Math.round(nights * nightlyRate * 100) / 100;
    }

    return {
      estimatedPrice: nextPrice,
      priceDifference: Math.round((nextPrice - initialTotalPrice) * 100) / 100,
      isStayExtended: nights > initialNights
    };
  }, [
    nights,
    initialNights,
    initialTotalPrice,
    initialCheckIn,
    initialCheckOut,
    formData.room_type_id,
    formData.check_in_date,
    formData.check_out_date,
    booking?.room_type_id,
    selectedRoomType
  ]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'first_name' || name === 'last_name') {
        next.guest_name = [
          name === 'first_name' ? value : prev.first_name,
          name === 'last_name' ? value : prev.last_name
        ]
          .filter(Boolean)
          .join(' ')
          .trim();
      } else if (name === 'guest_name') {
        const parts = String(value).trim().split(/\s+/);
        next.first_name = parts[0] || '';
        next.last_name = parts.slice(1).join(' ') || '';
      }
      return next;
    });

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    setServerError(null);
  };

  const handleSubmit = async (e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    setServerError(null);

    const validation = validateBookingInput(formData);
    const nextErrors = { ...validation.errors };

    const guestsCount = parseInt(formData.num_guests, 10);
    if (selectedRoomType && guestsCount > selectedRoomType.capacity) {
      nextErrors.num_guests = `Værelsestypen '${selectedRoomType.name}' tillader maks. ${selectedRoomType.capacity} gæst(er).`;
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        id: booking.id,
        guest_name:
          formData.guest_name.trim() ||
          [formData.first_name, formData.last_name].filter(Boolean).join(' ').trim(),
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        phone_number: formData.phone.trim(),
        country: formData.country.trim() || 'Danmark',
        room_type_id: parseInt(formData.room_type_id, 10),
        room_type_name: selectedRoomType?.name || booking.room_type_name,
        check_in_date: formData.check_in_date,
        check_out_date: formData.check_out_date,
        num_guests: parseInt(formData.num_guests, 10),
        total_price: estimatedPrice,
        status: formData.status
      };

      let updated;
      try {
        updated = await apiPut(`/bookings/${booking.id}`, payload);
      } catch (apiErr) {
        if (apiErr.status === 404) {
          updated = { ...booking, ...payload };
        } else {
          throw apiErr;
        }
      }

      if (typeof onSuccess === 'function') {
        onSuccess(updated?.data || updated || { ...booking, ...payload });
      }
    } catch (err) {
      setServerError(err.message || 'Kunne ikke gemme ændringerne på bookingen.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    booking,
    formData,
    roomTypes,
    selectedRoomType,
    nights,
    initialNights,
    initialTotalPrice,
    estimatedPrice,
    priceDifference,
    isStayExtended,
    errors,
    serverError,
    isSubmitting,
    handleChange,
    handleSubmit,
    handleCancel: onCancel
  };
}

export default useEditBookingViewModel;
