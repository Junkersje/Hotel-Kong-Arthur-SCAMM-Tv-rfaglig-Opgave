-- =====================================================================
-- Hotel Kong Arthur — Database Schema (DDL)
-- Database Engine: MySQL 8.0
-- Standard: 3. Normalform (3NF) med Foreign Keys og ACID Transaktioner
-- =====================================================================

CREATE DATABASE IF NOT EXISTS hotel_kong_arthur CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hotel_kong_arthur;

-- Drop eksisterende tabeller ved geninitialisering (omvendt afhængighedsrækkefølge)
DROP TABLE IF EXISTS sale_lines;
DROP TABLE IF EXISTS sales;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS employees;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS rooms;
DROP TABLE IF EXISTS room_types;
DROP TABLE IF EXISTS guests;

-- 1. Gæster (Guests)
CREATE TABLE guests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(50),
    country VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_guests_country (country),
    INDEX idx_guests_email (email)
) ENGINE=InnoDB;

-- 2. Værelsestyper (De 8 officielle typer på Hotel Kong Arthur)
CREATE TABLE room_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    capacity INT NOT NULL DEFAULT 2,
    base_price_dkk DECIMAL(10, 2) NOT NULL
) ENGINE=InnoDB;

-- 3. Fysiske Værelser (Præcis 214 værelser på Hotel Kong Arthur)
CREATE TABLE rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_number VARCHAR(10) NOT NULL UNIQUE,
    room_type_id INT NOT NULL,
    floor INT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    FOREIGN KEY (room_type_id) REFERENCES room_types(id) ON DELETE RESTRICT,
    INDEX idx_rooms_type (room_type_id),
    INDEX idx_rooms_floor (floor)
) ENGINE=InnoDB;

-- 4. Bookinger (Reservationer med soft-delete og tilfredshed)
CREATE TABLE bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guest_id INT NOT NULL,
    room_id INT NOT NULL,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    num_guests INT NOT NULL DEFAULT 1,
    total_price_dkk DECIMAL(10, 2) NOT NULL,
    status ENUM('confirmed', 'checked_in', 'checked_out', 'cancelled') NOT NULL DEFAULT 'confirmed',
    satisfaction_score TINYINT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE RESTRICT,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT,
    INDEX idx_bookings_dates (check_in_date, check_out_date),
    INDEX idx_bookings_status (status),
    INDEX idx_bookings_guest (guest_id),
    INDEX idx_bookings_room (room_id),
    CONSTRAINT chk_booking_dates CHECK (check_out_date > check_in_date),
    CONSTRAINT chk_booking_guests CHECK (num_guests BETWEEN 1 AND 4),
    CONSTRAINT chk_satisfaction CHECK (satisfaction_score IS NULL OR (satisfaction_score >= 1 AND satisfaction_score <= 5))
) ENGINE=InnoDB;

-- 5. Medarbejdere (Employees inkl. Helene Christine HC01)
CREATE TABLE employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_code VARCHAR(20) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'Bartender',
    INDEX idx_employees_code (employee_code)
) ENGINE=InnoDB;

-- 6. Produkter i Lobbybaren (20 Cocktails, 10 Kaffetyper m.fl.)
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    category ENUM('cocktail', 'coffee', 'other') NOT NULL,
    unit_price_dkk DECIMAL(10, 2) NOT NULL,
    INDEX idx_products_category (category)
) ENGINE=InnoDB;

-- 7. Barsalg Transaktioner (Header)
CREATE TABLE sales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    sale_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_amount_dkk DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT,
    INDEX idx_sales_time (sale_time),
    INDEX idx_sales_employee (employee_id)
) ENGINE=InnoDB;

-- 8. Varelinjer for Barsalg (Details)
CREATE TABLE sale_lines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sale_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price_dkk DECIMAL(10, 2) NOT NULL,
    line_total_dkk DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    INDEX idx_sale_lines_sale (sale_id),
    INDEX idx_sale_lines_product (product_id)
) ENGINE=InnoDB;
