#!/bin/bash
set -e

# สร้าง Database seats_payment เพิ่มเติม
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE seats_payment;
EOSQL

# สร้าง Table สำหรับ Booking DB
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "seats_booking" <<-EOSQL
    CREATE TABLE IF NOT EXISTS bookings (
        id VARCHAR(255) PRIMARY KEY,
        customer_id VARCHAR(255) NOT NULL,
        round_id VARCHAR(255) NOT NULL,
        table_number INT NOT NULL,
        status VARCHAR(50) NOT NULL,
        total_amount NUMERIC(10, 2) DEFAULT 0,
        held_at TIMESTAMP WITH TIME ZONE,
        hold_ends_at TIMESTAMP WITH TIME ZONE
    );

    CREATE TABLE IF NOT EXISTS holds (
        lock_key VARCHAR(255) PRIMARY KEY,
        booking_id VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL
    );
EOSQL

# สร้าง Table สำหรับ Payment DB
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "seats_payment" <<-EOSQL
    CREATE TABLE IF NOT EXISTS payments (
        id VARCHAR(255) PRIMARY KEY,
        booking_id VARCHAR(255) NOT NULL,
        customer_id VARCHAR(255) NOT NULL,
        amount NUMERIC(10, 2) NOT NULL,
        status VARCHAR(50) NOT NULL,
        checkout_url TEXT,
        created_at VARCHAR(255),
        result_at VARCHAR(255)
    );
EOSQL