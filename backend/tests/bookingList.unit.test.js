/**
 * Unit Tests: Booking-List Fejlhåndtering & Databasenormalisering (1NF, 2NF, 3NF)
 *
 * Tester:
 * 1. Normaliseringsregler (1NF, 2NF, 3NF, funktionelle afhængigheder og referentiel integritet)
 *    på tværs af schema.sql, seed.sql, BookingRepository og BookingModel.
 * 2. Fejlhåndtering og valideringsregler i booking-listen (søgning, filtrering,
 *    opslag, redigering, prisgenberegning og soft delete).
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  BookingRepository,
  ROOM_TYPE_BASE_PRICES_DKK,
  ROOM_TYPE_SPEC_CAPACITIES,
  formatDateOnly,
  splitFullName,
  mapRowToBooking,
  mapRowToRoomType
} from '../src/repositories/bookingRepository.js';

import {
  BookingService,
  ValidationError,
  NotFoundError,
  ConflictError,
  calculateNightsBetween
} from '../src/services/bookingService.js';

import {
  BookingModel,
  calculateNights,
  formatDate,
  getGuestDisplayName,
  getBookingTotalPrice,
  validateBookingInput,
  filterBookingsList
} from '../../frontend/src/models/BookingModel.js';

import {
  RoomTypeModel,
  DEFAULT_ROOM_TYPES
} from '../../frontend/src/models/RoomTypeModel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const SCHEMA_PATH = path.join(ROOT_DIR, 'database', 'schema.sql');
const SEED_PATH = path.join(ROOT_DIR, 'database', 'seed.sql');

/**
 * Normaliserer whitespace i SQL-strenge så mock-sammenligninger er robuste over for linjeskift.
 */
function normalizeSql(sql = '') {
  return String(sql).replace(/\s+/g, ' ').trim();
}

/**
 * Splitter en CREATE TABLE body på kommaer på topniveau (ignorerer kommaer inde i parenteser som DECIMAL(10,2) eller ENUM(...))
 */
function splitTableDefinitions(body) {
  const cleaned = body
    .split('\n')
    .map((line) => line.replace(/--.*$/, '').trim())
    .filter(Boolean)
    .join(' ');

  const definitions = [];
  let current = '';
  let depth = 0;
  let inSingleQuote = false;

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (ch === "'" && cleaned[i - 1] !== '\\') {
      inSingleQuote = !inSingleQuote;
    } else if (!inSingleQuote) {
      if (ch === '(') depth++;
      else if (ch === ')') depth = Math.max(0, depth - 1);
      else if (ch === ',' && depth === 0) {
        if (current.trim()) definitions.push(current.trim());
        current = '';
        continue;
      }
    }
    current += ch;
  }
  if (current.trim()) {
    definitions.push(current.trim());
  }
  return definitions;
}

/**
 * Hjælpefunktion til at parse CREATE TABLE blokke fra schema.sql
 */
function parseTablesFromSchema(schemaSql) {
  const tables = {};
  const tableRegex = /CREATE\s+TABLE\s+(\w+)\s*\(([\s\S]*?)\);/gi;
  let match;
  while ((match = tableRegex.exec(schemaSql)) !== null) {
    const tableName = match[1].toUpperCase();
    const body = match[2];
    const definitions = splitTableDefinitions(body);

    const columns = [];
    const foreignKeys = [];
    let hasPrimaryKey = false;

    for (const def of definitions) {
      if (/PRIMARY\s+KEY/i.test(def)) {
        hasPrimaryKey = true;
      }
      if (/^FOREIGN\s+KEY/i.test(def)) {
        foreignKeys.push(def);
      } else if (!/^(PRIMARY|UNIQUE|KEY|INDEX|CONSTRAINT|CHECK)\b/i.test(def)) {
        const colName = def.split(/\s+/)[0].toLowerCase();
        columns.push({ name: colName, definition: def });
      }
    }

    tables[tableName] = { columns, foreignKeys, hasPrimaryKey, rawBody: body };
  }
  return tables;
}

