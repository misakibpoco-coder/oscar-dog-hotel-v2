-- Migration 005: Add delivery_method to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS delivery_method JSONB DEFAULT NULL;
