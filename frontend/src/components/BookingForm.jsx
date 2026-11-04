
import React, { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPut } from '../services/api';
import { DEFAULT_ROOM_TYPES } from '../models/RoomTypeModel';

const initialForm = {
  first_name: '',
  last_name: '',
  email: '',
  phone_number: '',
  country: 'Danmark',
  room_type_id: '1',
  num_guests: '1',
  check_in_date: '',
  check_out_date: '',
  status: 'confirmed'
};

function getToday() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function getNights(start, end) {
  if (!start || !end) return 0;
  const difference = Date.parse(end) - Date.parse(start);
  return Math.max(0, Math.round(difference / 86400000));
}

function validate(form, isEditMode = false) {
  const errors = {};

  if (!form.first_name.trim()) errors.first_name = 'Fornavn er påkrævet.';
  if (!form.last_name.trim()) errors.last_name = 'Efternavn er påkrævet.';

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Indtast en gyldig e-mailadresse.';
  }

  if (!isEditMode && !form.phone_number.trim()) {
    errors.phone_number = 'Telefonnummer er påkrævet.';
  }

  if (!form.country.trim()) errors.country = 'Land er påkrævet.';
  if (!form.room_type_id) errors.room_type_id = 'Vælg en værelsestype.';

  const guests = Number(form.num_guests);
  if (!Number.isInteger(guests) || guests < 1 || guests > 4) {
    errors.num_guests = 'Antal gæster skal være mellem 1 og 4.';
  }

  if (!form.check_in_date) {
    errors.check_in_date = 'Vælg en ankomstdato.';
  } else if (!isEditMode && form.check_in_date < getToday()) {
    errors.check_in_date = 'Ankomstdato må ikke ligge i fortiden.';
  }

  if (!form.check_out_date) {
    errors.check_out_date = 'Vælg en afrejsedato.';
  } else if (form.check_in_date && getNights(form.check_in_date, form.check_out_date) < 1) {
    errors.check_out_date = 'Afrejsedato skal være efter ankomstdato.';
  }

  return errors;
}