describe('Booking-List & Normalisering — Unit Tests', () => {
  // ============================================================================
  // 1. NORMALISERINGSREGLER (1NF, 2NF, 3NF & Referentiel Integritet)
  // ============================================================================
  describe('1. Databasenormalisering (1NF, 2NF, 3NF)', () => {
    const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf8');
    const tables = parseTablesFromSchema(schemaSql);

    test('1NF: Alle tabeller i schema.sql skal have en eksplicit PRIMARY KEY og atomare kolonner', () => {
      const expectedTables = [
        'ROOM_TYPE',
        'ROOM',
        'GUEST',
        'BOOKING',
        'EMPLOYEE',
        'PRODUCT',
        'SALE',
        'SALE_LINE'
      ];

      for (const tableName of expectedTables) {
        assert.ok(tables[tableName], `Tabellen ${tableName} mangler i schema.sql`);
        assert.equal(
          tables[tableName].hasPrimaryKey,
          true,
          `1NF brudt: Tabellen ${tableName} mangler en PRIMARY KEY`
        );

        // Ingen repeterende grupper (f.eks. guest1, guest2, phone1, phone2, room1, room2)
        for (const col of tables[tableName].columns) {
          assert.equal(
            /\d+$/.test(col.name),
            false,
            `1NF brudt: Kolonnen '${col.name}' i ${tableName} antyder en repeterende gruppe`
          );
        }
      }
    });

    test('2NF & 3NF: BOOKING tabellen må ikke indeholde redundante gæste-, værelses- eller værelsestype-attributter (ingen transitive afhængigheder)', () => {
      const bookingCols = tables.BOOKING.columns.map((c) => c.name);

      // BOOKING skal referere via fremmednøgler
      assert.ok(bookingCols.includes('guest_id'), 'BOOKING skal have guest_id FK');
      assert.ok(bookingCols.includes('room_type_id'), 'BOOKING skal have room_type_id FK');
      assert.ok(bookingCols.includes('room_number'), 'BOOKING skal have room_number FK');

      // Ikke-nøgleattributter fra GUEST, ROOM_TYPE og ROOM må IKKE være duplikeret i BOOKING
      const forbiddenDenormalizedColumns = [
        'guest_name',
        'first_name',
        'last_name',
        'name',
        'email',
        'guest_email',
        'phone',
        'guest_phone',
        'country',
        'guest_country',
        'room_type_name',
        'capacity',
        'room_type_capacity',
        'description',
        'floor',
        'room_floor',
        'room_status'
      ];

      for (const forbidden of forbiddenDenormalizedColumns) {
        assert.equal(
          bookingCols.includes(forbidden),
          false,
          `3NF brudt: Redundant kolonne '${forbidden}' fundet direkte i BOOKING-tabellen`
        );
      }
    });

    test('3NF: ROOM tabellen må kun gemme room_type_id (FK) og ikke duplikere værelsestens navn, kapacitet eller beskrivelse', () => {
      const roomCols = tables.ROOM.columns.map((c) => c.name);
      assert.ok(roomCols.includes('room_number'));
      assert.ok(roomCols.includes('room_type_id'));

      for (const forbidden of ['name', 'room_type_name', 'capacity', 'description', 'price']) {
        assert.equal(
          roomCols.includes(forbidden),
          false,
          `3NF brudt: Redundant værelsestype-attribut '${forbidden}' fundet i ROOM-tabellen`
        );
      }
    });

    test('Referentiel integritet: BOOKING og ROOM skal håndhæve FOREIGN KEY constraints mod GUEST, ROOM_TYPE og ROOM', () => {
      const bookingFks = tables.BOOKING.foreignKeys.join(' ');
      assert.match(bookingFks, /FOREIGN KEY\s*\(guest_id\)\s*REFERENCES\s+GUEST\(id\)/i);
      assert.match(bookingFks, /FOREIGN KEY\s*\(room_type_id\)\s*REFERENCES\s+ROOM_TYPE\(id\)/i);
      assert.match(bookingFks, /FOREIGN KEY\s*\(room_number\)\s*REFERENCES\s+ROOM\(room_number\)/i);

      const roomFks = tables.ROOM.foreignKeys.join(' ');
      assert.match(roomFks, /FOREIGN KEY\s*\(room_type_id\)\s*REFERENCES\s+ROOM_TYPE\(id\)/i);

      // GUEST.email skal være UNIQUE så samme e-mail ikke oprettes som duplikerede gæste-entiteter
      const guestEmailCol = tables.GUEST.columns.find((c) => c.name === 'email');
      assert.ok(guestEmailCol, 'GUEST skal have en email-kolonne');
      assert.match(guestEmailCol.definition, /\bUNIQUE\b/i, 'GUEST.email skal være UNIQUE');
    });

    test('Seed-data konsistens (3NF): Alle bookinger i seed.sql har konsistent (room_number -> room_type_id) i forhold til ROOM tabellen', () => {
      const seedSql = fs.readFileSync(SEED_PATH, 'utf8');

      // Udtræk ROOM (room_number -> room_type_id)
      const roomMap = new Map();
      const roomInsertRegex = /\((\d+),\s*(\d+),\s*(\d+),\s*'(available|occupied|cleaning|maintenance)'\)/g;
      let match;
      while ((match = roomInsertRegex.exec(seedSql)) !== null) {
        const roomNumber = Number(match[1]);
        const roomTypeId = Number(match[2]);
        roomMap.set(roomNumber, roomTypeId);
      }

      assert.equal(roomMap.size, 214, 'Seed-data skal indeholde præcis 214 unikke værelser');

      // Udtræk BOOKING rækker og verificer at room_number findes i ROOM og har samme room_type_id
      const bookingRegex =
        /\((\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*'(\d{4}-\d{2}-\d{2})',\s*'(\d{4}-\d{2}-\d{2})'/g;
      let bookingCount = 0;
      while ((match = bookingRegex.exec(seedSql)) !== null) {
        bookingCount++;
        const bookingId = Number(match[1]);
        const bookingRoomTypeId = Number(match[3]);
        const bookingRoomNumber = Number(match[4]);
        const checkIn = match[5];
        const checkOut = match[6];

        assert.ok(
          roomMap.has(bookingRoomNumber),
          `Referentiel fejl i booking #${bookingId}: Værelse ${bookingRoomNumber} findes ikke i ROOM`
        );
        assert.equal(
          roomMap.get(bookingRoomNumber),
          bookingRoomTypeId,
          `3NF brud i seed.sql på booking #${bookingId}: BOOKING.room_type_id (${bookingRoomTypeId}) matcher ikke ROOM.room_type_id (${roomMap.get(bookingRoomNumber)}) for værelse ${bookingRoomNumber}`
        );
        assert.ok(
          checkOut > checkIn,
          `Dato-integritetsfejl i booking #${bookingId}: check_out_date (${checkOut}) <= check_in_date (${checkIn})`
        );
      }

      assert.ok(bookingCount > 0, 'Seed-data skal indeholde mindst én booking');
    });

    test('Normalisering i Data Access Layer: BookingRepository.searchBookings henter gæste- og værelsesdata via JOINs fremfor denormaliserede kolonner', async () => {
      let executedSql = '';
      let executedParams = [];
      const mockDb = {
        query: async (sql, params) => {
          executedSql = sql;
          executedParams = params;
          return [
            {
              id: 101,
              guest_id: 12,
              guest_name: 'Helene Hansen',
              guest_email: 'helene@eksempel.dk',
              guest_phone: '+45 12345678',
              guest_country: 'Danmark',
              room_type_id: 3,
              room_type_name: 'Standard Double',
              room_type_capacity: 2,
              room_number: 205,
              room_floor: 2,
              check_in_date: new Date('2026-06-01T00:00:00Z'),
              check_out_date: new Date('2026-06-05T00:00:00Z'),
              num_guests: 2,
              total_price: '5600.00',
              status: 'confirmed',
              satisfaction_rating: 5
            }
          ];
        }
      };

      const repo = new BookingRepository(mockDb);
      const results = await repo.searchBookings({ q: 'Helene', exclude_cancelled: true });

      assert.match(executedSql, /FROM\s+BOOKING\s+b/i);
      assert.match(executedSql, /INNER\s+JOIN\s+GUEST\s+g\s+ON\s+b\.guest_id\s*=\s*g\.id/i);
      assert.match(executedSql, /INNER\s+JOIN\s+ROOM_TYPE\s+rt\s+ON\s+b\.room_type_id\s*=\s*rt\.id/i);
      assert.match(executedSql, /LEFT\s+JOIN\s+ROOM\s+r\s+ON\s+b\.room_number\s*=\s*r\.room_number/i);
      assert.equal(executedParams.length, 6);
      assert.equal(results.length, 1);

      // Verificer at rækken normaliseres til atomare DTO-felter
      const mapped = results[0];
      assert.equal(mapped.id, 101);
      assert.equal(mapped.guest_id, 12);
      assert.equal(mapped.first_name, 'Helene');
      assert.equal(mapped.last_name, 'Hansen');
      assert.equal(mapped.check_in_date, '2026-06-01');
      assert.equal(mapped.check_out_date, '2026-06-05');
      assert.equal(mapped.total_price, 5600);
    });

    test('3NF ved opdatering: BookingRepository.updateBooking opdaterer GUEST og BOOKING separat i samme transaktion uden at duplikere gæstedata', async () => {
      const executedStatements = [];

      const mockConn = {
        execute: async (sql, params) => {
          executedStatements.push({ sql: sql.trim(), params });
          if (sql.includes('SELECT * FROM BOOKING WHERE id = ? FOR UPDATE')) {
            return [
              [
                {
                  id: 50,
                  guest_id: 7,
                  room_type_id: 2,
                  room_number: 117,
                  check_in_date: '2026-05-10',
                  check_out_date: '2026-05-12',
                  num_guests: 2,
                  total_price: 2500,
                  status: 'confirmed',
                  satisfaction_rating: null
                }
              ]
            ];
          }
          if (sql.includes('SELECT * FROM GUEST WHERE id = ? FOR UPDATE')) {
            return [
              [
                {
                  id: 7,
                  name: 'Anders Gamle',
                  country: 'Danmark',
                  email: 'anders@test.dk',
                  phone: '+45 11111111'
                }
              ]
            ];
          }
          if (sql.includes('SELECT id FROM GUEST WHERE email = ? AND id != ?')) {
            return [[]];
          }
          return [{ affectedRows: 1 }];
        }
      };

      const mockDb = {
        withTransaction: async (cb) => cb(mockConn),
        query: async () => [
          {
            id: 50,
            guest_id: 7,
            guest_name: 'Anders Ny',
            guest_email: 'anders.ny@test.dk',
            guest_phone: '+45 22222222',
            guest_country: 'Norge',
            room_type_id: 2,
            room_type_name: 'Grand Lit',
            room_type_capacity: 2,
            room_number: 117,
            room_floor: 1,
            check_in_date: '2026-05-10',
            check_out_date: '2026-05-12',
            num_guests: 2,
            total_price: 2500,
            status: 'confirmed',
            satisfaction_rating: 5
          }
        ]
      };

      const repo = new BookingRepository(mockDb);
      await repo.updateBooking(50, {
        first_name: 'Anders',
        last_name: 'Ny',
        email: 'anders.ny@test.dk',
        phone: '+45 22222222',
        country: 'Norge',
        satisfaction_rating: 5
      });

      const guestUpdate = executedStatements.find((s) => s.sql.startsWith('UPDATE GUEST'));
      const bookingUpdate = executedStatements.find((s) => s.sql.startsWith('UPDATE BOOKING'));

      assert.ok(guestUpdate, 'GUEST-tabellen skal opdateres med gæstens oplysninger');
      assert.deepEqual(guestUpdate.params, [
        'Anders Ny',
        'Norge',
        'anders.ny@test.dk',
        '+45 22222222',
        7
      ]);

      assert.ok(bookingUpdate, 'BOOKING-tabellen skal opdateres separat');
      assert.equal(
        /guest_name|email|phone|country/i.test(bookingUpdate.sql),
        false,
        'UPDATE BOOKING må ikke forsøge at skrive gæsteattributter direkte i BOOKING-tabellen'
      );
    });

    test('3NF funktionel afhængighed (room_number -> room_type_id): Afviser opdatering hvor eksplicit værelsesnummer ikke matcher værelsestypen (selv hvis værelsesnummeret var det eksisterende)', async () => {
      const mockConn = {
        execute: async (sql) => {
          if (sql.includes('SELECT * FROM BOOKING WHERE id = ? FOR UPDATE')) {
            return [
              [
                {
                  id: 10,
                  guest_id: 3,
                  room_type_id: 1, // Standard Single
                  room_number: 101, // Værelse 101 er Standard Single (type 1)
                  check_in_date: '2026-09-01',
                  check_out_date: '2026-09-03',
                  num_guests: 1,
                  total_price: 2100,
                  status: 'confirmed',
                  satisfaction_rating: null
                }
              ]
            ];
          }
          if (sql.includes('SELECT room_number, room_type_id, status FROM ROOM')) {
            return [[{ room_number: 101, room_type_id: 1, status: 'available' }]];
          }
          return [[]];
        }
      };

      const mockDb = {
        withTransaction: async (cb) => cb(mockConn),
        query: async () => []
      };

      const repo = new BookingRepository(mockDb);

      // Forsøger at ændre room_type_id til 3 (Standard Double), men fastholder eksplicit room_number: 101 (type 1)
      await assert.rejects(
        async () => {
          await repo.updateBooking(10, {
            room_type_id: 3,
            room_number: 101
          });
        },
        (err) => {
          assert.equal(err.status, 400);
          assert.equal(err.code, 'ROOM_TYPE_MISMATCH');
          return true;
        }
      );
    });

    test('3NF unikhed på GUEST.email: Afviser opdatering hvis ny e-mail allerede tilhører en anden gæst (EMAIL_CONFLICT)', async () => {
      const mockConn = {
        execute: async (sql) => {
          if (sql.includes('SELECT * FROM BOOKING WHERE id = ? FOR UPDATE')) {
            return [
              [
                {
                  id: 10,
                  guest_id: 3,
                  room_type_id: 1,
                  room_number: 101,
                  check_in_date: '2026-09-01',
                  check_out_date: '2026-09-03',
                  num_guests: 1,
                  total_price: 2100,
                  status: 'confirmed',
                  satisfaction_rating: null
                }
              ]
            ];
          }
          if (sql.includes('SELECT * FROM GUEST WHERE id = ? FOR UPDATE')) {
            return [
              [
                {
                  id: 3,
                  name: 'Gæst Tre',
                  country: 'Danmark',
                  email: 'gaest3@test.dk',
                  phone: '+45 33333333'
                }
              ]
            ];
          }
          if (sql.includes('SELECT id FROM GUEST WHERE email = ? AND id != ?')) {
            return [[{ id: 99 }]]; // E-mailen bruges allerede af gæst #99
          }
          return [[]];
        }
      };

      const mockDb = {
        withTransaction: async (cb) => cb(mockConn),
        query: async () => []
      };

      const repo = new BookingRepository(mockDb);

      await assert.rejects(
        async () => {
          await repo.updateBooking(10, {
            guestData: { email: 'optaget@test.dk' }
          });
        },
        (err) => {
          assert.equal(err.status, 409);
          assert.equal(err.code, 'EMAIL_CONFLICT');
          return true;
        }
      );
    });
  });

  // ============================================================================
  // 2. BOOKING-LIST FEJLHÅNDTERING I FORRETNINGSLAGET (BookingService)
  // ============================================================================
  describe('2. Booking-List Søgning, Filtrering & Fejlhåndtering (BookingService)', () => {
    test('getBookings afviser ugyldig status-filterværdi i booking-listen med 400 INVALID_STATUS', async () => {
      const service = new BookingService({
        searchBookings: async () => []
      });

      await assert.rejects(
        async () => {
          await service.getBookings({ status: 'ukendt_status' });
        },
        (err) => {
          assert.ok(err instanceof ValidationError);
          assert.equal(err.statusCode, 400);
          assert.equal(err.code, 'INVALID_STATUS');
          return true;
        }
      );
    });

    test('getBookings afviser ugyldigt datoformat i fra/til-filtre (inkl. ikke-ISO formater og ugyldige kalenderdatoer) med 400 INVALID_DATE_FILTER', async () => {
      const service = new BookingService({
        searchBookings: async () => []
      });

      for (const badFrom of ['ikke-en-dato', '05/10/2026', '2026/05/10', '2026-5-1', '2026-02-30']) {
        await assert.rejects(
          async () => {
            await service.getBookings({ from: badFrom });
          },
          (err) => {
            assert.ok(err instanceof ValidationError);
            assert.equal(err.statusCode, 400);
            assert.equal(err.code, 'INVALID_DATE_FILTER');
            return true;
          }
        );
      }

      for (const badTo of ['2026-99-99', '10-05-2026', '2026-04-31']) {
        await assert.rejects(
          async () => {
            await service.getBookings({ to: badTo });
          },
          (err) => {
            assert.ok(err instanceof ValidationError);
            assert.equal(err.statusCode, 400);
            assert.equal(err.code, 'INVALID_DATE_FILTER');
            return true;
          }
        );
      }
    });

    test('getBookings afviser datointerval hvor fra-dato ligger efter til-dato med 400 INVALID_DATE_RANGE', async () => {
      const service = new BookingService({
        searchBookings: async () => []
      });

      await assert.rejects(
        async () => {
          await service.getBookings({ from: '2026-08-20', to: '2026-08-10' });
        },
        (err) => {
          assert.ok(err instanceof ValidationError);
          assert.equal(err.statusCode, 400);
          assert.equal(err.code, 'INVALID_DATE_RANGE');
          return true;
        }
      );
    });

    test('getBookings accepterer gyldige filtre (q, status, from, to) og videresender til repository', async () => {
      let receivedFilters = null;
      const service = new BookingService({
        searchBookings: async (filters) => {
          receivedFilters = filters;
          return [{ id: 1, status: 'confirmed' }];
        }
      });

      const filters = {
        q: 'Lars',
        status: 'confirmed',
        from: '2026-07-01',
        to: '2026-07-15'
      };
      const res = await service.getBookings(filters);
      assert.equal(res.length, 1);
      assert.deepEqual(receivedFilters, filters);
    });

    test('BookingRepository.searchBookings håndterer status=completed, fra/til dato-overlap samt limit/offset grænser korrekt i SQL', async () => {
      const calls = [];
      const repo = new BookingRepository({
        query: async (sql, params) => {
          calls.push({ sql: normalizeSql(sql), params });
          return [];
        }
      });

      // 1. status = 'completed' oversættes til IN ('completed', 'checked_out') og datointervallet sættes på check_out_date / check_in_date
      await repo.searchBookings({
        status: 'completed',
        from: '2026-06-01',
        to: '2026-06-30',
        limit: 9999,
        offset: -50
      });

      assert.equal(calls.length, 1);
      assert.match(calls[0].sql, /b\.status IN \('completed', 'checked_out'\)/i);
      assert.match(calls[0].sql, /b\.check_out_date >= \?/i);
      assert.match(calls[0].sql, /b\.check_in_date <= \?/i);
      assert.match(calls[0].sql, /LIMIT 500 OFFSET 0$/i);
      assert.deepEqual(calls[0].params, ['2026-06-01', '2026-06-30']);

      // 2. Specifik status ('checked_in') bruger parameteriseret b.status = ?
      await repo.searchBookings({
        status: 'checked_in',
        limit: 25,
        offset: 10
      });

      assert.equal(calls.length, 2);
      assert.match(calls[1].sql, /b\.status = \?/i);
      assert.match(calls[1].sql, /LIMIT 25 OFFSET 10$/i);
      assert.deepEqual(calls[1].params, ['checked_in']);
    });

    test('getBookingById afviser ugyldige ID-typer (tekst, 0, negativt tal, decimaltal) med 400 INVALID_BOOKING_ID', async () => {
      const service = new BookingService({
        getById: async () => null
      });

      for (const invalidId of ['abc', '', 0, -10, 3.14, null, undefined]) {
        await assert.rejects(
          async () => {
            await service.getBookingById(invalidId);
          },
          (err) => {
            assert.ok(err instanceof ValidationError);
            assert.equal(err.statusCode, 400);
            assert.equal(err.code, 'INVALID_BOOKING_ID');
            return true;
          }
        );
      }
    });

    test('getBookingById kaster 404 NOT_FOUND når booking ikke eksisterer', async () => {
      const service = new BookingService({
        getById: async () => null
      });

      await assert.rejects(
        async () => {
          await service.getBookingById(99999);
        },
        (err) => {
          assert.ok(err instanceof NotFoundError);
          assert.equal(err.statusCode, 404);
          assert.equal(err.code, 'NOT_FOUND');
          return true;
        }
      );
    });
  });

  // ============================================================================
  // 3. BOOKING-LIST REDIGERING, KAPACITET & PRISBEREGNING (BookingService.updateBooking)
  // ============================================================================
  describe('3. Booking-List Redigering & Forretningsregler (updateBooking & cancelBooking)', () => {
    const baseExistingBooking = {
      id: 42,
      guest_id: 10,
      guest_name: 'Maria Jensen',
      email: 'maria@jensen.dk',
      phone: '+45 88888888',
      country: 'Danmark',
      room_type_id: 1, // Standard Single (kapacitet 1, basispris 1050 DKK)
      room_number: 103,
      check_in_date: '2026-10-01',
      check_out_date: '2026-10-04', // 3 nætter
      num_guests: 1,
      total_price: 3150,
      status: 'confirmed',
      satisfaction_rating: null
    };

    function createMockService(overrides = {}) {
      const mockRepo = {
        getById: async (id) => (id === 42 ? { ...baseExistingBooking, ...overrides.existing } : null),
        getRoomTypeById: async (typeId) => {
          const capacity = ROOM_TYPE_SPEC_CAPACITIES[typeId];
          if (!capacity) return null;
          return {
            id: typeId,
            name: `Type #${typeId}`,
            capacity,
            base_price_dkk: ROOM_TYPE_BASE_PRICES_DKK[typeId]
          };
        },
        updateBooking: async (id, payload) => ({
          ...baseExistingBooking,
          ...overrides.existing,
          id,
          ...payload
        }),
        cancelBooking: async (id) => ({
          ...baseExistingBooking,
          ...overrides.existing,
          id,
          status: 'cancelled'
        }),
        ...overrides.repo
      };
      return new BookingService(mockRepo);
    }

    test('afviser redigering af en allerede annulleret booking uden samtidig genaktivering (400 BOOKING_CANCELLED), men tillader eksplicit genaktivering', async () => {
      const service = createMockService({
        existing: { status: 'cancelled' }
      });

      await assert.rejects(
        async () => {
          await service.updateBooking(42, { num_guests: 1 });
        },
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.equal(err.code, 'BOOKING_CANCELLED');
          return true;
        }
      );

      // Eksplicit genaktivering (status: 'confirmed') på en annulleret booking skal tillades
      const reactivated = await service.updateBooking(42, {
        status: 'confirmed',
        num_guests: 1
      });
      assert.equal(reactivated.status, 'confirmed');
    });

    test('afviser check_out_date <= check_in_date (samme dag eller før ankomst) med 400 INVALID_DATE_RANGE', async () => {
      const service = createMockService();

      // Samme dag (0 nætter)
      await assert.rejects(
        async () => {
          await service.updateBooking(42, {
            check_in_date: '2026-10-05',
            check_out_date: '2026-10-05'
          });
        },
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.equal(err.code, 'INVALID_DATE_RANGE');
          return true;
        }
      );

      // Afrejse før ankomst
      await assert.rejects(
        async () => {
          await service.updateBooking(42, {
            check_in_date: '2026-10-05',
            check_out_date: '2026-10-02'
          });
        },
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.equal(err.code, 'INVALID_DATE_RANGE');
          return true;
        }
      );
    });

    test('afviser ugyldig eller ukendt værelsestype (400 INVALID_ROOM_TYPE / ROOM_TYPE_NOT_FOUND)', async () => {
      const service = createMockService();

      await assert.rejects(
        async () => {
          await service.updateBooking(42, { room_type_id: 'ugyldig' });
        },
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.equal(err.code, 'INVALID_ROOM_TYPE');
          return true;
        }
      );

      await assert.rejects(
        async () => {
          await service.updateBooking(42, { room_type_id: 99 });
        },
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.equal(err.code, 'ROOM_TYPE_NOT_FOUND');
          return true;
        }
      );
    });

    test('afviser gæsteantal uden for intervallet 1..4 (400 INVALID_GUEST_COUNT) samt overskridelse af værelsestens kapacitet (400 CAPACITY_EXCEEDED)', async () => {
      const service = createMockService();

      // 0 gæster -> INVALID_GUEST_COUNT
      await assert.rejects(
        async () => {
          await service.updateBooking(42, { num_guests: 0 });
        },
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.equal(err.code, 'INVALID_GUEST_COUNT');
          return true;
        }
      );

      // 5 gæster -> INVALID_GUEST_COUNT
      await assert.rejects(
        async () => {
          await service.updateBooking(42, { num_guests: 5, room_type_id: 8 });
        },
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.equal(err.code, 'INVALID_GUEST_COUNT');
          return true;
        }
      );

      // 2 gæster på Standard Single (room_type_id: 1, capacity: 1) -> CAPACITY_EXCEEDED
      await assert.rejects(
        async () => {
          await service.updateBooking(42, { num_guests: 2, room_type_id: 1 });
        },
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.equal(err.code, 'CAPACITY_EXCEEDED');
          return true;
        }
      );
    });

    test('afviser ugyldig e-mail og tomt gæstenavn ved opdatering (400 INVALID_EMAIL / INVALID_GUEST_NAME)', async () => {
      const service = createMockService();

      await assert.rejects(
        async () => {
          await service.updateBooking(42, { email: 'ugyldig-email-uden-domæne' });
        },
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.equal(err.code, 'INVALID_EMAIL');
          return true;
        }
      );

      await assert.rejects(
        async () => {
          await service.updateBooking(42, { guest_name: '   ' });
        },
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.equal(err.code, 'INVALID_GUEST_NAME');
          return true;
        }
      );
    });

    test('afviser ugyldig kundetilfredshedsrating uden for 1..5 (400 INVALID_SATISFACTION_RATING) og tillader nulstilling til null', async () => {
      const service = createMockService({
        existing: { satisfaction_rating: 4 }
      });

      for (const badRating of [0, 6, -1, 'fem']) {
        await assert.rejects(
          async () => {
            await service.updateBooking(42, { satisfaction_rating: badRating });
          },
          (err) => {
            assert.equal(err.statusCode, 400);
            assert.equal(err.code, 'INVALID_SATISFACTION_RATING');
            return true;
          }
        );
      }

      const clearedWithNull = await service.updateBooking(42, { satisfaction_rating: null });
      assert.equal(clearedWithNull.satisfaction_rating, null);

      const clearedWithEmpty = await service.updateBooking(42, { satisfaction_rating: '' });
      assert.equal(clearedWithEmpty.satisfaction_rating, null);
    });

    test('genberegner automatisk total_price korrekt ved forlængelse af ophold, ved skift af værelsestype og validerer eksplicit total_price', async () => {
      const service = createMockService();

      // Forlængelse fra 3 til 5 nætter på samme værelsestype (dagspris 1050 DKK -> 5 * 1050 = 5250 DKK)
      const extended = await service.updateBooking(42, {
        check_in_date: '2026-10-01',
        check_out_date: '2026-10-06'
      });
      assert.equal(extended.total_price, 5250);

      // Skift til Suite (room_type_id: 7, basispris 3000 DKK/nat) i 3 nætter -> 9000 DKK
      const upgraded = await service.updateBooking(42, {
        room_type_id: 7,
        num_guests: 2
      });
      assert.equal(upgraded.total_price, 9000);

      // Eksplicit pris-override respekteres når gyldig
      const customPriced = await service.updateBooking(42, {
        total_price_dkk: 4500
      });
      assert.equal(customPriced.total_price, 4500);

      // Negativ eksplicit pris afvises med 400 INVALID_PRICE
      await assert.rejects(
        async () => {
          await service.updateBooking(42, { total_price: -100 });
        },
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.equal(err.code, 'INVALID_PRICE');
          return true;
        }
      );
    });

    test('cancelBooking udfører soft delete til status cancelled og er idempotent for allerede annullerede bookinger', async () => {
      const service = createMockService();
      const cancelled = await service.cancelBooking(42);
      assert.equal(cancelled.status, 'cancelled');
      assert.match(cancelled.message, /soft delete/i);

      // Idempotent kald på allerede annulleret booking
      const alreadyCancelledService = createMockService({
        existing: { status: 'cancelled' }
      });
      const secondCall = await alreadyCancelledService.cancelBooking(42);
      assert.equal(secondCall.status, 'cancelled');
      assert.match(secondCall.message, /allerede annulleret/i);
    });

    const baseRepoRow = {
      id: 10,
      guest_id: 3,
      room_type_id: 2,
      room_number: 117,
      check_in_date: '2026-09-01',
      check_out_date: '2026-09-03',
      num_guests: 2,
      total_price: 2500,
      status: 'confirmed',
      satisfaction_rating: null
    };

    test('BookingRepository.updateBooking kaster 404 NOT_FOUND når booking ikke findes i transaktionen', async () => {
      const notFoundRepo = new BookingRepository({
        withTransaction: async (cb) =>
          cb({
            execute: async () => [[]]
          })
      });
      await assert.rejects(
        () => notFoundRepo.updateBooking(999, { num_guests: 1 }),
        (err) => err.status === 404 && err.code === 'NOT_FOUND'
      );
    });

    test('BookingRepository.updateBooking kaster 400 INVALID_ROOM_NUMBER når eksplicit værelse ikke findes på hotellet', async () => {
      const invalidRoomRepo = new BookingRepository({
        withTransaction: async (cb) =>
          cb({
            execute: async (sql) => {
              const norm = normalizeSql(sql);
              if (norm.includes('SELECT * FROM BOOKING')) return [[baseRepoRow]];
              if (norm.includes('FROM ROOM WHERE room_number')) return [[]];
              return [[]];
            }
          })
      });
      await assert.rejects(
        () => invalidRoomRepo.updateBooking(10, { room_number: 999 }),
        (err) => err.status === 400 && err.code === 'INVALID_ROOM_NUMBER'
      );
    });

    test('BookingRepository.updateBooking kaster 409 ROOM_MAINTENANCE når eksplicit værelse er under vedligeholdelse', async () => {
      const maintRepo = new BookingRepository({
        withTransaction: async (cb) =>
          cb({
            execute: async (sql) => {
              const norm = normalizeSql(sql);
              if (norm.includes('SELECT * FROM BOOKING')) return [[baseRepoRow]];
              if (norm.includes('FROM ROOM WHERE room_number')) {
                return [[{ room_number: 325, room_type_id: 2, status: 'maintenance' }]];
              }
              return [[]];
            }
          })
      });
      await assert.rejects(
        () => maintRepo.updateBooking(10, { room_number: 325 }),
        (err) => err.status === 409 && err.code === 'ROOM_MAINTENANCE'
      );
    });

    test('BookingRepository.updateBooking kaster 409 ROOM_CONFLICT når eksplicit valgt værelse er optaget i perioden', async () => {
      const conflictRepo = new BookingRepository({
        withTransaction: async (cb) =>
          cb({
            execute: async (sql) => {
              const norm = normalizeSql(sql);
              if (norm.includes('SELECT * FROM BOOKING')) return [[baseRepoRow]];
              if (norm.includes('FROM ROOM WHERE room_number')) {
                return [[{ room_number: 118, room_type_id: 2, status: 'available' }]];
              }
              if (norm.includes('SELECT COUNT(*) AS overlap_count')) {
                return [[{ overlap_count: 1 }]];
              }
              return [[]];
            }
          })
      });
      await assert.rejects(
        () => conflictRepo.updateBooking(10, { room_number: 118 }),
        (err) => err.status === 409 && err.code === 'ROOM_CONFLICT'
      );
    });

    test('BookingRepository.updateBooking kaster 409 NO_AVAILABLE_ROOM når ingen værelser af valgt værelsestype er ledige', async () => {
      const noRoomRepo = new BookingRepository({
        withTransaction: async (cb) =>
          cb({
            execute: async (sql) => {
              const norm = normalizeSql(sql);
              if (norm.includes('SELECT * FROM BOOKING')) return [[baseRepoRow]];
              if (norm.includes('SELECT r.room_number')) return [[]];
              return [[]];
            }
          })
      });
      await assert.rejects(
        () => noRoomRepo.updateBooking(10, { room_type_id: 7 }),
        (err) => err.status === 409 && err.code === 'NO_AVAILABLE_ROOM'
      );
    });

    test('BookingRepository.updateBooking tildeler automatisk et alternativt ledigt værelse af samme type ved datoforlængelse hvis nuværende værelse er optaget', async () => {
      let updatedRoomNumber = null;
      const reassignRepo = new BookingRepository({
        withTransaction: async (cb) =>
          cb({
            execute: async (sql, params) => {
              const norm = normalizeSql(sql);
              if (norm.includes('SELECT * FROM BOOKING WHERE id = ? FOR UPDATE')) {
                return [[baseRepoRow]];
              }
              if (norm.includes('SELECT COUNT(*) AS overlap_count')) {
                // Nuværende værelse 117 er optaget i den forlængede periode
                return [[{ overlap_count: 1 }]];
              }
              if (norm.includes('SELECT r.room_number FROM ROOM r')) {
                // Alternativt ledigt værelse 119 af samme type (type 2) findes
                return [[{ room_number: 119 }]];
              }
              if (norm.includes('SELECT * FROM GUEST WHERE id = ? FOR UPDATE')) {
                return [[]];
              }
              if (norm.startsWith('UPDATE BOOKING')) {
                updatedRoomNumber = params[1];
                return [{ affectedRows: 1 }];
              }
              return [[]];
            }
          }),
        query: async () => [
          {
            ...baseRepoRow,
            room_number: 119,
            check_out_date: '2026-09-06',
            guest_name: 'Gæst Tre',
            guest_email: 'g3@test.dk',
            guest_phone: '+45 33333333',
            guest_country: 'Danmark',
            room_type_name: 'Grand Lit',
            room_type_capacity: 2
          }
        ]
      });

      const result = await reassignRepo.updateBooking(10, {
        check_in_date: '2026-09-01',
        check_out_date: '2026-09-06'
      });

      assert.equal(updatedRoomNumber, 119);
      assert.equal(result.room_number, 119);
    });
  });

  // ============================================================================
  // 4. FRONTEND MVVM MODEL & VALIDERING (BookingModel & RoomTypeModel)
  // ============================================================================
  describe('4. Frontend Booking-List Model & Inputvalidering (BookingModel & RoomTypeModel)', () => {
    test('BookingModel normaliserer rå API-data, håndterer manglende felter sikkert og beregner nætter korrekt', () => {
      const raw = {
        id: 501,
        first_name: 'Sofie',
        last_name: 'Møller',
        email: 'sofie@eksempel.dk',
        country: '',
        room_type_id: 4,
        room_type_name: 'Superior Double',
        room_number: 340,
        check_in_date: '2026-07-10T14:00:00.000Z',
        check_out_date: '2026-07-14T11:00:00.000Z',
        num_guests: '2',
        total_price_dkk: '6800',
        status: 'checked_in'
      };

      const model = new BookingModel(raw);
      assert.equal(model.id, 501);
      assert.equal(model.guest_name, 'Sofie Møller');
      assert.equal(model.country, 'Ukendt', 'Tomt land skal normaliseres til synlig "Ukendt"-kategori');
      assert.equal(model.check_in_date, '2026-07-10');
      assert.equal(model.check_out_date, '2026-07-14');
      assert.equal(model.nights, 4);
      assert.equal(model.num_guests, 2);
      assert.equal(model.total_price, 6800);
      assert.equal(model.isCancelled, false);
      assert.equal(model.statusLabel, 'Indtjekket');
    });

    test('filterBookingsList filtrerer korrekt på status (inkl. skjult cancelled og completed/checked_out alias), datointerval og fritekstsøgning', () => {
      const sampleBookings = [
        new BookingModel({
          id: 101,
          guest_name: 'Lars Hansen',
          email: 'lars@firma.dk',
          country: 'Danmark',
          room_type_id: 3,
          room_type_name: 'Standard Double',
          room_number: 204,
          check_in_date: '2026-06-10',
          check_out_date: '2026-06-15',
          status: 'confirmed'
        }),
        new BookingModel({
          id: 102,
          guest_name: 'Anna Schmidt',
          email: 'anna@berlin.de',
          country: 'Tyskland',
          room_type_id: 5,
          room_type_name: 'Junior Suite',
          room_number: 412,
          check_in_date: '2026-06-20',
          check_out_date: '2026-06-25',
          status: 'checked_out'
        }),
        new BookingModel({
          id: 103,
          guest_name: 'Erik Lindqvist',
          email: 'erik@stockholm.se',
          country: 'Sverige',
          room_type_id: 1,
          room_type_name: 'Standard Single',
          room_number: 105,
          check_in_date: '2026-07-01',
          check_out_date: '2026-07-03',
          status: 'cancelled'
        })
      ];

      // 1. Standardvisning uden filter ekskluderer 'cancelled' (soft delete US4)
      const activeOnly = filterBookingsList(sampleBookings);
      assert.deepEqual(
        activeOnly.map((b) => b.id),
        [101, 102]
      );

      // 2. Valg af statusFilter = 'cancelled' viser kun annullerede bookinger
      const cancelledOnly = filterBookingsList(sampleBookings, { statusFilter: 'cancelled' });
      assert.deepEqual(
        cancelledOnly.map((b) => b.id),
        [103]
      );

      // 3. Valg af statusFilter = 'completed' matcher både 'completed' og 'checked_out'
      const completedMatch = filterBookingsList(sampleBookings, { statusFilter: 'completed' });
      assert.deepEqual(
        completedMatch.map((b) => b.id),
        [102]
      );

      // 4. Datointerval filtrerer på overlap (check_out_date >= fromDate og check_in_date <= toDate)
      const inEarlyJune = filterBookingsList(sampleBookings, {
        fromDate: '2026-06-01',
        toDate: '2026-06-18'
      });
      assert.deepEqual(
        inEarlyJune.map((b) => b.id),
        [101]
      );

      // 5. Fritekstsøgning matcher på tværs af ID, navn, e-mail, værelsesnummer, værelsestype og land
      assert.equal(filterBookingsList(sampleBookings, { searchQuery: '101' }).length, 1);
      assert.equal(filterBookingsList(sampleBookings, { searchQuery: 'schmidt' }).length, 1);
      assert.equal(filterBookingsList(sampleBookings, { searchQuery: 'berlin.de' }).length, 1);
      assert.equal(filterBookingsList(sampleBookings, { searchQuery: '412' }).length, 1);
      assert.equal(filterBookingsList(sampleBookings, { searchQuery: 'Junior Suite' }).length, 1);
      assert.equal(filterBookingsList(sampleBookings, { searchQuery: 'Tyskland' }).length, 1);
      assert.equal(filterBookingsList(sampleBookings, { searchQuery: 'findes-ikke' }).length, 0);
    });

    test('validateBookingInput fanger alle fejl i booking-listens redigeringsformular', () => {
      // Manglende fornavn/efternavn, ugyldig email, afrejse før ankomst, for mange gæster, manglende værelsestype
      const invalidResult = validateBookingInput({
        first_name: '  ',
        last_name: '',
        email: 'ugyldig@email',
        check_in_date: '2026-05-10',
        check_out_date: '2026-05-09',
        num_guests: 6,
        room_type_id: ''
      });

      assert.equal(invalidResult.isValid, false);
      assert.ok(invalidResult.errors.first_name);
      assert.ok(invalidResult.errors.last_name);
      assert.ok(invalidResult.errors.email);
      assert.ok(invalidResult.errors.check_out_date);
      assert.ok(invalidResult.errors.num_guests);
      assert.ok(invalidResult.errors.room_type_id);

      // Gyldigt input
      const validResult = validateBookingInput({
        first_name: 'Kasper',
        last_name: 'Schmeichel',
        email: 'kasper@landsholdet.dk',
        check_in_date: '2026-05-10',
        check_out_date: '2026-05-15',
        num_guests: 2,
        room_type_id: 3
      });

      assert.equal(validResult.isValid, true);
      assert.deepEqual(validResult.errors, {});
    });

    test('RoomTypeModel normaliserer de 8 officielle værelsestyper med korrekt kapacitet og basispris', () => {
      assert.equal(DEFAULT_ROOM_TYPES.length, 8);
      const single = new RoomTypeModel({ id: 1 });
      assert.equal(single.name, 'Standard Single');
      assert.equal(single.capacity, 1);
      assert.equal(single.base_price_dkk, 1050);

      const loft = new RoomTypeModel({ id: 8 });
      assert.equal(loft.name, 'LOFT Suite');
      assert.equal(loft.capacity, 4);
      assert.equal(loft.base_price_dkk, 3500);
    });

    test('Hjælpefunktioner (splitFullName, formatDateOnly, calculateNights, calculateNightsBetween) håndterer grænsetilfælde uden fejl', () => {
      assert.deepEqual(splitFullName('  Helene   Christine  '), {
        firstName: 'Helene',
        lastName: 'Christine'
      });
      assert.deepEqual(splitFullName('Madonna'), {
        firstName: 'Madonna',
        lastName: ''
      });
      assert.deepEqual(splitFullName(''), {
        firstName: '',
        lastName: ''
      });

      assert.equal(formatDateOnly(null), null);
      assert.equal(formatDateOnly('2026-11-03T10:00:00Z'), '2026-11-03');
      assert.equal(formatDate(null), '—');

      // Over årsskifte og skudår
      assert.equal(calculateNights('2026-12-30', '2027-01-02'), 3);
      assert.equal(calculateNightsBetween('2026-12-30', '2027-01-02'), 3);
      assert.equal(calculateNights('2026-05-10', '2026-05-10'), 0);
      assert.equal(getGuestDisplayName(null), 'Ukendt gæst');
      assert.equal(getBookingTotalPrice(null), 0);
    });
  });
});
