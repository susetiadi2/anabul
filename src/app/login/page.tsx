'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Eye, EyeOff, RefreshCw, CheckCircle } from 'lucide-react'

type Mode = 'login' | 'register'
type Role = 'guru' | 'kepala_sekolah' | 'pengawas' | 'superadmin'

const ROLE_LABELS: Record<Role, string> = {
  guru: '👩‍🏫 Guru',
  kepala_sekolah: '🏫 Kepala Sekolah',
  pengawas: '🔍 Pengawas',
  superadmin: '⚙️ Superadmin',
}

const ROLE_DESC: Record<Role, string> = {
  guru: 'Upload & analisis hasil ujian kelas Anda',
  kepala_sekolah: 'Pantau kinerja seluruh guru di sekolah',
  pengawas: 'Awasi kinerja sekolah di wilayah Anda',
  superadmin: 'Kelola sekolah, lisensi, dan seluruh pengguna sistem',
}

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [nip, setNip] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [name, setName] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [clusterName, setClusterName] = useState('')
  const [role, setRole] = useState<Role>('guru')
  const [licenseCode, setLicenseCode] = useState('')
  const [superadminPin, setSuperadminPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [checkingLicense, setCheckingLicense] = useState(false)
  const [licenseSchoolLocked, setLicenseSchoolLocked] = useState(false)
  const [licenseValid, setLicenseValid] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Reset saat mode bukan register atau role superadmin
    if (mode !== 'register' || role === 'superadmin') {
      setLicenseSchoolLocked(false)
      setLicenseValid(false)
      setSchoolName('')
      return
    }
    // Belum cukup panjang, reset tapi jangan fetch
    if (!licenseCode || licenseCode.trim().length < 5) {
      setLicenseSchoolLocked(false)
      setLicenseValid(false)
      setSchoolName('')
      return
    }

    const timer = setTimeout(async () => {
      setCheckingLicense(true)
      const { data } = await supabase
        .from('licenses')
        .select('school_id, schools(name)')
        .eq('code', licenseCode.trim().toUpperCase())
        .eq('is_active', true)
        .single()

      setCheckingLicense(false)
      
      // Jika license ada, maka kode lisensi valid
      if (data) {
        setLicenseValid(true)
        const schoolsData: any = data?.schools
        const fetched = Array.isArray(schoolsData) ? schoolsData[0]?.name : schoolsData?.name
        
        if (fetched) {
          setSchoolName(fetched)
          setLicenseSchoolLocked(true)
        } else {
          setSchoolName('')
          setLicenseSchoolLocked(false)
        }
      } else {
        setLicenseValid(false)
        setLicenseSchoolLocked(false)
        setSchoolName('')
      }
    }, 700)

    return () => clearTimeout(timer)
  }, [licenseCode, role, mode])

  // Jika NIP mengandung '@', berarti email asli (misal Gmail Superadmin)
  // Jika tidak, bungkus dengan format internal
  const nipToEmail = (nip: string) => {
    const trimmed = nip.trim()
    if (trimmed.includes('@')) return trimmed
    return `nip.${trimmed}@anasol.internal`
  }

  const handleLogin = async () => {
    if (!nip || !password) { setError('NIP dan Password wajib diisi.'); return }
    setLoading(true); setError(null)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: nipToEmail(nip),
        password,
      })
      if (error) throw error
      if (!data.user) throw new Error('User tidak ditemukan')

      // Ambil profil untuk tahu role-nya
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      const userRole = profile?.role?.toLowerCase().trim() || 'guru'
      const redirectMap: Record<string, string> = {
        guru: '/',
        kepala_sekolah: '/dashboard/principal',
        pengawas: '/dashboard/supervisor',
        superadmin: '/dashboard/superadmin',
      }
      router.push(redirectMap[userRole] ?? '/')
      router.refresh()
    } catch (err: any) {
      const msg = err.message || ''
      if (msg.includes('Invalid login credentials')) {
        setError('NIP atau Password salah. Silakan coba lagi.')
      } else {
        setError(msg || 'Terjadi kesalahan. Coba lagi.')
      }
    } finally { setLoading(false) }
  }

  const handleRegister = async () => {
    if (!nip || !password || !name) {
      setError('NIP, Password, dan Nama Lengkap wajib diisi.'); return
    }
    if (role !== 'superadmin' && role !== 'pengawas' && !schoolName) {
      setError('Nama Sekolah wajib diisi.'); return
    }
    if (role === 'pengawas' && !clusterName.trim()) {
      setError('Nama Gugus / Wilayah Binaan wajib diisi.'); return
    }
    if (role === 'pengawas' && !licenseCode) {
      setError('Kode Lisensi wajib diisi untuk mendaftar sebagai Pengawas.'); return
    }
    if (role === 'superadmin' && superadminPin !== 'ANABUS-MASTER-8899') {
      setError('PIN Keamanan Superadmin salah atau tidak valid! Pendaftaran ditolak.'); return
    }
    setLoading(true); setError(null)
    try {
      // Jika Pengawas, validasi kode lisensi terlebih dahulu
      if (role === 'pengawas') {
        const { data: license, error: licErr } = await supabase
          .from('licenses')
          .select('code')
          .eq('code', licenseCode.trim())
          .eq('is_active', true)
          .single()
        if (licErr || !license) throw new Error('Kode Lisensi tidak valid atau sudah tidak aktif.')
      }

      // Daftarkan ke Supabase Auth menggunakan email buatan dari NIP
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: nipToEmail(nip),
        password,
      })
      if (authErr) throw authErr
      if (!authData.user) throw new Error('Gagal membuat akun. Coba lagi.')

      // Simpan profil lengkap ke tabel user_profiles
      const { error: profileErr } = await supabase.from('user_profiles').insert({
        id: authData.user.id,
        nip: nip.trim(),
        name: name.trim(),
        school_name: role === 'superadmin' ? 'Pusat (Superadmin)' : role === 'pengawas' ? clusterName.trim() : schoolName.trim(),
        cluster_name: role === 'pengawas' ? clusterName.trim() : null,
        role,
        license_code: role !== 'superadmin' ? licenseCode.trim() : null,
      })
      if (profileErr) throw profileErr

      setSuccess('Akun berhasil dibuat! Silakan masuk menggunakan NIP dan Password Anda.')
      setMode('login')
      setNip(''); setPassword(''); setName(''); setSchoolName(''); setLicenseCode('')
    } catch (err: any) {
      const msg = err.message || ''
      if (msg.includes('already registered') || msg.includes('already been registered')) {
        setError('NIP ini sudah terdaftar. Silakan langsung Masuk.')
      } else {
        setError(msg || 'Terjadi kesalahan saat pendaftaran.')
      }
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex flex-col items-center justify-center p-4">

      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <div 
          className="w-14 h-14 select-none cursor-pointer"
          onDoubleClick={() => {
            if (mode === 'register') setRole('superadmin')
          }}
          title="Double-click untuk akses rahasia"
        >
          <img src="https://iili.io/CMHn0Cv.png" alt="Logo AnasolApp" className="w-full h-full object-contain rounded-2xl drop-shadow-md" />
        </div>
        <div>
          <div className="text-3xl font-black text-slate-900 tracking-tight leading-none">
            Anasol<span className="text-blue-600">App</span>
          </div>
          <div className="text-xs text-slate-500 font-bold tracking-widest uppercase mt-0.5">Sistem Analisis Butir Soal</div>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-white border border-slate-100 rounded-3xl shadow-xl shadow-slate-200/50 p-8">

        {/* Tab Mode */}
        <div className="flex bg-slate-100/80 rounded-2xl p-1.5 mb-8 gap-1">
          {(['login', 'register'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(null); setSuccess(null) }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                mode === m
                  ? 'bg-white text-blue-700 shadow-sm border border-slate-200/50'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {m === 'login' ? '🔐 Masuk' : '📝 Daftar Baru'}
            </button>
          ))}
        </div>

        <div className="space-y-5">

          {/* Field Register Only */}
          {mode === 'register' && (
            <>
              {/* Pilih Peran */}
              <div>
                <label className="block text-slate-700 text-xs font-extrabold uppercase tracking-wider mb-1.5">Peran / Jabatan</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 appearance-none shadow-sm transition-all"
                >
                  {(Object.keys(ROLE_LABELS) as Role[])
                    .filter((r) => r !== 'superadmin' || role === 'superadmin')
                    .map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
                <p className="text-slate-500 text-xs mt-2 italic font-medium">{ROLE_DESC[role]}</p>
              </div>

              {/* Nama Lengkap */}
              <div>
                <label className="block text-slate-700 text-xs font-extrabold uppercase tracking-wider mb-1.5">Nama Lengkap</label>
                <input
                  type="text"
                  placeholder="Contoh: Budi Santoso, S.Pd"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border border-slate-300 text-slate-900 placeholder-slate-400 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 shadow-sm transition-all"
                />
              </div>

              {/* Kode Lisensi + Nama Sekolah — untuk semua peran kecuali Superadmin */}
              {role !== 'superadmin' && (
                <>
                  {/* Kode Lisensi */}
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                    <label className="block text-amber-800 text-xs font-extrabold uppercase tracking-wider mb-1.5">
                      🔑 Kode Lisensi <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Contoh: ANASOL-SMP1-2025"
                        value={licenseCode}
                        onChange={(e) => {
                          setLicenseCode(e.target.value.toUpperCase())
                          setLicenseSchoolLocked(false)
                          setLicenseValid(false)
                          setSchoolName('')
                        }}
                        className="w-full bg-white border border-amber-300 text-slate-900 placeholder-slate-400 rounded-xl px-4 py-3 pr-10 text-sm font-mono tracking-widest focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all"
                      />
                      {checkingLicense && (
                        <div className="absolute right-3 top-3.5 text-amber-400">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        </div>
                      )}
                      {licenseValid && !checkingLicense && (
                        <div className="absolute right-3 top-3.5 text-emerald-500">
                          <CheckCircle className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                    {/* Pesan status lisensi */}
                    {licenseValid && role === 'pengawas' && (
                      <p className="text-emerald-600 text-xs mt-2 font-bold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Kode lisensi pengawas valid!
                      </p>
                    )}
                    {licenseSchoolLocked && role !== 'pengawas' && (
                      <p className="text-emerald-600 text-xs mt-2 font-bold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Kode valid — Sekolah berhasil ditemukan!
                      </p>
                    )}
                    {!checkingLicense && !licenseValid && licenseCode.trim().length >= 5 && (
                      <p className="text-red-500 text-xs mt-2 font-semibold">⚠️ Kode tidak ditemukan atau tidak aktif.</p>
                    )}
                    {licenseValid && !licenseSchoolLocked && role !== 'pengawas' && (
                      <p className="text-red-500 text-xs mt-2 font-semibold">⚠️ Lisensi ini tidak terhubung ke sekolah mana pun.</p>
                    )}
                    {!licenseCode && (
                      <p className="text-amber-700/70 text-xs mt-2">Kode lisensi diberikan oleh Administrator AnasolApp.</p>
                    )}
                  </div>

                  {/* Input Gugus untuk Pengawas, atau Nama Sekolah otomatis dari lisensi untuk yang lain */}
                  {role === 'pengawas' ? (
                    <div>
                      <label className="block text-slate-700 text-xs font-extrabold uppercase tracking-wider mb-1.5">
                        Nama Gugus / Wilayah Binaan <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Gugus Melati, atau Kecamatan X"
                        value={clusterName}
                        onChange={(e) => setClusterName(e.target.value)}
                        className="w-full bg-white border border-slate-300 text-slate-900 placeholder-slate-400 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 shadow-sm transition-all"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-slate-700 text-xs font-extrabold uppercase tracking-wider mb-1.5">
                        Nama Sekolah
                      </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Terisi otomatis setelah kode lisensi valid"
                        value={schoolName}
                        readOnly
                        className={`w-full border text-sm rounded-xl px-4 py-3 pr-10 transition-all ${
                          licenseSchoolLocked
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold cursor-not-allowed'
                            : 'bg-slate-100 border-slate-200 text-slate-400 placeholder-slate-300 cursor-not-allowed'
                        }`}
                      />
                        {licenseSchoolLocked && (
                          <div className="absolute right-3 top-3 text-emerald-500">
                            <CheckCircle className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* NIP */}
          <div>
            <label className="block text-slate-700 text-xs font-extrabold uppercase tracking-wider mb-1.5">
              NIP / No Handphone
            </label>
            <input
              type="text"
              placeholder="Masukkan NIP atau No HP Anda"
              value={nip}
              onChange={(e) => setNip(e.target.value)}
              className="w-full bg-white border border-slate-300 text-slate-900 placeholder-slate-400 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 shadow-sm transition-all"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-slate-700 text-xs font-extrabold uppercase tracking-wider mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Minimal 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && mode === 'login' && handleLogin()}
                className="w-full bg-white border border-slate-300 text-slate-900 placeholder-slate-400 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 shadow-sm transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Ingat Saya — hanya tampil di mode login */}
          {mode === 'login' && (
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer group select-none">
                <div
                  onClick={() => setRememberMe(!rememberMe)}
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                    rememberMe
                      ? 'bg-blue-600 border-blue-600'
                      : 'bg-white border-slate-300 group-hover:border-blue-400'
                  }`}
                >
                  {rememberMe && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-sm text-slate-600 font-medium group-hover:text-slate-900 transition-colors">
                  Ingat Saya
                </span>
              </label>
              <span className="text-xs text-slate-400 font-medium">
                {rememberMe ? 'Sesi tersimpan 7 hari' : 'Sesi hanya saat ini'}
              </span>
            </div>
          )}


          {/* PIN Keamanan — hanya muncul jika mendaftar sebagai Superadmin */}
          {mode === 'register' && role === 'superadmin' && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 shadow-sm">
              <label className="block text-rose-800 text-xs font-extrabold uppercase tracking-wider mb-1.5">
                🛡️ PIN Keamanan Superadmin
              </label>
              <input
                type="password"
                placeholder="Masukkan PIN Rahasia"
                value={superadminPin}
                onChange={(e) => setSuperadminPin(e.target.value)}
                className="w-full bg-white border border-rose-300 text-slate-900 placeholder-slate-400 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 shadow-sm transition-all"
              />
              <p className="text-rose-700/80 text-xs mt-2 font-medium">Hanya pemilik sistem yang mengetahui PIN keamanan ini.</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 text-red-600 border border-red-200 text-sm px-4 py-3 rounded-xl font-medium shadow-sm">
              ⚠️ {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm px-4 py-3 rounded-xl font-medium shadow-sm">
              ✅ {success}
            </div>
          )}

          {/* Tombol Aksi */}
          <button
            onClick={mode === 'login' ? handleLogin : handleRegister}
            disabled={loading}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 mt-2"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Memproses...
              </span>
            ) : mode === 'login' ? 'Masuk ke Sistem' : 'Buat Akun'}
          </button>
        </div>
      </div>

      <p className="text-slate-400 text-xs mt-8 font-medium">© 2025 AnasolApp · Sistem Analisis Butir Soal: By Susetiadi-Pengawas DS</p>
    </div>
  )
}

