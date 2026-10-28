# Hotel Kong Arthur (SCAMM) — Tværfaglig Opgave Constitution

## Core Principles

### I. Tre-lagsarkitektur og Ansvarsadskillelse (NON-NEGOTIABLE)

Backenden SKAL opbygges efter en strikt tre-lagsarkitektur med tydelig kodeopdeling mellem lagene:
- **Præsentationslag (Presentation Layer)**: Håndterer REST-ruter, JSON-serialisering, syntaktisk inputformat, HTTP-statuskoder og svar. Laget MÅ IKKE indeholde skjulte SQL-forespørgsler eller forretningslogik.
- **Forretningslag (Business Logic Layer)**: Håndterer bookingregler (herunder dato- og statusvalidering), periode- og sæsonfortolkning samt koordinering af KPI-beregninger. Laget MÅ IKKE være koblet til browserens skærmopbygning eller direkte SQL-syntaks.
- **Dataadgangslag (Data Access Layer)**: Håndterer MySQL-forespørgsler, transaktioner, datapersistens og nødvendige databaseaggregeringer. SQL MÅ gerne udføre aggregering effektivt, men beregningsreglerne SKAL være fastlagt i specifikationen og styret af forretningslaget. Laget MÅ IKKE bestemme UI eller API'ets præsentationsformat.

*Rationale*: Sikrer vedligeholdelsesvenlig arkitektur, testbarhed på tværs af lag og fuld opfyldelse af softwarearkitekturkravene i opgavebeskrivelsen.

### II. Kontraktdrevet REST API, OpenAPI og Swagger UI (NON-NEGOTIABLE)

Systemets præsentationslag SKAL udstille et REST API med JSON som udvekslingsformat:
- API'ets kontrakt SKAL udarbejdes som en **OpenAPI-specifikation** før den fulde implementering påbegyndes.
- OpenAPI-kontrakten SKAL til enhver tid afspejle de faktiske endpoints, query-parametre, datatyper, dato-/årfiltre, fejlformater og JSON-schemaer — ikke en løs fremtidsplan.
- OpenAPI-specifikationen SKAL kunne tilgås og afprøves interaktivt via **Swagger UI kørende i en dedikeret Docker-container**.
- Ingen funktion eller AI-task må ændre API-svar eller ruter stiltiende uden først at opdatere OpenAPI-kontrakten og tilhørende dokumentation.

*Rationale*: Kontrakten binder browserfrontend, backend og Tableau-integration sammen og forhindrer integrationsfejl mellem gruppens komponenter.

### III. MySQL-Persistens, Booking-CRUD og Løbende Dataopdatering (NON-NEGOTIABLE)

Systemet SKAL fungere som en levende prototype med løbende ("live") dataopdatering — ikke blot en statisk analyse af historiske CSV-filer:
- **Database**: Systemets database SKAL være **MySQL** med versionsstyret schema/migrationer, fremmednøgler, præcise decimaltyper til beløb samt gentagelig seed-/importkode med dubletbeskyttelse baseret på eksempeldata fra `ITAKEA/hoteldata`.
- **Browserfrontend til Booking-CRUD**: Der SKAL leveres en simpel browserbaseret frontend (som prototype-erstatning for hotellets nuværende bookingsystem), hvori brugere kan læse (`GET`), oprette (`POST`), redigere (`PUT`) og slette/aflyse (`DELETE`) bookinger gennem backendens REST API.
- **Hotellets bookingsystem som ekstern klient**: I systemarkitekturen indgår hotellets eksisterende bookingsystem som en fremtidig/ekstern API-klient, der skriver til samme REST API.
- **Datavalidering**: Ugyldige datoer (f.eks. afrejsedato før eller lig ankomstdato) og ugyldige formater SKAL afvises i backenden uden at gemme halve registreringer. Semantik for sletning/aflysning SKAL være ensartet på tværs af frontend, REST API, database og KPI-beregninger.

*Rationale*: Opfylder hovedkravet om et dynamisk system, hvor ændringer foretaget i en browser lagres i MySQL og slår igennem i analyserne.

### IV. API-Drevet Tableau Analytics og Entydige KPI'er (NON-NEGOTIABLE)

