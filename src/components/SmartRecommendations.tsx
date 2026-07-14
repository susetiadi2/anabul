'use client'

import { Lightbulb, AlertTriangle, TrendingDown, TrendingUp, Sparkles, Activity } from 'lucide-react'

export default function SmartRecommendations({ sessions }: { sessions: any[] }) {
  if (!sessions || sessions.length === 0) return null

  const insights: any[] = []

  const latestSession = sessions[0]
  const prevSession = sessions.length > 1 ? sessions[1] : null

  const latestData = latestSession.data_payload
  const prevData = prevSession?.data_payload

  const latestName = latestSession.name || 'Analisis Terakhir'

  // Insight 1: Bandingkan ketuntasan
  if (latestData && prevData) {
    const latestSiswaCount = latestData.metadata?.totalSiswa ?? latestData.studentData?.length ?? 1
    const prevSiswaCount = prevData.metadata?.totalSiswa ?? prevData.studentData?.length ?? 1
    
    const latestTuntas = (latestData.summary?.tuntas / latestSiswaCount) * 100
    const prevTuntas = (prevData.summary?.tuntas / prevSiswaCount) * 100
    
    if (latestTuntas < prevTuntas - 10) {
      insights.push({
        type: 'warning',
        icon: TrendingDown,
        title: 'Penurunan Tingkat Ketuntasan',
        desc: `Tingkat kelulusan pada "${latestName}" turun sebesar ${Math.round(prevTuntas - latestTuntas)}% dari ujian sebelumnya. Cek kembali daya serap materi atau kompleksitas soal.`,
        color: 'rose'
      })
    } else if (latestTuntas > prevTuntas + 10) {
      insights.push({
        type: 'success',
        icon: TrendingUp,
        title: 'Peningkatan Luar Biasa!',
        desc: `Ketuntasan siswa naik signifikan pada "${latestName}". Strategi mengajar Anda terbukti efektif dan membuahkan hasil yang sangat baik!`,
        color: 'emerald'
      })
    }
  }

  // Insight 2: Analisis Butir Soal Terakhir (Kualitas & Keputusan)
  if (latestData) {
    const sukarCount = latestData.metadata?.soalSukar ?? latestData.analyzedData?.filter((d: any) => d.pCat === 'Sukar').length ?? 0
    const totalSoal = latestData.metadata?.totalSoal ?? latestData.analyzedData?.length ?? 0
    
    if (sukarCount > totalSoal * 0.3) {
      insights.push({
        type: 'alert',
        icon: AlertTriangle,
        title: 'Banyak Soal Terlalu Sulit',
        desc: `Lebih dari 30% butir soal pada "${latestName}" masuk kategori Sukar. Pertimbangkan untuk menyesuaikan tingkat kesulitan (HOTS) agar proporsional.`,
        color: 'amber'
      })
    }

    const revisiCount = latestData.metadata?.soalRevisi ?? latestData.analyzedData?.filter((d: any) => d.decision === 'Revisi' || d.decision === 'Dibuang' || d.decision === 'Gugur').length ?? 0
    if (revisiCount > totalSoal * 0.2) {
      insights.push({
        type: 'info',
        icon: Lightbulb,
        title: 'Butuh Revisi Bank Soal',
        desc: `Terdapat ${revisiCount} soal yang bermasalah pada "${latestName}". Segera periksa Daya Beda dan fungsi Pengecoh sebelum soal tersebut diujikan kembali.`,
        color: 'blue'
      })
    }
    
    if (revisiCount === 0 && totalSoal > 0) {
      insights.push({
        type: 'success',
        icon: Sparkles,
        title: 'Kualitas Instrumen Sempurna',
        desc: `Hebat! Seluruh butir soal pada "${latestName}" berfungsi dengan sangat baik (Valid & Dapat Dipakai). Bank soal Anda kini sangat berkualitas.`,
        color: 'emerald'
      })
    }
  }

  // Jika tidak ada insight spesifik, berikan default motivasi & kesimpulan umum
  if (insights.length === 0) {
    insights.push({
      type: 'info',
      icon: Activity,
      title: 'Konsisten & Stabil',
      desc: 'Kinerja belajar siswa dan instrumen soal Anda berada pada tingkat yang stabil. Terus pertahankan kualitas pembelajaran di kelas!',
      color: 'blue'
    })
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8 mb-10 relative overflow-hidden">
      {/* Ornamen Latar AI */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-indigo-50 to-transparent rounded-bl-full pointer-events-none opacity-50"></div>
      
      <div className="mb-6 flex items-center gap-4 relative z-10">
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
          <Sparkles className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-black text-xl text-slate-800 tracking-tight flex items-center gap-2">
            AI Smart Recommendations
            <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">Beta</span>
          </h3>
          <p className="text-sm font-medium text-slate-500">Wawasan dan rekomendasi otomatis dari analisis data Anda.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
        {insights.slice(0, 4).map((item, idx) => {
          const Icon = item.icon
          
          let bgClass = 'bg-blue-50 border-blue-100'
          let iconBg = 'bg-blue-100 text-blue-600'
          let titleClass = 'text-blue-900'
          
          if (item.color === 'emerald') {
            bgClass = 'bg-emerald-50/70 border-emerald-100'
            iconBg = 'bg-emerald-100 text-emerald-600'
            titleClass = 'text-emerald-900'
          } else if (item.color === 'rose') {
            bgClass = 'bg-rose-50/70 border-rose-100'
            iconBg = 'bg-rose-100 text-rose-600'
            titleClass = 'text-rose-900'
          } else if (item.color === 'amber') {
            bgClass = 'bg-amber-50/70 border-amber-100'
            iconBg = 'bg-amber-100 text-amber-600'
            titleClass = 'text-amber-900'
          }

          return (
            <div key={idx} className={`p-5 rounded-2xl border ${bgClass} flex gap-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-default group`}>
              <div className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center ${iconBg} group-hover:scale-110 transition-transform`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <h4 className={`font-bold text-base mb-1 ${titleClass}`}>{item.title}</h4>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">{item.desc}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
