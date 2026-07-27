-- Migration: Add notification columns and setup cron
-- Date: 2026-07-27

-- 1. Add FCM token column to profiles for storing device tokens
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS fcm_token TEXT;

-- 2. Add notification tracking columns to appointments
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS notified_24h BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS notified_1h BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS notified_5min BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS notified_cancel BOOLEAN DEFAULT FALSE;

-- 3. Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 4. Schedule the reminder function to run every 5 minutes
-- Note: This uses Supabase's cron job system
SELECT cron.schedule(
  'appointment-reminders',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url => 'https://' || current_setting('app.settings.supabase_url') || '/functions/v1/send-appointment-reminders',
    headers => '{"Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '", "Content-Type": "application/json"}',
    body => '{}'::json
  );
  $$
);

-- 5. Grant necessary permissions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA net TO postgres;
GRANT USAGE ON SCHEMA cron TO postgres;

-- 6. Create function to update notification status when appointment is modified
CREATE OR REPLACE FUNCTION update_notification_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If appointment is canceled, reset notification flags and mark as notified_cancel
  IF OLD.status = 'confirmed' AND NEW.status = 'canceled' THEN
    NEW.notified_24h = FALSE;
    NEW.notified_1h = FALSE;
    NEW.notified_5min = FALSE;
    NEW.notified_cancel = TRUE;
  END IF;
  
  -- If appointment status changes, reset notification flags
  IF OLD.status != NEW.status THEN
    NEW.notified_24h = FALSE;
    NEW.notified_1h = FALSE;
    NEW.notified_5min = FALSE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger to automatically update notification status
DROP TRIGGER IF EXISTS appointment_notification_trigger ON appointments;
CREATE TRIGGER appointment_notification_trigger
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_status();

-- 8. Enable Row Level Security for FCM token (optional, for security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to update their own FCM token
CREATE POLICY "Users can update own FCM token"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Policy to allow users to read their own FCM token
CREATE POLICY "Users can read own FCM token"
  ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Comments for documentation
COMMENT ON COLUMN profiles.fcm_token IS 'Firebase Cloud Messaging token for push notifications';
COMMENT ON COLUMN appointments.notified_24h IS 'True if 24-hour reminder was sent';
COMMENT ON COLUMN appointments.notified_1h IS 'True if 1-hour reminder was sent';
COMMENT ON COLUMN appointments.notified_5min IS 'True if 5-minute reminder was sent';
COMMENT ON COLUMN appointments.notified_cancel IS 'True if cancellation notification was sent';
