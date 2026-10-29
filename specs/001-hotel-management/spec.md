# Feature Specification: Hotel Kong Arthur — Booking-CRUD og Analytics Platform

**Feature Branch**: `specify`  
**Feature Directory**: `specs/001-hotel-management`  
**Created**: 2026-10-29  
**Status**: Draft  
**Input**: Tværfaglig opgave Hotel Kong Arthur (SCAMM) — fuld specifikation for bookingstyring, 3-lags REST backend, dynamisk datagrundlag og interaktiv Tableau-analyse.

---

## Clarifications

### Session 2026-10-29

- Q: Hvilken detaljeringsgrad skal analysen "Hvilke værelser tjener Kong Arthur flest penge på?" vise i Tableau og REST API'et? (FR-012) → A: Kun de 8 værelsestyper (sidestiller "værelser" med de 8 officielle værelseskategorier).
- Q: Hvordan skal "Kundetilfredshed" modelleres i databasen og præsenteres i Tableau-dashboardet? (FR-020) → A: Rating-score fra 1 til 5 stjerner pr. booking (viser gennemsnitlig score og antal besvarelser i dashboardet; viser "Ingen besvarelser", hvis data mangler).
- Q: Hvilke præcise datointervaller skal definere de tre sæsoner i backenden og databasen? (FR-005) → A: Faste ikke-overlappende blokke: Lavsæson er 1. nov – 28./29. feb; Mellemsæson er 1. mar – 31. maj samt 1. sep – 31. okt; Højsæson er 1. jun – 31. aug.
- Q: Hvilken slettesemantik skal anvendes, når en booking slettes via browseren og REST API'et? (FR-001) → A: Soft delete: Markeres som status 'cancelled' i MySQL (bevarer historik og forhindrer tab af data, men ekskluderes automatisk fra aktive lister, belægning og realiseret omsætning).
- Q: Skal procentfordelingen mellem cocktails og kaffe for Helene Christine primært baseres på omsætning (DKK) eller antal solgte enheder (stk.)? (FR-019) → A: Begge dele understøttes i API og dashboard (omsætningsandel i DKK som standardvisning med mulighed for at skifte til antalsandel i stk.; nævneren udgøres udelukkende af de to kategorier).

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Fremsøge og inspicere bookinger (Priority: P1)

Som receptionist ønsker jeg at kunne fremsøge og inspicere en kundes booking via booking-ID, kundenavn eller datointerval, så jeg hurtigt kan finde og verificere kundens reservationsoplysninger ved skranken.

- **Why this priority**: Receptionisten skal kunne tilgå eksisterende reservationer for at betjene gæster og verificere, at reservationer er registreret korrekt i systemet.
- **Independent Test**: Kan testes isoleret ved at oprette et kendt sæt reservationer og fremsøge dem via søgefeltet med specifikke søgekriterier.
- **Acceptance Scenarios**:
  1. **Given** en eksisterende booking med ID `101` for kunden "Lars Hansen", **When** receptionisten søger efter "101" eller "Lars Hansen", **Then** præsenteres bookingen med korrekte detaljer (ankomst, afrejse, værelsestype, antal personer og status).
  2. **Given** at der søges efter en ikke-eksisterende gæst eller et ukendt booking-ID, **When** søgningen udføres, **Then** viser systemet en brugervenlig besked ("Ingen bookinger fundet") uden fejl i interfacet.
  3. **Given** en forespørgsel uden søgeord, **When** oversigten åbnes, **Then** returneres en sorteret liste over de seneste og aktive bookinger.

---

### User Story 2 — Oprette ny reservation med forretningsvalidering (Priority: P1)

Som receptionist ønsker jeg nemt at kunne oprette en ny booking via en browserformular, så gæstens reservation gemmes pålideligt i MySQL-databasen og automatisk indgår i de ledelsesmæssige analyser.

- **Why this priority**: Oprettelse af nye bookinger er forudsætningen for at drive hotellet og demonstrere, at systemet håndterer dynamiske dataændringer frem for statiske filer.
- **Independent Test**: Kan testes isoleret ved at indtaste gyldige bookingdata i formularen og kontrollere, at en ny post oprettes med unikt ID.
- **Acceptance Scenarios**:
  1. **Given** en formular udfyldt med gyldige oplysninger (navn: "Anna Schmidt", land: "Tyskland", værelsestype: "Superior Dobbeltværelse", 2026-11-10 til 2026-11-14, 2 gæster, 5.600 DKK), **When** receptionisten klikker "Opret booking", **Then** gemmes reservationen, og der vises en kvittering med det nye booking-ID.
  2. **Given** at receptionisten angiver en afrejsedato, der er før eller lig med ankomstdatoen, **When** oprettelse forsøges, **Then** afvises handlingen med en forklarende fejlbesked, og intet gemmes.
  3. **Given** at antallet af gæster overstiger værelseskategoriens maksimale kapacitet (maks. 4 personer), **When** oprettelse forsøges, **Then** afviser systemet registreringen med angivelse af kapacitetsgrænsen.

