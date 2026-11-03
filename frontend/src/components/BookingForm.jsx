
import React, { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../services/api';

const initialForm = {
  first_name: '',
  last_name: '',
  email: '',
  phone_number: '',
  country: '',
  room_type_id: '',
  num_guests: '1',
  check_in_date: '',
  check_out_date: ''
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

function validate(form) {
  const errors = {};

  if (!form.first_name.trim()) errors.first_name = 'Fornavn er påkrævet.';
  if (!form.last_name.trim()) errors.last_name = 'Efternavn er påkrævet.';

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Indtast en gyldig e-mailadresse.';
  }

  if (!form.phone_number.trim()) {
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
  } else if (form.check_in_date < getToday()) {
    errors.check_in_date = 'Ankomstdato må ikke ligge i fortiden.';
  }

  if (!form.check_out_date) {
    errors.check_out_date = 'Vælg en afrejsedato.';
  } else if (form.check_in_date && getNights(form.check_in_date, form.check_out_date) < 1) {
    errors.check_out_date = 'Afrejsedato skal være efter ankomstdato.';
  }

  return errors;
}

export default function BookingForm() {
  const [form, setForm] = useState(initialForm);
  const [roomTypes, setRoomTypes] = useState([]);
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
          if (!Array.isArray(result)) {
            throw new Error('Uventet svar fra serveren.');
          }
          setRoomTypes(result);
          setRoomError('');
        }
      } catch (error) {
        if (active) setRoomError(error.message);
      }
    }

    loadRoomTypes();
    return () => { active = false; };
  }, []);

  const nights = getNights(form.check_in_date, form.check_out_date);

  function updateField(event) {
    const { name, value } = event.target;
    const next = { ...form, [name]: value };
    setForm(next);
    setSuccess('');
    setServerError('');
    if (submitted) setErrors(validate(next));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
    setSuccess('');
    setServerError('');

    const validationErrors = validate(form);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) return;

    setSaving(true);
    try {
      const payload = {
        ...form,
        room_type_id: Number(form.room_type_id),
        num_guests: Number(form.num_guests)
      };

      await apiPost('/bookings', payload);

      setSuccess('Bookingen blev oprettet!');
      setForm(initialForm);
      setErrors({});
      setSubmitted(false);
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

      setServerError(error.message || 'Bookingen kunne ikke oprettes.');
    } finally {
      setSaving(false);
    }
  }

  const inputClass = 'w-full rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500';
  const fields = [
    ['first_name', 'Fornavn', 'text'],
    ['last_name', 'Efternavn', 'text'],
    ['email', 'E-mail', 'email'],
    ['phone_number', 'Telefonnummer', 'tel'],
    ['country', 'Land', 'text']
  ];

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <h2 className="text-xl font-bold text-slate-900 mb-2">Opret booking</h2>
      <p className="text-sm text-slate-500 mb-6">
        Udfyld gæsteoplysninger og vælg opholdets datoer.
      </p>

      {success && (
        <div role="status" className="mb-4 p-3 bg-green-50 text-green-800 rounded-lg">
          {success}
        </div>
      )}

      {serverError && (
        <div role="alert" className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fields.map(([name, label, type]) => (
            <div key={name}>
              <label htmlFor={name} className="block text-sm font-medium mb-1">
                {label}
              </label>
              <input
                id={name}
                name={name}
                type={type}
                value={form[name]}
                onChange={updateField}
                aria-invalid={Boolean(errors[name])}
                className={inputClass}
              />
              {errors[name] && (
                <p className="text-sm text-red-600 mt-1">{errors[name]}</p>
              )}
            </div>
          ))}

          <div>
            <label htmlFor="room_type_id" className="block text-sm font-medium mb-1">
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
            {roomError && <p className="text-sm text-red-600 mt-1">{roomError}</p>}
            {errors.room_type_id && (
              <p className="text-sm text-red-600 mt-1">{errors.room_type_id}</p>
            )}
          </div>

          <div>
            <label htmlFor="num_guests" className="block text-sm font-medium mb-1">
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
                <option key={number} value={number}>{number}</option>
              ))}
            </select>
            {errors.num_guests && (
              <p className="text-sm text-red-600 mt-1">{errors.num_guests}</p>
            )}
          </div>

          <div>
            <label htmlFor="check_in_date" className="block text-sm font-medium mb-1">
              Ankomstdato
            </label>
            <input
              id="check_in_date"
              name="check_in_date"
              type="date"
              min={getToday()}
              value={form.check_in_date}
              onChange={updateField}
              className={inputClass}
            />
            {errors.check_in_date && (
              <p className="text-sm text-red-600 mt-1">{errors.check_in_date}</p>
            )}
          </div>

          <div>
            <label htmlFor="check_out_date" className="block text-sm font-medium mb-1">
              Afrejsedato
            </label>
            <input
              id="check_out_date"
              name="check_out_date"
              type="date"
              min={form.check_in_date || getToday()}
              value={form.check_out_date}
              onChange={updateField}
              className={inputClass}
            />
            {errors.check_out_date && (
              <p className="text-sm text-red-600 mt-1">{errors.check_out_date}</p>
            )}
          </div>
        </div>

        <div className="mt-5 rounded-lg bg-amber-50 p-4 text-amber-900">
          Antal overnatninger: <strong>{nights}</strong>
        </div>

        <button
          type="submit"
          disabled={saving || roomTypes.length === 0}
          className="mt-5 bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white font-semibold rounded-lg px-6 py-3"
        >
          {saving ? 'Opretter booking...' : 'Opret booking'}
        </button>
      </form>
    </section>
  );
}
