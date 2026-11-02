-- Hotel Kong Arthur - MySQL Database Schema & Seed Data (Spec-Kit ER Model)
/*Schema is ONLY allowed to contain table definitions and constraints!*/

USE hotel_kong_arthur;

DROP TABLE IF EXISTS booking CASCADE;
DROP TABLE IF EXISTS costumer CASCADE;
DROP TABLE IF EXISTS room_price CASCADE;
DROP TABLE IF EXISTS room CASCADE;
DROP TABLE IF EXISTS room_type CASCADE;
DROP TABLE IF EXISTS season CASCADE;
DROP TABLE IF EXISTS country CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS product CASCADE;
DROP TABLE IF EXISTS category CASCADE;


    CREATE TABLE country (
        id INT PRIMARY KEY,
        name VARCHAR(255) NOT NULL
    );


    CREATE TABLE season (
        id INT PRIMARY KEY,
        name VARCHAR(100) NOT NULL
    );


    CREATE TABLE room_type (
        id INT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        max_capacity INT NOT NULL
    );


    CREATE TABLE room (
        id INT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        room_type_id INT REFERENCES room_type(id)
    );


    CREATE TABLE room_price (
        id INT PRIMARY KEY,
        room_type_id INT REFERENCES room_type(id),
        season_id INT REFERENCES season(id),
        price_pr_night NUMERIC(10, 2) NOT NULL
    );


    CREATE TABLE costumer (
        id INT PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255),
        phone_number VARCHAR(50),
        country_id INT REFERENCES country(id)
    );


    CREATE TABLE booking (
        id INT PRIMARY KEY,
        costumer_id INT REFERENCES costumer(id),
        order_date TIMESTAMP,
        room_id INT REFERENCES room(id),
        arrival TIMESTAMP,
        departure TIMESTAMP,
        season_id INT REFERENCES season(id),
        occupants INT,
        price NUMERIC(10, 2),
        status VARCHAR(50),
        star_rating INT,
        updated_at TIMESTAMP
    );


    CREATE TABLE category (
        id INT PRIMARY KEY,
        name VARCHAR(100) NOT NULL
    );


    CREATE TABLE product (
        id INT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category_id INT REFERENCES category(id),
        unit_price NUMERIC(10, 2) NOT NULL,
        total_amount_sold INT NOT NULL
    );


    CREATE TABLE sales (
        id INT PRIMARY KEY,
        product_id INT REFERENCES product(id),
        quantity INT NOT NULL,
        date TIMESTAMP NOT NULL
    );