---

### User Story 3 — Rette i en eksisterende booking (Priority: P1)

Som receptionist ønsker jeg at kunne rette gæste- og reservationsoplysninger på en eksisterende booking, så systemets datagrundlag holdes ajour, når gæster ændrer datoer, værelsestype eller opholdslængde.

- **Why this priority**: Gæster ændrer løbende planer; uden opdateringsmulighed vil hotellet have forældede belægnings- og indtægtstal.
- **Independent Test**: Kan testes isoleret ved at ændre afrejsedatoen på en specifik booking og verificere, at den nye periode slår igennem.
- **Acceptance Scenarios**:
  1. **Given** en eksisterende booking med ophold fra 2026-12-01 til 2026-12-05, **When** receptionisten forlænger opholdet til 2026-12-07 og gemmer, **Then** opdateres databasen med den nye afrejsedato og tilpassede pris.
  2. **Given** et forsøg på at rette en booking til en ugyldig datoperiode, **When** ændringen gemmes, **Then** afvises handlingen, og de oprindelige data forbliver uændrede.
  3. **Given** en ændring af værelsestype (f.eks. fra Standard til Junior Suite), **When** ændringen gemmes, **Then** afspejler forretningslogikken straks den nye værelseskategori i omsætningsberegningerne.

---

### User Story 4 — Slette eller aflyse en booking (Priority: P1)

Som receptionist ønsker jeg nemt og sikkert at kunne slette eller aflyse en booking i systemet, så annullerede ophold ikke optager værelseskapacitet eller forvrænger omsætningstallene.

- **Why this priority**: Nødvendig for at fuldføre CRUD-kravet og sikre, at sletninger håndteres ensartet i både databasen og de økonomiske analyser.
- **Independent Test**: Kan testes ved at slette en reservation og kontrollere, at den forsvinder fra aktive lister og belægningsberegninger.
- **Acceptance Scenarios**:
  1. **Given** en aktiv booking i systemet, **When** receptionisten klikker slet og bekræfter handlingen i bekræftelsesdialogen, **Then** udfører systemet en soft delete ved at opdatere bookingens status til `cancelled` i MySQL, og bookingen fjernes straks fra listen over aktive reservationer i browseren.
  2. **Given** en aflyst booking med status `cancelled`, **When** ledelsen inspicerer belægningsgraden eller omsætningen for den pågældende periode, **Then** ekskluderes denne booking automatisk fra solgte værelsesnætter og realiseret omsætning.
  3. **Given** et forsøg på at slette et ikke-eksisterende booking-ID, **When** handlingen udføres, **Then** returnerer systemet en forklarende fejl uden databrud eller systemnedbrud.

---

### User Story 5 — Samlet hotelindtægt for året (Værelser + Bar) (Priority: P1)

Som hoteladministrator ønsker jeg et samlet overblik over hotellets totale realiserede indtægter for et valgt år (kombineret værelsesbooking og barsalg), så jeg kan vurdere hotellets overordnede økonomiske drift og rapportere til ledelsen.

- **Why this priority**: Kernemål for beslutningstagere: at kunne aflæse den samlede årlige omsætning i et enkelt centralt nøgletalskort.
- **Independent Test**: Kan testes ved at sammenligne summen af realiserede overnatningsbeløb og barsalgslinjer i testdata med det viste tal i dashboardet.
- **Acceptance Scenarios**:
  1. **Given** et år (f.eks. 2026) med 5.000.000 DKK i realiseret værelsesomsætning og 800.000 DKK i realiseret barsalg, **When** administratoren vælger 2026 i årsfilteret, **Then** viser dashboardet en samlet totalomsætning på nøjagtigt 5.800.000 DKK.
  2. **Given** et år uden registrerede transaktioner, **When** året vælges, **Then** viser KPI-kortet explicit "0 DKK" eller "Ingen data" i stedet for en fejl.

---

### User Story 6 — Samlet indkomst for værelsesbookinger (Priority: P1)

Som hoteladministrator ønsker jeg at kunne se hotellets samlede indtægter udelukkende genereret fra værelsesovernatninger for et valgt år, så jeg kan isolere kerneforretningens økonomiske performance fra sekundære indtægtskilder.