Alle analyser og visualiseringer til beslutningstagere SKAL samles i et interaktivt **Tableau-dashboard med udgangspunkt i backendens REST API**:
- **Ingen skjult genvej**: Direkte Tableau-forbindelse til MySQL eller en manuel engangseksport til CSV opfylder IKKE kravet om en løsning med udgangspunkt i REST API'et og løbende opdatering. Den valgte connector-/adaptervej og opdateringsmekanisme (`API → Tableau`) SKAL afprøves tidligt og dokumenteres.
- **Én sandhedskilde for KPI'er**: Hvert nøgletal SKAL defineres præcist én gang i specifikation/plan og beregnes efter backendens dokumenterede regler. Tableau MÅ IKKE indføre konkurrerende KPI-formler eller ukritiske gennemsnit af daglige procentsatser.
- **Økonomisk redelighed**: Uden omkostningsdata dokumenteres og navngives *omsætning* (baseret på faktiske registrerede beløb, aldrig vejledende prisintervaller fra opgaveteksten). Ved nul i nævneren SKAL systemet og dashboardet vise `"ikke beregnelig"` eller en eksplicit tom værdi — aldrig en opdigtet `0 %`. Manglende land eller tomme kategorier SKAL være synlige frem for skjult som nul.

*Rationale*: Beslutningstagere på Hotel Kong Arthur skal kunne stole på, at tallene i Tableau er konsistente, forklarlige og opdaterede i forhold til driften.

### V. Containerisering med Docker Compose (NON-NEGOTIABLE)

Hele det udviklede tekniske system SKAL være containeriseret med Docker og orkestreret via Docker Compose:
- **Single-command opstart**: Alle systemets containerbaserede services SKAL kunne bygges og startes samlet med én enkelt `docker-compose up`-kommando.
- **Fast service- og portstruktur**: `docker-compose.yml` SKAL definere en klar struktur med dedikerede services og faste, dokumenterede porte for:
  1. `mysql` (MySQL-database med persistent Docker volume, så data overlever genstart)
  2. `backend` (3-lags REST API-applikation)
  3. `frontend` (Simpel browserfrontend til booking-CRUD)
  4. `swagger-ui` (Containeriseret Swagger UI bundet til OpenAPI-specifikationen)
- **Ærlig afgrænsning af Tableau-miljø**: Da Tableau Desktop/Public/Server typisk afvikles som klient/service uden for `docker-compose up`, SKAL opstart af egne Docker-services og forudsætninger/forbindelsesvej for Tableau dokumenteres tydeligt hver for sig i `README.md`.

*Rationale*: Sikrer reproducerbar afvikling på tværs af alle gruppemedlemmers maskiner.

### VI. Spec-Drevet Udvikling, AI-Ejerskab og Acceptkriteriekontrol (NON-NEGOTIABLE)

Projektet SKAL gennemføres med **GitHub Spec Kit** efter det faste workflow:
`Constitution → Specify → Clarify → Plan → Tasks → Implement → Converge`
- **Spec før kode**: Ingen produktionskode må skrives eller genereres af AI, før krav, user stories og acceptkriterier er beskrevet i `spec.md`, uklarheder er løst i `Clarify`, tekniske valg og kontrakter er fastlagt i `plan.md`, og arbejdet er brudt ned i `tasks.md`.
- **Kvalitetstjek med Checklister og Analyse**: Gruppen SKAL bruge checklister (`/speckit-checklist`) og krydsanalyse (`/speckit-analyze`) undervejs i forløbet til at kontrollere kvalitet og sammenhæng mellem `spec.md`, `plan.md` og `tasks.md`.
- **Én afgrænset task ad gangen**: AI-kodeagenter SKAL instrueres i at løse én specifik task ad gangen under overholdelse af tre-lagsarkitekturen og OpenAPI-kontrakten.
- **Fuldt gruppeejerskab og Code Review**: Gruppen (SCAMM) tager fuldt ejerskab for de udviklede produkter. Alle ændringer SKAL gennemgås via Pull Requests / Code Review før merge til `main`. Alle gruppemedlemmer SKAL bidrage med meningsfulde Git-commits og kunne forklare og vurdere alt, hvad gruppen eller AI'en har udviklet (arkitektur, kode, dataflow og beregningsformler).
- **Færdigkriterium (Definition of Done)**: Ingen task eller user story er færdig, før dens acceptkriterier er kontrolleret i praksis (tests, OpenAPI-validering, afstemning mod kendt testdatasæt og `Converge`-kontrol).

