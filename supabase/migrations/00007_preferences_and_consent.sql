-- Migration 00007: Add learning profile consent column to profiles
-- accessibility_prefs JSONB already supports preferred_mode and preferred_lang
-- at the application level (no schema change needed for JSONB fields).

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS learning_profile_consent BOOLEAN DEFAULT false;