- **Why this priority**: Værelsesudlejning er hotellets primære indtægtskilde og skal kunne analyseres særskilt.
- **Independent Test**: Kan testes ved at filtrere på værelsesomsætning for et kendt år og kontrollere, at barens salg er 100 % udelukket.
- **Acceptance Scenarios**:
  1. **Given** bekræftede overnatninger i 2026, **When** administratoren vælger 2026, **Then** summeres udelukkende de overnatningsnætter, der rent faktisk afholdes i 2026 (ved ophold over et årsskifte tilskrives nætterne det respektive år).
  2. **Given** en aflyst booking, **When** rapporten genereres, **Then** indgår det aflyste beløb ikke i den realiserede værelsesindkomst.

---

### User Story 7 — Samlet barindkomst og fordeling mod værelser (Priority: P1)

Som hoteladministrator ønsker jeg at kunne se barens samlede indtægter for året samt den procentvise fordeling mellem værelsesindtægter og barindtægter (f.eks. via et cirkel- eller donut-diagram), så jeg kan vurdere barens relative bidrag til hotellets samlede omsætning.

- **Why this priority**: Giver ledelsen indsigt i mersalgseffekten og lobbybarens betydning for den samlede forretningsmodel.
- **Independent Test**: Kan testes med kendte delsummer for bar og værelser og verificere, at procentfordelingen summerer til 100 %.
- **Acceptance Scenarios**:
  1. **Given** en samlet omsætning på 4.000.000 DKK fordelt med 3.000.000 DKK på værelser og 1.000.000 DKK på baren, **When** fordelingsdiagrammet indlæses, **Then** vises præcis 75 % til Værelser og 25 % til Baren.
  2. **Given** en periode uden registrerede salg, **When** visningen åbnes, **Then** viser fordelingen "Ikke beregnelig" frem for division med nul.

---

### User Story 8 — Beregning og visning af Belægningsgrad (Priority: P1)

Som hoteladministrator ønsker jeg at kunne se hotellets belægningsgrad for en valgt periode, så jeg kan vurdere kapacitetsudnyttelsen af de 214 værelser.

- **Why this priority**: Eksplicit systemkrav fra opgavebeskrivelsen; afgørende KPI for hoteldrift.
- **Independent Test**: Kan testes ved at beregne forholdet mellem solgte værelsesnætter og de teoretisk tilgængelige værelsesnætter i perioden.
- **Acceptance Scenarios**:
  1. **Given** en måned med 30 dage (i alt $214 \times 30 = 6.420$ tilgængelige værelsesnætter) og 4.494 solgte værelsesnætter, **When** belægningsgraden forespørges, **Then** viser dashboardet en belægningsgrad på nøjagtigt 70,0 %.
  2. **Given** en dag med 0 solgte værelser, **When** belægningsgraden vises, **Then** rapporteres 0,0 % uden formelfejl.

---

### User Story 9 — Årlig indkomst pr. gæsteland (Top-lande) (Priority: P2)

Som hoteladministrator ønsker jeg en rangordnet oversigt over, hvilke lande hotellet tjener flest penge på årligt, så jeg kan identificere vores mest indbringende geografiske markeder.

- **Why this priority**: Centralt krav fra opgavebeskrivelsen; danner grundlag for markedsføring og internationale partnerskaber.
- **Independent Test**: Kan testes ved at summere omsætning pr. land og kontrollere, at listen er sorteret faldende.
- **Acceptance Scenarios**:
  1. **Given** registrerede bookinger fra flere lande, **When** landerapporten vises for et år, **Then** præsenteres en sorteret rangering af lande efter samlet omsætning.
  2. **Given** bookinger med flere gæster tilknyttet, **When** omsætningen tilskrives landet, **Then** tilskrives bookingens samlede beløb kun én gang (ingen dobbelttælling pr. person).
  3. **Given** bookinger uden registreret land, **When** oversigten vises, **Then** fremgår disse synligt under kategorien "Ukendt / Ikke oplyst".

---

### User Story 10 — Sæsonpræget indkomst pr. land (Priority: P2)

Som hoteladministrator ønsker jeg at se omsætningen fordelt på gæstelande opdelt på de tre sæsoner (lav-, mellem- og højsæson), så jeg kan planlægge sæsonspecifikke kampagner mod de relevante markeder.

- **Why this priority**: Gæsternes rejsemønstre varierer markant mellem sommer-, vinter- og skuldersæsoner.
- **Independent Test**: Kan testes med et testdatasæt med bookinger placeret i de tre sæsoner for udvalgte lande.
- **Acceptance Scenarios**:
  1. **Given** bookinger der fordeler sig over lavsæson (vinter), mellemsæson (forår/efterår) og højsæson (sommer/jul), **When** administratoren vælger et land og inspicerer sæsonfordelingen, **Then** vises omsætningen korrekt opdelt på de tre sæsoner.
  2. **Given** et ophold der strækker sig hen over et sæsonskifte, **When** beregningen foretages, **Then** tilskrives overnatningerne de respektive sæsoner ud fra datoen for hver enkelt nat.