*Rationale*: Forhindrer uoverskuelig AI-genereret kode og sikrer sammenhæng mellem specifikation, implementering og dokumentation.

## Obligatoriske Case- og Analysekrav (Hotel Kong Arthur)

Alle funktionelle og analytiske krav fra opgavebeskrivelsen for **Hotel Kong Arthur** er ufravigelige rammekrav for projektet:

### 1. Domæne- og Kapacitetsrammer

- **Værelseskapacitet**: Hotel Kong Arthur råder over **214 værelser**, der afhængigt af størrelse og kategori huser 1–4 personer pr. værelse (maksimalt ca. 428 gæster ved fuld belægning). Ved beregning af belægningsgrad SKAL en verificeret værelsesbestand anvendes; der MÅ IKKE gættes på en uverificeret personkapacitet.
- **De 8 værelsestyper**: Systemet og datamodellen SKAL understøtte hotellets 8 værelsestyper (prisintervaller fra opgavebeskrivelsen er kun vejledende domænekontekst og MÅ IKKE bruges som faktisk realiseret omsætning):
  1. *Standard enkeltværelse* (vejledende ca. 900–1.200 DKK/nat)
  2. *Grand lit værelse / dobbelt økonomi* (vejledende ca. 1.100–1.400 DKK/nat)
  3. *Standard dobbeltværelse* (vejledende ca. 1.200–1.600 DKK/nat)
  4. *Superior dobbeltværelse* (vejledende ca. 1.400–2.000 DKK/nat)
  5. *Junior suite* (vejledende ca. 1.800–2.500 DKK/nat)
  6. *Spa executive* (vejledende ca. 2.000–2.800 DKK/nat, inkl. spa/behandlinger)
  7. *Suite* (vejledende ca. 2.500–3.500 DKK/nat)
  8. *LOFT suite* (vejledende ca. 3.000–4.000 DKK/nat)
- **De 3 sæsoner**: Systemet SKAL understøtte opdeling i *Lavsæson* (vintermånederne), *Mellemsæson* (forår og efterår) og *Højsæson* (sommer og juletid) med eksplicitte, ikke-overlappende datointervaller og faste regler for ophold hen over sæson- og årsskifte (fastlåses i Clarify/Plan).
- **Lobbyens Cocktailbar**: Hotellet driver en lobbybar med cocktails (kombineret med snacks), vin, øl og kaffe. Receptionisten **Helene Christine** arbejder også i baren, hvor hun laver 20 forskellige cocktails og 10 forskellige kaffetyper.

### 2. Obligatoriske Analyse- og Dashboardkrav

Med udgangspunkt i backendens REST API SKAL løsningen og det interaktive Tableau-dashboard beregne og vise:
1. **Gæstefordeling pr. land**: Hvor gæsterne kommer fra, fordelt på lande (med synlig kategori for evt. manglende land).
2. **Indtjening pr. værelsestype og sæson**: Omsætning fordelt på de 8 værelsestyper og 3 sæsoner.
3. **Indtjening pr. land**: Omsætning fordelt på land uden dobbelttælling ved flere gæster på samme booking.
4. **Mest indbringende værelser**: Hvilke værelser Hotel Kong Arthur tjener flest penge på (afklares eksplicit i `Clarify` mellem konkrete værelsesnumre, værelsestyper eller begge dele før datamodellen låses).
5. **Mest indbringende lande**: Hvilke lande Hotel Kong Arthur tjener flest penge på (sorteret rangering).
6. **Årets indtjening for hotellet**: Samlet hotelomsætning for et valgt år (med tydelig angivelse af inkluderede indtægtskategorier).
7. **Selvvalgt interessant nøgletal**: Minimum ét ekstra, dokumenterbart nøgletal valgt af gruppen (f.eks. *ADR — Average Daily Rate*, fastlåses i Specify/Clarify).
8. **Helene Christines samlede barsalg for året**: Totalomsætning i baren for Helene Christine i et valgt år, filtreret via stabilt medarbejder-ID (så andre medarbejderes salg aldrig indgår).
9. **Omsætning pr. drink**: Barsalg grupperet og sorteret pr. drink/produkt (med tydelig markering af, om udsnittet gælder hele baren eller Helene Christine).
10. **Procentfordeling af cocktails og kaffe for Helene Christine**: Fordeling mellem kategorierne *cocktails* og *kaffe* for Helene Christine i et valgt år (med eksplicit valg og navngivning af antalandel vs. omsætningsandel).
11. **Belægningsgrad (Systemkrav)**: Skal indgå i projektets KPI-definitioner, API og dashboard (optagne værelsesnætter divideret med tilgængelige værelsesnætter × 100).
12. **Kundetilfredshed (Systemkrav)**: Nævnes i de overordnede systemkrav; datagrundlag, skala og forventet visning SKAL afklares som et eksplicit `Clarify`-punkt før datamodellen låses og dokumenteres i specifikation og dashboard (må aldrig forsvinde stiltiende, og et tomt datasæt må aldrig vises som `0` i tilfredshed).

