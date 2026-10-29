# Capability Map: Hotel Kong Arthur — SCAMM Platform

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Tasks**: [tasks.md](./tasks.md)  
**Branch**: `specify` | **Dato**: 2026-10-29  
**Status**: Ratificeret

Dette dokument definerer **Business Capability Map** for Hotel Kong Arthur-platformen (SCAMM). Et Capability Map beskriver *hvad* forretningen og systemet er i stand til at gøre (kapabiliteter), uafhængigt af *hvordan* det implementeres teknologisk, og etablerer den direkte bro mellem forretningskrav, softwarearkitektur og de konkrete user stories.

---

## 1. Visuelt Capability Map (Level 1 & Level 2)

```mermaid
graph TB
    subgraph KONG_ARTHUR["Hotel Kong Arthur Enterprise Capabilities"]
        subgraph C1["1. Gæste- & Reservationsadministration"]
            C1_1["1.1 Bookingoprettelse & Validering"]
            C1_2["1.2 Bookingmodifikation & Fleksibilitet"]
            C1_3["1.3 Aflysning & Soft-Delete Historik"]
            C1_4["1.4 Gæsteprofilering & Oprindelse"]
        end

        subgraph C2["2. Kapacitets- & Værelsesstyring"]
            C2_1["2.1 Værelseskatalog (8 typer, 214 værelser)"]
            C2_2["2.2 Værelsesallokering & Konflikthåndtering"]
            C2_3["2.3 Belægningsgradsoptimering"]
            C2_4["2.4 Sæsonkalibrering & Dynamisk Prissætning"]
        end

        subgraph C3["3. F&B & Lobbybar Drift"]
            C3_1["3.1 Barsalgsregistrering & Point-of-Sale"]
            C3_2["3.2 Sortimentsstyring (20 Cocktails & 10 Kaffe)"]
            C3_3["3.3 Bartender- & Medarbejdersporing (Helene Christine)"]
            C3_4["3.4 Volumen- & Værdifordeling (DKK vs. Stk.)"]
        end

        subgraph C4["4. Business Intelligence & Analytics"]
            C4_1["4.1 Økonomisk Hovednøgletalskonsolidering"]
            C4_2["4.2 Geografisk Omsætningsanalyse (Lande)"]
            C4_3["4.3 Værelsesafkast & Sæsonrentabilitet"]
            C4_4["4.4 Hotelnøgletalsanalyse (ADR & ALOS)"]
            C4_5["4.5 Gæstetilfredshedsmåling (CSAT 1-5)"]
            C4_6["4.6 Tableau Live Dataudtræk (< 30s)"]
        end

        subgraph C5["5. Platform, Integration & Sikkerhed"]
            C5_1["5.1 Åben API-Kontraktstyring (OpenAPI/Swagger)"]
            C5_2["5.2 Transaktionssikkerhed & Dataintegritet (ACID)"]
            C5_3["5.3 Multi-Container Drift (Docker Compose)"]
            C5_4["5.4 Receptionist Webgrænseflade (SPA UI)"]
        end
    end

    classDef core fill:#dbeafe,stroke:#1d4ed8,stroke-width:2px;
    classDef diff fill:#dcfce7,stroke:#15803d,stroke-width:2px;
    classDef supp fill:#fef3c7,stroke:#b45309,stroke-width:2px;

    class C1,C1_1,C1_2,C1_3,C1_4 core;
    class C2,C2_1,C2_2,C2_3,C2_4 core;
    class C3,C3_1,C3_2,C3_3,C3_4 supp;
    class C4,C4_1,C4_2,C4_3,C4_4,C4_5,C4_6 diff;
    class C5,C5_1,C5_2,C5_3,C5_4 supp;
```

> **Farvekoder for strategisk kapabilitetsrolle**:
> - 🟦 **Kerne (Core)**: Forudsætning for daglig hoteldrift og drift af bookinger.
> - 🟩 **Differentierende (Differentiating)**: Giver ledelsen konkurrencefordele via realtids Business Intelligence og Tableau.
> - 🟨 **Understøttende / Enabler (Supporting)**: Teknisk fundament, kassedrift og containerinfrastruktur.

