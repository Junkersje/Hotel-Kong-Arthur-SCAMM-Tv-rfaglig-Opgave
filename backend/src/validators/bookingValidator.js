import { z } from 'zod';

/**
 * Zod skema for oprettelse af bookinger (T017)
 */
export const createBookingSchema = z.object({
  // Gæsteoplysninger
  first_name: z
    .string({ required_error: 'Fornavn er påkrævet' })
    .trim()
    .min(1, 'Fornavn må ikke være tomt')
    .max(100, 'Fornavn må højst være 100 tegn'),
  
  last_name: z
    .string({ required_error: 'Efternavn er påkrævet' })
    .trim()
    .min(1, 'Efternavn må ikke være tomt')
    .max(100, 'Efternavn må højst være 100 tegn'),

  email: z
    .string({ required_error: 'E-mail er påkrævet' })
    .trim()
    .email('Ugyldigt e-mail-format'),

  phone_number: z
    .string()
    .trim()
    .max(50, 'Telefonnummer må højst være 50 tegn')
    .optional(),

  country: z
    .union([
      z.string().trim().min(2, 'Landenavn eller landekode skal være mindst 2 tegn'),
      z.number().int().positive('Ugyldigt country_id')
    ], { required_error: 'Land er påkrævet' }),

  // Værelsesvalg
  room_type_id: z
    .coerce
    .number({ required_error: 'Værelsestype ID er påkrævet' })
    .int('Værelsestype ID skal være et heltal')
    .positive('Ugyldigt værelsestype ID'),

  room_id: z
    .coerce
    .number()
    .int()
    .positive('Ugyldigt værelses-ID')
    .optional(),

  // Antal gæster (hotellet tillader 1-4 gæster)
  num_guests: z
    .coerce
    .number({ required_error: 'Antal gæster er påkrævet' })
    .int('Antal gæster skal være et heltal')
    .min(1, 'Der skal være mindst 1 gæst')
    .max(4, 'Et værelse kan maksimalt rumme 4 gæster'),

  // Datoer
  check_in_date: z
    .string({ required_error: 'Ankomstdato er påkrævet' })
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Ugyldig ankomstdato (brug YYYY-MM-DD eller ISO-format)',
    }),

  check_out_date: z
    .string({ required_error: 'Afrejsedato er påkrævet' })
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Ugyldig afrejsedato (brug YYYY-MM-DD eller ISO-format)',
    }),
}).refine(
  (data) => {
    const arrival = new Date(data.check_in_date);
    const departure = new Date(data.check_out_date);
    return departure > arrival;
  },
  {
    message: 'Afrejsedato skal være strengt efter ankomstdato',
    path: ['check_out_date'],
  }
);

/**
 * Express middleware til validering af POST /api/bookings request body
 */
export function validateCreateBooking(req, res, next) {
  const result = createBookingSchema.safeParse(req.body);

  if (!result.success) {
    const formattedErrors = result.error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    }));

    return res.status(400).json({
      success: false,
      error: 'Valideringsfejl',
      details: formattedErrors,
    });
  }

  // Gem de rensede og typede data på req.validatedBody
  req.validatedBody = result.data;
  next();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createBookingSchema,
    validateCreateBooking,
  };
}

export default {
  createBookingSchema,
  validateCreateBooking,
};
