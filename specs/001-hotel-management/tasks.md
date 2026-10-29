# Tasks: Hotel Kong Arthur — Booking-CRUD og Analytics Platform

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)  
**Branch**: `specify` | **Date**: 2026-10-29  
**Status**: Ready for Implementation

Dette dokument definerer de konkrete, afhængighedsordnede opgaver til implementering af Hotel Kong Arthur-platformen (SCAMM). Hver opgave følger Spec Kit-tjeklisteformatet med opgave-ID, parallelitetsmarkør `[P]`, user story-label `[USX]` og præcis filsti.

---

## Phase 1: Setup (Shared Infrastructure)

**Formål**: Initialisering af repository- og containerinfrastruktur for backend, frontend og database.

- [ ] T001 Opret projektmapper for backend, frontend og database i henhold til arkitekturplanen (`backend/`, `frontend/`, `database/`)
- [ ] T002 [P] Initialiser Node.js backend-projekt med `package.json` og afhængigheder (`express`, `mysql2`, `cors`, `dotenv`, `zod`, `yamljs`) i `backend/package.json`
- [ ] T003 [P] Initialiser React SPA frontend-projekt med Vite og Tailwind CSS i `frontend/package.json`
- [ ] T004 [P] Opret backend Dockerfile i `backend/Dockerfile`
- [ ] T005 [P] Opret multi-stage frontend Dockerfile med Nginx Alpine i `frontend/Dockerfile` og tilhørende `frontend/nginx.conf`
- [ ] T006 Opret samlet `docker-compose.yml` med services for `mysql`, `backend`, `frontend` og `swagger-ui` i `docker-compose.yml`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Formål**: Database-skema, seed-data, database-forbindelse og 3-lags skelet i backenden.  
⚠️ **KRITISK**: Ingen user stories kan implementeres, før denne fase er 100 % gennemført og testet.

- [ ] T007 Opret MySQL DDL-skema med tabeller for `room_types`, `rooms` (214 værelser), `guests`, `bookings`, `employees`, `products`, `sales`, `sale_lines` i `database/schema.sql`
- [ ] T008 Opret MySQL seed-data med de 8 officielle værelsestyper, 214 værelser, Helene Christine (`HC01`), 20 cocktails, 10 kaffetyper og baseline-bookinger i `database/seed.sql`
- [ ] T009 [P] Implementer MySQL connection pool og transaktionshjælper med `mysql2/promise` i `backend/src/repositories/db.js`
- [ ] T010 [P] Implementer fælles middleware til JSON-parsing, CORS og centraliseret fejlhåndtering i `backend/src/server.js`
- [ ] T011 [P] Kobl OpenAPI-specifikationen `contracts/openapi.yaml` til Swagger UI containeren og tilføj `/api-docs` endpoint i `backend/src/server.js`
- [ ] T012 [P] Konfigurer frontend API-klient (`fetch` wrapper) med base URL mod backend i `frontend/src/services/api.js`

**Checkpoint**: Kør `docker-compose up --build -d` og verificér, at alle 4 containere kører, MySQL er initialiseret med seed-data, og Swagger UI er tilgængelig på port 8080.

---

## Phase 3: User Story 1 & 2 — Fremsøge og Oprette Bookinger (Priority: P1) 🎯 MVP

**Mål**: Receptionisten kan fremsøge eksisterende bookinger samt oprette nye bookinger med fuld forretningsvalidering via browserfrontenden.

