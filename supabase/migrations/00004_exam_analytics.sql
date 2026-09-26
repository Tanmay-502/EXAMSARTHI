-- migration 00004_exam_analytics.sql
-- Add analytics and subjects for exam history and performance analysis

ALTER TABLE questions ADD COLUMN subject TEXT DEFAULT 'General';

ALTER TABLE exam_sessions ADD COLUMN total_questions INTEGER DEFAULT 0;
ALTER TABLE exam_sessions ADD COLUMN attempted_questions INTEGER DEFAULT 0;
ALTER TABLE exam_sessions ADD COLUMN correct_questions INTEGER DEFAULT 0;
ALTER TABLE exam_sessions ADD COLUMN incorrect_questions INTEGER DEFAULT 0;
ALTER TABLE exam_sessions ADD COLUMN unanswered_questions INTEGER DEFAULT 0;
ALTER TABLE exam_sessions ADD COLUMN percentage NUMERIC(5, 2) DEFAULT 0.00;

-- Update the existing demo questions with subjects for analysis
UPDATE questions SET subject = 'Geography' WHERE content_text LIKE '%capital%';
UPDATE questions SET subject = 'Science' WHERE content_text LIKE '%planet%' OR content_text LIKE '%mammal%' OR content_text LIKE '%color%' OR content_text LIKE '%chemical%';
UPDATE questions SET subject = 'Reasoning' WHERE content_text LIKE '%taller%';
UPDATE questions SET subject = 'Mathematics' WHERE content_text LIKE '%square root%';
UPDATE questions SET subject = 'History' WHERE content_text LIKE '%national anthem%';
UPDATE questions SET subject = 'Computer Science' WHERE content_text LIKE '%LIFO%';
UPDATE questions SET subject = 'Geography' WHERE content_text LIKE '%continents%';