---

### User Story 11 — Mest indbringende værelsestyper for året (Priority: P2)

Som hoteladministrator ønsker jeg at se, hvilke af de 8 værelsestyper hotellet tjener flest penge på årligt, så jeg ved, hvilke værelseskategorier der bidrager mest til omsætningen.

- **Why this priority**: Direkte opgavekrav; vigtigt for vurdering af værelsesporteføljen.
- **Independent Test**: Kan testes ved at aggregere omsætning pr. værelsestype og kontrollere, at summen af alle 8 typer stemmer med den samlede værelsesomsætning.
- **Acceptance Scenarios**:
  1. **Given** et år med salg på tværs af de 8 værelsestyper, **When** rapporten vises, **Then** rangeres værelsestyperne efter samlet realiseret omsætning.
  2. **Given** en værelsestype uden salg i det pågældende år, **When** rapporten vises, **Then** fremgår typen nederst med 0 DKK i stedet for at forsvinde fra diagrammet.

---

### User Story 12 — Indtjening pr. værelsestype og sæson (Priority: P2)

Som hoteladministrator ønsker jeg at se omsætningen pr. værelsestype opdelt på lav-, mellem- og højsæson, så jeg kan se, hvordan efterspørgslen på suiter kontra standardværelser skifter gennem året.

- **Why this priority**: Opgavens hovedkrav for forretningsdesign: *"Indtjening fordelt på værelsestype og sæson"*.
- **Independent Test**: Kan testes ved at kontrollere, at delsummerne for de tre sæsoner for hver type matcher typens årstotal.
- **Acceptance Scenarios**:
  1. **Given** et grupperet søjlediagram eller en matrix, **When** visningen indlæses, **Then** præsenteres alle 8 værelsestyper med separate søjler/værdier for Lavsæson, Mellemsæson og Højsæson.
  2. **Given** et interaktivt filter på én specifik sæson, **When** filteret aktiveres, **Then** opdateres visningen til kun at vise tallene for den valgte sæson.

---

### User Story 13 — Mest indbringende værelsestyper (Priority: P2)

Som hoteladministrator ønsker jeg at kunne identificere, hvilke af de 8 værelseskategorier der genererer størst samlet indtjening, så jeg kan vurdere porteføljen og rentabiliteten på kategoriniveau.

- **Why this priority**: Besvarer opgavekravet: *"Hvilke værelser tjener Kong Arthur flest penge på?"*, hvor "værelser" opgøres på de 8 officielle værelsestyper.
- **Independent Test**: Kan testes ved at rangere de 8 værelsestyper efter samlet omsætning og afstemme mod den totale værelsesomsætning.
- **Acceptance Scenarios**:
  1. **Given** data med værelsestyper tilknyttet bookingerne, **When** visningen åbnes, **Then** præsenteres en sorteret rangering over de 8 værelsestyper efter totalomsætning.
  2. **Given** en værelsestype uden salg i perioden, **When** rangeringen vises, **Then** fremgår denne nederst med 0 DKK i omsætning.

---

### User Story 14 — Fordeling af værelsestyper pr. gæsteland (Priority: P2)

Som hoteladministrator ønsker jeg en fordelingsoversigt over, hvilke værelsestyper gæster fra forskellige lande booker (overordnet og pr. sæson), så jeg kan afdække præferencer og købekraft på tværs af markeder.

- **Why this priority**: Giver kommerciel indsigt i kundesegmenter (f.eks. om tyske gæster primært booker suiter i højsæsonen).
- **Independent Test**: Kan testes ved at krydstabulere lande og værelsestyper og afstemme antal bookinger/overnatninger.
- **Acceptance Scenarios**:
  1. **Given** bookinger fra Danmark, Sverige og Tyskland fordelt på forskellige værelsestyper, **When** administratoren vælger et land, **Then** viser visualiseringen den præcise fordeling over de 8 værelseskategorier.
  2. **Given** et tilknyttet sæsonfilter, **When** sæsonen ændres, **Then** opdateres fordelingen for det valgte land til den pågældende sæson.

---

### User Story 15 — Gennemsnitlig opholdslængde (ALOS) pr. land og værelsestype (Priority: P2)

