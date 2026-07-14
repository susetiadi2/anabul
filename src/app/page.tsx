import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { FolderPlus, FileSpreadsheet, LogOut, ChartBar } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/login')
  }

  // Nanti kita akan ambil data sesi dari tabel 'analysis_sessions'
  // const { data: sessions } = await supabase.from('analysis_sessions').select('*').order('created_at', { ascending: false })
  const sessions: any[] = [] // Placeholder

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-40 shadow-sm">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-inner">A</div>
            <div>
              <div className="text-xl font-bold tracking-tight text-slate-900 leading-none">Anasol<span className="text-blue-600">App</span></div>
              <div className="text-[11px] text-slate-500 font-medium tracking-wide">SAAS EDITION</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-600 hidden md:inline-block">{user.email}</span>
            <form action="/auth/signout" method="post">
              <button className="flex items-center text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-2 rounded-lg text-sm font-semibold transition-colors">
                <LogOut className="w-4 h-4 mr-1.5" /> Keluar
              </button>
            </form>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 md:p-8">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard Analisis</h1>
            <p className="text-sm text-slate-500 mt-1">Kelola dan lihat kembali riwayat analisis butir soal Anda.</p>
          </div>
          <Link 
            href="/analysis/new" 
            className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            <FolderPlus className="w-4 h-4 mr-2" /> Analisis Baru
          </Link>
        </div>

        {sessions.length === 0 ? (
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* List of sessions will go here */}
          </div>
        )}
      </main>
    </div>
  )
}