- [ ] T013 [P] [US1] Implementer `RoomRepository.getAllTypes()` og `RoomRepository.getAll()` i `backend/src/repositories/roomRepository.js`
- [ ] T014 [P] [US1] Implementer `BookingRepository.searchBookings()` med søgning på ID, navn og status i `backend/src/repositories/bookingRepository.js`
- [ ] T015 [US1] Implementer `BookingService.getBookings()` og `RoomService.getRoomTypes()` i `backend/src/services/bookingService.js`
- [ ] T016 [US1] Opret REST ruter `GET /api/bookings` og `GET /api/room-types` i `backend/src/routes/bookingRoutes.js`
- [ ] T017 [US2] Implementer Zod-validering for bookingoprettelse (kræv `check_out_date > check_in_date` og `num_guests BETWEEN 1 AND 4`) i `backend/src/services/bookingService.js`
- [ ] T018 [US2] Implementer `BookingRepository.createBooking()` med indsættelse i `guests` og `bookings` i `backend/src/repositories/bookingRepository.js`
- [ ] T019 [US2] Opret REST rute `POST /api/bookings` med HTTP 201 Created og HTTP 400 Bad Request fejlrespons i `backend/src/routes/bookingRoutes.js`
- [ ] T020 [P] [US1] Byg `BookingList` React-komponent med søgefelt og filtrering i `frontend/src/components/BookingList.jsx`
- [ ] T021 [P] [US2] Byg `BookingForm` React-komponent med validering og dropdown for de 8 værelsestyper i `frontend/src/components/BookingForm.jsx`
- [ ] T022 [US1] Integrer `BookingList` og `BookingForm` i hovedapplikationen i `frontend/src/App.jsx`

**Checkpoint (MVP)**: Verificér, at en receptionist kan søge i bookinger og oprette en ny gyldig booking, som straks vises i oversigten og persisteres i MySQL.

---

## Phase 4: User Story 3 — Rette i en Booking (Priority: P1)

**Mål**: Receptionisten kan ændre datoer, gæsteoplysninger og værelsestype på en eksisterende booking.

- [ ] T023 [US3] Implementer `BookingRepository.getById()` og `BookingRepository.updateBooking()` i `backend/src/repositories/bookingRepository.js`
- [ ] T024 [US3] Implementer forretningsvalidering for bookingændringer i `BookingService.updateBooking()` i `backend/src/services/bookingService.js`
- [ ] T025 [US3] Opret REST rute `PUT /api/bookings/:id` med HTTP 200 OK og HTTP 404/400 fejlhåndtering i `backend/src/routes/bookingRoutes.js`
- [ ] T026 [P] [US3] Byg `EditBookingModal` React-komponent med præ-udfyldte felter og datovalidering i `frontend/src/components/EditBookingModal.jsx`
- [ ] T027 [US3] Kobl redigerings-knap i `BookingList` til `EditBookingModal` med automatisk refresh af listen i `frontend/src/components/BookingList.jsx`

**Checkpoint**: Verificér, at en booking kan opdateres (f.eks. forlængelse af ophold), og at den nye afrejsedato straks reflekteres i databasen og UI.

---

## Phase 5: User Story 4 — Slette eller Aflyse en Booking (Priority: P1)

**Mål**: Receptionisten kan slette/aflyse en booking via en bekræftelsesdialog (soft delete til status `cancelled`).

- [ ] T028 [US4] Implementer soft delete SQL query (`UPDATE bookings SET status = 'cancelled' WHERE id = ?`) i `backend/src/repositories/bookingRepository.js`
- [ ] T029 [US4] Implementer forretningslogik i `BookingService.cancelBooking()` i `backend/src/services/bookingService.js`
- [ ] T030 [US4] Opret REST rute `DELETE /api/bookings/:id` i `backend/src/routes/bookingRoutes.js`
- [ ] T031 [P] [US4] Byg `DeleteDialog` React-komponent med bekræftelsesadvarsel ("Er du sikker?") i `frontend/src/components/DeleteDialog.jsx`
- [ ] T032 [US4] Kobl slet-knap i `BookingList` til `DeleteDialog` med øjeblikkelig fjernelse fra den aktive liste i `frontend/src/components/BookingList.jsx`

**Checkpoint**: Fuld CRUD er nu funktionel i browserfrontenden og backenden. Aflyste bookinger forbliver i MySQL med status `cancelled`.

---

## Phase 6: User Story 5, 6, 7 & 8 — Hotelindtægt, Barandel & Belægningsgrad (Priority: P1)

