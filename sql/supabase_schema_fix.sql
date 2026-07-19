-- Supabase schema fix for user_profiles, schools, licenses, and RLS policies
-- Pastikan Anda menjalankan skrip ini sebagai role dengan hak istimewa yang memadai.

-- 1. Aktifkan extension untuk UUID jika belum tersedia
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Pastikan role superadmin masuk ke constraint user_profiles
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('guru', 'kepala_sekolah', 'pengawas', 'superadmin'));

-- 3. Buat tabel schools jika belum ada
CREATE TABLE IF NOT EXISTS public.schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  address TEXT,
  level TEXT CHECK (level IN ('SD', 'SMP', 'SMA', 'SMK')),
  cluster_name TEXT,
  headmaster_name TEXT,
  headmaster_nip TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tambahkan kolom relasi di tabel licenses
ALTER TABLE public.licenses
  ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id),
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.user_profiles(id);

-- 5. Aktifkan RLS pada tabel schools
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- 6. Kebijakan RLS untuk schools
DROP POLICY IF EXISTS "Semua bisa lihat sekolah" ON public.schools;
CREATE POLICY "Semua bisa lihat sekolah"
  ON public.schools
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Superadmin kelola sekolah" ON public.schools;
CREATE POLICY "Superadmin kelola sekolah"
  ON public.schools
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

DROP POLICY IF EXISTS "Superadmin bisa update sekolah" ON public.schools;
CREATE POLICY "Superadmin bisa update sekolah"
  ON public.schools
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

DROP POLICY IF EXISTS "Superadmin bisa hapus sekolah" ON public.schools;
CREATE POLICY "Superadmin bisa hapus sekolah"
  ON public.schools
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

-- 7. Aktifkan RLS pada tabel licenses
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;

-- 8. Kebijakan RLS untuk licenses
DROP POLICY IF EXISTS "Semua bisa lihat lisensi" ON public.licenses;
CREATE POLICY "Semua bisa lihat lisensi"
  ON public.licenses
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Superadmin kelola lisensi (insert)" ON public.licenses;
CREATE POLICY "Superadmin kelola lisensi (insert)"
  ON public.licenses
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

DROP POLICY IF EXISTS "Superadmin kelola lisensi (update)" ON public.licenses;
CREATE POLICY "Superadmin kelola lisensi (update)"
  ON public.licenses
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

DROP POLICY IF EXISTS "Superadmin kelola lisensi (delete)" ON public.licenses;
CREATE POLICY "Superadmin kelola lisensi (delete)"
  ON public.licenses
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

-- 9. Buat tabel analysis_sessions jika belum ada
CREATE TABLE IF NOT EXISTS public.analysis_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  exam_type TEXT NOT NULL,
  kkm INTEGER NOT NULL,
  data_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.analysis_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert their own sessions" ON public.analysis_sessions;
CREATE POLICY "Users can insert their own sessions"
  ON public.analysis_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own sessions" ON public.analysis_sessions;
CREATE POLICY "Users can view their own sessions"
  ON public.analysis_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own sessions" ON public.analysis_sessions;
CREATE POLICY "Users can update their own sessions"
  ON public.analysis_sessions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own sessions" ON public.analysis_sessions;
CREATE POLICY "Users can delete their own sessions"
  ON public.analysis_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- 10. Tambahkan kolom cluster_name ke tabel user_profiles jika belum ada
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS cluster_name TEXT;

-- 11. Tambahkan kolom nama dan NIP kepala sekolah ke tabel schools jika belum ada
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS headmaster_name TEXT,
  ADD COLUMN IF NOT EXISTS headmaster_nip TEXT;

-- 12. Kebijakan RLS tambahan untuk schools (opsional jika Anda ingin spesifikkan update saja)
DROP POLICY IF EXISTS "Superadmin can update schools" ON public.schools;
CREATE POLICY "Superadmin can update schools"
  ON public.schools FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

-- 13. Refresh PostgREST / Supabase schema cache jika dibutuhkan
NOTIFY pgrst, 'reload schema';
