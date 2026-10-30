-- Hotel Kong Arthur - MySQL Database Schema & Seed Data (Spec-Kit ER Model)
CREATE DATABASE IF NOT EXISTS hotel_kong_arthur CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hotel_kong_arthur;

DROP TABLE IF EXISTS SALE_LINE;
DROP TABLE IF EXISTS SALE;
DROP TABLE IF EXISTS PRODUCT;
DROP TABLE IF EXISTS EMPLOYEE;
DROP TABLE IF EXISTS BOOKING;
DROP TABLE IF EXISTS GUEST;
DROP TABLE IF EXISTS ROOM;
DROP TABLE IF EXISTS ROOM_TYPE;

CREATE TABLE ROOM_TYPE (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    capacity INT NOT NULL,
    description TEXT
);

CREATE TABLE ROOM (
    room_number INT PRIMARY KEY,
    room_type_id INT NOT NULL,
    floor INT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'available',
    FOREIGN KEY (room_type_id) REFERENCES ROOM_TYPE(id)
);

CREATE TABLE GUEST (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    country VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(50) NOT NULL
);

CREATE TABLE BOOKING (
    id INT PRIMARY KEY AUTO_INCREMENT,
    guest_id INT NOT NULL,
    room_type_id INT NOT NULL,
    room_number INT NOT NULL,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    num_guests INT NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    status ENUM('confirmed', 'checked_in', 'checked_out', 'cancelled') NOT NULL DEFAULT 'confirmed',
    satisfaction_rating INT,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (guest_id) REFERENCES GUEST(id),
    FOREIGN KEY (room_type_id) REFERENCES ROOM_TYPE(id),
    FOREIGN KEY (room_number) REFERENCES ROOM(room_number)
);

CREATE TABLE EMPLOYEE (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    role VARCHAR(100) NOT NULL
);

CREATE TABLE PRODUCT (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    category ENUM('Cocktail', 'Coffee') NOT NULL,
    price DECIMAL(10,2) NOT NULL
);

CREATE TABLE SALE (
    id INT PRIMARY KEY AUTO_INCREMENT,
    employee_id VARCHAR(20) NOT NULL,
    sale_time DATETIME NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (employee_id) REFERENCES EMPLOYEE(id)
);

CREATE TABLE SALE_LINE (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sale_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (sale_id) REFERENCES SALE(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES PRODUCT(id)
);

-- Indekser for høj forespørgselsydeevne (SH-7 / T007)
CREATE INDEX idx_booking_dates ON BOOKING(check_in_date, check_out_date);
CREATE INDEX idx_booking_status ON BOOKING(status);
CREATE INDEX idx_guest_country ON GUEST(country);
CREATE INDEX idx_sale_time ON SALE(sale_time);