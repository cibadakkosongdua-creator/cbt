-- ============================================================
-- CBT-02 Supabase Migration Schema
-- Migrasi dari Firestore ke PostgreSQL (Supabase)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. STUDENTS
-- Doc ID = NISN (string)
-- Fields: name, kelas, password, nisn, tempat_lahir, tanggal_lahir
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,              -- NISN sebagai ID
  name TEXT NOT NULL,
  kelas TEXT NOT NULL,
  password TEXT NOT NULL,           -- plain text password (sesuai kode saat ini)
  nisn TEXT NOT NULL,               -- redundant dengan id, tapi dipakai di kode
  tempat_lahir TEXT,
  tanggal_lahir TEXT,
  photo_url TEXT,                   -- avatar pilihan siswa
  active_border TEXT DEFAULT 'none', -- border profile yang aktif
  xp INTEGER DEFAULT 0,              -- total experience points
  level INTEGER DEFAULT 1,           -- level siswa
  unlocked_items JSONB DEFAULT '["avatar_1", "avatar_2", "avatar_3", "avatar_4", "border_none"]', -- item yang sudah dibuka
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 2. ADMINS
-- Doc ID = email (lowercase)
-- Fields: name, addedAt, addedBy, photoURL (opsional)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY,              -- email sebagai ID
  name TEXT NOT NULL,
  password TEXT,                    -- plain text password untuk login manual (opsional)
  photo_url TEXT,                   -- opsional, dari Google OAuth
  added_at TIMESTAMPTZ DEFAULT now(),
  added_by TEXT                     -- email admin yang menambahkan
);

-- ────────────────────────────────────────────────────────────
-- 3. ADMIN_PRESENCE
-- Doc ID = uid atau email-safe string
-- Fields: name, photoURL, lastSeen
-- Digunakan untuk heartbeat (update setiap 60 detik)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_presence (
  id TEXT PRIMARY KEY,              -- uid atau email-safe string
  name TEXT NOT NULL,
  photo_url TEXT,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 4. QUESTIONS
-- Auto-generated ID
-- Fields: type, subtes, question, options, answer, image,
--         stimulus, difficulty, pairs, statements, explanation
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('PG', 'PGK', 'ISIAN', 'JODOH', 'BS')),
  subtes TEXT NOT NULL,             -- 'literasi', 'numerasi', atau nama MAPEL
  question JSONB,                   -- string atau {text: "..."} bisa berisi HTML
  options JSONB,                    -- array of strings/objects (PG, PGK)
  answer JSONB,                     -- number (PG), array (PGK), string (ISIAN), dll
  image TEXT,                       -- URL gambar (opsional)
  stimulus JSONB,                   -- string atau {text: "..."} bacaan pendukung
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  pairs JSONB,                      -- array untuk tipe JODOH
  statements JSONB,                 -- array of {text, isTrue} untuk tipe BS
  explanation TEXT,                 -- penjelasan jawaban (opsional)
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index untuk query subtes (dipakai di banyak tempat)
CREATE INDEX IF NOT EXISTS idx_questions_subtes ON questions (subtes);
CREATE INDEX IF NOT EXISTS idx_questions_type ON questions (type);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions (difficulty);

