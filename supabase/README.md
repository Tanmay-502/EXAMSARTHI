# Supabase Migration Order

Apply these migrations in filename order to an existing project.

- 00000_schema.sql — base tables and policies
- 00001_multilingual_questions.sql — multilingual question fields
- 00002_demo_exam_data.sql — demo exam data
- 00003_secure_answers.sql — isolates correct answers
- 00004_exam_analytics.sql — session analytics fields
- 00005_vision_accessibility.sql — image description fields
- 00006_harden_exam_security.sql — hardened write paths
- 00006_practice_and_difficulty.sql — practice/difficulty fields
- 00007_preferences_and_consent.sql — learning profile preferences and consent
- 00008_lock_exam_session_inserts.sql — removes client exam-session INSERT
- 00009_active_session_constraints.sql — cleans duplicate active sessions and adds active-session constraints
- 00010_practice_question_set.sql — stores server-bound question IDs on sessions

## Important

There are two distinct 00006 migrations. They are separate historical migrations and should not be renamed or renumbered after deployment.

`db_schema.sql` is a clean-install reference schema. For an existing Supabase project, use the ordered migrations above.
