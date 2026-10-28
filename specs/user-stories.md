# Hotel Kong Arthur — User Stories & Acceptkriterier

Dette dokument indeholder samtlige **21 user stories** for Hotel Kong Arthur-systemet (SCAMM), udarbejdet i henhold til **The Three Cs** (*Card, Conversation, Confirmation*) og valideret op imod **INVEST**-principperne (*Independent, Negotiable, Valuable, Estimable, Small, Testable*).

---

## Indholdsfortegnelse
- [Del 1: Booking-CRUD (Browserfrontend & REST API)](#del-1-booking-crud-browserfrontend--rest-api)
  - [US-01: Fremsøge bookinger (Read / Search)](#us-01-fremsøge-bookinger-read--search)
  - [US-02: Oprette ny booking (Create)](#us-02-oprette-ny-booking-create)
  - [US-03: Rette i en booking (Update)](#us-03-rette-i-en-booking-update)
  - [US-04: Slette eller aflyse en booking (Delete)](#us-04-slette-eller-aflyse-en-booking-delete)
- [Del 2: Forretningsdesign & Analytics (Tableau & REST API)](#del-2-forretningsdesign--analytics-tableau--rest-api)
  - [Tema A: Samlet Hotelomsætning & Indtægtsfordeling](#tema-a-samlet-hotelomsætning--indtægtsfordeling)
    - [US-05 (1): Samlet indkomst hele hotellet (Værelser + Bar)](#us-05-1-samlet-indkomst-hele-hotellet-værelser--bar)
    - [US-06 (2): Samlet indkomst for Booking](#us-06-2-samlet-indkomst-for-booking)
    - [US-07 (3): Samlet indkomst for baren og fordeling mod booking](#us-07-3-samlet-indkomst-for-baren-og-fordeling-mod-booking)
  - [Tema B: Geografiske Analyser (Lande, Omsætning & Opholdslængde)](#tema-b-geografiske-analyser-lande-omsætning--opholdslængde)
    - [US-08 (4): Årlig indkomst pr. land (Top-lande)](#us-08-4-årlig-indkomst-pr-land-top-lande)
    - [US-09 (5): Sæsonpræget indkomst pr. land](#us-09-5-sæsonpræget-indkomst-pr-land)
    - [US-10 (6): Hvilke lande booker samlet set længst ophold (ALOS)](#us-10-6-hvilke-lande-booker-samlet-set-længst-ophold-alos)
    - [US-11 (7): Hvilke lande booker længst ophold pr. sæson](#us-11-7-hvilke-lande-booker-længst-ophold-pr-sæson)
  - [Tema C: Værelses- & Segmentanalyser](#tema-c-værelses--segmentanalyser)
    - [US-12 (8): Hvilke lande booker overordnet hvilke værelsestyper](#us-12-8-hvilke-lande-booker-overordnet-hvilke-værelsestyper)
    - [US-13 (9): Hvilke lande booker hvilke værelsestyper pr. sæson](#us-13-9-hvilke-lande-booker-hvilke-værelsestyper-pr-sæson)
    - [US-14 (10): Hvilken værelsestype tjener vi overordnet mest på](#us-14-10-hvilken-værelsestype-tjener-vi-overordnet-mest-på)
    - [US-15 (11): Hvilken værelsestype tjener vi mest på ift. sæson](#us-15-11-hvilken-værelsestype-tjener-vi-mest-på-ift-sæson)
    - [US-16 (12): Værelsestyper med længst bookingperiode (Årlig oversigt)](#us-16-12-værelsestyper-med-længst-bookingperiode-årlig-oversigt)
    - [US-17 (13): Værelsestyper med længst bookingperiode pr. sæson](#us-17-13-værelsestyper-med-længst-bookingperiode-pr-sæson)
  - [Tema D: Bar- & Menu-analyser (Lobbybar & Cocktails)](#tema-d-bar--menu-analyser-lobbybar--cocktails)
    - [US-18 (14): Samlet indkomst for baren og Helene Christines andel](#us-18-14-samlet-indkomst-for-baren-og-helene-christines-andel)
    - [US-19 (15): Hvilket produkt i drinksmenuen giver størst indtjening årligt](#us-19-15-hvilket-produkt-i-drinksmenuen-giver-størst-indtjening-årligt)
    - [US-20 (16): Hvilket produkt i drinksmenuen bliver der købt flest af årligt (Volumen)](#us-20-16-hvilket-produkt-i-drinksmenuen-bliver-der-købt-flest-af-årligt-volumen)
    - [US-21 (17): Procentvis fordeling af kaffe vs. cocktails indkomst & salg](#us-21-17-procentvis-fordeling-af-kaffe-vs-cocktails-indkomst--salg)

---

# Del 1: Booking-CRUD (Browserfrontend & REST API)

### US-01: Fremsøge bookinger (Read / Search)
- **Card**:  
  > **Som** receptionist  
  > **ønsker jeg** at kunne fremsøge en kundes booking i systemet (via booking-ID, kundenavn eller dato)  
  > **så** jeg hurtigt kan finde og verificere kundens reservationsoplysninger ved henvendelse eller check-in.
- **Conversation**:  
  - Søgekriterier: Receptionisten skal kunne søge på booking-ID, gæstens navn eller datointerval. Hvis søgefeltet er tomt, vises en oversigt over seneste/aktive bookinger med mulighed for paginering/sortering.
  - Datafelter: Resultatet viser: Booking-ID, gæstens fulde navn, land, værelsestype, værelsesnummer (hvis tildelt), ankomstdato (check-in), afrejsedato (check-out), antal gæster og status (f.eks. `confirmed` eller `cancelled`).
  - Fejlhåndtering: Hvis ingen bookinger matcher søgningen, viser UI'et en venlig besked frem for en tom eller frossen skærm. Backenden svarer med HTTP 200 og en tom liste `[]` (eller HTTP 404 ved direkte opslag på specifikt ukendt ID).
- **Confirmation**:  
  - **AC-01.1 (Succesfuld søgning på ID/Navn)**:  
    *Givet* at der findes en eksisterende booking med ID `101` tilhørende "Lars Hansen" i MySQL-databasen,  
    *Når* receptionisten indtaster "101" eller "Lars Hansen" i browserfrontendens søgefelt og trykker søg,  
    *Så* kalder frontend `GET /bookings?search=...`, og receptionisten præsenteres for bookingen med korrekte detaljer (ankomst, afrejse, værelsestype og pris).
  - **AC-01.2 (Ingen match / Ukendt booking)**:  
    *Givet* at der søges på et booking-ID eller navn, som ikke eksisterer,  
    *Når* forespørgslen udføres,  
    *Så* viser browseren teksten "Ingen bookinger fundet", og backenden returnerer HTTP 200 med en tom liste `[]`.
  - **AC-01.3 (Søgning på specifikt ID via API)**:  
    *Givet* et direkte opslag på `GET /bookings/99999` (ikke-eksisterende ID),  
    *Så* returnerer backenden HTTP 404 Not Found med en standardiseret JSON-fejlbesked.
- **INVEST-Verifikation**:  
  - **I**: Uafhængig læseoperation. **N**: Søgeparametre kan forhandles/udvides. **V**: Giver receptionisten det basale overblik ved skranken. **E**: Simpel SQL `SELECT ... WHERE`. **S**: Lille afgrænset scope. **T**: Testes nemt via Swagger og UI.

---

### US-02: Oprette ny booking (Create)
- **Card**:  
  > **Som** receptionist  
  > **ønsker jeg** nemt at kunne oprette en ny booking via browserfrontenden  
  > **så** reservationen gemmes i MySQL-databasen og automatisk indgår i de opdaterede analyser.
- **Conversation**:  
  - Inputfelter: Gæstens navn, kontaktland, værelsestype (én af de 8 officielle typer: *Standard Enkeltværelse*, *Grand Lit*, *Standard Dobbeltværelse*, *Superior Dobbeltværelse*, *Junior Suite*, *Spa Executive*, *Suite*, *LOFT Suite*), ankomstdato, afrejsedato, antal gæster (1–4) og aftalt pris/beløb.
  - Validering: Afrejsedato SKAL ligge efter ankomstdato (afvises hvis afrejse $\le$ ankomst). Ankomstdato kan ikke ligge i fortiden for nye bookinger. Antal gæster må ikke overstige værelsestypens maks. kapacitet.
  - Tre-lagsopdeling: Præsentationslag modtager JSON og validerer syntaks; Forretningslag håndterer bookingregler og sæsontilknytning; Dataadgangslag udfører `INSERT` i MySQL. Ved fejl rulles alt tilbage.
- **Confirmation**:  
  - **AC-02.1 (Gyldig bookingoprettelse)**:  
    *Givet* en formular udfyldt med gyldige data (Gæst: "Anna Schmidt", Land: "Tyskland", Type: "Superior Dobbeltværelse", 2026-11-10 til 2026-11-14, 2 gæster, 5.600 DKK),  
    *Når* receptionisten klikker "Opret booking",  
    *Så* sender frontend `POST /bookings` med JSON-payload, backenden gemmer bookingen i MySQL, returnerer HTTP 201 Created med et nyt unikt booking-ID, og formularen nulstilles med en bekræftelsesbesked.
  - **AC-02.2 (Ugyldig datoperiode afvises)**:  
    *Givet* at receptionisten angiver afrejsedato før eller lig med ankomstdato (f.eks. ankomst 2026-11-15 og afrejse 2026-11-12),  
    *Når* der klikkes "Opret booking",  
    *Så* afviser forretningslaget handlingen, der gemmes intet i databasen, backenden svarer med HTTP 400 Bad Request med fejlteksten "Afrejsedato skal være efter ankomstdato", og brugeren informeres i interfacet.
  - **AC-02.3 (Manglende påkrævede felter)**:  
    *Givet* at et obligatorisk felt mangler (f.eks. gæstens navn eller værelsestype er tomt),  
    *Når* der forsøges oprettelse,  
    *Så* returnerer API'et HTTP 422 Unprocessable Entity / 400 Bad Request med angivelse af de manglende felter.
- **INVEST-Verifikation**:  
  - **I**: Uafhængig oprettelse. **N**: Automatisk genererede felter kan tilpasses. **V**: Bringer data ind i systemet; grundlag for alle analyser. **E**: Klar CRUD `POST`-operation. **S**: Én handling. **T**: Verificeres via Swagger og database-inspektion.

---

### US-03: Rette i en booking (Update)
- **Card**:  
  > **Som** receptionist  
  > **ønsker jeg** at kunne rette oplysninger på en eksisterende booking i browseren  
  > **så** databasen altid stemmer, når en gæst ringer og ændrer datoer, værelsestype eller antal personer.
- **Conversation**:  
  - Tilladte rettelser: Ankomstdato, afrejsedato, værelsestype, antal gæster, kontaktland og evt. værelsesnummer/pris. Primærnøgle (`id`) kan ikke ændres.
  - Samme valideringsregler: Ved ændring af datoer skal afrejsedato fortsat være efter ankomstdato.
  - Konsekvens for analyser: Når datoer eller værelsestype ændres, skal backendens beregninger for overnatninger, sæsonfordeling og omsætning automatisk afspejle ændringen ved næste API-kald/Tableau-opdatering.
- **Confirmation**:  
  - **AC-03.1 (Succesfuld opdatering af datoer)**:  
    *Givet* en eksisterende booking med ID `101` for perioden 2026-12-01 til 2026-12-05,  
    *Når* receptionisten ændrer afrejsedato til 2026-12-07 og gemmer ændringen,  
    *Så* sender frontend et `PUT /bookings/101` kald, backenden opdaterer posten i MySQL, returnerer HTTP 200 OK med de opdaterede data, og oversigten viser den nye afrejsedato.
  - **AC-03.2 (Afvisning af ugyldig ændring)**:  
    *Givet* en eksisterende booking,  
    *Når* receptionisten forsøger at rette ankomstdatoen, så den bliver efter den eksisterende afrejsedato uden at korrigere afrejsedatoen,  
    *Så* afviser backenden transaktionen med HTTP 400 Bad Request, og databasens oprindelige tilstand bevares uændret.
  - **AC-03.3 (Opdatering på ukendt booking-ID)**:  
    *Givet* et opdateringskald rettet mod `PUT /bookings/99999` (ikke-eksisterende ID),  
    *Så* returnerer backenden HTTP 404 Not Found, og frontend viser "Bookingen kunne ikke findes".
- **INVEST-Verifikation**:  
  - **I**: Uafhængig opdatering mod kendt ID. **N**: Fuld `PUT` vs. delvis `PATCH`. **V**: Sikrer datakvalitet over tid. **E**: Standard REST `PUT`. **S**: Begrænset til modifikation af én post. **T**: Verificeres med opdatering efterfulgt af `GET`.

---

### US-04: Slette eller aflyse en booking (Delete)
- **Card**:  
  > **Som** receptionist  
  > **ønsker jeg** nemt at kunne slette eller aflyse en booking i browseren  
  > **så** fejlagtige eller annullerede reservationer ikke optager værelseskapacitet eller forvrænger omsætningstallene.
- **Conversation**:  
  - Slettesemantik: I henhold til Constitution og forretningsregler fjernes fejlagtige reservationer, mens aflyste reservationer markeres som `cancelled`. Hverken slettede eller aflyste reservationer må tælle med i belægningsgrad eller realiseret omsætning.
  - Sikkerhed: Browserfrontenden skal vise en bekræftelsesdialog ("Er du sikker på, at du vil slette/aflyse booking #X?") før API-kaldet afsendes.
- **Confirmation**:  
  - **AC-04.1 (Bekræftelse og sletning/aflysning)**:  
    *Givet* en aktiv booking med ID `101` synlig i bookingoversigten,  
    *Når* receptionisten klikker "Slet", bekræfter prompten i browseren og sender anmodningen,  
    *Så* kaldes `DELETE /bookings/101`, backenden opdaterer/sletter posten i MySQL, returnerer HTTP 200/204, og bookingen fjernes straks fra den aktive liste i browseren.
  - **AC-04.2 (Konsekvens for KPI og belægningsgrad)**:  
    *Givet* at en booking er slettet/aflyst,  
    *Når* `GET /analytics/occupancy` eller Tableau forespørger data for den pågældende periode,  
    *Så* indgår den slettede booking ikke i antallet af solgte værelsesnætter eller i den beregnede omsætning.
  - **AC-04.3 (Sletning af ikke-eksisterende booking)**:  
    *Givet* en sletteanmodning `DELETE /bookings/99999` på et ID der allerede er slettet eller ikke findes,  
    *Så* returnerer backenden HTTP 404 Not Found, og der sker ingen fejl i systemet.
- **INVEST-Verifikation**:  
  - **I**: Uafhængig handling. **N**: Soft delete vs. hard delete semantik. **V**: Forhindrer spøgelsesbookinger. **E**: Simpel `DELETE`-forespørgsel. **S**: Lille scope. **T**: Testes via Swagger og opdatering i dashboard.

---

# Del 2: Forretningsdesign & Analytics (Tableau & REST API)

## Tema A: Samlet Hotelomsætning & Indtægtsfordeling

### US-05 (1): Samlet indkomst hele hotellet (Værelser + Bar)
- **Card**:  
  > **Som** hoteladministrator  
  > **ønsker jeg** nemt at kunne få et samlet overblik over hotellets totale indtægter for et valgt år (kombineret værelsesbooking og barsalg)  
  > **så** jeg kan vurdere den overordnede økonomiske drift og præsentere bundlinjens omsætning for ledelsen.
- **Conversation**:  
  - Formel: $\text{Total Hotelomsætning} = \sum \text{Realiserede værelsesbeløb} + \sum \text{Realiserede barsalgslinjer}$ inden for det valgte kalenderår.
  - Aflyste bookinger og returnerede barsalg må **ikke** tælles med som omsætning.
  - Hvis der skiftes år i Tableau/API, opdateres begge datakilder synkront.
- **Confirmation**:  
  - **AC-05.1**: *Givet* at der for år 2026 er realiseret 5.000.000 DKK i værelsesomsætning og 800.000 DKK i barsalg, *Når* hoteladministratoren vælger år "2026", *Så* kalder systemet `GET /analytics/hotel-revenue?year=2026`, og dashboardet viser en samlet totalomsætning på nøjagtigt 5.800.000 DKK.
  - **AC-05.2**: *Givet* et år uden registrerede data, *Så* viser KPI-kortet explicit "0 DKK" eller "Ingen data", frem for en systemfejl.
- **INVEST-Verifikation**:  
  - **I**: Uafhængig top-level beregning. **N**: Aggregeringsniveau kan tilpasses. **V**: Højeste ledelsesværdi (top-level KPI). **E**: Simpel summering af to delsummer. **S**: Én samlet total. **T**: Verificeres mod syntetisk testdatasæt.

---

### US-06 (2): Samlet indkomst for Booking
- **Card**:  
  > **Som** hoteladministrator  
  > **ønsker jeg** at se hotellets samlede indtægter udelukkende genereret fra overnatninger for et valgt år  
  > **så** jeg kan isolere kerneforretningens økonomiske performance uafhængigt af baren.
- **Conversation**:  
  - Omsætningen tilskrives det kalenderår, hvor de faktiske overnatninger finder sted (ved ophold over et årsskifte fordeles nætterne på de respektive år).
  - Status = `confirmed` eller `completed` tælles; status = `cancelled` ekskluderes.
- **Confirmation**:  
  - **AC-06.1**: *Givet* et testdatasæt med bekræftede bookinger i 2026, *Når* administratoren filtrerer på 2026, *Så* returnerer API'et `room_revenue` som summen af alle værelsesnætter i 2026, og Tableau viser tallet tydeligt formateret som DKK.
  - **AC-06.2**: *Givet* en aflyst booking på 10.000 DKK, *Når* bookingen annulleres via browserfrontenden, *Så* reduceres den samlede værelsesindkomst straks med 10.000 DKK ved næste refresh.
- **INVEST-Verifikation**:  
  - **I**: Uafhængig af baren. **N**: Filtrering på kalenderår/periode. **V**: Nøglemåling for hotellets kernedrift. **E**: Klar SQL `SUM(room_price)`. **S**: Lille afgrænset metrik. **T**: Afstemmes mod SQL-udtræk.

---

### US-07 (3): Samlet indkomst for baren og fordeling mod booking
- **Card**:  
  > **Som** hoteladministrator  
  > **ønsker jeg** at kunne se barens samlede indtægter for året samt den procentvise fordeling mellem værelsesindtægter og barindtægter (f.eks. via et pie-/donut-chart)  
  > **så** jeg kan vurdere barens relative bidrag til hotellets samlede omsætning.
- **Conversation**:  
  - Sum af alle salgslinjer i tabellen `sale_lines` for det valgte år.
  - Procentdel beregnes som: $\frac{\text{Baromsætning}}{\text{Total hotelomsætning}} \times 100$.
- **Confirmation**:  
  - **AC-07.1**: *Givet* en samlet hotelomsætning på 4.000.000 DKK, hvoraf 1.000.000 DKK stammer fra baren og 3.000.000 DKK fra værelser, *Når* visningen indlæses, *Så* viser cirkeldiagrammet 25 % til Bar og 75 % til Værelser.
  - **AC-07.2**: *Givet* et scenarie med 0 DKK i total omsætning, *Så* viser visningen "Ikke beregnelig" i stedet for division med nul-fejl.
- **INVEST-Verifikation**:  
  - **I**: Kan testes isoleret på salgslinjer. **N**: Visningsform (pie chart vs. 100 % stablet søjle). **V**: Dokumenterer mersalgseffekten. **E**: Procentregning. **S**: Én relativ KPI. **T**: Testes med kendte omsætningstal.

---

## Tema B: Geografiske Analyser (Lande, Omsætning & Opholdslængde)

### US-08 (4): Årlig indkomst pr. land (Top-lande)
- **Card**:  
  > **Som** hoteladministrator  
  > **ønsker jeg** en rangordnet oversigt over, hvilke gæstelande der genererer størst årlig omsætning  
  > **så** jeg kan identificere vores mest værdifulde geografiske markeder og målrette internationale salgsindsatser.
- **Conversation**:  
  - Hver booking knyttes til ét gæsteland. Hvis der er flere personer på én booking, må hele beløbet **ikke** ganges op pr. person (ingen dobbelttælling).
  - Manglende lande grupperes synligt under "Ukendt" / "Ikke oplyst".
- **Confirmation**:  
  - **AC-08.1**: *Givet* at Tyskland har genereret 1.200.000 DKK og Norge 800.000 DKK i 2026, *Når* administratoren åbner landerapporten, *Så* vises en sorteret søjlegraf med Tyskland øverst efterfulgt af Norge.
  - **AC-08.2**: *Givet* bookinger uden registreret land, *Så* vises omsætningen for disse under kategorien "Ukendt", og beløbet indgår i den samlede landekontrol.
- **INVEST-Verifikation**:  
  - **I**: Uafhængig `GROUP BY country`. **N**: Top-N eller komplet liste. **V**: Direkte strategisk marketingværdi. **E**: Standard aggregering. **S**: Én opgørelse. **T**: Testes ved at summere lande mod totalen.

---

### US-09 (5): Sæsonpræget indkomst pr. land
- **Card**:  
  > **Som** hoteladministrator  
  > **ønsker jeg** at se indtægterne fordelt på lande nedbrudt på de tre sæsoner (lav-, mellem- og højsæson)  
  > **så** jeg kan se, hvilke nationaliteter der dominerer i henholdsvis sommer-, vinter- og skuldersæsonerne.
- **Conversation**:  
  - Sæsoner: Lavsæson (vinter), Mellemsæson (forår/efterår), Højsæson (sommer/jul).
  - Hvis et ophold krydser en sæsongrænse, fordeles de enkelte nætters omsætning til den respektive sæson.
- **Confirmation**:  
  - **AC-09.1**: *Givet* en tysk gæst med 2 nætter i mellemsæson og 2 nætter i højsæson, *Når* rapporten beregnes, *Så* tilskrives præcis 2 nætters omsætning til Mellemsæson og 2 nætters omsætning til Højsæson under Tyskland.
  - **AC-09.2**: *Givet* filtrering på "Højsæson", *Så* viser diagrammet udelukkende de lande og beløb, der er realiseret i netop højsæsonen.
- **INVEST-Verifikation**:  
  - **I**: Uafhængig todimensional visning. **N**: Matrix vs. grupperede søjler. **V**: Giver sæsonmæssig indsigt. **E**: Kræver dato-til-sæson mapping i forretningslaget. **S**: Afgrænset gruppering. **T**: Verificeres med grænseoverskridende bookinger.

---

### US-10 (6): Hvilke lande booker samlet set længst ophold (ALOS)
- **Card**:  
  > **Som** hoteladministrator  
  > **ønsker jeg** at se, hvilke nationaliteter der gennemsnitligt har de længste ophold (Average Length of Stay - ALOS) over året  
  > **så** jeg kan optimere bookingbetingelser og kampagner mod gæster, der bliver mange dage.
- **Conversation**:  
  - Formel: $\text{ALOS}_{\text{land}} = \frac{\sum \text{Antal overnatningsnætter for land}}{\text{Antal gennemførte bookinger for land}}$.
  - Afrejsedato tæller ikke som en overnatning (antal nætter = afrejse minus ankomst).
- **Confirmation**:  
  - **AC-10.1**: *Givet* at USA har 10 bookinger med i alt 50 nætter (gns. 5,0 nætter), og Danmark har 20 bookinger med i alt 40 nætter (gns. 2,0 nætter), *Når* administratoren vælger "Længst ophold pr. land", *Så* rangeres USA foran Danmark med gennemsnittet 5,0 nætter.
  - **AC-10.2**: *Givet* et land med 0 bookinger, *Så* ekskluderes landet eller viser "-" (ingen division med nul).
- **INVEST-Verifikation**:  
  - **I**: Uafhængig gennemsnitsberegning. **N**: Minimum antal bookinger som grænsefilter. **V**: Optimerer opholdslængde. **E**: Standard gennemsnitsberegning. **S**: Én metrik pr. land. **T**: Testes med kontrollerede syntetiske bookinger.

---

### US-11 (7): Hvilke lande booker længst ophold pr. sæson
- **Card**:  
  > **Som** hoteladministrator  
  > **ønsker jeg** at se den gennemsnitlige opholdslængde for de enkelte lande opdelt efter sæson  
  > **så** jeg kan identificere, om visse nationaliteter tager lange ferieophold om sommeren og korte forretningsophold om vinteren.
- **Conversation**:  
  - Samme formel som US-10, men filtreret og grupperet på sæson ud fra overnatningsdatoerne.
- **Confirmation**:  
  - **AC-11.1**: *Givet* at svenske gæster gennemsnitligt bor 6 nætter i højsæsonen og 1,5 nat i lavsæsonen, *Når* administratoren inspicerer sæsonopdelingen for Sverige, *Så* viser tabellen/diagrammet tydeligt disse to separate gennemsnit.
- **INVEST-Verifikation**:  
  - **I**: Bygger videre på US-10 med sæsonfilter. **N**: Filtre vs. side-om-side visning. **V**: Dybdegående planlægningsværdi. **E**: Moderat. **S**: Afgrænset. **T**: Testes med syntetiske bookinger i forskellige måneder.

---

## Tema C: Værelses- & Segmentanalyser

### US-12 (8): Hvilke lande booker overordnet hvilke værelsestyper
- **Card**:  
  > **Som** hoteladministrator  
  > **ønsker jeg** en fordelingsoversigt over, hvilke af de 8 værelsestyper gæster fra forskellige lande foretrækker  
  > **så** jeg kan tilpasse markedsføringen af f.eks. suiter kontra standardværelser til specifikke markeder.
- **Conversation**:  
  - De 8 officielle værelsestyper: Standard enkelt, Grand lit, Standard dobbelt, Superior dobbelt, Junior suite, Spa executive, Suite, LOFT suite.
  - Tælling: Antal bookinger (eller antal værelsesnætter) pr. krydsfelt mellem land og værelsestype.
- **Confirmation**:  
  - **AC-12.1**: *Givet* at britiske gæster har booket 30 "Standard Dobbeltværelse" og 5 "LOFT Suite", *Når* administratoren filtrerer på Storbritannien, *Så* viser diagrammet den eksakte fordeling på de 8 værelsestyper med korrekte antal.
- **INVEST-Verifikation**:  
  - **I**: Uafhængig krydstabulering. **N**: Stablet søjle vs. heat-map. **V**: Segmenteringsindsigt for værelsessalg. **E**: Standard 2D SQL `GROUP BY country, room_type`. **S**: Lille rapport. **T**: Testes mod kontroltælling i SQL.

---

### US-13 (9): Hvilke lande booker hvilke værelsestyper pr. sæson
- **Card**:  
  > **Som** hoteladministrator  
  > **ønsker jeg** at kunne filtrere fordelingen af lande og værelsestyper på sæson  
  > **så** jeg kan se, om efterspørgslen på luksusværelser (f.eks. Spa Executive / LOFT suiter) fra specifikke lande ændrer sig mellem sommer og vinter.
- **Conversation**:  
  - Tilføjer en interaktiv sæsonslicer (Lavsæson / Mellemsæson / Højsæson) til fordelingen fra US-12.
- **Confirmation**:  
  - **AC-13.1**: *Givet* at norske gæster kun booker "Spa Executive" i lavsæsonen (vinter) og "Standard Dobbeltværelse" i højsæsonen, *Når* administratoren skifter mellem lav- og højsæson for Norge, *Så* skifter de fremhævede værelsestyper tilsvarende i visualiseringen.
- **INVEST-Verifikation**:  
  - **I**: Udvidelse af US-12. **N**: Interaktivt filter vs. separate faner. **V**: Høj værdi for differentieret prissætning. **E**: Simpel filtertilføjelse. **S**: Lille. **T**: Verificeres med sæsonskift.

---

### US-14 (10): Hvilken værelsestype tjener vi overordnet mest på
- **Card**:  
  > **Som** hoteladministrator  
  > **ønsker jeg** en rangering af de 8 værelsestyper baseret på deres samlede realiserede omsætning for året  
  > **så** jeg straks kan se, hvilken værelseskategori der er hotellets største indtægtskilde.
- **Conversation**:  
  - Sorteret liste/bardiagram over samlet indtjening pr. værelsestype for et valgt år.
  - Baseret på faktiske realiserede beløb (ikke de vejledende prisspænd fra opgaveteksten).
- **Confirmation**:  
  - **AC-14.1**: *Givet* at "Superior Dobbeltværelse" har omsat for 1.800.000 DKK og "Standard Enkeltværelse" for 600.000 DKK i 2026, *Når* administratoren ser rapporten, *Så* rangeres "Superior Dobbeltværelse" over "Standard Enkeltværelse" med det præcise beløb.
  - **AC-14.2**: *Givet* en værelsestype med 0 bookinger i perioden, *Så* fremgår den nederst med 0 DKK i omsætning uden at mangle på listen.
- **INVEST-Verifikation**:  
  - **I**: Uafhængig aggregering. **N**: Bardiagram vs. tabel. **V**: Direkte svar på centralt opgavekrav. **E**: Simpel `GROUP BY room_type`. **S**: Meget lille. **T**: Let at afstemme mod total omsætning.

---

### US-15 (11): Hvilken værelsestype tjener vi mest på ift. sæson
- **Card**:  
  > **Som** hoteladministrator  
  > **ønsker jeg** at se indtjeningen pr. værelsestype opdelt på de tre sæsoner  
  > **så** jeg kan identificere, hvilke typer der bærer indtjeningen i henholdsvis lav-, mellem- og højsæson.
- **Conversation**:  
  - Opfylder opgavekravet: *"Indtjening fordelt på værelsestype og sæson"*.
  - Summerne for de 3 sæsoner for en værelsestype skal nøjagtigt matche typens totalomsætning for året.
- **Confirmation**:  
  - **AC-15.1**: *Givet* en samlet omsætning for "Suite" på 900.000 DKK (fordelt med 100.000 i lav, 300.000 i mellem og 500.000 i høj), *Når* administratoren vælger visningen "Indtjening pr. værelsestype og sæson", *Så* viser et grupperet søjlediagram præcis disse 3 værdier, og summen er 900.000 DKK.
- **INVEST-Verifikation**:  
  - **I**: Uafhængig 2D aggregering. **N**: Stablet søjle vs. grupperet søjle. **V**: Kritisk opgaveleverance. **E**: Let. **S**: Lille. **T**: Totalafstemning mod US-14.

---

### US-16 (12): Værelsestyper med længst bookingperiode (Årlig oversigt)
- **Card**:  
  > **Som** hoteladministrator  
  > **ønsker jeg** at se, hvilke værelsestyper der gennemsnitligt bookes til de længste ophold  
  > **så** jeg ved, om det primært er suiter (f.eks. LOFT suiter) eller standardværelser, der tiltrækker langtidsgæster.
- **Conversation**:  
  - Formel: $\text{Gennemsnitlig opholdslængde}_{\text{type}} = \frac{\sum \text{Nætter for værelsestype}}{\text{Antal bookinger for værelsestype}}$.
- **Confirmation**:  
  - **AC-16.1**: *Givet* at "LOFT suite" har 10 bookinger med i alt 45 nætter (gns. 4,5 nætter) og "Standard enkelt" har 20 bookinger med 30 nætter (gns. 1,5 nætter), *Når* administratoren åbner rapporten, *Så* rangeres "LOFT suite" øverst med 4,5 nætter.
- **INVEST-Verifikation**:  
  - **I**: Uafhængig gennemsnitsberegning. **N**: Sortering faldende/stigende. **V**: Viden om gæsteformål (ferie vs. hurtig transit). **E**: Simpel SQL `AVG(DATEDIFF(...))`. **S**: Lille. **T**: Verificeres mod rådata.

---

### US-17 (13): Værelsestyper med længst bookingperiode pr. sæson
- **Card**:  
  > **Som** hoteladministrator  
  > **ønsker jeg** at se de gennemsnitlige bookingperioder for de enkelte værelsestyper opdelt pr. sæson  
  > **så** jeg kan spotte sæsonbetingede ændringer i gæsternes opholdsmønstre for de forskellige værelser.
- **Conversation**:  
  - Beregner gennemsnitsnætter pr. værelsestype inden for hver sæsons datointervaller.
- **Confirmation**:  
  - **AC-17.1**: *Givet* data fordelt på sæsoner, *Når* administratoren vælger "Højsæson", *Så* viser oversigten de gennemsnitlige opholdslængder pr. værelsestype udelukkende for sommer/juletid, så lange sommerferieophold i suiter fremstår tydeligt.
- **INVEST-Verifikation**:  
  - **I**: Kombinerer US-16 med sæsongruppering. **N**: Filtrering via dropdown eller interaktiv visualisering. **V**: Sæsonmæssig optimering. **E**: Moderat. **S**: Lille. **T**: Afstemmes mod beregninger for sæsonen.

---

## Tema D: Bar- & Menu-analyser (Lobbybar & Cocktails)

### US-18 (14): Samlet indkomst for baren og Helene Christines andel
- **Card**:  
  > **Som** hoteladministrator / leder  
  > **ønsker jeg** at se barens samlede årsindtægt samt isolere receptionisten Helene Christines samlede barsalg for året  
  > **så** jeg kan vurdere lobbybarens overordnede omsætning og specifikt dokumentere Helene Christines salgsperformance som krævet i opgaven.
- **Conversation**:  
  - Krav i opgaven: *"Hvor meget har Helene Christine solgt totalt for året"*.
  - Filtrering skal ske på et stabilt medarbejder-ID (f.eks. `employee_id = 'HC01'`), så salg fra andre bartendere/receptionister ikke forurener hendes tal.
- **Confirmation**:  
  - **AC-18.1**: *Givet* at baren samlet har omsat for 600.000 DKK i 2026, hvoraf Helene Christine har solgt for 250.000 DKK og en anden medarbejder for 350.000 DKK, *Når* administratoren filtrerer på Helene Christine for 2026, *Så* viser totalfeltet præcis 250.000 DKK.
  - **AC-18.2**: *Givet* at filteret fjernes, *Så* viser baren sin samlede total på 600.000 DKK.
- **INVEST-Verifikation**:  
  - **I**: Uafhængig af hotelværelser. **N**: Filter vs. side-om-side kort. **V**: Obligatorisk opgavekrav. **E**: Simpel `WHERE employee_id = ...`. **S**: Én metrik. **T**: Testes med multi-medarbejder datasæt.

---

### US-19 (15): Hvilket produkt i drinksmenuen giver størst indtjening årligt
- **Card**:  
  > **Som** hoteladministrator  
  > **ønsker jeg** en rangering over drinksmenuens produkter sorteret efter samlet realiseret omsætning for året  
  > **så** jeg ved, hvilke specifikke cocktails, kaffer eller vine der genererer flest penge til baren.
- **Conversation**:  
  - Formel: $\text{Omsætning pr. drink} = \sum (\text{Antal} \times \text{Stykpris})$ for hver vare på menuen.
  - Skal kunne vise enten hele baren eller filtreres til kun at vise Helene Christines salg.
- **Confirmation**:  
  - **AC-19.1**: *Givet* at "Espresso Martini" har indbragt 45.000 DKK og "Caffè Latte" har indbragt 18.000 DKK, *Når* oversigten over omsætning pr. drink vises for året, *Så* rangeres "Espresso Martini" over "Caffè Latte" i et sorteret søjlediagram.
- **INVEST-Verifikation**:  
  - **I**: Uafhængig produktanalyse. **N**: Top-10 eller alle ~30 produkter (20 cocktails + 10 kaffetyper). **V**: Optimerer menukort og indkøb. **E**: Let `GROUP BY product_name`. **S**: Lille. **T**: Afstemmes mod barens samlede omsætning.

---

### US-20 (16): Hvilket produkt i drinksmenuen bliver der købt flest af årligt (Volumen)
- **Card**:  
  > **Som** hoteladministrator  
  > **ønsker jeg** at se, hvilke drinks/produkter der sælges i det største stykaftag (antal enheder) om året  
  > **så** jeg kan planlægge råvareindkøb, lagerbeholdning og bemanding i baren baseret på faktisk volumen.
- **Conversation**:  
  - Tæller `SUM(quantity)` pr. produkt i stedet for kroner.
  - En billig kaffe kan have højt volumen, mens en dyr cocktail kan have høj omsætning.
- **Confirmation**:  
  - **AC-20.1**: *Givet* at der er solgt 500 kopper "Americano" til 35 DKK (17.500 DKK) og 200 "Old Fashioned" til 120 DKK (24.000 DKK), *Når* administratoren sorterer efter solgte enheder, *Så* ligger "Americano" øverst med 500 stk.
- **INVEST-Verifikation**:  
  - **I**: Uafhængig af beløb. **N**: Enheder vs. serveringer. **V**: Kritisk for lager/logistik. **E**: Simpel `SUM(quantity)`. **S**: Lille. **T**: Testes med forskellige antal og priser.

---

### US-21 (17): Procentvis fordeling af kaffe vs. cocktails indkomst & salg
- **Card**:  
  > **Som** hoteladministrator  
  > **ønsker jeg** at se den procentvise fordeling mellem salg af kaffe og salg af cocktails (for hele baren samt specifikt for Helene Christine)  
  > **så** jeg kan vurdere balancen mellem dagssalg (kaffe) og aftensalg (cocktails).
- **Conversation**:  
  - Opgavekrav: *"Vis procentfordeling af cocktails og kaffe for Helene Christine"*.
  - Nævneren i procenten er entydig: $\frac{\text{Omsætning på Cocktails}}{\text{Omsætning på Cocktails} + \text{Omsætning på Kaffe}} \times 100$ (og tilsvarende for kaffe).
  - Skal kunne vises både som omsætningsandel (DKK) og antalsandel (stk.).
- **Confirmation**:  
  - **AC-21.1**: *Givet* at Helene Christine i 2026 har solgt cocktails for 60.000 DKK og kaffe for 40.000 DKK (i alt 100.000 DKK i de to kategorier), *Når* visningen indlæses med filter på Helene Christine, *Så* viser en 100 % stablet søjle præcis 60 % Cocktails og 40 % Kaffe.
  - **AC-21.2**: *Givet* en medarbejder uden salg i en af kategorierne, *Så* håndteres 0 % korrekt uden at systemet fejler.
- **INVEST-Verifikation**:  
  - **I**: Uafhængig relativ analyse. **N**: Vises som 100 %-stablet søjle eller donut-chart. **V**: Eksplicit opgavekrav for cocktailbaren. **E**: Klar forretningsformel. **S**: Én visualisering. **T**: Testes med kontrolleret testdatasæt.
