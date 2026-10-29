# Phase 0: Research & Technology Decisions

**Feature**: [spec.md](./spec.md) | **Feature Directory**: `specs/001-hotel-management`  
**Date**: 2026-10-29  
**Status**: Completed

Dette dokument konsoliderer de tekniske undersøgelser, arkitekturvalg og begrundelser for Hotel Kong Arthur-systemet (SCAMM) i henhold til projektets [Constitution](../../.specify/memory/constitution.md) og [spec.md](./spec.md).

---

## 1. Backend-arkitektur og Framework

- **Beslutning**: **Node.js (LTS v20+) med Express.js**.
- **Begrundelse**:
  - Express.js leverer en letvægts, hurtig og veldokumenteret HTTP-server, der er ideel til REST API'er med JSON.
  - Tre-lagsarkitekturen kan modelleres knivskarpt med tydelig adskillelse mellem routere (`presentation`), forretningslogik (`services`) og databaseadgang (`repositories`).
  - Giver native JSON-håndtering uden behov for komplekse serializers eller tung boilerplate.
  - Hurtig containeropstart i Docker med minimalt resourceforbrug.
- **Overvejede alternativer**:
  - *Python (FastAPI)*: Fremragende til databehandling og auto-genereret OpenAPI, men gruppen valgte Express.js grundet kendskab og direkte kontrol over routing.
  - *C# (.NET Web API)*: Stærkt typesystem, men tungere build-step og unødvendig kompleksitet for en to-ugers prototype.

---

## 2. Browserfrontend-arkitektur

- **Beslutning**: **React 18/19 med Vite (Single Page Application)**, containeriseret via en multi-stage Dockerfile med en letvægts **Nginx Alpine** webserver på port 3000.
- **Begrundelse**:
  - React komponentopdeling gør det let at adskille bookinglisten (`<BookingList />`), oprettelsesformularen (`<BookingForm />`), redigeringsmodalen (`<EditBookingModal />`) og bekræftelsesdialoger for sletning/aflysning.
  - Vite giver millisekund-hurtig byggetid og genererer optimerede, statiske produktionsfiler (`HTML/CSS/JS`), som Nginx serverer lynhurtigt uden behov for en kørende Node.js-proces i produktionscontaineren.
  - SPA-arkitekturen sikrer, at receptionisten kan oprette, rette og slette bookinger uden genindlæsning af browseren, hvilket giver en professionel og responsiv brugeroplevelse.
- **Overvejede alternativer**:
  - *Ren Vanilla JS (uden React)*: Færre filer, men manuel DOM-manipulation og mere skrøbelig synkronisering mellem modal-dialoger og bookingtabellen.
  - *Server-side rendered (EJS/Pug)*: Kræver genindlæsning af sider ved handlinger, hvilket modarbejder en moderne interaktiv applikationsoplevelse.

---

## 3. Database & Datapersistens

- **Beslutning**: **MySQL 8.0** med versionsstyret SQL-skema (`schema.sql`) og gentagelig seed-kode (`seed.sql`), orkestreret i Docker med et navngivet Docker volume (`mysql_data`).
- **Begrundelse**:
  - MySQL er et ufravigeligt krav i opgavebeskrivelsen og Constitution.
  - Understøtter ACID-transaktioner, fremmednøgler (`FOREIGN KEY`) og præcise decimaltyper (`DECIMAL(10,2)` for priser og beløb).
  - Dataadgangslaget i Node.js anvender biblioteket `mysql2/promise` med connection pooling for at sikre hurtige og asynkrone databasekald uden blokerende I/O.
- **Overvejede alternativer**:
  - *PostgreSQL / SQLite*: Ikke tilladt jf. opgavekravet.
  - *ORM (Prisma / TypeORM)*: Overvejet, men fravalgt til fordel for parametriserede SQL-queries i repositories for at bevare fuld gennemsigtighed og direkte kontrol over de aggregerede KPI-forespørgsler.

---

## 4. API-Kontrakt og Dokumentation

- **Beslutning**: **OpenAPI 3.0 (YAML)** defineret i `contracts/openapi.yaml`, serveret interaktivt via **Swagger UI i Docker** (eller monteret endpoint).
- **Begrundelse**:
  - Ufravigeligt krav i opgavebeskrivelsen.
  - OpenAPI 3.0 fungerer som en formel kontrakt mellem backend-udviklere, frontend-udviklere og Tableau-integrationen, så alle arbejder ud fra samme dataformater og fejlkoder.
  - Swagger UI giver øjeblikkelig mulighed for manuel integrationstest og demonstration af endpoints uden brug af browserfrontenden.
- **Overvejede alternativer**:
  - *Kode-genereret dokumentation (annotations)*: Ofte rodet og spreder specifikationen ud over mange filer; en dedikeret specifikationsfil i YAML sikrer kontrakt-først tilgang.

---

## 5. Tableau Dataforbindelse og Opdateringsmekanisme

- **Beslutning**: **Tableau Web Data Connector (WDC) / Web Connector** mod backendens `/api/analytics`-endpoints i JSON.
- **Begrundelse**:
  - Opfylder opgavens krav om, at dashboardet skal have *"udgangspunkt i backendens REST API"* og understøtte løbende dataopdatering.
  - Udelukker skjulte genveje direkte til MySQL og undgår statiske CSV-filer.
  - Connectoren foretager HTTP GET-kald til JSON-endpoints, parser svaret og overfører data til Tableau, så en genopfriskning (Refresh) i Tableau henter opdaterede tal på under 30 sekunder efter en bookingændring.
- **Overvejede alternativer**:
  - *Direkte ODBC/JDBC mod MySQL*: Eksplicit forbudt i Constitution, da det omgår API-kravet.
  - *Manuel CSV-eksport*: Dokumenterer ikke en levende datavej.

---

## 6. Sæsondatoer og Økonomisk Beregningsmodel

- **Beslutning**: Faste 4-måneders blokke for sæsoner:
  - **Lavsæson**: 1. november – 28./29. februar
  - **Mellemsæson**: 1. marts – 31. maj samt 1. september – 31. oktober
  - **Højsæson**: 1. juni – 31. august
- **Begrundelse**:
  - Besluttet i Clarify-fasen; dækker samtlige 365/366 dage i året uden overlap.
  - Beregning af sæsonomsætning sker på overnatningsniveau (`room_nights` / datointerval), så ophold over et sæsonskifte fordeles præcist.
  - Uden omkostningsdata beregnes og navngives udelukkende *omsætning* (revenue), aldrig estimeret profit.
  - Nøgletal (ADR, ALOS, Belægningsgrad) håndterer division med nul ved at returnere eksplicit `"Ikke beregnelig"` eller `0,0 %`.
