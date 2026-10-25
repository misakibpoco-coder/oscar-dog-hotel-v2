-- Migration 006: Allow duplicate owner phone numbers across multiple owners and dog profiles
ALTER TABLE owners DROP CONSTRAINT IF EXISTS owners_normalized_phone_key;
DROP INDEX IF EXISTS owners_normalized_phone_key;
