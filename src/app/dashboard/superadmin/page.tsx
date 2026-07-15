'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Building2, Key, Users, Plus, Trash2, RefreshCw, LogOut, CheckCircle, XCircle, ShieldCheck, Pencil, X, Save } from 'lucide-react'

type School = { id: string; name: string; address: string | null; level: string | null; is_active: boolean; headmaster_name?: string | null; headmaster_nip?: string | null; created_at: string }
type License = { id: string; code: string; description: string | null; is_active: boolean; school_id: string | null; created_at: string; schools?: { name: string } | null }
type UserProfile = { id: string; nip: string; name: string; school_name: string; role: string; created_at: string }

const ROLE_BADGE: Record<string, string> = {
  guru: 'bg-blue-100 text-blue-700 border-blue-200',
  kepala_sekolah: 'bg-violet-100 text-violet-700 border-violet-200',
  pengawas: 'bg-amber-100 text-amber-700 border-amber-200',
  superadmin: 'bg-rose-100 text-rose-700 border-rose-200',
}
const ROLE_LABEL: Record<string, string> = {
  guru: 'Guru', kepala_sekolah: 'Kepala Sekolah', pengawas: 'Pengawas', superadmin: 'Superadmin',
}

export default function SuperadminDashboard() {
  const [tab, setTab] = useState<'schools' | 'licenses' | 'users'>('schools')
  const [schools, setSchools] = useState<School[]>([])
  const [licenses, setLicenses] = useState<License[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Form tambah sekolah
  const [newSchoolName, setNewSchoolName] = useState('')
  const [newSchoolAddress, setNewSchoolAddress] = useState('')
  const [newSchoolLevel, setNewSchoolLevel] = useState('SMA')
  const [newHeadmasterName, setNewHeadmasterName] = useState('')
  const [newHeadmasterNip, setNewHeadmasterNip] = useState('')

  // Form tambah lisensi
  const [newLicenseCode, setNewLicenseCode] = useState('')
  const [newLicenseDesc, setNewLicenseDesc] = useState('')
  const [newLicenseSchoolId, setNewLicenseSchoolId] = useState('')

  // Edit lisensi
  const [editingLicense, setEditingLicense] = useState<License | null>(null)
  const [editCode, setEditCode] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editSchoolId, setEditSchoolId] = useState('')

  // Konfirmasi hapus
  const [deletingLicenseId, setDeletingLicenseId] = useState<string | null>(null)

  const supabase = createClient()
  const router = useRouter()

  const showMsg = (type: 'success' | 'error', text: string) => {
    setActionMsg({ type, text })
    setTimeout(() => setActionMsg(null), 4000)
  }

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [s, l, u] = await Promise.all([
      supabase.from('schools').select('*').order('created_at', { ascending: false }),
      supabase.from('licenses').select('*, schools(name)').order('created_at', { ascending: false }),
      supabase.from('user_profiles').select('*').order('created_at', { ascending: false }),
    ])
    if (s.data) setSchools(s.data)
    if (l.data) setLicenses(l.data as License[])
    if (u.data) setUsers(u.data)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    // Guard: pastikan yang akses adalah superadmin
    supabase.auth.getUser().then(({ data: authData }) => {
      if (!authData.user) {
        router.replace('/login')
        return
      }
      supabase.from('user_profiles').select('role').eq('id', authData.user.id).single().then(({ data }) => {
        if (!data || data.role !== 'superadmin') {
          router.replace('/login')
        } else {
          fetchAll()
        }
      })
    })
  }, [fetchAll, router, supabase])

  const addSchool = async () => {
    if (!newSchoolName.trim()) return showMsg('error', 'Nama sekolah wajib diisi.')
    const { error } = await supabase.from('schools').insert({
      name: newSchoolName.trim(),
      address: newSchoolAddress.trim() || null,
      level: newSchoolLevel,
      headmaster_name: newHeadmasterName.trim() || null,
      headmaster_nip: newHeadmasterNip.trim() || null,
    })
    if (error) return showMsg('error', error.message)
    showMsg('success', `Sekolah "${newSchoolName}" berhasil ditambahkan!`)
    setNewSchoolName(''); setNewSchoolAddress(''); setNewHeadmasterName(''); setNewHeadmasterNip('');
    fetchAll()
  }

  const toggleSchool = async (id: string, current: boolean) => {
    const { error } = await supabase.from('schools').update({ is_active: !current }).eq('id', id)
    if (error) return showMsg('error', error.message)
    showMsg('success', `Status sekolah berhasil diubah.`)
    fetchAll()
  }

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    const rand = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    setNewLicenseCode(`ANABUS-${rand}`)
  }

  const addLicense = async () => {
    if (!newLicenseCode.trim()) return showMsg('error', 'Kode Lisensi wajib diisi.')
    const { error } = await supabase.from('licenses').insert({
      code: newLicenseCode.trim().toUpperCase(),
      description: newLicenseDesc.trim() || null,
      school_id: newLicenseSchoolId || null,
    })
    if (error) return showMsg('error', error.message)
    showMsg('success', `Lisensi "${newLicenseCode}" berhasil dibuat!`)
    setNewLicenseCode(''); setNewLicenseDesc(''); setNewLicenseSchoolId('')
    fetchAll()
  }

  const toggleLicense = async (id: string, current: boolean) => {
    const { error } = await supabase.from('licenses').update({ is_active: !current }).eq('id', id)
    if (error) return showMsg('error', error.message)
    showMsg('success', `Status lisensi berhasil diubah.`)
    fetchAll()
  }

  const openEdit = (lic: License) => {
    setEditingLicense(lic)
    setEditCode(lic.code)
    setEditDesc(lic.description ?? '')
    setEditSchoolId(lic.school_id ?? '')
  }

  const saveEdit = async () => {
    if (!editingLicense) return
    if (!editCode.trim()) return showMsg('error', 'Kode Lisensi tidak boleh kosong.')
    const { error } = await supabase.from('licenses').update({
      code: editCode.trim().toUpperCase(),
      description: editDesc.trim() || null,
      school_id: editSchoolId || null,
    }).eq('id', editingLicense.id)
    if (error) return showMsg('error', error.message)
    showMsg('success', `Lisensi berhasil diperbarui!`)
    setEditingLicense(null)
    fetchAll()
  }

  const deleteLicense = async (id: string) => {
    const { error } = await supabase.from('licenses').delete().eq('id', id)
    if (error) return showMsg('error', error.message)
    showMsg('success', 'Lisensi berhasil dihapus.')
    setDeletingLicenseId(null)
    fetchAll()
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const tabs = [
    { key: 'schools', label: 'Sekolah', icon: Building2, count: schools.length },
    { key: 'licenses', label: 'Lisensi', icon: Key, count: licenses.length },
    { key: 'users', label: 'Pengguna', icon: Users, count: users.length },
  ] as const

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-orange-500 rounded-xl flex items-center justify-center shadow-md shadow-rose-500/20">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-black text-lg leading-none text-slate-800">AnasolApp <span className="text-rose-500">Superadmin</span></div>
              <div className="text-xs text-slate-500 font-medium">Panel Kontrol Sistem</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchAll} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-600 hover:text-slate-900 rounded-xl text-sm font-bold transition-all shadow-sm">
              <LogOut className="w-4 h-4" /> Keluar
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-5 mb-8">
          {[
            { label: 'Total Sekolah', value: schools.length, active: schools.filter(s => s.is_active).length, color: 'from-blue-600 to-cyan-500', icon: '🏫' },
            { label: 'Total Lisensi', value: licenses.length, active: licenses.filter(l => l.is_active).length, color: 'from-violet-600 to-purple-500', icon: '🔑' },
            { label: 'Total Pengguna', value: users.length, active: users.filter(u => u.role === 'guru').length, color: 'from-emerald-600 to-teal-500', icon: '👥' },
          ].map(stat => (
            <div key={stat.label} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute right-[-10px] top-[-10px] text-8xl opacity-[0.03] group-hover:scale-110 transition-transform duration-500 pointer-events-none">{stat.icon}</div>
              <div>
                <div className={`text-4xl font-black bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>{stat.value}</div>
                <div className="text-slate-600 font-extrabold text-sm uppercase tracking-wide mt-2">{stat.label}</div>
              </div>
              <div className="text-slate-500 text-xs mt-3 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                {stat.label === 'Total Pengguna' ? `${stat.active} Akun Guru` : `${stat.active} Status Aktif`}
              </div>
            </div>
          ))}
        </div>

        {/* Toast */}
        {actionMsg && (
          <div className={`mb-6 flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-bold border shadow-sm ${
            actionMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {actionMsg.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0 text-emerald-500" /> : <XCircle className="w-5 h-5 shrink-0 text-red-500" />}
            {actionMsg.text}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-white border border-slate-200 rounded-2xl p-1.5 mb-6 w-fit shadow-sm">
          {tabs.map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                tab === key ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
              <span className={`text-xs px-2 py-0.5 rounded-full font-black ${tab === key ? 'bg-white text-slate-900' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
            </button>
          ))}
        </div>

        {/* ─── TAB: SEKOLAH ─── */}
        {tab === 'schools' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form Tambah Sekolah */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 lg:col-span-1 h-fit shadow-sm">
              <h3 className="font-black text-lg text-slate-800 mb-6 flex items-center gap-2"><Plus className="w-5 h-5 text-blue-500" /> Tambah Sekolah</h3>
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2 block">Nama Sekolah *</label>
                  <input value={newSchoolName} onChange={e => setNewSchoolName(e.target.value)} placeholder="SMA Negeri 1 Jakarta" className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all" />
                </div>
                <div>
                  <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2 block">Alamat</label>
                  <input value={newSchoolAddress} onChange={e => setNewSchoolAddress(e.target.value)} placeholder="Jl. Merdeka No. 1" className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all" />
                </div>
                <div>
                  <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2 block">Jenjang</label>
                  <select value={newSchoolLevel} onChange={e => setNewSchoolLevel(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none">
                    {['SD', 'SMP', 'SMA', 'SMK'].map(l => <option key={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2 block">Nama Kepala Sekolah</label>
                  <input value={newHeadmasterName} onChange={e => setNewHeadmasterName(e.target.value)} placeholder="Nama Lengkap & Gelar" className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all" />
                </div>
                <div>
                  <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2 block">NIP Kepala Sekolah</label>
                  <input value={newHeadmasterNip} onChange={e => setNewHeadmasterNip(e.target.value)} placeholder="NIP (Kosongkan jika tidak ada)" className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all" />
                </div>
                <button onClick={addSchool} className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 active:translate-y-0 mt-2">
                  + Daftarkan Sekolah
                </button>
              </div>
            </div>

            {/* Daftar Sekolah */}
            <div className="lg:col-span-2 space-y-3">
              {loading ? (
                <div className="text-slate-500 text-center py-12 font-medium">Memuat data sekolah...</div>
              ) : schools.length === 0 ? (
                <div className="text-slate-500 text-center py-12 bg-white border border-slate-200 border-dashed rounded-3xl font-medium">Belum ada sekolah yang terdaftar.</div>
              ) : schools.map(school => (
                <div key={school.id} className={`bg-white border rounded-2xl p-5 flex items-center justify-between gap-4 transition-all hover:shadow-md ${school.is_active ? 'border-slate-200 shadow-sm' : 'border-slate-200 bg-slate-50 opacity-60'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm border ${school.is_active ? 'bg-blue-50 border-blue-100 text-blue-600' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
                      {school.level ?? 'S'}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-base">{school.name}</div>
                      <div className="text-sm text-slate-500 mt-0.5">{school.address ?? 'Alamat belum diisi'}</div>
                      {(school.headmaster_name || school.headmaster_nip) && (
                        <div className="text-xs text-slate-400 mt-1 font-medium">Kepsek: {school.headmaster_name || '-'} {school.headmaster_nip ? `(${school.headmaster_nip})` : ''}</div>
                      )}
                    </div>
                  </div>
                  <button onClick={() => toggleSchool(school.id, school.is_active)} className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all border ${school.is_active ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-red-50 hover:border-red-200 hover:text-red-700' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700'}`}>
                    {school.is_active ? '✓ Status Aktif' : '✗ Dinonaktifkan'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── TAB: LISENSI ─── */}
        {tab === 'licenses' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 lg:col-span-1 h-fit shadow-sm">
              <h3 className="font-black text-lg text-slate-800 mb-6 flex items-center gap-2"><Key className="w-5 h-5 text-amber-500" /> Buat Lisensi Baru</h3>
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2 block">Kode Lisensi *</label>
                  <div className="flex gap-2">
                    <input value={newLicenseCode} onChange={e => setNewLicenseCode(e.target.value)} placeholder="ANABUS-XXXXXXXX" className="flex-1 bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/10 font-mono transition-all" />
                    <button onClick={generateCode} title="Generate otomatis" className="p-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-colors">
                      <RefreshCw className="w-4 h-4 text-slate-600" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2 block">Deskripsi</label>
                  <input value={newLicenseDesc} onChange={e => setNewLicenseDesc(e.target.value)} placeholder="Lisensi Pengawas Wilayah A" className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/10 transition-all" />
                </div>
                <div>
                  <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2 block">Kaitkan ke Sekolah (Opsional)</label>
                  <select value={newLicenseSchoolId} onChange={e => setNewLicenseSchoolId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/10 appearance-none transition-all">
                    <option value="">— Tidak dikaitkan —</option>
                    {schools.filter(s => s.is_active).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <button onClick={addLicense} className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl shadow-lg shadow-amber-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0 mt-2">
                  🔑 Buat Lisensi
                </button>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-3">
              {loading ? (
                <div className="text-slate-500 text-center py-12 font-medium">Memuat data lisensi...</div>
              ) : licenses.length === 0 ? (
                <div className="text-slate-500 text-center py-12 bg-white border border-slate-200 border-dashed rounded-3xl font-medium">Belum ada lisensi. Buat lisensi pertama!</div>
              ) : licenses.map(lic => (
                <div key={lic.id} className={`bg-white border rounded-2xl p-5 transition-all hover:shadow-md ${lic.is_active ? 'border-slate-200 shadow-sm' : 'border-slate-200 bg-slate-50 opacity-60'}`}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center border ${lic.is_active ? 'bg-amber-50 border-amber-100' : 'bg-slate-100 border-slate-200'}`}>
                        <Key className={`w-5 h-5 ${lic.is_active ? 'text-amber-500' : 'text-slate-400'}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-mono font-extrabold text-slate-800 text-lg truncate">{lic.code}</div>
                        <div className="text-sm text-slate-500 font-medium">{lic.description ?? 'Tanpa deskripsi'} {lic.schools?.name ? <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md ml-1 text-xs">🔗 {lic.schools.name}</span> : ''}</div>
                      </div>
                    </div>
                    {/* Tombol aksi */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => toggleLicense(lic.id, lic.is_active)}
                        className={`px-3 py-2 rounded-xl text-xs font-extrabold transition-all border ${lic.is_active ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-red-50 hover:border-red-200 hover:text-red-700' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700'}`}
                      >
                        {lic.is_active ? '✓ Aktif' : '✗ Nonaktif'}
                      </button>
                      <button
                        onClick={() => openEdit(lic)}
                        className="p-2 rounded-xl border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all"
                        title="Edit Lisensi"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingLicenseId(lic.id)}
                        className="p-2 rounded-xl border border-red-200 bg-red-50 text-red-500 hover:bg-red-100 transition-all"
                        title="Hapus Lisensi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── MODAL EDIT LISENSI ─── */}
        {editingLicense && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 border border-slate-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-black text-xl text-slate-800 flex items-center gap-2"><Pencil className="w-5 h-5 text-blue-500" /> Edit Lisensi</h3>
                <button onClick={() => setEditingLicense(null)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2 block">Kode Lisensi *</label>
                  <input value={editCode} onChange={e => setEditCode(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all" />
                </div>
                <div>
                  <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2 block">Deskripsi</label>
                  <input value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Tanpa deskripsi" className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all" />
                </div>
                <div>
                  <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2 block">Kaitkan ke Sekolah</label>
                  <select value={editSchoolId} onChange={e => setEditSchoolId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 appearance-none transition-all">
                    <option value="">— Tidak dikaitkan —</option>
                    {schools.filter(s => s.is_active).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setEditingLicense(null)} className="flex-1 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all">Batal</button>
                  <button onClick={saveEdit} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2">
                    <Save className="w-4 h-4" /> Simpan
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── MODAL KONFIRMASI HAPUS ─── */}
        {deletingLicenseId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 border border-slate-200 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="font-black text-xl text-slate-800 mb-2">Hapus Lisensi?</h3>
              <p className="text-slate-500 text-sm mb-8">Tindakan ini <span className="font-bold text-red-500">tidak dapat dibatalkan</span>. Lisensi akan terhapus permanen dari sistem.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeletingLicenseId(null)} className="flex-1 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all">Batal</button>
                <button onClick={() => deleteLicense(deletingLicenseId)} className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-black rounded-xl shadow-lg shadow-red-500/20 transition-all">Ya, Hapus!</button>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: PENGGUNA ─── */}
        {tab === 'users' && (
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-black text-lg text-slate-800">Semua Pengguna</h3>
              <span className="text-xs font-bold text-slate-500 bg-slate-200 px-3 py-1 rounded-full">{users.length} Akun Terdaftar</span>
            </div>
            {loading ? (
              <div className="text-slate-500 text-center py-12 font-medium">Memuat data pengguna...</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {users.map(u => (
                  <div key={u.id} className="px-6 py-5 flex items-center justify-between hover:bg-blue-50/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center font-black text-slate-500 text-lg shadow-inner">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-base">{u.name}</div>
                        <div className="text-sm text-slate-500 mt-0.5">NIP: <span className="font-mono text-slate-600">{u.nip}</span> · {u.school_name}</div>
                      </div>
                    </div>
                    <span className={`px-3.5 py-1.5 rounded-full text-xs font-bold border shadow-sm ${ROLE_BADGE[u.role] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {ROLE_LABEL[u.role] ?? u.role}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

