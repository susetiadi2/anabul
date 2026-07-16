'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Users, RefreshCw, LogOut, GraduationCap, Building, Activity, FileText, Calendar, ChevronRight, Award } from 'lucide-react'

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
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
        <div className="font-bold text-slate-500 animate-pulse">Menyiapkan Ruang Kerja Kepala Sekolah...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Premium Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200 px-6 py-4 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Building className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="font-black text-xl tracking-tight text-slate-800 flex items-center gap-2">
                AnasolApp <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-700 text-xs uppercase tracking-widest">Kepsek</span>
              </div>
              <div className="text-sm text-slate-500 font-medium mt-0.5">{profile.school_name}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => fetchDashboardData(profile)} className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all border border-transparent hover:border-emerald-200 shadow-sm hover:shadow">
              <RefreshCw className="w-5 h-5" />
            </button>
            <button onClick={handleLogout} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 text-slate-600 rounded-xl text-sm font-bold transition-all shadow-sm">
              <LogOut className="w-4 h-4" /> Keluar
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Dynamic Hero Banner */}
        <div className="relative rounded-[2.5rem] p-10 overflow-hidden shadow-2xl shadow-emerald-900/5">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900"></div>
          <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-emerald-400/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          <div className="absolute bottom-0 left-0 w-[30rem] h-[30rem] bg-teal-500/20 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-white max-w-2xl">
              <h1 className="text-4xl md:text-5xl font-black mb-4 leading-tight tracking-tight">Selamat Datang,<br/><span className="text-emerald-200">{profile.name}</span></h1>
              <p className="text-emerald-50/80 text-lg font-medium leading-relaxed mb-8 max-w-xl">
                Ini adalah pusat kendali Anda. Pantau aktivitas guru, kelola administrasi, dan tingkatkan kualitas pendidikan di {profile.school_name} dengan mudah.
              </p>
              <div className="flex flex-wrap gap-4">
                <button className="px-6 py-3 bg-white text-emerald-700 font-bold rounded-2xl hover:bg-emerald-50 transition-colors shadow-lg flex items-center gap-2">
                  <Activity className="w-5 h-5" /> Lihat Laporan Kinerja
                </button>
                <button className="px-6 py-3 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 text-white font-bold rounded-2xl transition-colors backdrop-blur-md flex items-center gap-2">
                  <FileText className="w-5 h-5" /> Dokumen Sekolah
                </button>
              </div>
            </div>
            
            {/* At-a-glance Stats */}
            <div className="flex flex-col gap-4 w-full md:w-72 shrink-0">
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 text-white flex items-center justify-between group hover:bg-white/20 transition-all cursor-pointer">
                <div>
                  <div className="text-emerald-200 text-sm font-bold uppercase tracking-wider mb-1">Total Guru</div>
                  <div className="text-4xl font-black">{teachers.length}</div>
                </div>
                <div className="w-14 h-14 bg-emerald-500/30 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="w-7 h-7 text-white" />
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 text-white flex items-center justify-between group hover:bg-white/20 transition-all cursor-pointer">
                <div>
                  <div className="text-emerald-200 text-sm font-bold uppercase tracking-wider mb-1">Agenda Hari Ini</div>
                  <div className="text-2xl font-black">2 Rapat</div>
                </div>
                <div className="w-14 h-14 bg-emerald-500/30 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Calendar className="w-7 h-7 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Guru Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <Users className="w-7 h-7 text-emerald-500 bg-emerald-100 p-1.5 rounded-xl" /> 
              Manajemen Guru
            </h2>
            <button className="text-sm font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
              Lihat Semua <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {teachers.length === 0 ? (
              <div className="col-span-full text-center py-16 bg-white border border-slate-200 border-dashed rounded-[2rem] text-slate-500">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-10 h-10 text-slate-300" />
                </div>
                <div className="font-bold text-lg text-slate-700 mb-1">Belum Ada Guru</div>
                <p className="text-sm">Guru yang mendaftar akan otomatis muncul di sini.</p>
              </div>
            ) : teachers.map(teacher => (
              <div key={teacher.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-100 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                <div className="flex items-start justify-between mb-5 relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center font-black text-slate-600 text-xl shadow-inner border border-slate-300/50 uppercase">
                    {teacher.name.charAt(0)}
                  </div>
                  <div className="bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                    Aktif
                  </div>
                </div>
                
                <div className="relative z-10 mb-5">
                  <h3 className="font-black text-slate-800 text-lg leading-tight mb-1 group-hover:text-emerald-600 transition-colors">{teacher.name}</h3>
                  <p className="text-sm text-slate-500 font-mono bg-slate-50 px-2 py-1 rounded-md inline-block">NIP: {teacher.nip}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-2 relative z-10">
                  <button className="py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Laporan
                  </button>
                  <button className="py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5">
                    <Award className="w-3.5 h-3.5" /> Evaluasi
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
