# 🏨 Hotel Kong Arthur — Tableau Dashboard Resources

Dette bibliotek indeholder artefakter og ressourcer til ledelsesdashboardet i Tableau Desktop.

## Filer i dette bibliotek
- **`Hotel_Kong_Arthur_Executive_Dashboard.twb`**:  
  Færdigbygget Tableau Executive Workbook, som automatisk forbinder til Web Data Connectoren på `http://localhost:5000/tableau-wdc.html`.  
  Dashboardet indeholder:
  - 1. Hovednøgletal (Total omsætning, Værelsesomsætning, Baromsætning, Belægning på 214 værelser, ADR).
  - 2. Omsætningsfordeling (Værelser vs. Bar).
  - 3. Helene Christine (Cocktails 34,5% vs. Kaffe 65,5%).
  - Fuldt samlet Executive Dashboard i 1400 x 900 px format.

- **`Hotel_Kong_Arthur_Room_Types_Dashboard.twb`**:  
  Færdigbygget Tableau Værelses- & Sæsonanalyse (US-14, US-15, US-16, US-17).  
  Dashboardet indeholder:
  - 1. Omsætning pr. Værelsestype med **interaktivt filter på år** (2025, 2026, Alle).
  - 2. Indtjening pr. Værelsestype opdelt på Sæson (Lavsæson, Mellemsæson, Højsæson).
  - 3. Gennemsnitlig Opholdslængde (ALOS i dage) pr. Værelsestype.
  - Fuldt samlet Værelses- & Sæsonanalyse Dashboard med interaktivt årsfilter.

> **Bemærk for lokal åbning**:  
> Begge filer er automatisk synkroniseret til din lokale Tableau-mappe:  
> - `C:\Users\mathi\Documents\My Tableau Repository\Workbooks\Hotel_Kong_Arthur_Executive_Dashboard.twb`  
> - `C:\Users\mathi\Documents\My Tableau Repository\Workbooks\Hotel_Kong_Arthur_Room_Types_Dashboard.twb`  
> Du kan åbne dem direkte i Tableau Desktop via File -> Open.

## Manuel trin-for-trin guide (Option A)
Hvis du ønsker at bygge dashboardet manuelt fra bunden i Tableau Desktop, kan du følge den komplette guide:  
👉 **[Tableau Executive Dashboard Guide](../docs/tableau_dashboard_guide.md)**