## Tekniske Rammer, Konventioner og Bevidste Fravalg

### 1. Tekniske Valg, der Fastlåses i Plan-fasen

- **Backend-programmeringssprog og framework**: Holdes åbent i Constitution (jf. opgavekravet *"Programmeringssprog er frit"*) og fastlåses i `plan.md`.
- **Frontend-teknologi**: Holdes åbent i Constitution (kravet er en simpel browserbaseret frontend til booking-CRUD) og fastlåses i `plan.md`.

### 2. Sprog- og Navngivningskonventioner

- **Engelsk i kode og tekniske kontrakter**: Al kildekode, variabel-/funktionsnavne, MySQL-tabel- og kolonnenavne (`bookings`, `room_types`, `sale_lines` osv.), REST API-ruter (`/bookings`, `/analytics/...`) samt JSON-nøgler SKAL skrives på **engelsk**.
- **Dansk i dokumentation og dashboard**: Alle Spec Kit-artefakter (`.specify/memory/constitution.md` samt `spec.md`, `plan.md`, `tasks.md`, `checklists/` og `converge.md` under `specs/<feature>/`), `README.md`, `CONTRIBUTE.md` samt overskrifter og forklaringer i Tableau-dashboardet SKAL skrives på **dansk**.

### 3. Bevidste Fravalg (Out of Scope)

For at sikre en fuldt sammenhængende og gennemtestet prototype inden for det 2-ugers tværfaglige miniprojekt fravælges følgende eksplicit:
- Ingen microservices-arkitektur (systemet bygges som én samlet 3-lags backend med tilhørende services i Docker Compose).
- Ingen AI/ML-baserede prognosemodeller eller uefterspurgte tredjepartsintegrationer.
- Ingen selvstændige forretnings- eller strategirapporter uden for Spec Kit (ingen BMC, PESTEL, SWOT, TOWS, Capability Mapping, SIPOC, omfattende BPMN AS-IS/TO-BE, personaer, fem-dages Design Sprint eller separat Figma-prototype).
- Ingen parallelle dokumentpakker (ingen separate ADR- eller RACI-dokumenter); alle krav, user stories og afklaringer samles i `spec.md`, mens arkitektur, ER-model, dataordbog, KPI-definitioner og forbindelsesvalg samles i `plan.md` (eller direkte linkede bilag).

## Udviklingsworkflow, Kvalitetskrav og Afleveringspakke

### 1. Krav til User Stories, Specifikation og Kvalitetstjek (`Specify`, `Clarify`, `Checklist` & `Analyze`)