---

## 2. Detaljeret Kapabilitetskatalog

### Kapabilitetsdomæne 1: Gæste- & Reservationsadministration
*Formål*: Sikre problemfri modtagelse, administration og historik for hotellets gæster og reservationer.

| Kapabilitet ID | Navn | Beskrivelse (Hvad forretningen kan) | Strategisk Type | Relaterede User Stories | Relaterede Tasks |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CAP-1.1** | Bookingoprettelse & Validering | Oprette nye reservationer i realtid med øjeblikkelig validering af ankomst/afrejse, gæsteantal (1-4) og kontaktinformation. | Kerne (MVP) | `US02` | `T017`, `T018`, `T019`, `T021` |
| **CAP-1.2** | Bookingmodifikation | Redigere opholdsdatoer, gæstedata, værelsestype og beregne ny totalpris på eksisterende reservationer. | Kerne (P1) | `US03` | `T023`, `T024`, `T025`, `T026`, `T027` |
| **CAP-1.3** | Aflysning & Soft-Delete | Annullere reservationer med øjeblikkelig frigivelse af værelset, mens data bevares til revisionsspor og regnskab. | Kerne (P1) | `US04` | `T028`, `T029`, `T030`, `T031`, `T032` |
| **CAP-1.4** | Gæsteprofilering & Fremsøgning | Fremsøge bookinger på tværs af gæstenavn, ID og status samt registrere gæsternes nationalitet/land. | Kerne (MVP) | `US01` | `T013`, `T014`, `T015`, `T016`, `T020` |

---

### Kapabilitetsdomæne 2: Kapacitets- & Værelsesstyring
*Formål*: Maksimere udnyttelsen af hotellets faste bygningsmasse (214 værelser) og optimere indtægtsgrundlaget.

| Kapabilitet ID | Navn | Beskrivelse (Hvad forretningen kan) | Strategisk Type | Relaterede User Stories | Relaterede Tasks |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CAP-2.1** | Værelseskatalog & Inventar | Administrere hotellets faste bestand af 214 fysiske værelser fordelt på de 8 officielle værelsestyper og 5 etager. | Kerne (P1) | `US01`, `US02` | `T007`, `T008`, `T013` |
| **CAP-2.2** | Værelsesallokering | Tildele konkrete ledige værelser og forhindre dobbeltbookinger via overlapskontrol på datointervaller. | Kerne (MVP) | `US02`, `US03` | `T013`, `T018`, `T023` |
| **CAP-2.3** | Belægningsgradsoptimering | Beregne den officielle belægningsprocent: $\frac{\text{Optagne nætter}}{214 \times \text{dage}} \times 100$ på måneds- og årsbasis. | Differentierende | `US08` | `T035`, `T036`, `T037`, `T038` |
| **CAP-2.4** | Sæson- & Prisstyring | Klassificere hoteldrift i 3 faste 4-måneders sæsoner (lav, mellem, høj) og estimere prisintervaller (800–4.000 DKK). | Kerne (P1) | `US05`, `US06`, `US11` | `T033`, `T034`, `T040` |

---

### Kapabilitetsdomæne 3: F&B & Lobbybar Drift
*Formål*: Registrere og analysere salg i hotellets lobbybar med særligt fokus på produktkategorier og nøglepersonale.