**Mål**: Backenden udstiller nøgletal for samlet omsætning (værelser + bar), værelsesindtægt, barandel og belægningsgrad baseret på de 214 værelser.

- [ ] T033 [P] [US5] Implementer sæsontilhørsforhold og kalenderberegningshjælper (faste blokke: nov-feb, mar-maj+sep-okt, jun-aug) i `backend/src/services/seasonService.js`
- [ ] T034 [P] [US5] Implementer SQL-forespørgsler for samlet værelsesomsætning (ekskl. aflyste) og barsalg i `backend/src/repositories/analyticsRepository.js`
- [ ] T035 [US8] Implementer SQL-forespørgsel for belægningsgrad: $\frac{\text{Optagne værelsesnætter}}{\text{214 værelser} \times \text{dage}} \times 100$ i `backend/src/repositories/analyticsRepository.js`
- [ ] T036 [US5] Implementer `AnalyticsService.getSummary()` der samler total omsætning, værelsesomsætning, baromsætning, bar-procentdel og belægning i `backend/src/services/analyticsService.js`
- [ ] T037 [US5] Opret REST ruter `GET /api/analytics/summary` og `GET /api/analytics/occupancy` i `backend/src/routes/analyticsRoutes.js`
- [ ] T038 [US5] Tilføj en simpel "Hurtigt Nøgletalsoverblik"-sektion i browserfrontenden i `frontend/src/components/AnalyticsOverview.jsx`

**Checkpoint**: Verificér via Swagger eller curl, at `GET /api/analytics/summary?year=2026` returnerer korrekte matematiske totaler for hotellets økonomi og belægning.

---

## Phase 7: User Story 9, 10, 11, 12, 13, 14, 15, 16 — Geografiske, Værelses- & Sæsonanalyser samt ADR (Priority: P2)

**Mål**: Backenden udstiller aggregerede analyser for lande, de 8 værelsestyper, sæsonfordeling, gennemsnitlig opholdslængde (ALOS) og gennemsnitlig dagspris (ADR).

- [ ] T039 [P] [US9] Implementer SQL-aggregering for omsætning og antal bookinger pr. land (med håndtering af "Ukendt" ved NULL) i `backend/src/repositories/analyticsRepository.js`
- [ ] T040 [P] [US11] Implementer SQL-aggregering for omsætning fordelt på de 8 værelsestyper og de 3 sæsoner i `backend/src/repositories/analyticsRepository.js`
- [ ] T041 [P] [US15] Implementer beregning af gennemsnitlig opholdslængde (ALOS) pr. land og pr. værelsestype i `backend/src/repositories/analyticsRepository.js`
- [ ] T042 [P] [US16] Implementer beregning af ADR ($\frac{\text{Værelsesomsætning}}{\text{Solgte værelsesnætter}}$) med division med nul-beskyttelse i `backend/src/services/analyticsService.js`
- [ ] T043 [US9] Implementer `AnalyticsService.getRevenueByCountry()` og `AnalyticsService.getRevenueByRoomType()` i `backend/src/services/analyticsService.js`
- [ ] T044 [US9] Opret REST ruter `GET /api/analytics/revenue-by-country`, `GET /api/analytics/revenue-by-room-type` og `GET /api/analytics/adr` i `backend/src/routes/analyticsRoutes.js`

**Checkpoint**: Verificér, at summerne for de 8 værelsestyper og sæsoner stemmer præcist overens med den samlede værelsesomsætning.

---

## Phase 8: User Story 17, 18, 19, 20 & 21 — Baranalyser (Helene Christine, Cocktails vs. Kaffe) og Kundetilfredshed (Priority: P3)

**Mål**: Backenden udstiller analyser for lobbybarens produkter, Helene Christines salg, cocktail/kaffe-fordeling samt kundetilfredshedsmåling.

