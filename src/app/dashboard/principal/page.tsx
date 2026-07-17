'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Users, RefreshCw, LogOut, GraduationCap, Building, Activity, FileText, CheckCircle, AlertTriangle, XCircle, Search, Filter, BookOpen, Star, TrendingUp, ChevronRight, BarChart2, Award } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'

type UserProfile = { id: string; nip: string; name: string; school_name: string; role: string; cluster_name: string | null }

export default function PrincipalDashboard() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('ringkasan')

  // Data Nyata dari Supabase
  const [stats, setStats] = useState({
    totalGuru: 0,
    totalMapel: 0,
    analisisSelesai: 0,
    paketSoal: 0,
    soalDianalisis: 0,
    layak: 0,
    revisi: 0,
    ditolak: 0
  })
  const [monitoringGuru, setMonitoringGuru] = useState<any[]>([])
  const [kualitasKesukaran, setKualitasKesukaran] = useState<any[]>([])
  const [kualitasBeda, setKualitasBeda] = useState<any[]>([
    { name: 'Sangat Baik', value: 0 },
    { name: 'Baik', value: 0 },
    { name: 'Cukup', value: 0 },
    { name: 'Jelek', value: 0 }
  ])
  const [rankingMapel, setRankingMapel] = useState<any[]>([])
  const [rankingGuru, setRankingGuru] = useState<any[]>([])
  const [bermasalah, setBermasalah] = useState<any[]>([])
  const [bankSoal, setBankSoal] = useState<any[]>([])

  const supabase = createClient()
  const router = useRouter()

  const fetchDashboardData = useCallback(async (userProfile: UserProfile) => {
    setLoading(true)
    try {
      // 1. Ambil data guru di sekolah ini
      const { data: teachers } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('school_name', userProfile.school_name)
        .eq('role', 'guru')

      const guruList = teachers || []

      // 2. Ambil data analisis di sekolah ini
      const { data: sessions } = await supabase
        .from('analysis_sessions')
        .select('*')
        .eq('school_name', userProfile.school_name)
      
      const sessionList = sessions || []

      // 3. Agregasi Data
      let totalSoalDianalisis = 0
      let totalValid = 0
      let totalSukar = 0
      let totalRevisi = 0

      sessionList.forEach(session => {
        const meta = session.data_payload?.metadata
        if (meta) {
          totalSoalDianalisis += (meta.totalSoal || 0)
          totalValid += (meta.soalValid || 0)
          totalSukar += (meta.soalSukar || 0)
          totalRevisi += (meta.soalRevisi || 0)
        }
      })

      const persentaseLayak = totalSoalDianalisis > 0 ? Math.round((totalValid / totalSoalDianalisis) * 100) : 0
      const persentaseRevisi = totalSoalDianalisis > 0 ? Math.round((totalRevisi / totalSoalDianalisis) * 100) : 0
      const persentaseDitolak = totalSoalDianalisis > 0 ? Math.round((totalSukar / totalSoalDianalisis) * 100) : 0

      setStats({
        totalGuru: guruList.length,
        totalMapel: 0, 
        analisisSelesai: sessionList.length,
        paketSoal: sessionList.length,
        soalDianalisis: totalSoalDianalisis,
        layak: persentaseLayak,
        revisi: persentaseRevisi,
        ditolak: persentaseDitolak
      })

      // Monitoring Guru
      const monitoring = guruList.map(guru => {
        const guruSessions = sessionList.filter(s => s.user_id === guru.id)
        return {
          id: guru.id,
          guru: guru.name,
          mapel: '-',
          kelas: '-', 
          semester: '-',
          status: guruSessions.length > 0 ? 'Selesai' : 'Belum Mulai'
        }
      })
      setMonitoringGuru(monitoring)

      // Dummy Kesukaran Berdasarkan Agregat
      const mudah = Math.max(0, totalSoalDianalisis - totalSukar - (totalSoalDianalisis * 0.4))
      const sedang = Math.max(0, totalSoalDianalisis * 0.4)
      setKualitasKesukaran([
        { name: 'Mudah', value: totalSoalDianalisis > 0 ? mudah : 1, color: '#10b981' },
        { name: 'Sedang', value: totalSoalDianalisis > 0 ? sedang : 1, color: '#3b82f6' },
        { name: 'Sulit', value: totalSoalDianalisis > 0 ? totalSukar : 1, color: '#f59e0b' },
      ])

    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
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

  const TABS = [
    { id: 'ringkasan', label: 'Ringkasan', icon: Activity },
    { id: 'monitoring', label: 'Monitoring Guru', icon: Users },
    { id: 'statistik', label: 'Statistik Mutu', icon: BarChart2 },
    { id: 'ranking', label: 'Ranking Mutu', icon: Award },
    { id: 'bermasalah', label: 'Soal Bermasalah', icon: AlertTriangle },
    { id: 'bank', label: 'Bank Soal', icon: BookOpen },
  ]

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 font-sans">
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

      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto gap-2 pb-4 mb-6 custom-scrollbar">
          {TABS.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm whitespace-nowrap transition-all shadow-sm ${
                  isActive 
                    ? 'bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-emerald-500/25 border-transparent' 
                    : 'bg-white text-slate-600 hover:text-emerald-700 border border-slate-200 hover:bg-emerald-50 hover:border-emerald-200'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* --- TAB CONTENT --- */}
        
        {activeTab === 'ringkasan' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative overflow-hidden group">
                <div className="absolute right-[-10px] top-[-10px] opacity-[0.03] group-hover:scale-110 transition-transform"><Users className="w-32 h-32" /></div>
                <div className="text-slate-500 font-bold text-sm uppercase tracking-wide mb-2">Guru Terdaftar</div>
                <div className="text-4xl font-black text-slate-800">{stats.totalGuru}</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative overflow-hidden group">
                <div className="absolute right-[-10px] top-[-10px] opacity-[0.03] group-hover:scale-110 transition-transform"><BookOpen className="w-32 h-32" /></div>
                <div className="text-slate-500 font-bold text-sm uppercase tracking-wide mb-2">Mata Pelajaran</div>
                <div className="text-4xl font-black text-slate-800">{stats.totalMapel}</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative overflow-hidden group">
                <div className="absolute right-[-10px] top-[-10px] opacity-[0.03] group-hover:scale-110 transition-transform"><FileText className="w-32 h-32" /></div>
                <div className="text-slate-500 font-bold text-sm uppercase tracking-wide mb-2">Paket Soal</div>
                <div className="text-4xl font-black text-slate-800">{stats.paketSoal}</div>
              </div>
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 border border-transparent rounded-3xl p-6 shadow-lg shadow-emerald-500/20 relative overflow-hidden group text-white">
                <div className="absolute right-[-10px] top-[-10px] opacity-10 group-hover:scale-110 transition-transform"><Activity className="w-32 h-32" /></div>
                <div className="text-emerald-100 font-bold text-sm uppercase tracking-wide mb-2">Soal Dianalisis</div>
                <div className="text-4xl font-black">{stats.soalDianalisis.toLocaleString()}</div>
              </div>
            </div>

            {/* Quality Summary Chart */}
            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm flex flex-col md:flex-row gap-8 items-center">
              <div className="w-full md:w-1/3">
                <h3 className="text-xl font-black text-slate-800 mb-2">Kelayakan Soal Sekolah</h3>
                <p className="text-slate-500 text-sm mb-6">Distribusi persentase kualitas dari total {stats.soalDianalisis} butir soal yang telah dikerjakan oleh guru.</p>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> <span className="font-bold text-slate-700 text-sm">Layak</span></div>
                    <div className="font-black text-emerald-600">{stats.layak}%</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-400"></div> <span className="font-bold text-slate-700 text-sm">Perlu Revisi</span></div>
                    <div className="font-black text-amber-500">{stats.revisi}%</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-rose-500"></div> <span className="font-bold text-slate-700 text-sm">Ditolak</span></div>
                    <div className="font-black text-rose-600">{stats.ditolak}%</div>
                  </div>
                </div>
              </div>
              
              <div className="w-full md:w-2/3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Layak', value: stats.layak },
                        { name: 'Revisi', value: stats.revisi },
                        { name: 'Ditolak', value: stats.ditolak }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#fbbf24" />
                      <Cell fill="#f43f5e" />
                    </Pie>
                    <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'monitoring' && (
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-black text-lg text-slate-800">Monitoring Analisis Guru</h3>
                <p className="text-slate-500 text-sm">Pantau progres penyusunan dan analisis butir soal per kelas.</p>
              </div>
              <div className="flex gap-2">
                <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50"><Filter className="w-4 h-4" /> Filter</button>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input placeholder="Cari Guru / Mapel..." className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" />
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/50 text-slate-500 font-extrabold uppercase text-xs">
                  <tr>
                    <th className="px-6 py-4">Nama Guru</th>
                    <th className="px-6 py-4">Mata Pelajaran</th>
                    <th className="px-6 py-4">Kelas</th>
                    <th className="px-6 py-4">Semester</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monitoringGuru.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-500 italic">Belum ada guru yang terdaftar.</td>
                    </tr>
                  ) : monitoringGuru.map(row => (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800">{row.guru}</td>
                      <td className="px-6 py-4 text-slate-500 italic">{row.mapel}</td>
                      <td className="px-6 py-4 text-slate-500 italic">{row.kelas}</td>
                      <td className="px-6 py-4 text-slate-500 italic">{row.semester}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full font-bold text-xs border ${
                          row.status === 'Selesai' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          row.status === 'Proses' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'statistik' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Kesukaran */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-blue-500" /> Tingkat Kesukaran Soal</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={kualitasKesukaran} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700, fill: '#64748b' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                      <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {kualitasKesukaran.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Daya Pembeda */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2"><Activity className="w-5 h-5 text-violet-500" /> Kualitas Daya Pembeda</h3>
                <div className="h-64">
                  {kualitasBeda.length > 0 && kualitasBeda.some(x => x.value > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={kualitasBeda} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700, fill: '#64748b' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                        <RechartsTooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={4} dot={{ r: 6, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 italic font-medium gap-2">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center"><BarChart2 className="w-5 h-5 text-slate-300" /></div>
                      Belum ada data untuk ditampilkan
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ranking' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Ranking Mapel */}
            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center"><Star className="w-5 h-5 text-amber-500" /></div>
                <div>
                  <h3 className="font-black text-lg text-slate-800">Ranking Mata Pelajaran</h3>
                  <p className="text-xs text-slate-500 font-medium">Berdasarkan Nilai Kualitas Analisis</p>
                </div>
              </div>
              <div className="space-y-4">
                {rankingMapel.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 italic">Data belum tersedia</div>
                ) : rankingMapel.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4 group">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-500 text-sm group-hover:bg-amber-100 group-hover:text-amber-600 transition-colors">#{idx + 1}</div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="font-bold text-slate-700 text-sm">{item.mapel}</span>
                        <span className="font-black text-emerald-600">{item.nilai}</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: `${item.nilai}%` }}></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ranking Guru */}
            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center"><Award className="w-5 h-5 text-blue-500" /></div>
                <div>
                  <h3 className="font-black text-lg text-slate-800">Kualitas Guru Pembuat Soal</h3>
                  <p className="text-xs text-slate-500 font-medium">Indikator Mutu Penyusunan Soal (Non-Punitive)</p>
                </div>
              </div>
              <div className="space-y-4">
                {rankingGuru.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 italic">Data belum tersedia</div>
                ) : rankingGuru.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4 group">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-500 border border-slate-200 uppercase text-sm group-hover:border-blue-300 transition-colors">{item.guru.charAt(0)}</div>
                    <div className="flex-1">
                      <div className="flex justify-between items-end mb-1">
                        <div>
                          <div className="font-bold text-slate-800 text-sm leading-none mb-1">{item.guru}</div>
                          <div className="text-xs text-slate-500">{item.mapel}</div>
                        </div>
                        <span className="font-black text-blue-600 text-lg">{item.nilai}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full rounded-full transition-all duration-1000" style={{ width: `${item.nilai}%` }}></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'bermasalah' && (
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="p-6 border-b border-slate-100 bg-rose-50/30">
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="w-6 h-6 text-rose-500" />
                <h3 className="font-black text-lg text-slate-800">Monitoring Soal Bermasalah</h3>
              </div>
              <p className="text-slate-600 text-sm">Butir soal di bawah ini terdeteksi oleh sistem memiliki masalah kualitas dan membutuhkan perhatian atau revisi segera.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/50 text-slate-500 font-extrabold uppercase text-xs">
                  <tr>
                    <th className="px-6 py-4">No. Soal</th>
                    <th className="px-6 py-4">Mata Pelajaran</th>
                    <th className="px-6 py-4">Kelas</th>
                    <th className="px-6 py-4">Kategori Masalah</th>
                    <th className="px-6 py-4">Prioritas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bermasalah.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500 italic">Belum ada data soal bermasalah.</td></tr>
                  ) : bermasalah.map(row => (
                    <tr key={row.id} className="hover:bg-rose-50/50 transition-colors">
                      <td className="px-6 py-4 font-black text-slate-800 text-center w-16">#{row.soalNo}</td>
                      <td className="px-6 py-4 font-bold">{row.mapel}</td>
                      <td className="px-6 py-4">{row.kelas}</td>
                      <td className="px-6 py-4 text-rose-600 font-medium">{row.masalah}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-md font-bold text-[10px] uppercase tracking-wider border ${
                          row.tingkat === 'Tinggi' ? 'bg-rose-100 text-rose-700 border-rose-200' :
                          row.tingkat === 'Sedang' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                          'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {row.tingkat}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'bank' && (
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 text-white">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-800">Bank Soal Sekolah</h3>
                  <p className="text-slate-500 text-sm">Repositori butir soal yang telah diverifikasi dan lolos analisis kelayakan.</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <select className="px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 focus:outline-none focus:border-blue-500">
                  <option>Semua Mapel</option>
                  <option>IPA</option>
                  <option>Matematika</option>
                </select>
                <select className="px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 focus:outline-none focus:border-blue-500">
                  <option>Semua Kelas</option>
                  <option>VII</option>
                  <option>VIII</option>
                </select>
                <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold shadow-sm transition-colors">
                  <Search className="w-4 h-4" /> Cari
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/50 text-slate-500 font-extrabold uppercase text-xs">
                  <tr>
                    <th className="px-6 py-4">Mata Pelajaran</th>
                    <th className="px-6 py-4">Kelas</th>
                    <th className="px-6 py-4">Materi Pokok</th>
                    <th className="px-6 py-4">Tipe Soal</th>
                    <th className="px-6 py-4">Penulis</th>
                    <th className="px-6 py-4">Kesukaran</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bankSoal.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500 italic">Belum ada soal di bank soal.</td></tr>
                  ) : bankSoal.map(row => (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800">{row.materi}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{row.mapel} · Kls {row.kelas}</div>
                      </td>
                      <td className="px-6 py-4 font-medium">{row.tipe}</td>
                      <td className="px-6 py-4 font-bold text-slate-700">{row.guru}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${
                          row.kesukaran === 'Mudah' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          row.kesukaran === 'Sedang' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                          'bg-amber-50 text-amber-600 border-amber-100'
                        }`}>
                          {row.kesukaran}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-all">Preview</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
