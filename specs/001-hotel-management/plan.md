# Implementation Plan: Hotel Kong Arthur — Booking-CRUD og Analytics Platform

**Branch**: `specify` | **Date**: 2026-10-29 | **Spec**: [spec.md](./spec.md) | **Capability Map**: [capability-map.md](./capability-map.md)

**Input**: Feature specification from `specs/001-hotel-management/spec.md`

---

## Summary

Dette projekt leverer en fuldt integreret, forklarlig prototype for Hotel Kong Arthur i henhold til kravene for 3. semesters tværfaglige opgave (SCAMM). Systemet består af:
1. En **Node.js (Express.js) backend** opbygget efter en strikt 3-lagsarkitektur (*Præsentationslag*, *Forretningslag*, *Dataadgangslag*), der udstiller et REST API med JSON.
2. En **MySQL 8.0 database** med 214 værelser, 8 værelsestyper, 3 sæsoner, bookinghistorik og lobbybarens salgstransaktioner.
3. En **React (Vite) Single Page Application** browserfrontend, der giver receptionister mulighed for at fremsøge, oprette, redigere og aflyse/slette bookinger.
4. En **OpenAPI 3.0 specifikation** serveret via en containeriseret **Swagger UI**.
5. Et interaktivt **Tableau-dashboard**, der forbinder til backendens REST API via en **Web Data Connector (WDC)** til dynamiske ledelsesanalyser.
6. Komplet orkestrering af alle services via en enkelt `docker-compose up`-kommando.

---

## Technical Context

**Language/Version**: Node.js v20 LTS (Backend), JavaScript ES6+ / JSX (Frontend)

**Primary Dependencies**:
- *Backend*: Express.js, `mysql2/promise`, `cors`, `dotenv`, `zod` (inputvalidering), `yamljs`
- *Frontend*: React 18/19, Vite, Lucide-React (ikoner), Tailwind CSS
- *Webserver*: Nginx Alpine (til frontend-containeren)

**Storage**: MySQL 8.0 Community Server med persistent Docker volume (`mysql_data`)

**Testing**: Jest og Supertest (til integrationstest af API-endpoints og forretningslag), manuelle verifikationsscenarier i `quickstart.md`

**Target Platform**: Multi-container Docker Compose miljø (Linux container runtime, afviklet på Windows/macOS/Linux)

**Project Type**: Web application bestående af 3-lags REST API backend, browserbaseret SPA frontend, MySQL database og Swagger UI dokumentation

**Performance Goals**:
- Tableau data-refresh reflekterer ændringer på **< 30 sekunder**.
- REST API responstid **< 100 ms** for almindelige CRUD-kald og **< 300 ms** for aggregerede KPI-kald.
- Hurtig opstart: hele systemet køreklar på **< 60 sekunder** ved `docker-compose up`.

