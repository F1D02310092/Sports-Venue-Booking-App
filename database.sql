-- Database: futsal_db
CREATE DATABASE futsal_db;

-- Connect to database
\c futsal_db;

-- Table: users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL UNIQUE, -- UUIDV4
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    login_attempts INTEGER DEFAULT 0,
    lock_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: bookings
CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    booking_id VARCHAR(36) NOT NULL UNIQUE,
    user_id VARCHAR(36) REFERENCES users(user_id) ON DELETE CASCADE,
    field_id VARCHAR(36) NOT NULL,
    date DATE NOT NULL,
    slots INTEGER[] NOT NULL,
    start_time INTEGER NOT NULL CHECK (start_time >= 0 AND start_time <= 1439),
    end_time INTEGER NOT NULL CHECK (end_time >= 0 AND end_time <= 1439),
    total_price INTEGER NOT NULL CHECK (total_price >= 0),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('success', 'pending', 'failed')),
    
    -- Midtrans fields
    order_id VARCHAR(255),
    transaction_id VARCHAR(255),
    payment_token VARCHAR(512),
    payment_time TIMESTAMP,
    expired_at TIMESTAMP,
    
    -- Manual booking fields
    manual_name VARCHAR(255),
    manual_contact VARCHAR(255),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_field_id ON bookings(field_id);
CREATE INDEX idx_bookings_date_field ON bookings(date, field_id);
CREATE INDEX idx_bookings_created_at ON bookings(created_at DESC);
CREATE INDEX idx_bookings_expired_at ON bookings(expired_at);

-- Unique constraint untuk mencegah double booking (success)
CREATE UNIQUE INDEX idx_unique_success_booking 
ON bookings(field_id, date, slots)
WHERE status = 'success';

-- Unique constraint untuk mencegah pending duplicate
CREATE UNIQUE INDEX idx_unique_pending_booking 
ON bookings(field_id, date, user_id, slots)
WHERE status = 'pending';

-- Index untuk users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
