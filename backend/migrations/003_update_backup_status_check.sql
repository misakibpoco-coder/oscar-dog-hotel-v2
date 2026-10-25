-- Update backup_logs status check to allow RUNNING
ALTER TABLE backup_logs DROP CONSTRAINT IF EXISTS backup_logs_status_check;
ALTER TABLE backup_logs ADD CONSTRAINT backup_logs_status_check CHECK (status IN ('RUNNING', 'SUCCESS', 'FAILED'));
