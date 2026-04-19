# Module 5 – Database – Spec

## 1. Purpose
Store transcript history and app settings locally using SQLite. Backend calls this module to persist transcripts and retrieve history.

## 2. Scope
**In**: SQLite setup, transcript schema, settings storage, basic CRUD, search/filter  
**Out**: UI, backend orchestration, authentication, cloud sync

## 3. User behavior
User completes transcription → transcript saved automatically → user can view/search history → settings persist between sessions

## 4. Core requirements

### Schemas
```ts
// transcripts table
interface TranscriptRecord {
  id: string;
  rawText: string;
  polishedText: string;
  mode: TextMode;
  language?: string;
  provider: SpeechProviderName;
  durationMs?: number;
  confidence?: number;
  createdAt: string;
  appContext?: string; // e.g. "VSCode", "Notes"
}

// settings table
interface SettingRecord {
  key: string;
  value: string; // JSON stringified
}
```

### Functionality
1. `db.saveTranscript(transcript)` → saves complete record
2. `db.getRecentTranscripts(limit?: number)` → latest N transcripts
3. `db.searchTranscripts(query: string)` → text search
4. `db.getTranscript(id)` → single transcript
5. `db.deleteTranscript(id)` → remove one
6. `db.saveSetting(key, value)` → app preferences
7. `db.getSetting(key)` → retrieve setting

### Database file
- Single `whisppro.db` SQLite file in app data directory
- Schema version tracking for migrations
- Automatic DB creation on first use

## 5. Backend contract
```ts
await db.saveTranscript(finalTranscript);
const history = await db.getRecentTranscripts(20);
const speechProvider = await db.getSetting('speech.provider') || 'mock';
```

## 6. Settings managed
speech.provider: 'mock' | 'whisper-cpp'
speech.language: 'en' | 'auto'
text.mode: 'conversation' | 'coding'
text.enhancement: 'light' | 'normal' | 'heavy'
ui.theme: 'system' | 'light' | 'dark'
hotkey.trigger: string

text

## 7. Search capabilities
- Full-text search on `rawText` and `polishedText`
- Filter by date range
- Filter by mode
- Sort by `createdAt` DESC

## 8. Error handling
- DB locked → retry with backoff
- Disk full → log warning, skip non-critical writes
- Schema migration failure → safe fallback
- Always non-blocking async operations

## 9. Folder structure
modules/database/
├── index.ts
├── types.ts
├── db.ts
├── schema.ts
├── migrations.ts
├── transcriptRepo.ts
├── settingsRepo.ts
└── tests/

## 10. Dependencies
- `better-sqlite3` (synchronous, performant)
- `sqlite3` (alternative)

## 11. Definition of done
- Backend can save/retrieve transcripts
- Settings persist between app restarts
- Basic search works
- Tests cover CRUD operations
- Single DB file created in app data dir
- Schema migration stub exists