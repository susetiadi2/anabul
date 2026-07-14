'use client'

import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { analyzeData } from '@/lib/analyzer'
import { Upload, Save, ArrowLeft, BarChart2 } from 'lucide-react'
import Link from 'next/link'
import ChartsDashboard from '@/components/ChartsDashboard'

export default function NewAnalysisPage() {
  const [file, setFile] = useState<File | null>(null)
  const [examType, setExamType] = useState('pg_huruf')
  const [kkm, setKkm] = useState(75)
  const [error, setError] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('ringkasan')
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const router = useRouter()

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError('')
    }
  }

  const processFile = () => {
    if (!file) {
      setError('Silakan upload file terlebih dahulu.')
      return
    }
    
    setIsProcessing(true)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheetName = workbook.SheetNames[0]
        
        const aoa = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], { header: 1 }) as any[][]
        let headerRowIndex = aoa.findIndex(row => {
            if (!row || !Array.isArray(row)) return false;
            const rowStr = row.join("").toLowerCase();
            return (rowStr.includes("nama") || rowStr.includes("siswa") || rowStr.includes("no")) && row.length > 2;
        });
        
        if (headerRowIndex === -1) headerRowIndex = 0; 
        const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], { range: headerRowIndex, defval: "" });
        
        if (jsonData.length === 0) { 
            throw new Error('Data tidak ditemukan di dalam file.'); 
        }

        const result = analyzeData(jsonData, examType, kkm)
        setAnalysisResult(result)
        setIsProcessing(false)
      } catch (err: any) { 
        console.error(err)
        setError(err.message || 'Gagal membaca file. Pastikan format valid.')
        setIsProcessing(false)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const saveToCloud = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Anda harus login terlebih dahulu")

      // Ini membutuhkan tabel 'analysis_sessions' di Supabase
      const { error } = await supabase.from('analysis_sessions').insert({
        user_id: user.id,
        name: file?.name || 'Analisis Baru',
        exam_type: examType,
        kkm: kkm,
        data_payload: analysisResult // Menyimpan JSON utuh ke database
      })

      if (error) throw error
      
      setShowSuccessModal(true)
      setTimeout(() => {
        router.push('/')
      }, 2500)
    } catch (err: any) {
      alert("Gagal menyimpan: " + err.message + "\n\nPastikan Anda telah membuat tabel 'analysis_sessions' di Supabase.")
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="inline-flex items-center text-blue-600 font-semibold mb-6 hover:underline">
          <ArrowLeft className="w-4 h-4 mr-1" /> Kembali ke Dashboard
        </Link>
        
        <h1 className="text-2xl font-bold mb-8">Buat Analisis Baru</h1>

        {!analysisResult ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <div className="mb-6">
                <label className="block font-bold text-slate-800 mb-2">1. Pilih Jenis Instrumen</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {['pg_huruf', 'pg', 'bs', 'uraian'].map(type => (
                        <button key={type} onClick={() => setExamType(type)} className={`py-3 px-2 rounded-xl text-xs font-bold border-2 transition-all ${examType === type ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-600'}`}>
                            {type === 'pg_huruf' ? 'PG (A-E)' : type === 'pg' ? 'PG (0/1)' : type === 'bs' ? 'Benar/Salah' : 'Uraian'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="mb-6">
              <label className="block font-bold text-slate-800 mb-2">2. Target KKM</label>
              <input type="number" value={kkm} onChange={e => setKkm(Number(e.target.value))} className="w-32 px-4 py-2 border border-slate-300 rounded-lg" />
            </div>

            <div className="mb-8">
              <label className="block font-bold text-slate-800 mb-2">3. Upload File Excel</label>
              <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-blue-300 bg-blue-50/50 rounded-xl py-10 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition-colors">
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv,.xlsx" className="hidden" />
                  {file ? <div className="font-bold text-blue-700">{file.name}</div> : <><Upload className="w-8 h-8 text-blue-400 mb-2" /> <span className="font-semibold text-slate-600">Klik untuk upload file</span></>}
              </div>
            </div>

            {error && <div className="text-red-500 font-semibold mb-4">{error}</div>}

            <button onClick={processFile} disabled={!file || isProcessing} className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50">
              {isProcessing ? 'Memproses...' : 'Mulai Analisis'}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-6 rounded-2xl flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">Analisis Selesai!</h3>
                <p className="text-sm">Reliabilitas: {analysisResult.summary.reliability} - {analysisResult.summary.relCat}</p>
              </div>
              <button onClick={saveToCloud} className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center hover:bg-emerald-700">
                <Save className="w-4 h-4 mr-2" /> Simpan ke Database
              </button>
            </div>
            
            <div className="flex border-b border-slate-200 mb-6 mt-4 overflow-x-auto">
              <button onClick={() => setActiveTab('dashboard')} className={`flex items-center gap-1.5 px-6 py-3 font-semibold text-sm transition-colors whitespace-nowrap ${activeTab === 'dashboard' ? 'text-violet-600 border-b-2 border-violet-600' : 'text-slate-500 hover:text-slate-700'}`}>
                <BarChart2 className="w-4 h-4" /> Dashboard Grafik
              </button>
              <button onClick={() => setActiveTab('ringkasan')} className={`px-6 py-3 font-semibold text-sm transition-colors whitespace-nowrap ${activeTab === 'ringkasan' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
                Ringkasan & Statistik
              </button>
              <button onClick={() => setActiveTab('butir')} className={`px-6 py-3 font-semibold text-sm transition-colors whitespace-nowrap ${activeTab === 'butir' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
                Analisis Butir Soal
              </button>
              <button onClick={() => setActiveTab('siswa')} className={`px-6 py-3 font-semibold text-sm transition-colors whitespace-nowrap ${activeTab === 'siswa' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
                Rencana Tindak Lanjut
              </button>
            </div>

            {activeTab === 'dashboard' && (
              <ChartsDashboard analysisResult={analysisResult} kkm={kkm} />
            )}
            
            {activeTab === 'ringkasan' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h3 className="font-bold mb-4">Statistik Kelas</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="p-4 bg-slate-50 rounded-lg">Rata-rata: <span className="font-bold">{analysisResult.classStats.mean}</span></div>
                    <div className="p-4 bg-slate-50 rounded-lg">Nilai Max: <span className="font-bold">{analysisResult.classStats.max}</span></div>
                    <div className="p-4 bg-slate-50 rounded-lg">Nilai Min: <span className="font-bold">{analysisResult.classStats.min}</span></div>
                    <div className="p-4 bg-slate-50 rounded-lg">Tuntas: <span className="font-bold">{analysisResult.summary.tuntas}</span></div>
                  </div>
                </div>

                <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-2xl">
                  <h3 className="font-bold mb-2">Kesimpulan Umum</h3>
                  <p className="text-sm leading-relaxed">{analysisResult.summary.narrative}</p>
                </div>
              </div>
            )}

            {activeTab === 'butir' && (

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <h3 className="font-bold mb-4">Tabel Analisis Butir Soal</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b">
                    <tr>
                      <th className="px-4 py-3">No Soal</th>
                      <th className="px-4 py-3">Tkt Kesukaran (P)</th>
                      <th className="px-4 py-3">Daya Beda (D)</th>
                      <th className="px-4 py-3">Validitas</th>
                      <th className="px-4 py-3">Distribusi Jawaban Pengecoh</th>
                      <th className="px-4 py-3 text-right">Keputusan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysisResult.analyzedData.map((item: any, idx: number) => (
                      <tr key={idx} className="border-b hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-900">{item.id}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-700">{item.p.toFixed(2)}</div>
                          <div className="text-[11px] text-slate-500 uppercase tracking-wide">{item.pCat}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-700">{item.d.toFixed(2)}</div>
                          <div className="text-[11px] text-slate-500 uppercase tracking-wide">{item.dCat}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide uppercase shadow-sm ${item.valStatus === 'Valid' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-rose-100 text-rose-700 border border-rose-200'}`}>
                            {item.validity.toFixed(2)} - {item.valStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {item.distractorData ? (
                            <div className="flex gap-1.5">
                              {Object.entries(item.distractorData).map(([opt, data]: any) => {
                                let colorClass = ''
                                if (opt === 'A') colorClass = data.isKey ? 'bg-rose-500 border-rose-600 text-white font-bold' : 'bg-rose-50 border-rose-200 text-rose-700'
                                else if (opt === 'B') colorClass = data.isKey ? 'bg-blue-500 border-blue-600 text-white font-bold' : 'bg-blue-50 border-blue-200 text-blue-700'
                                else if (opt === 'C') colorClass = data.isKey ? 'bg-violet-500 border-violet-600 text-white font-bold' : 'bg-violet-50 border-violet-200 text-violet-700'
                                else if (opt === 'D') colorClass = data.isKey ? 'bg-amber-500 border-amber-600 text-white font-bold' : 'bg-amber-50 border-amber-200 text-amber-700'
                                else if (opt === 'E') colorClass = data.isKey ? 'bg-teal-500 border-teal-600 text-white font-bold' : 'bg-teal-50 border-teal-200 text-teal-700'
                                else colorClass = data.isKey ? 'bg-emerald-500 border-emerald-600 text-white font-bold' : 'bg-slate-100 border-slate-200 text-slate-600'
                                
                                return (
                                  <div key={opt} title={`${data.count} siswa memilih ${opt}`} className={`flex flex-col items-center justify-center w-8 h-10 rounded shadow-sm text-[10px] border ${colorClass} ${!data.isKey && !data.isEffective ? 'opacity-50' : ''}`}>
                                    <span className={`w-full text-center pb-0.5 border-b ${data.isKey ? 'border-white/30 font-black' : 'border-black/10 font-bold'}`}>{opt}</span>
                                    <span className="pt-0.5 font-medium">{data.pct}%</span>
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs italic">N/A</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide uppercase shadow-sm ${item.decision === 'Dipakai' ? 'bg-blue-100 text-blue-700 border border-blue-200' : item.decision === 'Revisi' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-slate-200 text-slate-600 border border-slate-300'}`}>
                            {item.decision}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            )}

            {activeTab === 'siswa' && (() => {
              const remedial = analysisResult.studentData.filter((s: any) => s.status !== 'Tuntas')
              const pengayaan = analysisResult.studentData.filter((s: any) => s.status === 'Tuntas')
              return (
                <div className="space-y-4">
                  {/* Header info */}
                  <div className="flex items-center justify-between text-sm text-slate-500 mb-2">
                    <span>KKM: <span className="font-bold text-slate-700">{kkm}</span></span>
                    <span>Total {analysisResult.studentData.length} siswa</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* ── Panel Remedial ── */}
                    <div className="rounded-2xl border border-rose-200 bg-rose-50/40 overflow-hidden">
                      <div className="flex items-center justify-between px-5 py-4 border-b border-rose-200">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"/>
                          <span className="font-bold text-rose-700 text-sm">Peserta Remedial</span>
                        </div>
                        <span className="text-[11px] font-bold text-rose-700 bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-full">
                          &lt; {kkm}
                        </span>
                      </div>
                      <div className="px-5 py-3 border-b border-rose-100 bg-rose-50/60">
                        <p className="text-xs text-slate-600 leading-relaxed">
                          <span className="font-semibold">Rencana Tindak Lanjut:</span> Pembelajaran ulang secara klasikal untuk materi yang sulit, dilanjutkan dengan tes perbaikan.
                        </p>
                      </div>
                      <div className="divide-y divide-rose-100 max-h-80 overflow-y-auto">
                        {remedial.length > 0 ? remedial.map((s: any, i: number) => (
                          <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-rose-50 transition-colors">
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-slate-400 w-5 text-right">{i + 1}.</span>
                              <span className="text-sm font-medium text-slate-800">{s.id}</span>
                            </div>
                            <span className="text-sm font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-lg">
                              {s.finalScore.toFixed(1)}
                            </span>
                          </div>
                        )) : (
                          <div className="py-8 text-center text-sm text-emerald-600 bg-emerald-50/60 font-medium mx-4 my-4 rounded-xl border border-emerald-200">
                            Tidak ada peserta yang perlu remedial. 🎉
                          </div>
                        )}
                      </div>
                      <div className="px-5 py-2 bg-rose-100/50 border-t border-rose-200">
                        <p className="text-xs text-rose-600 font-semibold">{remedial.length} siswa</p>
                      </div>
                    </div>

                    {/* ── Panel Pengayaan ── */}
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 overflow-hidden">
                      <div className="flex items-center justify-between px-5 py-4 border-b border-emerald-200">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"/>
                          <span className="font-bold text-emerald-700 text-sm">Peserta Pengayaan</span>
                        </div>
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-full">
                          ≥ {kkm}
                        </span>
                      </div>
                      <div className="px-5 py-3 border-b border-emerald-100 bg-emerald-50/60">
                        <p className="text-xs text-slate-600 leading-relaxed">
                          <span className="font-semibold">Rencana Tindak Lanjut:</span> Pemberian tugas mandiri, proyek analisis (HOTS), atau bertindak sebagai tutor sebaya.
                        </p>
                      </div>
                      <div className="divide-y divide-emerald-100 max-h-80 overflow-y-auto">
                        {pengayaan.length > 0 ? pengayaan.map((s: any, i: number) => (
                          <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-emerald-50 transition-colors">
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-slate-400 w-5 text-right">{i + 1}.</span>
                              <span className="text-sm font-medium text-slate-800">{s.id}</span>
                            </div>
                            <span className="text-sm font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg">
                              {s.finalScore.toFixed(1)}
                            </span>
                          </div>
                        )) : (
                          <div className="py-8 text-center text-sm text-rose-500 bg-rose-50/60 font-medium mx-4 my-4 rounded-xl border border-rose-200">
                            Belum ada peserta yang mencapai batas ketuntasan.
                          </div>
                        )}
                      </div>
                      <div className="px-5 py-2 bg-emerald-100/50 border-t border-emerald-200">
                        <p className="text-xs text-emerald-600 font-semibold">{pengayaan.length} siswa</p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}

            <button onClick={() => setAnalysisResult(null)} className="text-blue-600 font-semibold text-sm hover:underline">
              Ulangi Analisis
            </button>
          </div>
        )}
      </div>

      {/* Success Modal Keren */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
              <div className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/40">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">Sukses!</h3>
            <p className="text-slate-500 font-medium mb-8 leading-relaxed">Data analisis Anda telah berhasil diamankan ke Cloud Database.</p>
            <div className="flex items-center justify-center gap-2 text-sm text-emerald-700 font-bold bg-emerald-50 border border-emerald-100 px-5 py-3 rounded-xl w-full">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Mengalihkan ke Dashboard...
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