Som hoteladministrator ønsker jeg at se, hvilke lande og værelsestyper der gennemsnitligt har de længste bookingperioder (både årligt og pr. sæson), så jeg kan optimere minimum-stay-regler og pakkeløsninger.

- **Why this priority**: Belyser gæsteadfærd: forretningsrejsende (korte ophold) vs. feriegæster (lange ophold).
- **Independent Test**: Kan testes ved at beregne $\text{ALOS} = \frac{\text{Antal overnatningsnætter}}{\text{Antal bookinger}}$ for udvalgte segmenter.
- **Acceptance Scenarios**:
  1. **Given** 10 bookinger fra USA med i alt 40 overnatninger (gns. 4,0 nætter) og 20 bookinger fra Danmark med i alt 30 overnatninger (gns. 1,5 nætter), **When** rapporten vises, **Then** rangeres USA over Danmark med det korrekte gennemsnit.
  2. **Given** et filter på værelsestyper, **When** "LOFT suite" vælges, **Then** vises den gennemsnitlige opholdslængde specifikt for denne værelseskategori.

---

### User Story 16 — Selvvalgt nøgletal: ADR (Average Daily Rate) (Priority: P2)

Som hoteladministrator ønsker jeg at kunne se hotellets gennemsnitlige dagspris pr. solgt værelse (ADR), så jeg kan vurdere prisniveauet uafhængigt af den samlede volumen.

- **Why this priority**: Opfylder opgavekravet om *"ét selvvalgt interessant nøgletal"*; branchestandard sammen med belægningsgrad.
- **Independent Test**: Kan testes ved formlen $\text{ADR} = \frac{\text{Realiserede værelsesindtægter}}{\text{Antal solgte værelsesnætter}}$ for en given periode.
- **Acceptance Scenarios**:
  1. **Given** 1.000 solgte værelsesnætter og en samlet værelsesomsætning på 1.400.000 DKK i en måned, **When** administratoren aflæser ADR, **Then** viser kortet nøjagtigt 1.400,00 DKK pr. nat.
  2. **Given** en periode med 0 solgte værelsesnætter, **When** visningen åbnes, **Then** viser ADR-kortet "Ikke beregnelig" i stedet for en division med nul-fejl.

---

### User Story 17 — Helene Christines samlede barsalg for året (Priority: P3)

Som hoteladministrator ønsker jeg at kunne se receptionisten Helene Christines samlede salg i cocktailbaren for et valgt år, så jeg kan dokumentere hendes salgsresultater særskilt som krævet i opgaven.

- **Why this priority**: Eksplicit opgavekrav for lobbybaren; skal filtreres pålideligt på medarbejderniveau.
- **Independent Test**: Kan testes med et datasæt indeholdende salg fra både Helene Christine og andre medarbejdere.
- **Acceptance Scenarios**:
  1. **Given** at Helene Christine har solgt for 250.000 DKK i 2026 og en anden medarbejder har solgt for 350.000 DKK, **When** administratoren filtrerer på Helene Christine for 2026, **Then** viser totalfeltet præcis 250.000 DKK.
  2. **Given** at filteret på Helene Christine fjernes, **When** visningen opdateres, **Then** vises hele barens samlede salg på 600.000 DKK.

---

### User Story 18 — Omsætning pr. drink på drinksmenuen (Priority: P3)

Som hoteladministrator ønsker jeg et overblik over, hvilke drinks på barens menu der genererer størst indtjening, så jeg kan optimere menukortet og prissætningen på vores 20 cocktails og 10 kaffetyper.

- **Why this priority**: Eksplicit opgavekrav; gør det muligt at identificere hotellets mest profitable drikkevarer.
- **Independent Test**: Kan testes ved at aggregere salgslinjer grupperet efter produktnavn.
- **Acceptance Scenarios**:
  1. **Given** salgslinjer for baren i en given periode, **When** oversigten over omsætning pr. drink vises, **Then** præsenteres en sorteret søjlegraf med produkterne rangeret efter samlet omsætning (antal gange stykpris).
  2. **Given** et valg om at se hele baren vs. kun Helene Christine, **When** filteret skiftes, **Then** tilpasses tallene det valgte udsnit med tydelig overskrift.

---

### User Story 19 — Mest solgte drinks i volumen/antal (Priority: P3)

Som hoteladministrator ønsker jeg at se, hvilke drinks der sælges flest af i volumen (antal enheder) om året, så jeg kan tilpasse råvareindkøb, forberedelse og lagerbeholdning.