| Kapabilitet ID | Navn | Beskrivelse (Hvad forretningen kan) | Strategisk Type | Relaterede User Stories | Relaterede Tasks |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CAP-3.1** | Barsalgsregistrering | Registrere salgstransaktioner med tidsstempel, medarbejder-ID, varelinjer og totalbeløb i DKK. | Understøttende | `US07`, `US17` | `T007`, `T008`, `T034`, `T045` |
| **CAP-3.2** | Sortimentsadministration | Håndtere menukortet i lobbybaren med minimum 20 cocktails og 10 kaffetyper samt stykpriser. | Understøttende | `US18` | `T007`, `T008`, `T046` |
| **CAP-3.3** | Bartenderperformance | Isolere og analysere salgsaktivitet for bartender/receptionist Helene Christine (`HC01`) separat fra andre medarbejdere. | Differentierende | `US17`, `US19`, `US20` | `T045`, `T047`, `T049` |
| **CAP-3.4** | Volumen- & Værdifordeling | Beregne procentvis fordeling mellem cocktails og kaffe for Helene Christine i både omsætningsværdi (DKK) og volumen (stk.). | Differentierende | `US20` | `T047`, `T049` |

---

### Kapabilitetsdomæne 4: Business Intelligence & Analytics
*Formål*: Konsolidere driftsdata til handlingsorienterede nøgletal og give ledelsen direkte adgang via interaktive Tableau dashboards.

| Kapabilitet ID | Navn | Beskrivelse (Hvad forretningen kan) | Strategisk Type | Relaterede User Stories | Relaterede Tasks |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CAP-4.1** | Økonomisk Hovedkonsolidering | Beregne total hotelomsætning, værelsesindtægt, barindtægt og bar-andel i procent for en vilkårlig tidsperiode. | Differentierende | `US05`, `US06`, `US07` | `T034`, `T036`, `T037`, `T038` |
| **CAP-4.2** | Geografisk Markedsanalyse | Identificere gæsternes bopælslande og rangordne hvilke lande der genererer størst indtjening og flest bookinger (inkl. 'Ukendt'). | Differentierende | `US09`, `US10` | `T039`, `T043`, `T044` |
| **CAP-4.3** | Værelsesafkast & Sæsonanalyse | Analysere hvilke værelsestyper hotellet tjener flest penge på fordelt på de 3 sæsoner. | Differentierende | `US11`, `US12`, `US13` | `T040`, `T043`, `T044` |
| **CAP-4.4** | Hotelnøgletalsanalyse (ADR & ALOS) | Beregne gennemsnitlig dagspris pr. værelse (ADR) og gennemsnitlig opholdslængde (ALOS) pr. land og værelsestype. | Differentierende | `US14`, `US15`, `US16` | `T041`, `T042`, `T044` |
| **CAP-4.5** | Kundetilfredshedsmåling | Beregne gennemsnitlig rating (1–5 stjerner) og antal anmeldelser for at vurdere gæsteoplevelsen. | Differentierende | `US21` | `T048` |
| **CAP-4.6** | Tableau Live Dataudtræk | Udstille en Web Data Connector (WDC), der overfører frisk JSON-analysedata til Tableau på under 30 sekunder. | Differentierende | `US05`–`US21` | `T050`, `T053` |

---

### Kapabilitetsdomæne 5: Platform, Integration & Sikkerhed
*Formål*: Sikre systemets arkitektoniske integritet, overholdelse af API-standarder og enkel udrulning.

| Kapabilitet ID | Navn | Beskrivelse (Hvad forretningen kan) | Strategisk Type | Relaterede User Stories | Relaterede Tasks |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CAP-5.1** | API Kontraktstyring | Serverer en standardiseret OpenAPI 3.0 specifikation og interaktiv Swagger UI til tredjepartsintegration. | Enabler | `Alle` | `T011` |
| **CAP-5.2** | Dataintegritet & Transaktioner | Håndhæve 3. normalform (3NF), relationelle fremmednøgler og ACID transaktioner via MySQL 8.0 connection pool. | Enabler | `Alle` | `T007`, `T009` |
| **CAP-5.3** | Containeriseret Orkestrering | Køre alle fire services (`mysql`, `backend`, `frontend`, `swagger-ui`) via en enkelt `docker-compose up` kommando. | Enabler | `Alle` | `T004`, `T005`, `T006` |
| **CAP-5.4** | Receptionist Webgrænseflade | Udstille en responsiv Single Page Application (React/Tailwind) til receptionister uden behov for eksterne værktøjer. | Enabler (MVP) | `US01`–`US04` | `T003`, `T020`, `T021`, `T022`, `T026`, `T031`, `T038` |

