# Module 5 – Database Spec

## Purpose
Local SQLite for transcript history and user settings.

## Requirements
- transcripts table: id, text, mode, language, created_at
- settings table: key/value store
- CRUD for transcripts with full-text search
- Settings read/write with defaults

## Definition of Done
- [ ] Database initializes on first launch
- [ ] Transcripts saved and queryable
- [ ] Settings persist across restarts
- [ ] Unit tests with in-memory DB
