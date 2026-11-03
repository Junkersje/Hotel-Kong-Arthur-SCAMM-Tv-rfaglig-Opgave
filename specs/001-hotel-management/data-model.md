# Phase 1: Data Model & Database Architecture

**Feature**: [spec.md](./spec.md) | **Feature Directory**: `specs/001-hotel-management`  
**Date**: 2026-10-29  
**Database**: PostgreSQL 15
**Status**: Completed

Dette dokument definerer den relationelle datamodel, tabeller, fremmednøgler, forretningsregler og seed-strategi for Hotel Kong Arthur-systemet (SCAMM).

---

## 1. Konceptuel ER-Model

```mermaid
erDiagram
    country ||--o{ costumer : "has"
    season ||--o{ room_price : "defines"
    season ||--o{ booking : "falls_under"
    room_type ||--o{ room : "categorizes"
    room_type ||--o{ room_price : "priced_at"
    room ||--o{ booking : "assigned_to"
    costumer ||--o{ booking : "places"
    category ||--o{ product : "classifies"
    product ||--o{ sales : "sold_in"

    country {
        int id PK
        varchar name
    }

    season {
        int id PK
        varchar name
    }

    room_type {
        int id PK
        varchar name
        int max_capacity
    }

    room {
        int id PK
        varchar name
        int room_type_id FK
    }

    room_price {
        int id PK
        int room_type_id FK
        int season_id FK
        numeric price_pr_night
    }

    costumer {
        int id PK
        varchar first_name
        varchar last_name
        varchar email
        varchar phone_number
        int country_id FK
    }

    booking {
        int id PK
        int costumer_id FK
        timestamp order_date
        int room_id FK
        timestamp arrival
        timestamp departure
        int season_id FK
        int occupants
        numeric price
        varchar status
        int star_rating
        timestamp updated_at
    }

    category {
        int id PK
        varchar name
    }

    product {
        int id PK
        varchar name
        int category_id FK
        numeric unit_price
        int total_amount_sold
    }

    sales {
        int id PK
        int product_id FK
        int quantity
        timestamp date
    }

```
## Konceptuel Domain Model
```mermaid
classDiagram
    direction TB

    class Country {
        +String name
    }

    class Customer {
        +String firstName
        +String lastName
        +String email
        +String phoneNumber
    }

    class Season {
        +String name
    }

    class RoomType {
        +String name
        +Integer maxCapacity
    }

    class RoomPrice {
        +Decimal pricePrNight
    }

    class Room {
        +String name
    }

    class Booking {
        +DateTime orderDate
        +DateTime arrival
        +DateTime departure
        +Integer occupants
        +Decimal price
        +String status
        +Integer starRating
        +DateTime updatedAt
    }

    class Category {
        +String name
    }

    class Product {
        +String name
        +Decimal unitPrice
        +Integer totalAmountSold
    }

    class Sale {
        +Integer quantity
        +DateTime date
    }

    Country "1" -- "0..*" Customer : er hjemland for
    Customer "1" -- "0..*" Booking : foretager
    RoomType "1" -- "1..*" Room : kategoriserer
    Room "1" -- "0..*" Booking : reserveres i
    Season "1" -- "0..*" Booking : tilknyttes

    RoomType "1" -- "0..*" RoomPrice : prissættes ved
    Season "1" -- "0..*" RoomPrice : gælder for

    Category "1" -- "0..*" Product : grupperer
    Product "1" -- "0..*" Sale : indgår i
```
---

## 2. Tabeldefinitioner & Integritetsregler

### 2.1 `room_types` (De 8 officielle værelseskategorier)
- **Formål**: Indeholder hotellets 8 faste værelsestyper.
- **Felter**:
  - `id` (SERIAL, PK)
  - `name` (VARCHAR(100), NOT NULL, UNIQUE)
  - `capacity` (INT, NOT NULL, DEFAULT 2) — Maksimal personkapacitet (1–4)
  - `base_price_indicative` (VARCHAR(100), NULL) — Vejledende prisinterval fra opgaven (kun information)

