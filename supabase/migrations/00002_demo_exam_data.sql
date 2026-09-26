-- Demo Exam Data for Phase 4 (Multilingual)
-- This inserts the hardcoded demo exam and 10 multilingual questions.

INSERT INTO exams (id, title, description, duration_minutes)
VALUES (
    'e2f9d6c3-1b8a-4c5e-8d2a-1b4e9f3c7a8b',
    'General Knowledge & Reasoning Demo',
    'A demo exam to test multilingual and accessibility features.',
    15
) ON CONFLICT (id) DO NOTHING;

-- Insert 10 demo questions
DELETE FROM questions WHERE exam_id = 'e2f9d6c3-1b8a-4c5e-8d2a-1b4e9f3c7a8b';

INSERT INTO questions (
    exam_id, 
    order_index, 
    content_text, 
    options, 
    correct_answer_index,
    content_translations,
    options_translations
) VALUES 
(
    'e2f9d6c3-1b8a-4c5e-8d2a-1b4e9f3c7a8b', 
    1, 
    'What is the capital of India?', 
    '["Mumbai", "New Delhi", "Kolkata", "Chennai"]', 
    1, 
    '{"hi-IN": "भारत की राजधानी क्या है?", "te-IN": "భారతదేశ రాజధాని ఏమిటి?"}',
    '{"hi-IN": ["मुंबई", "नई दिल्ली", "कोलकाता", "चेन्नई"], "te-IN": ["ముంబై", "న్యూ ఢిల్లీ", "కోల్కతా", "చెన్నై"]}'
),
(
    'e2f9d6c3-1b8a-4c5e-8d2a-1b4e9f3c7a8b', 
    2, 
    'Which planet is known as the Red Planet?', 
    '["Venus", "Mars", "Jupiter", "Saturn"]', 
    1, 
    '{"hi-IN": "किस ग्रह को लाल ग्रह के नाम से जाना जाता है?", "te-IN": "ఏ గ్రహాన్ని రెడ్ ప్లానెట్ అని పిలుస్తారు?"}',
    '{"hi-IN": ["शुक्र", "मंगल", "बृहस्पति", "शनि"], "te-IN": ["శుక్రుడు", "అంగారకుడు", "బృహస్పతి", "శని"]}'
),
(
    'e2f9d6c3-1b8a-4c5e-8d2a-1b4e9f3c7a8b', 
    3, 
    'If A is taller than B, and B is taller than C, who is the tallest?', 
    '["A", "B", "C", "Cannot be determined"]', 
    0, 
    '{"hi-IN": "यदि A, B से लंबा है, और B, C से लंबा है, तो सबसे लंबा कौन है?", "te-IN": "A, B కంటే పొడవుగా ఉండి, B, C కంటే పొడవుగా ఉంటే, అందరికంటే పొడవైనది ఎవరు?"}',
    '{"hi-IN": ["A", "B", "C", "निर्धारित नहीं किया जा सकता"], "te-IN": ["A", "B", "C", "నిర్ణయించలేము"]}'
),
(
    'e2f9d6c3-1b8a-4c5e-8d2a-1b4e9f3c7a8b', 
    4, 
    'What is the largest mammal in the world?', 
    '["Elephant", "Blue Whale", "Giraffe", "Great White Shark"]', 
    1, 
    '{"hi-IN": "दुनिया का सबसे बड़ा स्तनपायी कौन सा है?", "te-IN": "ప్రపంచంలో అతిపెద్ద క్షీరదం ఏది?"}',
    '{"hi-IN": ["हाथी", "नीली व्हेल", "जिराफ़", "ग्रेट व्हाइट शार्क"], "te-IN": ["ఏనుగు", "నీలి తిమింగలం", "జిరాఫీ", "గ్రేట్ వైట్ షార్క్"]}'
),
(
    'e2f9d6c3-1b8a-4c5e-8d2a-1b4e9f3c7a8b', 
    5, 
    'Which of the following is a primary color?', 
    '["Green", "Orange", "Red", "Purple"]', 
    2, 
    '{"hi-IN": "निम्नलिखित में से कौन सा एक प्राथमिक रंग है?", "te-IN": "కింది వాటిలో ప్రాథమిక రంగు ఏది?"}',
    '{"hi-IN": ["हरा", "नारंगी", "लाल", "बैंगनी"], "te-IN": ["ఆకుపచ్చ", "నారింజ", "ఎరుపు", "ఊదా"]}'
),
(
    'e2f9d6c3-1b8a-4c5e-8d2a-1b4e9f3c7a8b', 
    6, 
    'What is the square root of 144?', 
    '["10", "12", "14", "16"]', 
    1, 
    '{"hi-IN": "144 का वर्गमूल क्या है?", "te-IN": "144 యొక్క వర్గమూలం ఎంత?"}',
    '{"hi-IN": ["10", "12", "14", "16"], "te-IN": ["10", "12", "14", "16"]}'
),
(
    'e2f9d6c3-1b8a-4c5e-8d2a-1b4e9f3c7a8b', 
    7, 
    'Who wrote the national anthem of India?', 
    '["Bankim Chandra Chatterjee", "Rabindranath Tagore", "Mahatma Gandhi", "Subhas Chandra Bose"]', 
    1, 
    '{"hi-IN": "भारत का राष्ट्रगान किसने लिखा था?", "te-IN": "భారత జాతీయ గీతాన్ని ఎవరు రాశారు?"}',
    '{"hi-IN": ["बंकिम चंद्र चटर्जी", "रवींद्रनाथ टैगोर", "महात्मा गांधी", "सुभाष चंद्र बोस"], "te-IN": ["బంకిమ్ చంద్ర ఛటర్జీ", "రవీంద్రనాథ్ ఠాగూర్", "మహాత్మా గాంధీ", "సుభాష్ చంద్రబోస్"]}'
),
(
    'e2f9d6c3-1b8a-4c5e-8d2a-1b4e9f3c7a8b', 
    8, 
    'Which data structure uses LIFO (Last In First Out)?', 
    '["Queue", "Stack", "Tree", "Graph"]', 
    1, 
    '{"hi-IN": "कौन सी डेटा संरचना LIFO (लास्ट इन फर्स्ट आउट) का उपयोग करती है?", "te-IN": "LIFO (లాస్ట్ ఇన్ ఫస్ట్ అవుట్) ఉపయోగించే డేటా స్ట్రక్చర్ ఏది?"}',
    '{"hi-IN": ["क्यू (Queue)", "स्टैक (Stack)", "ट्री (Tree)", "ग्राफ (Graph)"], "te-IN": ["క్యూ (Queue)", "స్టాక్ (Stack)", "ట్రీ (Tree)", "గ్రాఫ్ (Graph)"]}'
),
(
    'e2f9d6c3-1b8a-4c5e-8d2a-1b4e9f3c7a8b', 
    9, 
    'How many continents are there on Earth?', 
    '["5", "6", "7", "8"]', 
    2, 
    '{"hi-IN": "पृथ्वी पर कितने महाद्वीप हैं?", "te-IN": "భూమిపై ఎన్ని ఖండాలు ఉన్నాయి?"}',
    '{"hi-IN": ["5", "6", "7", "8"], "te-IN": ["5", "6", "7", "8"]}'
),
(
    'e2f9d6c3-1b8a-4c5e-8d2a-1b4e9f3c7a8b', 
    10, 
    'What is the chemical symbol for Gold?', 
    '["Ag", "Au", "Fe", "Cu"]', 
    1, 
    '{"hi-IN": "सोने (Gold) का रासायनिक प्रतीक क्या है?", "te-IN": "బంగారం యొక్క రసాయన చిహ్నం ఏమిటి?"}',
    '{"hi-IN": ["Ag", "Au", "Fe", "Cu"], "te-IN": ["Ag", "Au", "Fe", "Cu"]}'
);
