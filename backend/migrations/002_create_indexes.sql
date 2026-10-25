-- Indexes for relational navigation, search, and filtering

-- Dogs indexes
CREATE INDEX IF NOT EXISTS idx_dogs_owner_id ON dogs(owner_id);
CREATE INDEX IF NOT EXISTS idx_dogs_is_archived ON dogs(is_archived);
CREATE INDEX IF NOT EXISTS idx_dogs_name_lower ON dogs(LOWER(name));
CREATE INDEX IF NOT EXISTS idx_dogs_avatar_id ON dogs(avatar_id);

-- Owners indexes
CREATE INDEX IF NOT EXISTS idx_owners_normalized_phone ON owners(normalized_phone);
CREATE INDEX IF NOT EXISTS idx_owners_name_lower ON owners(LOWER(name));

-- Bookings indexes
CREATE INDEX IF NOT EXISTS idx_bookings_dog_id ON bookings(dog_id);
CREATE INDEX IF NOT EXISTS idx_bookings_check_in_at ON bookings(check_in_at);
CREATE INDEX IF NOT EXISTS idx_bookings_check_out_at ON bookings(check_out_at);
CREATE INDEX IF NOT EXISTS idx_bookings_current_status ON bookings(current_status);
CREATE INDEX IF NOT EXISTS idx_bookings_dog_overlap ON bookings(dog_id, check_in_at, check_out_at);

-- Status history indexes
CREATE INDEX IF NOT EXISTS idx_status_history_booking_id ON status_history(booking_id);
CREATE INDEX IF NOT EXISTS idx_status_history_effective_at ON status_history(effective_at);

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