---

## 3. Kapabilitet til Systemkomponent-Mapping (Arkitektur)

Nedenstående matrix viser, hvordan forretningskapabiliteterne realiseres af systemets tekniske komponenter:

| Kapabilitet | Frontend (React UI) | Backend Controller/Route | Backend Service | Dataadgang (Repository) | Database (MySQL Tabeller) | Ekstern BI (Tableau) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Booking Opret & Søg** | `BookingList`, `BookingForm` | `bookingRoutes.js` | `bookingService.js` | `bookingRepository.js` | `bookings`, `guests`, `rooms` | – |
| **Booking Ret & Slet** | `EditBookingModal`, `DeleteDialog` | `bookingRoutes.js` | `bookingService.js` | `bookingRepository.js` | `bookings` (status update) | – |
| **Belægning (214 r.)** | `AnalyticsOverview` | `analyticsRoutes.js` | `analyticsService.js` | `analyticsRepository.js` | `bookings`, `rooms` | Tableau Dashboard |
| **Sæson- & Prisanalyse** | – | `analyticsRoutes.js` | `seasonService.js` | `analyticsRepository.js` | `bookings`, `room_types` | Tableau Dashboard |
| **Helene Christine Bar** | – | `analyticsRoutes.js` | `analyticsService.js` | `analyticsRepository.js` | `sales`, `sale_lines`, `employees` | Tableau Bar Sheet |
| **ADR & ALOS Nøgletal** | `AnalyticsOverview` | `analyticsRoutes.js` | `analyticsService.js` | `analyticsRepository.js` | `bookings`, `room_types` | Tableau KPI Card |
| **Tableau Live Feed** | – | `/tableau-wdc.html` | `/api/analytics/*` | `analyticsRepository.js` | MySQL 8.0 Persistent | Tableau WDC (< 30s) |

---

## 4. Prioriterings- og Modenhedshierarki

```mermaid
quadrantChart
    title Kapabilitet Modenhed & Forretningsværdi
    x-axis Lav Forretningsdifferentiering --> Høj Forretningsdifferentiering
    y-axis Understøttende Drift --> Strategisk Ledelsesværdi
    quadrant-1 Strategiske Vækstdrivere
    quadrant-2 Differentierende Beslutningsstøtte
    quadrant-3 Tekniske Enablers
    quadrant-4 Kritiske Driftsfundamenter
    "Tableau Live WDC": [0.85, 0.90]
    "Helene Christine Baranalyse": [0.80, 0.65]
    "Sæson- & Værelsesyield": [0.75, 0.85]
    "Geografisk Markedsanalyse": [0.70, 0.75]
    "Belægningsgradsoptimering": [0.60, 0.80]
    "Booking Opret & Validering (MVP)": [0.35, 0.40]
    "Booking Modifikation (P1)": [0.30, 0.35]
    "Aflysning / Soft Delete (P1)": [0.25, 0.30]
    "MySQL ACID Dataintegritet": [0.15, 0.20]
    "Docker Compose Orkestrering": [0.20, 0.15]
    "OpenAPI / Swagger UI": [0.30, 0.25]
```

### Konklusion og Næste Skridt
Capability Mappet fastlægger det udtømmende omfang af hvad Hotel Kong Arthur platformen kan levere. Det garanterer:
1. **Sporbarhed**: Enhver af de 54 tasks i Jira og enhver kildekodefil refererer direkte tilbage til en defineret forretningskapabilitet.
2. **Forankring**: Både receptionisternes daglige behov (CRUD) og ledelsens strategiske behov (Tableau/Analytics) er ligeværdigt dækket.
3. **Klarhed for censor & undervisere**: Arkitekturen kan præsenteres og forsvares med udgangspunkt i virksomhedens forretningsmæssige kapabiliteter.
