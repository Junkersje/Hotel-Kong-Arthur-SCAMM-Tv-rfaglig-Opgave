# 🏨 Hotel Kong Arthur — Tableau Dashboard Resources

Dette bibliotek indeholder artefakter og ressourcer til ledelsesdashboardet i Tableau Desktop.

## Filer i dette bibliotek
- **`Hotel_Kong_Arthur_Executive_Dashboard.twb`**:  
  Komplet samlet Tableau Executive Workbook med én fælles WDC-datakilde (`Kong Arthur - Master Analytics`), som automatisk forbinder til `http://localhost:5000/tableau-wdc.html`.  
  Projektmappen indeholder 6 arbejdsark fordelt på **2 interaktive dashboards**:
  - **Dashboard 1: Executive Dashboard**
    - 1. Hovednøgletal (Total omsætning, Værelsesomsætning, Baromsætning, ADR).
    - 2. Omsætningsfordeling (Værelser 45,5% vs. Lobbybar 54,5%).
    - 3. Helene Christine (Cocktails 34,5% vs. Kaffe 65,5%).
  - **Dashboard 2: Værelses- & Sæsonanalyse (US-14, US-15, US-16)**
    - 4. Omsætning pr. Værelsestype med årsfiltrering (2024, 2025, 2026).
    - 5. Indtjening pr. Værelsestype opdelt på Sæson (Lav, Mellem, Høj).
    - 6. Gennemsnitlig Opholdslængde (ALOS i dage) pr. Værelsestype.

- **`Hotel_Kong_Arthur_Room_Types_Dashboard.twb`**:  
  Fristående version af Værelses- & Sæsonanalysen for individuel gennemgang.

> **Bemærk for lokal åbning**:  
> Filerne er automatisk synkroniseret til din lokale Tableau-mappe:  
> - `C:\Users\mathi\Documents\My Tableau Repository\Workbooks\Hotel_Kong_Arthur_Executive_Dashboard.twb`  
> - `C:\Users\mathi\Documents\My Tableau Repository\Workbooks\Hotel_Kong_Arthur_Room_Types_Dashboard.twb`  
> Du kan åbne dem direkte i Tableau Desktop via File -> Open.

## Manuel trin-for-trin guide (Option A)
Hvis du ønsker at bygge dashboardet manuelt fra bunden i Tableau Desktop, kan du følge den komplette guide:  
👉 **[Tableau Executive Dashboard Guide](../docs/tableau_dashboard_guide.md)**
