-- SQLite schema for DOIO Macro Browser
-- Big knob index is 14; grid key slots and positions are handled in code

PRAGMA foreign_keys = ON;

BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS profiles (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  app TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- Store the raw JSON uploads for provenance/debugging
CREATE TABLE IF NOT EXISTS imports (
  id INTEGER PRIMARY KEY,
  profile_id INTEGER NOT NULL,
  raw_json TEXT NOT NULL,
  imported_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- One row per (profile, layer, slotIndex) for keys and button presses
-- Slot indices correspond to the device dump (0..19), we skip noop=19 at import
CREATE TABLE IF NOT EXISTS doio_macros (
  id INTEGER PRIMARY KEY,
  profile_id INTEGER NOT NULL,
  layer INTEGER NOT NULL CHECK(layer BETWEEN 0 AND 3),
  slot_index INTEGER NOT NULL,           -- 0..19 per device JSON
  macro TEXT NOT NULL,                   -- raw string e.g., "C(KC_0)"
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_doio_profile_layer_slot
  ON doio_macros(profile_id, layer, slot_index);

-- Encoders (knobs): three logical encoders × 4 layers × 2 directions (left/right)
-- encoder: 'topLeft' | 'topRight' | 'big'; direction: 'left' | 'right'
CREATE TABLE IF NOT EXISTS encoders (
  id INTEGER PRIMARY KEY,
  profile_id INTEGER NOT NULL,
  layer INTEGER NOT NULL CHECK(layer BETWEEN 0 AND 3),
  encoder TEXT NOT NULL CHECK(encoder IN ('topLeft','topRight','big')),
  direction TEXT NOT NULL CHECK(direction IN ('left','right')),
  macro TEXT NOT NULL,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_enc_profile_layer_encoder_dir
  ON encoders(profile_id, layer, encoder, direction);

-- Translations: DOIO macro string → human-friendly label (optionally app-specific)
CREATE TABLE IF NOT EXISTS translations (
  id INTEGER PRIMARY KEY,
  doio_macro TEXT NOT NULL,
  app TEXT,                             -- NULL for generic; otherwise e.g., 'Rebelle'
  human_label TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_translations_key
  ON translations(doio_macro, app);

-- Optional: cache parsed tokens for performance
CREATE TABLE IF NOT EXISTS macro_tokens (
  id INTEGER PRIMARY KEY,
  doio_macro TEXT NOT NULL,
  tokens_json TEXT NOT NULL
);

COMMIT;
