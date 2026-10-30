# Retningslinjer for Samarbejde og Udvikling (CONTRIBUTE.md)

Velkommen til udviklingen af **Hotel Kong Arthur Management & Analytics Platform (SCAMM)** for 3. semesters tværfaglige opgave i softwarearkitektur.

Dette dokument fastlægger vores fælles arbejdsgang, branch-strategi, review-regler og **Definition of Done (DoD)**, så hele teamet kan arbejde uafhængigt uden konflikter.

---

## 1. Branch-Strategi

Vi arbejder ud fra en forenklet Git-flow model med `development` som den centrale integrationsgren:

* **`development`**: Hovedudviklingsbranchen hvor alle nye features samles og testes.
* **Feature Branches**: Hvert teammedlem opretter en isoleret branch ud fra den seneste `development`:
  
```bash
git checkout development
git pull origin development
git checkout -b <type>/<jira-key>-<kort-beskrivelse>
```

### Navngivningskonvention for branches:
* **Features**: `feat/SH-<nummer>-<beskrivelse>`
  * *Eksempel*: `feat/SH-13-booking-creation` (Amira)
  * *Eksempel*: `feat/SH-20-booking-search` (Christoffer)
  * *Eksempel*: `feat/SH-33-hotel-revenue` (Simon)
  * *Eksempel*: `feat/SH-43-bar-analytics` (Maja)
* **Fejlrettelser**: `fix/SH-<nummer>-<beskrivelse>`
* **Dokumentation & QA**: `docs/SH-<nummer>-<beskrivelse>` eller `test/SH-<nummer>-<beskrivelse>`

---

## 2. Commit-Konventioner (Conventional Commits)

Vi anvender standardiserede commit-beskeder for sporbarhed mod Jira:

* `feat(scope): beskrivelse af ny funktion` (f.eks. `feat(bookings): tilføj Zod-validering af ankomstdato`)
* `fix(scope): beskrivelse af fejlrettelse` (f.eks. `fix(rooms): korriger status på værelse 305`)
* `docs(scope): dokumentationsændringer`
* `test(scope): tilføjelse eller rettelse af enhedstests`
* `refactor(scope): kodeændringer uden adfærdsændring`

---

## 3. Pull Requests & Merge Regler (Self-Review Policy)

For at sikre fremdrift og undgå flaskehalse gælder følgende pragmatiske review-politik:

1. **Self-Review er tilstrækkeligt**:  
   Du må **godkende og merge din egen Pull Request direkte ind i `development`**, så længe du selv har gennemført en omhyggelig **self-review** og krydset alle punkter i tjeklisten nedenfor af.
2. **Frivilligt Peer-Review**:  
   Hvis du er i tvivl om arkitekturmæssige snitflader eller databasemodellen, kan du anmode et andet teammedlem (f.eks. Mathias for arkitektur/infrastruktur) om review.
3. **Ingen direkte commits til `development`**:  
   Al feature-kode skal altid gå via en branch og en PR (eller merges lokalt efter verifikation).

---

## 4. Definition of Done (DoD) Tjekliste

Før en PR merges ind i `development` og din Jira ticket flyttes til **Done**, skal du verificere følgende:

- [ ] **Arkitekturoverholdelse (3-Lags princip)**:
  - Ingen SQL-forespørgsler i Controller- eller Routes-laget (al databaseadgang sker i `repositories/`).
  - Ingen forretningsvalidering direkte i UI eller ruter (forretningslogik ligger i `services/`).
- [ ] **Lokal Byggetest**:
  - `docker-compose up --build -d` kører fejlfrit lokalt på din maskine.
  - Ingen manglende moduler eller brækkede imports.
- [ ] **Sikkerhed & Hemmeligheder**:
  - Ingen hardcodede adgangskoder eller API-nøgler i koden (brug `.env`).
  - `.env` må **aldrig** committes til Git (kun `.env.example`).
- [ ] **Jira Sporbarhed**:
  - Jira ticket-nøglen (f.eks. `SH-15`) indgår i branch-navnet eller commit-beskeden.
  - Checklisten i `specs/001-hotel-management/tasks.md` er opdateret til `[x]`.

---

## 5. Fejlfinding & Hjælp

Hvis du oplever problemer med containere eller databasen lokalt:

```bash
# Se status og logs for alle containere
docker-compose ps
docker-compose logs -f backend

# Nulstil containere og data ved behov
docker-compose down -v
docker-compose up --build -d
```