- User stories SKAL skrives i formatet: *"Som `<rolle>` ønsker jeg `<mål>`, så `<forretningsværdi>`"* og dække de fem storyområder: **Bookinger**, **Bookingændring**, **Hotelanalyse**, **Baranalyse** og **Opdatering**.
- Hver user story SKAL overholde **INVEST**-principperne (*Independent, Negotiable, Valuable, Estimable, Small, Testable*) og **The Three Cs** (*Card, Conversation, Confirmation*) med konkrete, testbare acceptkriterier.
- Alle åbne fortolkningsspørgsmål (betydning af "live", sæsongrænser, gæstetælling, landtilskrivning, slet- vs. aflys-semantik, konkrete værelser vs. værelsestyper samt kundetilfredshed) SKAL afklares og besluttes i `Clarify` før fuld implementering.
- Undervejs mellem `Specify`, `Plan` og `Tasks` SKAL der anvendes Spec Kit-checklister (`/speckit-checklist`) og sammenhængsanalyse (`/speckit-analyze`) til at verificere, at alle krav og acceptkriterier er dækket uden modstrid.

### 2. Krav til Testdatasæt og `Converge`-kontrol

- Gruppen SKAL opbygge et lille, kontrollerbart syntetisk testdatasæt med kendte forventede resultater (inkl. ophold over årsskifte og sæsongrænse, aflyst booking, booking med flere gæster, mindst to lande samt manglende land, barsalg fra både Helene Christine og en anden medarbejder samt forskellige antal/priser på cocktails og kaffe).
- Forventede tal SKAL beregnes uafhængigt af produktionskoden og afstemmes mod både SQL-output, REST API-svar og Tableau-visning.
- `Implement → Converge` gentages løbende. Resultatet af den samlede kontrol dokumenteres i repositoryet (f.eks. i `specs/<feature>/converge.md`) med status (*Bestået / Fejlet / Ikke testet*) og evt. restarbejde.

### 3. Obligatoriske Leverancer i Projektet

Ved projektets afslutning SKAL følgende tekniske og analytiske leverancer foreligge og være fuldt afstemt:
- **GitHub-repository**:
  - Spec Kit-artefakter: `.specify/memory/constitution.md` (linket fra `README.md`) samt `spec.md`, `plan.md`, `tasks.md`, `checklists/` og sidste `Converge`-resultat i `specs/<feature>/`-mappen.
  - Kildekode til backend med tydelig 3-lagsopdeling, browserfrontend til booking-CRUD, MySQL-schema/migrationer og seed-/importkode.
  - OpenAPI-specifikation og Swagger UI i Docker-container.
  - `Dockerfile`(s) og `docker-compose.yml`, der starter hele løsningen med `docker-compose up`.
  - `README.md` med opsætning, opstart, porte/adresser, datagrundlag, opdateringsvej, link til Constitution og **ét samlet arkitekturdiagram** over hele løsningen.
  - `CONTRIBUTE.md` (med netop dette filnavn fra opgaveteksten) med gruppens arbejds-, branch-/PR- og bidragsvejledning.
  - Meningsfulde Git-commits fra alle gruppemedlemmer i SCAMM.
- **Tableau-leverance**:
  - Interaktivt Tableau-dashboard/workbook med alle krævede hotel- og barvisninger, filtre, selvvalgt KPI og afklaret håndtering af belægningsgrad og kundetilfredshed.
  - Kort vejledning til at åbne løsningen, forbinde til REST API'et og udføre refresh uden adgangskoder eller personfølsomme oplysninger.

## Governance

- **Højeste autoritet**: Denne Constitution udgør de ufravigelige tekniske, faglige og procesmæssige rammer for Hotel Kong Arthur-projektet (SCAMM) og har forrang over alle øvrige dokumenter, planer og AI-instruktioner. Faste opgavekrav kan aldrig gøres valgfrie.
- **Ændringsprocedure (Amendments)**: Hvis en afklaring i `Clarify` eller en teknisk opdagelse i `Plan` kræver ændring af rammerne, SKAL det dokumenteres via en opdatering af `.specify/memory/constitution.md` (med versionsbump efter semantisk versionering: MAJOR ved ændrede principper, MINOR ved nye sektioner/principper, PATCH ved sproglige præciseringer) og godkendes i gruppen via Pull Request.
- **Efterlevelseskontrol (Compliance Review)**: Ved hvert Pull Request og i hvert `Converge`-trin SKAL gruppen kontrollere, at ændringen overholder tre-lagsarkitekturen, OpenAPI-kontrakten, KPI-definitionerne og acceptkriterierne i denne Constitution.

**Version**: 1.0.0 | **Ratified**: 2026-10-27 | **Last Amended**: 2026-10-27
