-- migration 00003_secure_answers.sql
-- Create a secure table for correct answers so that `questions` can be 
-- safely read by the client without leaking correct answers.

CREATE TABLE question_answers (
  question_id UUID PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
  correct_answer_index INTEGER NOT NULL
);

-- Migrate existing data
INSERT INTO question_answers (question_id, correct_answer_index)
SELECT id, correct_answer_index FROM questions;

-- Drop the column from questions so it is no longer exposed to authenticated users
ALTER TABLE questions DROP COLUMN correct_answer_index;

-- Secure the new table
ALTER TABLE question_answers ENABLE ROW LEVEL SECURITY;

-- No policies for authenticated users! Only service_role (admin client) 
-- can read/write to this table, which is perfectly aligned with server-side grading.