- [ ] T045 [P] [US17] Implementer SQL-forespørgsel for barsalg filtreret på medarbejder-ID (f.eks. `HC01` for Helene Christine) i `backend/src/repositories/analyticsRepository.js`
- [ ] T046 [P] [US18] Implementer SQL-aggregering for omsætning og solgte enheder (volumen) pr. drink/produkt i `backend/src/repositories/analyticsRepository.js`
- [ ] T047 [US20] Implementer beregning af procentfordeling mellem cocktails og kaffe for Helene Christine i både DKK og stk. i `backend/src/services/analyticsService.js`
- [ ] T048 [P] [US21] Implementer beregning af gennemsnitlig kundetilfredshedsscore (1–5 stjerner) og samlet antal besvarelser i `backend/src/services/analyticsService.js`
- [ ] T049 [US17] Opret REST ruter `GET /api/analytics/bar-sales`, `GET /api/analytics/drinks-revenue` og `GET /api/analytics/helene-breakdown` i `backend/src/routes/analyticsRoutes.js`

**Checkpoint**: Verificér, at Helene Christines salg er 100 % isoleret fra andre medarbejdere, og at cocktail vs. kaffe-procenten summerer til nøjagtigt 100,0 %.

---

## Phase 9: Polish, Tableau WDC & Samlet Systemkontrol

**Formål**: Forbinde Tableau til REST API'et, færdiggøre dokumentation og køre komplet end-to-end verifikation.

- [ ] T050 [P] Opret en letvægts Tableau Web Data Connector (WDC) HTML/JS-fil i `backend/src/public/tableau-wdc.html`, der henter JSON fra `/api/analytics/summary` og de øvrige analyse-endpoints
- [ ] T051 Opret `README.md` med systembeskrivelse, startvejledning (`docker-compose up`), portadresser og arkitekturdiagram over hele 3-lagssystemet i `README.md`
- [ ] T052 [P] Opret `CONTRIBUTE.md` (præcis dette filnavn fra opgavebeskrivelsen) med gruppens arbejds-, review- og PR-regler i `CONTRIBUTE.md`
- [ ] T053 Udfør samlet gennemløb af alle 7 testscenarier i `quickstart.md` (opret, ret, soft delete, Tableau-opdatering, genstart af containere)
- [ ] T054 Gennemfør Converge-kontrol mod Constitution og generér statusrapport i `converge.md`

---

## Dependencies & Execution Order

```mermaid
graph TD
    Phase1[Phase 1: Setup] --> Phase2[Phase 2: Foundational]
    Phase2 --> Phase3[Phase 3: US 1 & 2 - Booking Opret & Søg (MVP)]
    Phase3 --> Phase4[Phase 4: US 3 - Booking Ret]
    Phase4 --> Phase5[Phase 5: US 4 - Booking Slet/Aflys]
    Phase2 --> Phase6[Phase 6: US 5-8 - Hotelomsætning & Belægning]
    Phase6 --> Phase7[Phase 7: US 9-16 - Lande, Typer & Sæsoner]
    Phase6 --> Phase8[Phase 8: US 17-21 - Bar & Helene Christine]
    Phase5 --> Phase9[Phase 9: Polish & Tableau Integration]
    Phase7 --> Phase9
    Phase8 --> Phase9
```

---

## Implementation Strategy (MVP First)

1. **Trin 1 (Foundation)**: Gennemfør Phase 1 og Phase 2. Databasen starter med 214 værelser og seed-data, og Swagger UI viser OpenAPI-kontrakten.
2. **Trin 2 (MVP Delivery)**: Gennemfør Phase 3 (US 1 & 2). Receptionisten kan oprette og søge bookinger i browseren mod MySQL.
3. **Trin 3 (Fuld CRUD)**: Gennemfør Phase 4 og Phase 5. Receptionisten kan redigere og soft-delete reservationer.
4. **Trin 4 (Analytics API & Tableau)**: Gennemfør Phase 6, 7 og 8. Samtlige 10 analysevisninger samt belægningsgrad og kundetilfredshed er tilgængelige som JSON REST endpoints.
5. **Trin 5 (Converge)**: Gennemfør Phase 9. Forbind Tableau via WDC, test live-opdatering på under 30 sekunder, og afslut dokumentationen.