- **Why this priority**: Sikrer operationel drift i baren ved at skelne mellem høj omsætning (dyre cocktails) og højt styksalg (f.eks. kaffe/fadøl).
- **Independent Test**: Kan testes ved at summere solgte enheder pr. produkt og kontrollere sorteringen.
- **Acceptance Scenarios**:
  1. **Given** salg af 500 kopper Americano og 200 Old Fashioned cocktails, **When** administratoren sorterer efter antal enheder, **Then** vises Americano øverst med 500 stk.

---

### User Story 20 — Procentfordeling af kaffe vs. cocktails for Helene Christine (Priority: P3)

Som hoteladministrator ønsker jeg at se den procentvise fordeling mellem salg af cocktails og kaffe for receptionisten Helene Christine, så jeg kan vurdere hendes salgsprofil mellem dagssalg (kaffe) og aftensalg (cocktails).

- **Why this priority**: Eksplicit opgavekrav: *"Vis procentfordeling af cocktails og kaffe for Helene Christine"*.
- **Independent Test**: Kan testes ved at beregne andelen af cocktails og kaffe udelukkende inden for de to kategorier for hendes medarbejder-ID.
- **Acceptance Scenarios**:
  1. **Given** at Helene Christine i 2026 har solgt cocktails for 60.000 DKK og kaffe for 40.000 DKK (i alt 100.000 DKK i de to kategorier), **When** visningen åbnes for hende, **Then** viser en 100 %-stablet søjle præcis 60 % Cocktails og 40 % Kaffe.
  2. **Given** et skift mellem omsætningsandel (DKK) og antalsandel (stk.), **When** visningstype vælges, **Then** opdateres procentfordelingen med tydelig angivelse af måleenhed.

---

### User Story 21 — Kundetilfredshedsmåling (Priority: P3)

Som hoteladministrator ønsker jeg at kunne aflæse hotellets gennemsnitlige kundetilfredshedsscore (1–5 stjerner) samt antallet af besvarelser for en valgt periode, så jeg kan følge gæsternes tilfredshed i relation til belægning og værelsespriser.

- **Why this priority**: Opfylder det overordnede systemkrav om kundetilfredshed; viser både gennemsnit og datagrundlagets omfang.
- **Independent Test**: Kan testes ved at beregne gennemsnittet af registrerede 1–5 stjernede ratings samt tælle antallet af besvarelser.
- **Acceptance Scenarios**:
  1. **Given** registrerede tilfredshedsscorer (skala 1–5 stjerner pr. booking), **When** administratoren inspicerer tilfredshedskortet i Tableau, **Then** vises gennemsnitsscoren samt det samlede antal besvarelser.
  2. **Given** en periode uden registrerede besvarelser, **When** visningen indlæses, **Then** viser kortet "Ingen besvarelser" frem for en opdigtet nul-rating.

---

### Edge Cases

- **Ophold hen over årsskifte**: Hvis en gæst checker ind d. 28. december og checker ud d. 3. januar, skal de 4 overnatninger i december tilskrives det første år, og de 2 overnatninger i januar tilskrives det nye år i årsrapporterne.
- **Ophold hen over sæsongrænser**: Hvis et ophold krydser grænsen mellem f.eks. Mellemsæson og Højsæson, skal hver nat afregnes og tilskrives den specifikke sæson, natten tilhører.
- **Afrejsedato som overnatning**: Afrejsedatoen er ikke en overnatning (3 nætter = check-out dato minus check-in dato). Belægning og omsætning må ikke tælle afrejsedagen som en ekstra nat.
- **Flere personer på én booking**: En booking med 4 personer må aldrig få sit samlede overnatningsbeløb multipliceret med 4 i lande- eller omsætningsanalyserne.
- **Division med nul**: Ved 0 solgte nætter, 0 bookinger eller 0 salg i baren skal alle gennemsnit (ADR, ALOS) og procentsatser vise "Ikke beregnelig" eller "0,0 %" frem for at fejle.
- **Sletning/Aflysning vs. Historik**: Aflyste bookinger skal have en entydig status (`cancelled`), så de bevares til revisionsformål uden at indgå i realiseret omsætning eller optage værelseskapacitet.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Systemet SKAL udstille en browserbaseret brugergrænseflade, hvor en receptionist kan søge, oprette, redigere og slette/aflyse bookinger (Booking-CRUD).
- **FR-002**: Systemet SKAL validere, at en afrejsedato altid er strengt efter ankomstdatoen, og afvise enhver registrering, der bryder denne regel, med en forklarende fejlmeddelelse.
- **FR-003**: Systemet SKAL håndtere hotellets **214 fysiske værelser** fordelt på de **8 officielle værelsestyper**:
  1. Standard enkeltværelse
  2. Grand lit værelse / dobbelt økonomi
  3. Standard dobbeltværelse
  4. Superior dobbeltværelse
  5. Junior suite
  6. Spa executive
  7. Suite
  8. LOFT suite
