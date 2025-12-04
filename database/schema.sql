CREATE TABLE IF NOT EXISTS application (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS profile (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    json_filename TEXT,
    json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES application(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_profile_application_id ON profile(application_id);

-- Translations: VIA macro string → human-friendly label (optionally profile-specific)
-- profile_id NULL = generic translation (fallback), otherwise profile-specific
CREATE TABLE IF NOT EXISTS translation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    via_macro TEXT NOT NULL,
    profile_id INTEGER,
    human_label TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (profile_id) REFERENCES profile(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_translation_lookup ON translation(via_macro, profile_id);
