-- Add multilingual support to questions using JSONB

-- content_translations: {"en": "What is...", "hi": "क्या है...", "te": "ఏమిటి..."}
ALTER TABLE questions
ADD COLUMN content_translations JSONB DEFAULT '{}'::jsonb NOT NULL;

-- options_translations: {"en": ["Option A", "Option B"], "hi": ["विकल्प ए", "विकल्प बी"]}
ALTER TABLE questions
ADD COLUMN options_translations JSONB DEFAULT '{}'::jsonb NOT NULL;