- **FR-004**: Systemet SKAL afvise bookinger, hvor antallet af gæster overstiger værelseskategoriens maksimale kapacitet (maks. 4 personer pr. værelse).
- **FR-005**: Systemet SKAL opdele årets overnatninger i tre ikke-overlappende sæsoner med faste datointervaller:
  - *Lavsæson*: 1. november – 28./29. februar (vintermånederne)
  - *Mellemsæson*: 1. marts – 31. maj samt 1. september – 31. oktober (forår og efterår)
  - *Højsæson*: 1. juni – 31. august (sommermånederne)
- **FR-006**: Systemet SKAL fordele nætter og tilhørende omsætning korrekt til de respektive år og sæsoner ved ophold, der krydser kalenderårs- eller sæsongrænser.
- **FR-007**: Systemet SKAL registrere og persistere alle transaktioner i MySQL-databasen, så data bevares over genstart.
- **FR-008**: Systemet SKAL beregne den samlede realiserede hotelomsætning for et valgt år som summen af faktiske værelsesindtægter og faktiske barsalgslinjer.
- **FR-009**: Systemet SKAL beregne og præsentere hotellets belægningsgrad som:  
  $$\text{Belægningsgrad (\%)} = \frac{\text{Antal optagne værelsesnætter}}{\text{Antal tilgængelige værelsesnætter (214 pr. døgn)}} \times 100$$
- **FR-010**: Systemet SKAL beregne og præsentere gæstefordelingen pr. land samt den samlede indtjening fordelt pr. gæsteland (med synlig angivelse af eventuelt ukendt land).
- **FR-011**: Systemet SKAL beregne og præsentere indtjeningen fordelt pr. værelsestype og sæson uden overlap eller dobbelttælling.
- **FR-012**: Systemet SKAL rangere de mest indbringende værelser defineret som de 8 officielle værelsestyper (sidestiller "værelser" med de 8 værelseskategorier).
- **FR-013**: Systemet SKAL rangere de mest indbringende gæstelande efter årlig omsætning.
- **FR-014**: Systemet SKAL beregne og præsentere det selvvalgte nøgletal ADR (Average Daily Rate):  
  $$\text{ADR} = \frac{\text{Realiseret værelsesomsætning}}{\text{Antal solgte værelsesnætter}}$$
- **FR-015**: Systemet SKAL registrere barsalg med tilknytning til medarbejder, produkt, kategori (cocktail, kaffe, vin, øl, snacks), antal, enhedspris og tidspunkt.
- **FR-016**: Systemet SKAL kunne filtrere barens salg på medarbejder-ID og specifikt beregne Helene Christines samlede barsalg for et valgt år.
- **FR-017**: Systemet SKAL beregne og rangere omsætningen pr. drink/produkt på drinksmenuen.
- **FR-018**: Systemet SKAL beregne og rangere det samlede antal solgte enheder (volumen) pr. drink/produkt.
- **FR-019**: Systemet SKAL beregne den procentvise fordeling mellem salg af cocktails og kaffe for Helene Christine i et valgt år, hvor nævneren udelukkende udgøres af summen af disse to kategorier, med omsætningsandel i DKK som standardvisning og mulighed for skift til antalsandel i stk.
- **FR-020**: Systemet SKAL understøtte kundetilfredshedsmåling baseret på en rating-score fra 1 til 5 stjerner pr. booking, og præsentere både gennemsnitlig score og det samlede antal besvarelser i Tableau (eller "Ingen besvarelser" ved tomt datasæt).
- **FR-021**: Systemet SKAL levere alle analyser via et interaktivt Tableau-dashboard med udgangspunkt i backendens dataadgang (uden brug af manuelle CSV-engangseksportfiler som løbende opdateringsvej).
- **FR-022**: Systemet SKAL sikre, at dataændringer foretaget i browserfrontenden (opret, ret, slet booking) slår igennem i de underliggende analyser ved efterfølgende dataopdatering i Tableau.

---

### Key Entities