**Faste data (8 rækker)**:
1. `Standard enkeltværelse` (Kapacitet: 1, Vejl: 900–1.200 DKK)
2. `Grand lit værelse` (dobbelt økonomi) (Kapacitet: 2, Vejl: 1.100–1.400 DKK)
3. `Standard dobbeltværelse` (Kapacitet: 2, Vejl: 1.200–1.600 DKK)
4. `Superior dobbeltværelse` (Kapacitet: 3, Vejl: 1.400–2.000 DKK)
5. `Junior suite` (Kapacitet: 4, Vejl: 1.800–2.500 DKK)
6. `Spa executive` (Kapacitet: 2, Vejl: 2.000–2.800 DKK)
7. `Suite` (Kapacitet: 4, Vejl: 2.500–3.500 DKK)
8. `LOFT suite` (Kapacitet: 4, Vejl: 3.000–4.000 DKK)

---

### 2.2 `rooms` (De 214 fysiske værelser)
- **Formål**: Registrering af hotellets samlede verificerede værelsesbestand (grundlag for belægningsgrad).
- **Felter**:
  - `room_number` (INT, PK) — Værelsesnumre (f.eks. 101–425)
  - `room_type_id` (INT, NOT NULL, FK $\rightarrow$ `room_types.id`)
  - `floor` (INT, NOT NULL) — 1. til 4. etage
  - `status` (VARCHAR(50), NOT NULL, DEFAULT 'available', CHECK `status IN ('available', 'occupied', 'maintenance')`)

**Integritetsregel**: Der skal være præcis **214 værelser** oprettet i seed-data for at sikre, at kapacitetsberegninger til enhver tid er retvisende.

---

### 2.3 `guests` (Gæster og lande)
- **Formål**: Registrering af gæstens oplysninger og bopælsland/nationalitet.
- **Felter**:
  - `id` (SERIAL, PK)
  - `name` (VARCHAR(150), NOT NULL)
  - `country` (VARCHAR(100), NULL) — Gæstens kontaktland (hvis NULL, grupperes under "Ukendt")
  - `email` (VARCHAR(150), NULL)
  - `phone` (VARCHAR(50), NULL)
  - `created_at` (TIMESTAMP, NOT NULL, DEFAULT CURRENT_TIMESTAMP)

---

### 2.4 `bookings` (Reservationer og ophold)
- **Formål**: Kerneenhed for overnatninger, CRUD-håndtering og omsætningsberegninger.
- **Felter**:
  - `id` (SERIAL, PK)
  - `guest_id` (INT, NOT NULL, FK $\rightarrow$ `guests.id`)
  - `room_type_id` (INT, NOT NULL, FK $\rightarrow$ `room_types.id`)
  - `room_number` (INT, NULL, FK $\rightarrow$ `rooms.room_number`) — Valgfrit tildelt værelse
  - `check_in_date` (DATE, NOT NULL)
  - `check_out_date` (DATE, NOT NULL)
  - `num_guests` (INT, NOT NULL, CHECK `num_guests >= 1 AND num_guests <= 4`)
  - `total_price` (DECIMAL(10,2), NOT NULL, CHECK `total_price >= 0`) — Faktisk aftalt totalbeløb i DKK
  - `status` (VARCHAR(20), NOT NULL, DEFAULT 'confirmed', CHECK `status IN ('confirmed', 'cancelled', 'completed')`)
  - `satisfaction_rating` (SMALLINT, NULL, CHECK `satisfaction_rating BETWEEN 1 AND 5`)
  - `created_at` (TIMESTAMP, NOT NULL, DEFAULT CURRENT_TIMESTAMP)
  - `updated_at` (TIMESTAMP, NOT NULL; updated by the application)

**Validerings- og Forretningsregler**:
1. `check_out_date > check_in_date` (afvises ellers af database constraint / service-lag).
2. Sletning udføres som **Soft Delete**: `UPDATE bookings SET status = 'cancelled' WHERE id = $1`.
3. Beregning af overnatninger: $\text{Nætter} = \text{check\_out\_date} - \text{check\_in\_date}$. Check-out dagen tæller **ikke** som en overnatning.

