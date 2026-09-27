-- Migration 00006: Add difficulty and practice session support

ALTER TABLE questions ADD COLUMN difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard'));

-- Update existing demo questions with some variety in difficulty
UPDATE questions SET difficulty = 'easy' WHERE subject = 'Geography';
UPDATE questions SET difficulty = 'medium' WHERE subject = 'Science';
UPDATE questions SET difficulty = 'hard' WHERE subject = 'Reasoning';
UPDATE questions SET difficulty = 'medium' WHERE subject = 'Mathematics';
UPDATE questions SET difficulty = 'hard' WHERE subject = 'History';
UPDATE questions SET difficulty = 'hard' WHERE subject = 'Computer Science';

ALTER TABLE exam_sessions ADD COLUMN is_practice BOOLEAN DEFAULT false;