- **Guest**: Repræsenterer hotellets gæst. Vigtige attributter: gæste-ID, fulde navn, nationalitet/kontaktland, kontaktoplysninger.
- **Room**: Repræsenterer et af hotellets 214 fysiske værelser. Vigtige attributter: værelsesnummer, etage, tilknyttet værelsestype, aktuel status (tilgængelig, optaget, under rengøring/vedligeholdelse).
- **RoomType**: Repræsenterer én af de 8 værelseskategorier. Vigtige attributter: type-ID, typenavn (f.eks. "Spa Executive"), standardkapacitet (1–4 personer), vejledende basispris.
- **Booking**: Repræsenterer en reservation. Vigtige attributter: booking-ID, tilknyttet gæst, tilknyttet værelse/værelsestype, ankomstdato, afrejsedato, antal gæster, aftalt totalbeløb, reservationsstatus (`confirmed`, `cancelled`, `completed`), oprettelsestidspunkt.
- **Season**: Repræsenterer de tre driftssæsoner (*Lavsæson*: 1. nov – 28./29. feb, *Mellemsæson*: 1. mar – 31. maj + 1. sep – 31. okt, *Højsæson*: 1. jun – 31. aug). Vigtige attributter: sæson-ID, navn, startdato, slutdato.
- **Employee**: Repræsenterer hotellets personale (herunder receptionisten Helene Christine). Vigtige attributter: medarbejder-ID, navn, rolle/funktion.
- **Product**: Repræsenterer varer på lobbybarens menukort (20 cocktails, 10 kaffetyper, vin, øl, snacks). Vigtige attributter: produkt-ID, varenavn, kategori (`cocktail`, `coffee`, `other`), stykpris.
- **SaleLine**: Repræsenterer en solgt varelinje i baren. Vigtige attributter: salgslinje-ID, salgstidspunkt, tilknyttet medarbejder, tilknyttet produkt, antal, realiseret salgspris.
- **SatisfactionRating**: Repræsenterer en gæstetilfredshedsmåling tilknyttet et ophold (skala 1–5 stjerner med tilknyttet afgivelsestidspunkt).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001 (End-to-End Opdateringsflow)**: En ændring foretaget i browserfrontenden (opret, ret eller slet booking) skal være reflekteret i de tilknyttede nøgletal i Tableau inden for **under 30 sekunder** efter udløst data-refresh.
- **SC-002 (Kapacitetsintegritet)**: Beregning af belægningsgrad skal til enhver tid være 100 % matematisk konsistent baseret på de **214 værelser** (hverken overstige 100 % for hotellet som helhed eller tælle afrejsedatoer som overnatninger).
- **SC-003 (Datakvalitet & Validering)**: 100 % af ugyldige reservationsforsøg (afrejse før ankomst eller persontall $\gt 4$) afvises ved kilden uden at efterlade halve transaktioner i MySQL-databasen.
- **SC-004 (Økonomisk Konsistens)**: Summen af indtægter opdelt på de 8 værelsestyper og 3 sæsoner skal stemme på decimalen med hotellets samlede rapporterede værelsesomsætning for perioden.
- **SC-005 (Medarbejderisolation i Baren)**: Ved visning af Helene Christines barsalg for året må 0 % af andre bartenderes eller medarbejderes salgslinjer indgå i hendes opgørelse.
- **SC-006 (Division med nul-håndtering)**: Ved perioder eller kategorier uden salg skal 100 % af nøgletallene (ADR, ALOS, kaffe/cocktail-procent) rapportere "Ikke beregnelig" eller "0,0 %" frem for at fremprovokere systemfejl eller uforklarlige blanke diagrammer.
- **SC-007 (Komplet Analysekravsdækning)**: Tableau-dashboardet skal indeholde samtlige **10 obligatoriske analysevisninger** fra opgavebeskrivelsen samt belægningsgrad og kundetilfredshed.
- **SC-008 (Enkeltkommandostart)**: Hele det containeriserede system skal kunne startes fra bunden på et rent udviklingsmiljø ved hjælp af én enkelt `docker-compose up`-kommando.

---

## Assumptions

- **A-001**: Prisintervallerne i opgavebeskrivelsen (f.eks. 900–1.200 DKK for Standard enkeltværelse) er vejledende domænekontekst; analyser og regnskab baseres på faktiske, realiserede beløb i transaktionsdata.
- **A-002**: Hotellets samlede værelsesbestand er fastlagt til **214 værelser**, og den maksimale teoretiske gæstekapacitet er ca. 428 gæster. Belægningsgrad baseres på optagne værelser ud af 214 (room occupancy).
- **A-003**: Sæsongrænser defineres administrativt i systemet, så alle 365/366 dage i året entydigt tilhører enten Lavsæson, Mellemsæson eller Højsæson.
- **A-004**: Browserfrontenden er en prototype-erstatning for hotellets fremtidige bookingsystem, som i den endelige arkitektur vil kunne integrere mod samme backend via REST API (`POST`/`PUT`/`DELETE`).
- **A-005**: Tableau afvikles som en ekstern analyseklient/arbejdsstation, der forbinder til backendens data via en dokumenteret adapter/connector, idet en standard Tableau Desktop-klient ikke afvikles inde i Docker Compose.
