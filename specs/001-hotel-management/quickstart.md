# Quickstart & Validation Guide: Hotel Kong Arthur Platform

**Feature**: [spec.md](./spec.md) | **Feature Directory**: `specs/001-hotel-management`  
**Date**: 2026-10-29  
**Status**: Ready for Implementation

Denne guide dokumenterer, hvordan systemet bygges, startes og valideres end-to-end ved hjælp af Docker Compose og REST API'et i henhold til projektets [Constitution](../../.specify/memory/constitution.md).

---

## 1. Forudsætninger & Systemkrav

- **Docker Desktop** (version 24+ med Docker Compose v2)
- **Git**
- **Tableau Desktop / Tableau Web Data Connector** (til analysevisning)
- En åben browser (Chrome, Edge, Firefox el. Safari)

---

## 2. Opstart med én enkelt kommando

Hele det tekniske system bygges og startes fra repositoryets rodmappe med:

```bash
docker-compose up --build -d
```

### Services og Port-adresser:

| Service | Port | Beskrivelse | URL |
| :--- | :--- | :--- | :--- |
| **Frontend** | `3000` | React (Vite) Single Page Application (Nginx) | [http://localhost:3000](http://localhost:3000) |
| **Backend** | `5000` | Node.js Express 3-lags REST API | [http://localhost:5000/api](http://localhost:5000/api) |
| **Swagger UI** | `8080` | Containeriseret OpenAPI 3.0 dokumentation | [http://localhost:8080](http://localhost:8080) |
| **MySQL Database**| `3306` | MySQL 8.0 med persistent Docker volume | `localhost:3306` |

---

## 3. Trin-for-trin End-to-End Valideringsscenarier

### Testscenarie 1: Verificér Swagger UI og OpenAPI-kontrakt
1. Åbn [http://localhost:8080](http://localhost:8080) i browseren.
2. Kontrollér, at kontrakten indlæser alle endpoints for `/api/bookings` og `/api/analytics`.
3. Udfør et test-kald på `GET /api/room-types`:
   - **Forventet resultat**: HTTP 200 OK med de 8 officielle værelsestyper (Standard enkelt, Grand lit, Standard dobbelt, Superior dobbelt, Junior suite, Spa executive, Suite, LOFT suite).

### Testscenarie 2: Browserfrontend & Bookingliste
1. Åbn [http://localhost:3000](http://localhost:3000).
2. Verificér, at bookingoversigten viser de seedede bookinger fra MySQL med gæstenavn, land, værelsestype, datoer og beløb.
3. Test søgebaren ved at skrive et navn (f.eks. "Hansen"):
   - **Forventet resultat**: Listen filtreres øjeblikkeligt uden genindlæsning af siden.

### Testscenarie 3: Opret en ny booking (Happy Path)
1. I browserfrontenden, udfyld formularen "Opret ny booking":
   - **Gæstenavn**: "Mette Frederiksen"
   - **Land**: "Danmark"
   - **Værelsestype**: "Superior Dobbeltværelse"
   - **Ankomst**: 2026-11-15 | **Afrejse**: 2026-11-18 (3 nætter)
   - **Antal gæster**: 2
   - **Totalpris**: 4.500 DKK
2. Klik "Opret booking":
   - **Forventet resultat**: Ny booking vises straks i tabellen, og backend returnerer HTTP 201 Created.

### Testscenarie 4: Valideringsafvisning (Negativ test)
1. Forsøg at oprette en booking, hvor afrejsedato er før ankomstdato (f.eks. 2026-11-15 til 2026-11-12).
   - **Forventet resultat**: Forretningslaget afviser anmodningen med HTTP 400 Bad Request, en rød fejlmeddelelse vises i interfacet, og ingen halve rækker gemmes i MySQL.

### Testscenarie 5: Ret og Slet/Aflys (Soft Delete)
1. Klik "Redigér" på den nyoprettede booking, forlæng opholdet med 1 nat, og gem:
   - **Forventet resultat**: Afrejsedato opdateres i oversigten og i MySQL.
2. Klik "Slet" på bookingen og bekræft dialogen:
   - **Forventet resultat**: Bookingen markeres som `cancelled` i MySQL og fjernes straks fra den aktive liste.

### Testscenarie 6: Tableau Data-refresh & Nøgletalskontrol
1. Åbn Tableau og forbind via Web Data Connector mod [http://localhost:5000/api/analytics/summary](http://localhost:5000/api/analytics/summary).
2. Udløs en opdatering (Refresh Data Source):
   - **Forventet resultat**: Belægningsgrad, totalomsætning og ADR opdateres inden for under 30 sekunder. Den aflyste booking indgår ikke i den realiserede omsætning.

### Testscenarie 7: Datapersistens over containergenstart
1. Kør `docker-compose down` i terminalen.
2. Kør derefter `docker-compose up -d`.
3. Genindlæs [http://localhost:3000](http://localhost:3000):
   - **Forventet resultat**: Alle data, ændringer og bookinger bevares intakt i det tilknyttede Docker volume `mysql_data`.
