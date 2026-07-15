'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Users, RefreshCw, LogOut, GraduationCap, Building } from 'lucide-react'

type UserProfile = { id: string; nip: string; name: string; school_name: string; role: string; cluster_name: string | null }

export default function PrincipalDashboard() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [teachers, setTeachers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()
  const router = useRouter()

  const fetchDashboardData = useCallback(async (userProfile: UserProfile) => {
    setLoading(true)
    const school = userProfile.school_name

    if (!school) {
      setLoading(false)
      return
    }

    // Ambil semua guru yang ada di sekolah ini
    const { data: teachersData } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('school_name', school)
      .eq('role', 'guru')
      .order('name', { ascending: true })
    
    setTeachers(teachersData || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    // Guard: pastikan yang akses adalah kepala sekolah
    supabase.auth.getUser().then(({ data: authData }) => {
      if (!authData.user) {
        router.replace('/login')
        return
      }
      supabase.from('user_profiles').select('*').eq('id', authData.user.id).single().then(({ data }) => {
        const role = data?.role?.toLowerCase().trim()
        if (!data || role !== 'kepala_sekolah') {
          router.replace('/login')
        } else {
          setProfile(data)
          fetchDashboardData(data)
        }
      })
    })
  }, [fetchDashboardData, router, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (loading || !profile) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold text-slate-500">Memuat Dasbor Kepala Sekolah...</div>
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Building className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-black text-lg leading-none text-slate-800">AnasolApp <span className="text-emerald-600">Kepsek</span></div>
              <div className="text-xs text-slate-500 font-medium">{profile.school_name}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => fetchDashboardData(profile)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-transparent hover:border-emerald-100">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-600 hover:text-slate-900 rounded-xl text-sm font-bold transition-all shadow-sm">
              <LogOut className="w-4 h-4" /> Keluar
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Welcome Banner */}
        <div className="bg-white border border-slate-200 rounded-3xl p-8 mb-8 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
            <GraduationCap className="w-48 h-48" />
          </div>
          <div className="relative z-10">
            <h1 className="text-2xl font-black text-slate-800 mb-2">Selamat datang, {profile.name}!</h1>
            <p className="text-slate-500">Anda sedang memantau <span className="font-bold text-emerald-600">{teachers.length} Guru</span> di {profile.school_name}.</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <div className="text-3xl font-black text-slate-800">{teachers.length}</div>
              <div className="text-slate-500 font-bold text-sm uppercase tracking-wide">Total Guru</div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <GraduationCap className="w-8 h-8" />
            </div>
            <div>
              <div className="text-3xl font-black text-slate-800">Aktif</div>
              <div className="text-slate-500 font-bold text-sm uppercase tracking-wide">Status Sekolah</div>
            </div>
          </div>
        </div>

        {/* Daftar Guru */}
        <h2 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-emerald-500" /> Daftar Guru di Sekolah Anda</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {teachers.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white border border-slate-200 border-dashed rounded-3xl text-slate-500 font-medium">
              Belum ada guru yang mendaftar di sekolah ini.
            </div>
          ) : teachers.map(teacher => (
            <div key={teacher.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-500 text-lg border border-slate-200 uppercase">
                  {teacher.name.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-slate-800 leading-tight">{teacher.name}</div>
                  <div className="text-xs text-slate-500 font-mono mt-1">NIP: {teacher.nip}</div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-sm">
                <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg font-bold text-xs flex items-center gap-1.5">
                  <GraduationCap className="w-3 h-3" /> Guru Pengajar
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
