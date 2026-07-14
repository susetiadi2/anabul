'use client'

import { FileText, Trash2, Eye, Calendar, Users, Target } from 'lucide-react'

export default function HistoryTable({ sessions }: { sessions: any[] }) {
  if (!sessions || sessions.length === 0) return null

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-10 relative">
      {/* Table Header Section */}
      <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50/50 gap-4">
        <div>
          <h3 className="font-black text-xl text-slate-800 tracking-tight flex items-center gap-2">
            Riwayat Analisis Butir Soal
          </h3>
          <p className="text-sm font-medium text-slate-500 mt-1">Daftar semua laporan hasil evaluasi ujian yang telah Anda proses.</p>
        </div>
        <div className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm font-bold text-slate-600 shadow-sm">
          {sessions.length} Dokumen Disimpan
        </div>
      </div>
      
      {/* Table Section */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 text-slate-500 text-xs uppercase tracking-widest font-black border-b border-slate-200">
              <th className="px-6 py-5 whitespace-nowrap">Dokumen Ujian</th>
              <th className="px-6 py-5 whitespace-nowrap">Tipe & KKTP</th>
              <th className="px-6 py-5 whitespace-nowrap">Peserta & Hasil</th>
              <th className="px-6 py-5 whitespace-nowrap">Status Instrumen</th>
              <th className="px-6 py-5 text-right whitespace-nowrap">Aksi Cepat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sessions.map((session) => {
              const data = session.data_payload
              const date = new Date(session.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
              const siswaCount = data?.studentData?.length || 0
              const tuntas = data?.summary?.tuntas || 0
              const percentage = siswaCount > 0 ? Math.round((tuntas / siswaCount) * 100) : 0
              
              const reliability = data?.summary?.reliability || 0
              const relCat = data?.summary?.relCat || 'Tidak Diketahui'
              
              let badgeColor = 'bg-slate-100 text-slate-700'
              if (relCat.includes('Sangat Reliabel')) badgeColor = 'bg-emerald-100 text-emerald-700 border border-emerald-200/50'
              else if (relCat.includes('Reliabel')) badgeColor = 'bg-blue-100 text-blue-700 border border-blue-200/50'
              else if (relCat.includes('Cukup')) badgeColor = 'bg-amber-100 text-amber-700 border border-amber-200/50'
              else badgeColor = 'bg-rose-100 text-rose-700 border border-rose-200/50'

              return (
                <tr key={session.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-start gap-3.5">
                      <div className="mt-0.5 p-2.5 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-blue-500/30 transition-all duration-300">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 line-clamp-1 group-hover:text-blue-700 transition-colors">{session.name || 'Analisis Tanpa Judul'}</div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-1.5">
                          <Calendar className="w-3.5 h-3.5" /> {date}
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-5">
                    <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-md mb-2 shadow-sm border border-slate-200/50">
                      {session.exam_type === 'pg_huruf' ? 'Pilihan Ganda' : session.exam_type.toUpperCase()}
                    </span>
                    <div className="text-xs text-slate-500 font-medium">KKTP: <strong className="text-slate-800">{session.kkm}</strong></div>
                  </td>
                  
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2 mb-2 text-sm">
                      <Users className="w-4 h-4 text-slate-400" /> <span className="font-bold text-slate-700">{siswaCount}</span> <span className="text-slate-500 text-xs font-medium">Siswa</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Target className={`w-4 h-4 ${percentage >= 50 ? 'text-emerald-500' : 'text-amber-500'}`} />
                      <span className={`${percentage >= 50 ? 'text-emerald-600' : 'text-amber-600'} font-bold`}>
                        {percentage}% Tuntas
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-5">
                    <div className="text-sm font-black text-slate-700 mb-1.5">{typeof reliability === 'number' ? reliability.toFixed(3) : reliability}</div>
                    <span className={`inline-block px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-full shadow-sm ${badgeColor}`}>
                      {relCat}
                    </span>
                  </td>

                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button 
                        onClick={() => alert("Fitur Viewer Laporan (Lihat Hasil) akan segera dirilis!")}
                        className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors hover:shadow-sm" 
                        title="Lihat Detail (Segera Hadir)"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => alert("Fitur Hapus Data akan segera dirilis!")}
                        className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors hover:shadow-sm" 
                        title="Hapus Laporan (Segera Hadir)"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