-- ────────────────────────────────────────────────────────────
-- 5. RESULTS
-- Doc ID = `${studentId}_${Date.now()}`
-- Fields: studentId, studentName, kelas, examName, examType,
--         subtes, mode, answers, score, correct, total,
--         passScore, duration, submittedAt, doubtful, questionIds
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS results (
  id TEXT PRIMARY KEY,              -- `${studentId}_${timestamp}`
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  kelas TEXT NOT NULL,
  exam_name TEXT NOT NULL DEFAULT 'Ujian',
  exam_type TEXT NOT NULL DEFAULT 'MAPEL' CHECK (exam_type IN ('MAPEL', 'TKA')),
  subtes TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'tryout' CHECK (mode IN ('tryout', 'latihan')),
  answers JSONB NOT NULL DEFAULT '{}',     -- {questionId: answer}
  score NUMERIC NOT NULL DEFAULT 0,
  correct NUMERIC NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  pass_score INTEGER NOT NULL DEFAULT 0,
  duration INTEGER NOT NULL DEFAULT 60,     -- dalam menit (waktu yang dihabiskan)
  duration_limit INTEGER NOT NULL DEFAULT 60, -- dalam menit (batas waktu yang diberikan)
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  doubtful JSONB DEFAULT '{}',             -- {questionId: boolean}
  question_ids JSONB DEFAULT '[]',         -- array of question IDs
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index untuk query yang dipakai di StudentDash, StudentProfileModal, ManageResults
CREATE INDEX IF NOT EXISTS idx_results_student_id ON results (student_id);
CREATE INDEX IF NOT EXISTS idx_results_subtes ON results (subtes);
CREATE INDEX IF NOT EXISTS idx_results_mode ON results (mode);
CREATE INDEX IF NOT EXISTS idx_results_submitted_at ON results (submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_results_score ON results (score DESC);
CREATE INDEX IF NOT EXISTS idx_results_klas ON results (kelas);
CREATE INDEX IF NOT EXISTS idx_results_student_submitted ON results (student_id, submitted_at DESC);

-- ────────────────────────────────────────────────────────────
-- 6. SESSIONS (Live Monitor)
-- Doc ID = studentId
-- Fields: studentId, studentName, kelas, subtes, mode,
--         currentIndex, totalQuestions, timeLeft, startedAt,
--         lastActive, tabSwitches, device, forceSubmit,
--         adminMessage {text, sentAt}
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,              -- studentId
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  kelas TEXT NOT NULL,
  subtes TEXT NOT NULL DEFAULT 'literasi',
  mode TEXT NOT NULL DEFAULT 'tryout' CHECK (mode IN ('tryout', 'latihan')),
  current_index INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  time_left INTEGER NOT NULL DEFAULT 0,     -- dalam detik
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active TIMESTAMPTZ NOT NULL DEFAULT now(),
  tab_switches INTEGER NOT NULL DEFAULT 0,
  device TEXT NOT NULL DEFAULT 'desktop' CHECK (device IN ('mobile', 'desktop')),
  force_submit BOOLEAN DEFAULT FALSE,
  admin_message JSONB,              -- {text: string, sentAt: number}
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index untuk live monitor filter kelas
CREATE INDEX IF NOT EXISTS idx_sessions_kelas ON sessions (kelas);
CREATE INDEX IF NOT EXISTS idx_sessions_last_active ON sessions (last_active);

-- ────────────────────────────────────────────────────────────
-- 7. ANNOUNCEMENTS
-- Auto-generated ID
-- Fields: title, body, type, createdBy, isActive, createdAt
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success')),
  created_by TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements (is_active, created_at DESC);

-- ────────────────────────────────────────────────────────────
-- 8. ACTIVITY_LOGS
-- Auto-generated ID
-- Fields: action, details, adminName, adminEmail, timestamp
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  details TEXT,
  admin_name TEXT,
  admin_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs (action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs (created_at DESC);

-- ────────────────────────────────────────────────────────────
-- 9. SETTINGS (single-row table)
-- Mengganti dokumen "settings/main" di Firestore
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),  -- memastikan hanya 1 baris
  title TEXT NOT NULL DEFAULT 'Ujian CBT',
  duration INTEGER NOT NULL DEFAULT 60,             -- menit
  token TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  exam_type TEXT NOT NULL DEFAULT 'MAPEL' CHECK (exam_type IN ('MAPEL', 'TKA')),
  active_mapel TEXT NOT NULL DEFAULT 'IPAS',
  min_score INTEGER NOT NULL DEFAULT 70,
  passing_grade TEXT NOT NULL DEFAULT 'C' CHECK (passing_grade IN ('A', 'B', 'C', 'D')),
  show_results BOOLEAN NOT NULL DEFAULT FALSE,
  randomize_questions BOOLEAN NOT NULL DEFAULT FALSE,
  partial_scoring_pgk BOOLEAN NOT NULL DEFAULT FALSE,
  start_at TEXT,                                    -- datetime-local string
  end_at TEXT,                                      -- datetime-local string
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert baris default jika belum ada
INSERT INTO settings (id, title, duration, token, is_active, exam_type, active_mapel, min_score, passing_grade, show_results, randomize_questions, partial_scoring_pgk)
VALUES (1, 'Ujian CBT', 60, '', FALSE, 'MAPEL', 'IPAS', 70, 'C', FALSE, FALSE, FALSE)
ON CONFLICT (id) DO NOTHING;

-- Trigger auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tambahkan trigger ke tabel settings (drop dulu jika sudah ada)
DROP TRIGGER IF EXISTS trg_settings_updated_at ON settings;
CREATE TRIGGER trg_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ────────────────────────────────────────────────────────────
-- 10. REALTIME CONFIGURATION
-- Pastikan Realtime diaktifkan untuk tabel-tabel utama
-- ────────────────────────────────────────────────────────────
-- Catatan: Jalankan ini di SQL Editor Supabase
-- ALTER PUBLICATION supabase_realtime ADD TABLE students;
-- ALTER PUBLICATION supabase_realtime ADD TABLE questions;
-- ALTER PUBLICATION supabase_realtime ADD TABLE results;
-- ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
-- ALTER PUBLICATION supabase_realtime ADD TABLE admin_presence;
-- ALTER PUBLICATION supabase_realtime ADD TABLE announcements;
-- ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;
-- ALTER PUBLICATION supabase_realtime ADD TABLE settings;

-- ────────────────────────────────────────────────────────────
-- 11. ROW LEVEL SECURITY (RLS) - Basic policies
-- ────────────────────────────────────────────────────────────
-- Aktifkan RLS
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Policy untuk role 'authenticated' (Admin via Supabase Auth)
DROP POLICY IF EXISTS "Full access for authenticated" ON students;
CREATE POLICY "Full access for authenticated" ON students FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full access for authenticated" ON admins;
CREATE POLICY "Full access for authenticated" ON admins FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full access for authenticated" ON admin_presence;
CREATE POLICY "Full access for authenticated" ON admin_presence FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full access for authenticated" ON questions;
CREATE POLICY "Full access for authenticated" ON questions FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full access for authenticated" ON results;
CREATE POLICY "Full access for authenticated" ON results FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full access for authenticated" ON sessions;
CREATE POLICY "Full access for authenticated" ON sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full access for authenticated" ON announcements;
CREATE POLICY "Full access for authenticated" ON announcements FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full access for authenticated" ON activity_logs;
CREATE POLICY "Full access for authenticated" ON activity_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full access for authenticated" ON settings;
CREATE POLICY "Full access for authenticated" ON settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Policy untuk role 'anon' (Siswa - login via NISN manual)
DROP POLICY IF EXISTS "Siswa read access" ON students;
CREATE POLICY "Siswa read access" ON students FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Siswa update profile" ON students;
CREATE POLICY "Siswa update profile" ON students FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Siswa read access" ON questions;
CREATE POLICY "Siswa read access" ON questions FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Siswa read access" ON settings;
CREATE POLICY "Siswa read access" ON settings FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Siswa read access" ON announcements;
CREATE POLICY "Siswa read access" ON announcements FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Siswa read access" ON results;
CREATE POLICY "Siswa read access" ON results FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Siswa write access" ON results;
CREATE POLICY "Siswa write access" ON results FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Siswa session access" ON sessions;
CREATE POLICY "Siswa session access" ON sessions FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Siswa presence access" ON admin_presence;
CREATE POLICY "Siswa presence access" ON admin_presence FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Siswa admin check" ON admins;
CREATE POLICY "Siswa admin check" ON admins FOR SELECT TO anon USING (true);

-- ────────────────────────────────────────────────────────────
-- 12. FIX RELATIONS (Run this if you have existing tables)
-- ────────────────────────────────────────────────────────────
-- Menambahkan Foreign Key yang hilang agar Join Leaderboard berfungsi
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'results_student_id_fkey') THEN
        ALTER TABLE results 
        ADD CONSTRAINT results_student_id_fkey 
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sessions_student_id_fkey') THEN
        ALTER TABLE sessions 
        ADD CONSTRAINT sessions_student_id_fkey 
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
    END IF;
END $$;