**Constraints**:
- Ufravigelig tre-lagsarkitektur i backenden (ingen SQL i præsentationslaget, ingen UI-afhængighed i forretningslaget).
- Udelukkende OpenAPI 3.0 til API-dokumentation.
- Ingen direkte MySQL-databaseforbindelse fra Tableau (al Tableau-adgang sker med udgangspunkt i REST API'et).
- Ingen parallelle rapportpakker eller overflødige microservices (alt holdes simpelt og veldokumenteret inden for rammerne).

**Scale/Scope**:
- 214 fysiske værelser (verificeret bestand for belægningsgrad).
- 8 officielle værelsestyper med estimerede vejledende priser.
- 3 driftssæsoner uden overlap.
- Lobbybar med 20 cocktails, 10 kaffetyper samt Helene Christines salgsregistrering.

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princip / Krav i Constitution | Status | Verifikation i Planen |
| :--- | :--- | :--- |
| **I. Tre-lagsarkitektur (NON-NEGOTIABLE)** | ✅ **PASS** | Tydeligt adskilt kodebase i backenden: `routes/` (Præsentation), `services/` (Forretning), `repositories/` (Dataadgang). |
| **II. Kontraktdrevet REST API & Swagger (NON-NEGOTIABLE)** | ✅ **PASS** | Kontrakt formaliseret i `contracts/openapi.yaml` før kodeimplementering; Swagger UI tilgængelig i container på port 8080. |
| **III. MySQL-Persistens & Booking-CRUD (NON-NEGOTIABLE)** | ✅ **PASS** | MySQL 8.0 med persistent volume, versionsstyret schema og seeddata. Browserfrontend leverer fuld CRUD med soft delete. |
| **IV. API-Drevet Tableau Analytics & Entydige KPI'er (NON-NEGOTIABLE)** | ✅ **PASS** | Tableau integrerer via Web Data Connector mod `/api/analytics` endpoints i JSON. Én sandhedskilde for nøgletal i forretningslaget. |
| **V. Containerisering med Docker Compose (NON-NEGOTIABLE)** | ✅ **PASS** | Fast struktur med 4 services (`mysql`, `backend`, `frontend`, `swagger-ui`), der starter samlet via én enkelt `docker-compose up`-kommando. |
| **VI. Spec-Drevet Udvikling & Kvalitetskontrol (NON-NEGOTIABLE)** | ✅ **PASS** | Fuld sporbarhed fra Constitution $\rightarrow$ Spec $\rightarrow$ Clarify $\rightarrow$ Plan $\rightarrow$ Tasks. Checklists og acceptkriterier styrende. |

---

## Project Structure

### Documentation & Spec Kit Artifacts (specs/001-hotel-management)

```text
specs/001-hotel-management/
├── spec.md                  # Komplet specifikation med prioriterede user stories
├── checklists/
│   └── requirements.md      # Kvalitets-checklist (16/16 punkter bestået)
├── research.md              # Phase 0: Teknologibeslutninger, begrundelser og fravalg
├── data-model.md            # Phase 1: ER-diagram, tabeller, datatyper og forretningsregler
├── quickstart.md            # Phase 1: Trin-for-trin guide til opstart og end-to-end test
├── contracts/
│   └── openapi.yaml         # Phase 1: Formel OpenAPI 3.0 kontrakt for alle endpoints
├── plan.md                  # Dette dokument (den samlede implementeringsplan)
└── tasks.md                 # Phase 2: Actionable tasks opdelt efter user stories (udarbejdes i næste trin)
```

### Source Code Layout (Repository root)

```text
Hotel-Kong-Arthur-SCAMM/
├── docker-compose.yml       # Fælles orkestrering af alle 4 services
├── README.md                # Systemdokumentation med samlet arkitekturdiagram
├── CONTRIBUTE.md            # Gruppens arbejds- og reviewvejledning
│
├── database/                # Database-migrationer og seed-data
│   ├── Dockerfile
│   ├── schema.sql           # CREATE TABLE scripts med constraints og indekser
│   └── seed.sql             # De 214 værelser, 8 typer, medarbejdere, varer og eksempelbookinger
│
├── backend/                 # 3-lags Node.js Express REST API
│   ├── Dockerfile
│   ├── package.json
│   ├── src/
│   │   ├── server.js        # Entry point og middleware
│   │   ├── routes/          # 1. PRÆSENTATIONSLAG: REST ruter, JSON-formatering, HTTP status
│   │   │   ├── bookingRoutes.js
│   │   │   ├── roomRoutes.js
│   │   │   └── analyticsRoutes.js
│   │   ├── services/        # 2. FORRETNINGSLAG: Validering, sæsonfortolkning, KPI-beregninger
│   │   │   ├── bookingService.js
│   │   │   ├── seasonService.js
│   │   │   └── analyticsService.js
│   │   ├── repositories/    # 3. DATAADGANGSLAG: MySQL queries, transaktioner og connection pool
│   │   │   ├── db.js
│   │   │   ├── bookingRepository.js
│   │   │   ├── roomRepository.js
│   │   │   └── analyticsRepository.js
│   │   └── utils/           # Fælles hjælpere (fejlhåndtering, formatering)
│   └── tests/               # Integrationstests mod API og forretningslag
│
└── frontend/                # Browserfrontend til Booking-CRUD (React 18 + Vite + Tailwind CSS i MVVM-mønster)
    ├── Dockerfile           # Multi-stage build (Node build -> Nginx Alpine)
    ├── nginx.conf           # Nginx konfiguration (port 3000 med reverse proxy / api pass)
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── App.jsx          # MVVM App Container
        ├── models/          # 1. MODEL LAYER: Domænemodeller, valideringsregler og beregninger
        │   ├── BookingModel.js
        │   ├── RoomTypeModel.js
        │   └── AnalyticsModel.js
        ├── viewmodels/      # 2. VIEWMODEL LAYER: Custom hooks for reaktiv tilstand, filtre og handlinger
        │   ├── useBookingListViewModel.js
        │   ├── useBookingFormViewModel.js
        │   ├── useEditBookingViewModel.js
        │   ├── useDeleteBookingViewModel.js
        │   └── useAnalyticsViewModel.js
        ├── views/           # 3. VIEW LAYER: Præsentationskomponenter (UI) uden direkte forretningslogik
        │   ├── BookingListView.jsx
        │   ├── BookingFormView.jsx
        │   ├── EditBookingModalView.jsx
        │   ├── DeleteDialogView.jsx
        │   └── AnalyticsOverviewView.jsx
        ├── components/      # Kompatibilitets-aliasser der eksporterer respektive Views
        └── services/        # Dataadgang: HTTP klient mod backendens REST API
            └── api.js
```

---

## Complexity Tracking

> **Der er INGEN forfatningsmæssige overtrædelser (Violations).**

| Område | Løsning | Hvorfor nødvendig |
| :--- | :--- | :--- |
| **Tre-lagsopdeling** | Adskilte mapper `routes/`, `services/`, `repositories/` | Sikrer direkte sporbarhed til opgavens softwarearkitekturkrav uden at sprede SQL ud over hele applikationen. |
| **OpenAPI & Swagger UI** | Dedikeret `contracts/openapi.yaml` i separat Swagger container | Giver en 100 % uafhængig test- og dokumentationsportal for underviserne og Tableau-integrationen. |
| **Multi-stage Dockerfile i Frontend** | Bygger med Node.js, serverer med Nginx | Minimerer containerstørrelse (fra ~500 MB til ~25 MB) og garanterer lynhurtig indlæsning i browseren. |