---

### 2.5 `employees` (Hotellets personale)
- **Formål**: Registrering af ansatte for at muliggøre medarbejderfiltrering i baren.
- **Felter**:
  - `id` (VARCHAR(20), PK) — F.eks. `HC01` for Helene Christine
  - `name` (VARCHAR(100), NOT NULL)
  - `role` (VARCHAR(100), NOT NULL)

**Faste data**:
- `HC01`: Helene Christine (Receptionist & Bartender)
- `BM02`: Barskift 2 (Bartender)
- `BM03`: Barskift 3 (Bartender)

---

### 2.6 `products` (Lobbybarens menukort)
- **Formål**: Registrering af menukortet i lobbybaren.
- **Felter**:
  - `id` (SERIAL, PK)
  - `name` (VARCHAR(100), NOT NULL, UNIQUE)
  - `category` (VARCHAR(20), NOT NULL, CHECK `category IN ('cocktail', 'coffee', 'wine', 'beer', 'snack')`)
  - `price` (DECIMAL(10,2), NOT NULL, CHECK `price >= 0`)

**Dataomfang**:
- **20 forskellige cocktails** (f.eks. *Espresso Martini*, *Old Fashioned*, *Mojito*, *Gin Hass*, *Aviation*...)
- **10 forskellige kaffetyper** (f.eks. *Espresso*, *Americano*, *Caffè Latte*, *Cappuccino*, *Cortado*, *Flat White*...)
- Udvalgte vine, øl og snacks.

---

### 2.7 `sales` og `sale_lines` (Barsalgstransaktioner)
- **Formål**: Fintmasket transaktionsdata for baren, der muliggør både medarbejder-, volumen- og produktanalyser.
- **`sales` Felter**:
  - `id` (SERIAL, PK)
  - `employee_id` (VARCHAR(20), NOT NULL, FK $\rightarrow$ `employees.id`)
  - `sale_time` (TIMESTAMP, NOT NULL, DEFAULT CURRENT_TIMESTAMP)
  - `total_amount` (DECIMAL(10,2), NOT NULL, DEFAULT 0.00)
- **`sale_lines` Felter**:
  - `id` (SERIAL, PK)
  - `sale_id` (INT, NOT NULL, FK $\rightarrow$ `sales.id` ON DELETE CASCADE)
  - `product_id` (INT, NOT NULL, FK $\rightarrow$ `products.id`)
  - `quantity` (INT, NOT NULL, CHECK `quantity >= 1`)
  - `unit_price` (DECIMAL(10,2), NOT NULL)
  - `subtotal` (DECIMAL(10,2), NOT NULL) — Beregnet som `quantity * unit_price`

---

## 3. Sæsontilknytning & Beregningslogik i SQL

For at fordele overnatninger på sæsoner anvender forretningslaget og databaseforespørgslerne følgende datologik for en given overnatningsdato $D$:

```sql
CASE 
    WHEN EXTRACT(MONTH FROM D) IN (11, 12, 1, 2) THEN 'Lavsæson'
    WHEN EXTRACT(MONTH FROM D) IN (3, 4, 5, 9, 10) THEN 'Mellemsæson'
    WHEN EXTRACT(MONTH FROM D) IN (6, 7, 8) THEN 'Højsæson'
END AS season_name
```

### Håndtering af ophold over sæson- eller årsskifte:
Ved hjælp af en dato-tabel (`calendar_dates`) eller en rekursiv CTE genereres én række pr. overnatning:
$$\text{Datoer for booking: } [\text{check\_in\_date}, \dots, \text{check\_out\_date} - 1 \text{ dag}]$$
Hver enkelt overnatning tilskrives dagsprisen $\frac{\text{total\_price}}{\text{antal nætter}}$ og kategoriseres i den specifikke nat's sæson og kalenderår. Derved opnås 100 % nøjagtig fordeling uden afrundingsfejl.
