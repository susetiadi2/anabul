import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { FolderPlus, FileSpreadsheet, LogOut, ChartBar } from 'lucide-react'
import TrendChart from '@/components/TrendChart'
import SmartRecommendations from '@/components/SmartRecommendations'
import HistoryTable from '@/components/HistoryTable'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/login')
  }

  const { data: profile } = await supabase.from('user_profiles').select('name, school_name').eq('id', user.id).single()

  const { data: sessions, error } = await supabase
    .from('analysis_sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  
  // Hitung Global Insight
  let totalAnalisis = sessions?.length || 0
  let totalSiswa = 0
  let totalTuntas = 0
  let totalSoal = 0
  let totalValid = 0

  sessions?.forEach((session: any) => {
    const data = session.data_payload
    if (data) {
      const siswaCount = data.metadata?.totalSiswa ?? data.studentData?.length ?? 0
      totalSiswa += siswaCount
      totalTuntas += data.summary?.tuntas || 0
      
      const soalCount = data.metadata?.totalSoal ?? data.analyzedData?.length ?? 0
      totalSoal += soalCount
      
      const validCount = data.metadata?.soalValid ?? data.analyzedData?.filter((d: any) => d.valStatus === 'Valid').length ?? 0
      totalValid += validCount
    }
  })

  const persentaseKetuntasan = totalSiswa > 0 ? Math.round((totalTuntas / totalSiswa) * 100) : 0
  const persentaseValid = totalSoal > 0 ? Math.round((totalValid / totalSoal) * 100) : 0

  // Dynamic Greeting
  const currentHour = new Date().getUTCHours() + 7
  const hour = currentHour % 24
  let greeting = 'Selamat Pagi'
  if (hour >= 11 && hour < 15) greeting = 'Selamat Siang'
  else if (hour >= 15 && hour < 18) greeting = 'Selamat Sore'
  else if (hour >= 18 || hour < 4) greeting = 'Selamat Malam'

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans relative overflow-x-hidden">
      {/* Background Ornaments for Glassmorphism */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400/20 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-400/20 blur-[120px] pointer-events-none"></div>
      
      <nav className="bg-white/70 backdrop-blur-xl border-b border-white/40 px-4 sm:px-6 py-4 sticky top-0 z-40 shadow-sm">
        <div className="flex justify-between items-center w-full max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-3">
            <img src="https://iili.io/CMHn0Cv.png" alt="Logo AnasolApp" className="w-10 h-10 object-contain rounded-xl" />
            <div>
              <div className="text-xl font-bold tracking-tight text-slate-900 leading-none">Anasol<span className="text-blue-600">App</span></div>
              <div className="text-[11px] text-slate-500 font-medium tracking-wide">Aplikasi Analisis Butir Soal</div>
              <div className="text-[9px] text-slate-400 font-medium tracking-wide">By: Susetiadi - Pengawas DS</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {profile && (
              <div className="hidden md:flex flex-col items-end mr-2">
                <span className="text-sm font-bold text-slate-800">{profile.name}</span>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{profile.school_name}</span>
              </div>
            )}
            <form action="/auth/signout" method="post">
              <button className="flex items-center text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-2 rounded-lg text-sm font-semibold transition-colors">
                <LogOut className="w-4 h-4 mr-1.5" /> Keluar
              </button>
            </form>
          </div>
        </div>
      </nav>

      <main className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8 relative z-10">
        
        {/* Greetings & Actions */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{greeting}, {profile?.name?.split(' ')[0] || 'Guru'}! 👋</h1>
            <p className="text-slate-500 mt-1 font-medium">Ini adalah ringkasan kinerja evaluasi belajar yang telah Anda lakukan.</p>
          </div>
          <Link 
            href="/analysis/new" 
            className="flex items-center justify-center bg-blue-600/90 backdrop-blur-md border border-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-[0_8px_20px_rgb(37,99,235,0.25)] hover:shadow-[0_8px_25px_rgb(37,99,235,0.4)] hover:-translate-y-0.5"
          >
            <FolderPlus className="w-5 h-5 mr-2" /> Buat Analisis Baru
          </Link>
        </div>

        {/* Global Insight (Hero Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {/* Card 1: Total Analisis */}
          <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:bg-white/80 transition-all duration-300">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-400/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-50/50 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
            <div className="relative z-10">
              <p className="text-xs font-black text-slate-400 mb-1 uppercase tracking-widest">Total Analisis</p>
              <h3 className="text-4xl font-black text-slate-800">{totalAnalisis} <span className="text-sm font-semibold text-slate-500">Dokumen</span></h3>
            </div>
          </div>

          {/* Card 2: Total Siswa */}
          <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:bg-white/80 transition-all duration-300">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-400/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-50/50 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
            <div className="relative z-10">
              <p className="text-xs font-black text-slate-400 mb-1 uppercase tracking-widest">Total Siswa</p>
              <h3 className="text-4xl font-black text-slate-800">{totalSiswa} <span className="text-sm font-semibold text-slate-500">Dievaluasi</span></h3>
            </div>
          </div>

          {/* Card 3: Ketuntasan */}
          <div className="bg-gradient-to-br from-emerald-500/90 to-teal-600/90 backdrop-blur-xl border border-emerald-400/50 rounded-3xl p-6 shadow-[0_8px_30px_rgb(16,185,129,0.25)] relative overflow-hidden group text-white">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/20 blur-2xl rounded-full group-hover:scale-150 transition-transform duration-700"></div>
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
            <div className="relative z-10">
              <p className="text-xs font-black text-emerald-100 mb-1 uppercase tracking-widest">Rata-rata Ketuntasan</p>
              <div className="flex items-end gap-2">
                <h3 className="text-4xl font-black">{persentaseKetuntasan}%</h3>
                <span className="text-sm font-medium text-emerald-100 mb-1">{totalTuntas} Lulus</span>
              </div>
            </div>
          </div>

          {/* Card 4: Kualitas Soal */}
          <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:bg-white/80 transition-all duration-300">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-rose-400/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-rose-50/50 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
            <div className="relative z-10">
              <p className="text-xs font-black text-slate-400 mb-1 uppercase tracking-widest">Kualitas Bank Soal</p>
              <h3 className="text-4xl font-black text-slate-800">{persentaseValid}% <span className="text-sm font-semibold text-slate-500">Valid</span></h3>
              <p className="text-xs text-slate-400 mt-1 font-medium">Dari {totalSoal} butir soal yg diuji</p>
            </div>
          </div>
        </div>

        {/* AI Smart Recommendations */}
        {sessions && sessions.length > 0 && (
          <SmartRecommendations sessions={sessions} />
        )}

        {/* Grafik Tren Belajar */}
        {sessions && sessions.length > 1 && (
          <TrendChart sessions={sessions} />
        )}

        {/* Tabel Riwayat */}
        {sessions && sessions.length > 0 ? (
          <HistoryTable sessions={sessions} />
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
              <ChartBar className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Belum Ada Analisis</h3>
            <p className="text-slate-500 max-w-sm mb-6">Anda belum pernah melakukan analisis butir soal. Mulai unggah file Excel nilai siswa Anda sekarang.</p>
            <Link 
              href="/analysis/new" 
              className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-colors shadow-md"
            >
              Mulai Analisis Pertama
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}

