'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Building2, Users, FileText, RefreshCw, LogOut, ShieldCheck, MapPin } from 'lucide-react'

type School = { id: string; name: string; address: string | null; level: string | null; cluster_name: string | null; headmaster_name?: string | null }
type UserProfile = { id: string; nip: string; name: string; school_name: string; role: string; cluster_name: string | null }

export default function SupervisorDashboard() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [schools, setSchools] = useState<School[]>([])
  const [teachers, setTeachers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()
  const router = useRouter()

  const fetchDashboardData = useCallback(async (userProfile: UserProfile) => {
    setLoading(true)
    const cluster = userProfile.cluster_name

    if (!cluster) {
      setLoading(false)
      return
    }

    // Ambil semua sekolah di gugus/wilayah ini
    const { data: schoolsData } = await supabase
      .from('schools')
      .select('*')
      .eq('cluster_name', cluster)
      .eq('is_active', true)
      .order('name', { ascending: true })

    const schoolsList = schoolsData || []
    setSchools(schoolsList)

    if (schoolsList.length > 0) {
      const schoolNames = schoolsList.map(s => s.name)
      // Ambil semua guru yang ada di sekolah-sekolah tersebut
      const { data: teachersData } = await supabase
        .from('user_profiles')
        .select('*')
        .in('school_name', schoolNames)
        .eq('role', 'guru')
        .order('school_name', { ascending: true })
      
      setTeachers(teachersData || [])
    }

    setLoading(false)
  }, [supabase])

  useEffect(() => {
    // Guard: pastikan yang akses adalah pengawas
    supabase.auth.getUser().then(({ data: authData }) => {
      if (!authData.user) {
        router.replace('/login')
        return
      }
      supabase.from('user_profiles').select('*').eq('id', authData.user.id).single().then(({ data }) => {
        const role = data?.role?.toLowerCase().trim()
        if (!data || role !== 'pengawas') {
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
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold text-slate-500">Memuat Dasbor Pengawas...</div>
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-linear-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-black text-lg leading-none text-slate-800">AnasolApp <span className="text-blue-600">Pengawas</span></div>
              <div className="text-xs text-slate-500 font-medium">Wilayah Binaan: {profile.cluster_name || 'Belum diatur'}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => fetchDashboardData(profile)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100">
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
            <MapPin className="w-48 h-48" />
          </div>
          <div className="relative z-10">
            <h1 className="text-2xl font-black text-slate-800 mb-2">Selamat datang, {profile.name}!</h1>
            <p className="text-slate-500">Anda sedang memantau <span className="font-bold text-blue-600">{schools.length} Sekolah</span> dan <span className="font-bold text-blue-600">{teachers.length} Guru</span> di {profile.cluster_name}.</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <div className="text-3xl font-black text-slate-800">{schools.length}</div>
              <div className="text-slate-500 font-bold text-sm uppercase tracking-wide">Sekolah Binaan</div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <div className="text-3xl font-black text-slate-800">{teachers.length}</div>
              <div className="text-slate-500 font-bold text-sm uppercase tracking-wide">Total Guru</div>
            </div>
          </div>
        </div>

        {/* Daftar Sekolah */}
        <h2 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2"><Building2 className="w-5 h-5 text-blue-500" /> Daftar Sekolah Binaan</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {schools.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white border border-slate-200 border-dashed rounded-3xl text-slate-500 font-medium">
              Belum ada sekolah yang terdaftar di wilayah ini.
            </div>
          ) : schools.map(school => (
            <div key={school.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-600 text-sm border border-slate-200">
                  {school.level || 'S'}
                </div>
                <div>
                  <div className="font-bold text-slate-800 leading-tight">{school.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{school.address || 'Alamat belum diisi'}</div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-sm">
                <div className="text-slate-500 font-medium text-xs">Kepsek: <span className="text-slate-700 font-bold">{school.headmaster_name || '-'}</span></div>
                <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg font-bold text-xs flex items-center gap-1.5">
                  <Users className="w-3 h-3" /> {teachers.filter(t => t.school_name === school.name).length} Guru
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
