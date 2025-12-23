CREATE DATABASE futsal_db;
\c futsal_db;

CREATE TYPE booking_status AS ENUM ('pending', 'success', 'failed');

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL UNIQUE,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user'
        CHECK (role IN ('user', 'admin')),
    login_attempts INTEGER DEFAULT 0,
    lock_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    booking_id VARCHAR(36) NOT NULL UNIQUE,

    user_id VARCHAR(36)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    field_id VARCHAR(36) NOT NULL,
    date DATE NOT NULL,

    slots INTEGER[] NOT NULL,

    start_time INTEGER NOT NULL CHECK (start_time >= 0 AND start_time <= 1439),
    end_time   INTEGER NOT NULL CHECK (end_time > start_time AND end_time <= 1439),

    total_price INTEGER NOT NULL CHECK (total_price >= 0),
    status booking_status NOT NULL DEFAULT 'pending',

    -- Midtrans
    order_id VARCHAR(255),
    transaction_id VARCHAR(255),
    payment_token VARCHAR(512),
    payment_time TIMESTAMP,
    expired_at TIMESTAMP,

    -- Manual booking
    manual_name VARCHAR(255),
    manual_contact VARCHAR(255),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE UNIQUE INDEX idx_unique_slot_reservation 
ON bookings(field_id, date, slots)
WHERE status IN ('success', 'pending');

CREATE INDEX idx_bookings_user_id      ON bookings(user_id);
CREATE INDEX idx_bookings_status       ON bookings(status);
CREATE INDEX idx_bookings_field_id     ON bookings(field_id);
CREATE INDEX idx_bookings_date_field   ON bookings(date, field_id);
CREATE INDEX idx_bookings_created_at   ON bookings(created_at DESC);
CREATE INDEX idx_bookings_expired_at   ON bookings(expired_at);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role  ON users(role);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bookings_updated_at
BEFORE UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
