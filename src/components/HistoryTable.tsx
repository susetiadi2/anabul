'use client'

import { useState } from 'react'
import { FileText, Trash2, Eye, Calendar, Users, Target, AlertTriangle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { del as idbDel } from 'idb-keyval'

export default function HistoryTable({ sessions: initialSessions }: { sessions: any[] }) {
  const [sessions, setSessions] = useState(initialSessions)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmSession, setConfirmSession] = useState<any | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!sessions || sessions.length === 0) return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-12 text-center mb-10">
      <div className="text-slate-300 text-6xl mb-4">📂</div>
      <h3 className="font-bold text-slate-700 text-lg">Belum ada riwayat analisis</h3>
      <p className="text-slate-500 text-sm mt-1">Laporan yang sudah Anda simpan akan muncul di sini.</p>
    </div>
  )

  const handleDeleteConfirm = async () => {
    if (!confirmSession) return
    setIsDeleting(true)
    setErrorMsg(null)

    try {
      const supabase = createClient()

      // 1. Hapus dari Supabase
      const { error } = await supabase
        .from('analysis_sessions')
        .delete()
        .eq('id', confirmSession.id)

      if (error) throw new Error(error.message)

      // 2. Hapus data detail dari IndexedDB lokal
      try {
        await idbDel(`analysis_${confirmSession.id}`)
      } catch {
        // IndexedDB mungkin tidak ada, abaikan
      }

      // 3. Update UI: filter baris yang dihapus
      setSessions(prev => prev.filter(s => s.id !== confirmSession.id))
      setConfirmSession(null)

    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menghapus. Silakan coba lagi.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      {/* ── Modal Konfirmasi Hapus ── */}
      {confirmSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !isDeleting && setConfirmSession(null)}
          />
          {/* Modal Card */}
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              {/* Icon */}
              <div className="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center mb-5 shadow-inner">
                <AlertTriangle className="w-8 h-8 text-rose-500" />
              </div>

              <h3 className="text-xl font-black text-slate-800 mb-1">Hapus Laporan Ini?</h3>
              <p className="text-sm text-slate-500 mb-4 leading-relaxed">
                Tindakan ini <strong className="text-slate-700">tidak dapat dibatalkan</strong>. Laporan berikut akan dihapus permanen dari server dan perangkat Anda:
              </p>

              {/* Preview laporan yang akan dihapus */}
              <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 mb-6 text-left">
                <div className="font-bold text-slate-800 truncate">{confirmSession.name || 'Analisis Tanpa Judul'}</div>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1.5">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(confirmSession.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-slate-300 inline-block"/>
                  <span className="uppercase font-bold tracking-wider">{confirmSession.exam_type === 'pg_huruf' ? 'PG (A-E)' : confirmSession.exam_type}</span>
                </div>
              </div>

              {/* Error message */}
              {errorMsg && (
                <div className="w-full mb-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl px-4 py-3 text-left">
                  ⚠️ {errorMsg}
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setConfirmSession(null)}
                  disabled={isDeleting}
                  className="flex-1 px-5 py-3 rounded-2xl border-2 border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className="flex-1 px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm transition-colors shadow-lg shadow-rose-500/20 disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Menghapus...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Ya, Hapus
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tabel Riwayat ── */}
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
                <th className="px-6 py-5 whitespace-nowrap">Tipe &amp; KKTP</th>
                <th className="px-6 py-5 whitespace-nowrap">Peserta &amp; Hasil</th>
                <th className="px-6 py-5 whitespace-nowrap">Status Instrumen</th>
                <th className="px-6 py-5 text-right whitespace-nowrap">Aksi Cepat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessions.map((session) => {
                const data = session.data_payload
                const date = new Date(session.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                const siswaCount = data?.metadata?.totalSiswa ?? data?.studentData?.length ?? 0
                const tuntas = data?.summary?.tuntas || 0
                const percentage = siswaCount > 0 ? Math.round((tuntas / siswaCount) * 100) : 0
                
                const reliability = data?.summary?.reliability || 0
                const relCat = data?.summary?.relCat || 'Tidak Diketahui'
                
                let badgeColor = 'bg-slate-100 text-slate-700'
                if (relCat.includes('Sangat Reliabel')) badgeColor = 'bg-emerald-100 text-emerald-700 border border-emerald-200/50'
                else if (relCat.includes('Reliabel')) badgeColor = 'bg-blue-100 text-blue-700 border border-blue-200/50'
                else if (relCat.includes('Cukup')) badgeColor = 'bg-amber-100 text-amber-700 border border-amber-200/50'
                else badgeColor = 'bg-rose-100 text-rose-700 border border-rose-200/50'

                const isBeingDeleted = deletingId === session.id

                return (
                  <tr key={session.id} className={`hover:bg-blue-50/30 transition-colors group ${isBeingDeleted ? 'opacity-40 pointer-events-none' : ''}`}>
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
                        <Link 
                          href={`/analysis/new?viewId=${session.id}`}
                          className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors hover:shadow-sm block" 
                          title="Lihat Detail Laporan"
                        >
                          <Eye className="w-5 h-5" />
                        </Link>
                        <button 
                          onClick={() => setConfirmSession(session)}
                          className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors hover:shadow-sm group/del" 
                          title="Hapus Laporan"
                        >
                          <Trash2 className="w-5 h-5 group-hover/del:scale-110 transition-transform" />
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
    </>
  )
}