export default function BookingForm({
  mode = 'create',
  bookingToEdit = null,
  onBookingCreated,
  onBookingUpdated,
  onSuccess,
  compact = false
} = {}) {
  const isEditMode = mode === 'edit' && Boolean(bookingToEdit);

  const [form, setForm] = useState(initialForm);
  const [roomTypes, setRoomTypes] = useState(DEFAULT_ROOM_TYPES);
  const [roomError, setRoomError] = useState('');
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadRoomTypes() {
      try {
        const result = await apiGet('/room-types');
        if (active) {
          if (Array.isArray(result) && result.length > 0) {
            setRoomTypes(result);
            setRoomError('');
          }
        }
      } catch (error) {
        if (active && roomTypes.length === 0) {
          setRoomError(error.message);
        }
      }
    }

    loadRoomTypes();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setSuccess('');
    setServerError('');
    setErrors({});
    setSubmitted(false);

    if (mode === 'edit' && bookingToEdit) {
      const nameParts = (bookingToEdit.guest_name || '').trim().split(/\s+/);
      const firstName = bookingToEdit.first_name || nameParts[0] || '';
      const lastName = bookingToEdit.last_name || nameParts.slice(1).join(' ') || '';

      setForm({
        first_name: firstName,
        last_name: lastName,
        email: bookingToEdit.email || '',
        phone_number: bookingToEdit.phone || bookingToEdit.phone_number || '',
        country: bookingToEdit.country && bookingToEdit.country !== 'Ukendt' ? bookingToEdit.country : 'Danmark',
        room_type_id: String(bookingToEdit.room_type_id || '1'),
        num_guests: String(bookingToEdit.num_guests || '1'),
        check_in_date:
          bookingToEdit.check_in_date && bookingToEdit.check_in_date !== '—'
            ? bookingToEdit.check_in_date
            : '',
        check_out_date:
          bookingToEdit.check_out_date && bookingToEdit.check_out_date !== '—'
            ? bookingToEdit.check_out_date
            : '',
        status: bookingToEdit.status || 'confirmed'
      });
    } else {
      setForm(initialForm);
    }
  }, [mode, bookingToEdit]);

  const nights = getNights(form.check_in_date, form.check_out_date);

  function updateField(event) {
    const { name, value } = event.target;
    const next = { ...form, [name]: value };
    setForm(next);
    setSuccess('');
    setServerError('');
    if (submitted) setErrors(validate(next, isEditMode));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
    setSuccess('');
    setServerError('');

    const validationErrors = validate(form, isEditMode);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) return;

    setSaving(true);
    try {
      const selectedRoom = roomTypes.find(
        (r) => String(r.room_type_id ?? r.id) === String(form.room_type_id)
      );
      const roomTypeName =
        selectedRoom?.name ?? selectedRoom?.type_name ?? selectedRoom?.room_type_name ?? bookingToEdit?.room_type_name;

      if (isEditMode && bookingToEdit) {
        const updatePayload = {
          id: bookingToEdit.id,
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          guest_name: `${form.first_name.trim()} ${form.last_name.trim()}`.trim(),
          email: form.email.trim(),
          phone: form.phone_number.trim(),
          phone_number: form.phone_number.trim(),
          country: form.country.trim(),
          room_type_id: Number(form.room_type_id),
          room_type_name: roomTypeName,
          num_guests: Number(form.num_guests),
          check_in_date: form.check_in_date,
          check_out_date: form.check_out_date,
          status: form.status
        };

        let updatedResult;
        try {
          const res = await apiPut(`/bookings/${bookingToEdit.id}`, updatePayload);
          updatedResult = res?.data || res || updatePayload;
        } catch (putErr) {
          if (putErr.status === 404) {
            updatedResult = { ...bookingToEdit, ...updatePayload };
          } else {
            throw putErr;
          }
        }

        setSuccess(`Booking #${bookingToEdit.id} blev opdateret!`);
        setSubmitted(false);
        if (typeof onBookingUpdated === 'function') {
          onBookingUpdated({ ...updatePayload, ...updatedResult });
        }
        if (typeof onSuccess === 'function') {
          onSuccess({ ...updatePayload, ...updatedResult });
        }
      } else {
        const payload = {
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim(),
          phone_number: form.phone_number.trim(),
          country: form.country.trim(),
          room_type_id: Number(form.room_type_id),
          num_guests: Number(form.num_guests),
          check_in_date: form.check_in_date,
          check_out_date: form.check_out_date
        };

        const response = await apiPost('/bookings', payload);
        const createdRaw = response?.data || response || {};
        const enrichedCreated = {
          ...payload,
          ...createdRaw,
          first_name: payload.first_name,
          last_name: payload.last_name,
          guest_name: `${payload.first_name} ${payload.last_name}`.trim(),
          email: payload.email,
          phone: payload.phone_number,
          phone_number: payload.phone_number,
          country: payload.country,
          room_type_name: createdRaw.room?.room_type_name || roomTypeName,
          room_number: createdRaw.room?.room_number || createdRaw.room_number || null,
          created_at: createdRaw.created_at || new Date().toISOString()
        };

        setSuccess('Bookingen blev oprettet!');
        setForm(initialForm);
        setErrors({});
        setSubmitted(false);

        if (typeof onBookingCreated === 'function') {
          onBookingCreated(enrichedCreated);
        }
        if (typeof onSuccess === 'function') {
          onSuccess(enrichedCreated);
        }
      }
    } catch (error) {
      const details = error.data?.errors || error.data?.error?.details;

      if (Array.isArray(details)) {
        const fieldErrors = {};
        for (const item of details) {
          const field = Array.isArray(item.path)
            ? item.path.join('.')
            : item.field || item.path;

          if (field) fieldErrors[field] = item.message;
        }
        setErrors(fieldErrors);
      }

      setServerError(
        error.message ||
          (isEditMode ? 'Bookingen kunne ikke opdateres.' : 'Bookingen kunne ikke oprettes.')
      );
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    'w-full text-sm rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500';
  const fields = [
    ['first_name', 'Fornavn', 'text', 'F.eks. Anders'],
    ['last_name', 'Efternavn', 'text', 'F.eks. Jensen'],
    ['email', 'E-mail', 'email', 'gæst@eksempel.dk'],
    ['phone_number', 'Mobil nr.', 'tel', '+45 12 34 56 78'],
    ['country', 'Land', 'text', 'Danmark']
  ];

  return (
    <section
      className={
        compact
          ? 'bg-white rounded-lg border-2 border-slate-800 p-4 shadow-sm'
          : 'bg-white rounded-xl border border-slate-200 shadow-sm p-6'
      }
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            {isEditMode ? `Redigér booking #${bookingToEdit.id}` : 'Opret ny booking'}
          </h2>
          <p className="text-xs text-slate-500">
            {isEditMode
              ? 'Ret oplysninger direkte og gem med 1 klik.'
              : 'Udfyld gæsteoplysninger og vælg opholdets datoer.'}
          </p>
        </div>
        {isEditMode && (
          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
            #{bookingToEdit.id}
          </span>
        )}
      </div>

      {success && (
        <div role="status" className="mb-3 p-2.5 text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg font-medium">
          {success}
        </div>
      )}

      {serverError && (
        <div role="alert" className="mb-3 p-2.5 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg font-medium">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {fields.map(([name, label, type, placeholder]) => (
            <div key={name} className={name === 'email' ? 'sm:col-span-2' : ''}>
              <label htmlFor={name} className="block text-xs font-semibold text-slate-700 mb-0.5">
                {label}
              </label>
              <input
                id={name}
                name={name}
                type={type}
                placeholder={placeholder}
                value={form[name]}
                onChange={updateField}
                aria-invalid={Boolean(errors[name])}
                className={inputClass}
              />
              {errors[name] && (
                <p className="text-xs text-rose-600 mt-0.5">{errors[name]}</p>
              )}
            </div>
          ))}

          <div>
            <label htmlFor="room_type_id" className="block text-xs font-semibold text-slate-700 mb-0.5">
              Værelsestype
            </label>
            <select
              id="room_type_id"
              name="room_type_id"
              value={form.room_type_id}
              onChange={updateField}
              className={inputClass}
              aria-invalid={Boolean(errors.room_type_id)}
            >
              <option value="">Vælg værelsestype</option>
              {roomTypes.map((room) => (
                <option
                  key={room.room_type_id ?? room.id}
                  value={room.room_type_id ?? room.id}
                >
                  {room.name ?? room.type_name ?? room.room_type_name}
                </option>
              ))}
            </select>
            {roomError && <p className="text-xs text-rose-600 mt-0.5">{roomError}</p>}
            {errors.room_type_id && (
              <p className="text-xs text-rose-600 mt-0.5">{errors.room_type_id}</p>
            )}
          </div>

          <div>
            <label htmlFor="num_guests" className="block text-xs font-semibold text-slate-700 mb-0.5">
              Antal gæster
            </label>
            <select
              id="num_guests"
              name="num_guests"
              value={form.num_guests}
              onChange={updateField}
              className={inputClass}
            >
              {[1, 2, 3, 4].map((number) => (
                <option key={number} value={number}>
                  {number} {number === 1 ? 'gæst' : 'gæster'}
                </option>
              ))}
            </select>
            {errors.num_guests && (
              <p className="text-xs text-rose-600 mt-0.5">{errors.num_guests}</p>
            )}
          </div>

          <div>
            <label htmlFor="check_in_date" className="block text-xs font-semibold text-slate-700 mb-0.5">
              Ankomstdato
            </label>
            <input
              id="check_in_date"
              name="check_in_date"
              type="date"
              min={isEditMode ? undefined : getToday()}
              value={form.check_in_date}
              onChange={updateField}
              className={inputClass}
            />
            {errors.check_in_date && (
              <p className="text-xs text-rose-600 mt-0.5">{errors.check_in_date}</p>
            )}
          </div>

          <div>
            <label htmlFor="check_out_date" className="block text-xs font-semibold text-slate-700 mb-0.5">
              Afrejsedato
            </label>
            <input
              id="check_out_date"
              name="check_out_date"
              type="date"
              min={form.check_in_date || (isEditMode ? undefined : getToday())}
              value={form.check_out_date}
              onChange={updateField}
              className={inputClass}
            />
            {errors.check_out_date && (
              <p className="text-xs text-rose-600 mt-0.5">{errors.check_out_date}</p>
            )}
          </div>

          {isEditMode && (
            <div className="sm:col-span-2">
              <label htmlFor="status" className="block text-xs font-semibold text-slate-700 mb-0.5">
                Booking status
              </label>
              <select
                id="status"
                name="status"
                value={form.status}
                onChange={updateField}
                className={inputClass}
              >
                <option value="confirmed">Bekræftet (Aktiv - Gul)</option>
                <option value="checked_in">Indtjekket (Grøn)</option>
                <option value="completed">Gennemført / Udtjekket (Blå)</option>
                <option value="cancelled">Annulleret (Grå)</option>
              </select>
            </div>
          )}
        </div>

        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900 flex items-center justify-between">
          <span>
            Antal overnatninger: <strong>{nights}</strong>
          </span>
          {isEditMode && bookingToEdit?.formattedPrice && (
            <span>
              Nuværende pris: <strong>{bookingToEdit.formattedPrice}</strong>
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={saving || roomTypes.length === 0}
          className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg px-4 py-2.5 transition shadow-sm"
        >
          {saving
            ? isEditMode
              ? 'Gemmer ændringer...'
              : 'Opretter booking...'
            : isEditMode
            ? 'Gem ændringer'
            : 'Opret booking'}
        </button>
      </form>
    </section>
  );
}
