-- Add 'on_hold' status to service_status enum for service calls with pending issues
ALTER TYPE service_status ADD VALUE IF NOT EXISTS 'on_hold';