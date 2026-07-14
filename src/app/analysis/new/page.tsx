'use client'

import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { analyzeData } from '@/lib/analyzer'
import { Upload, Save, ArrowLeft, BarChart2, BookOpen, X } from 'lucide-react'
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
  const [showGuide, setShowGuide] = useState(false)
  
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
        
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <h1 className="text-2xl font-bold">Buat Analisis Baru</h1>
          <button 
            onClick={() => setShowGuide(true)} 
            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 font-bold text-sm transition-colors border border-indigo-200 shadow-sm"
          >
            <BookOpen className="w-4 h-4" /> Panduan Analisis
          </button>
        </div>

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
                              <span className="text-sm font-medium text-slate-800">{s.name}</span>
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
                              <span className="text-sm font-medium text-slate-800">{s.name}</span>
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

      {/* Guide Modal Keren */}
      {showGuide && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header Modal */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Panduan Analisis Butir Soal</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Petunjuk praktis membaca hasil analisis</p>
                </div>
              </div>
              <button 
                onClick={() => setShowGuide(false)}
                className="w-10 h-10 hover:bg-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Modal */}
            <div className="p-6 md:p-8 overflow-y-auto bg-slate-50/50">
              <div className="space-y-8 max-w-3xl mx-auto">
                
                {/* Bagian 1 */}
                <section className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                    <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm">1</span> 
                    Tingkat Kesukaran (P)
                  </h3>
                  <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <p className="text-sm text-slate-700"><strong>Apa yang diukur?</strong> Menunjukkan seberapa mudah atau sulit suatu soal berdasarkan jawaban siswa.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                        <p className="text-xs font-bold text-blue-800 mb-2">Pilihan Ganda</p>
                        <p className="text-sm font-mono text-blue-900 font-semibold bg-white px-3 py-2 rounded-lg shadow-sm border border-blue-100 text-center">P = ∑ Benar ÷ ∑ Siswa</p>
                      </div>
                      <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                        <p className="text-xs font-bold text-emerald-800 mb-2">Soal Uraian</p>
                        <p className="text-sm font-mono text-emerald-900 font-semibold bg-white px-3 py-2 rounded-lg shadow-sm border border-emerald-100 text-center">P = Rata-rata Skor ÷ Skor Maks</p>
                      </div>
                    </div>
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      <table className="w-full text-sm text-left text-slate-600">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                          <tr><th className="px-4 py-3">Nilai P</th><th className="px-4 py-3">Kategori</th><th className="px-4 py-3">Tindakan</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          <tr className="bg-white"><td className="px-4 py-3 font-medium">0,00 – 0,30</td><td className="px-4 py-3"><span className="text-red-600 font-bold">Sukar</span></td><td className="px-4 py-3">Periksa apakah soal terlalu sulit atau materi belum diajarkan dengan baik.</td></tr>
                          <tr className="bg-slate-50/50"><td className="px-4 py-3 font-medium">0,31 – 0,70</td><td className="px-4 py-3"><span className="text-emerald-600 font-bold">Sedang</span></td><td className="px-4 py-3">Soal sudah baik dan ideal digunakan.</td></tr>
                          <tr className="bg-white"><td className="px-4 py-3 font-medium">0,71 – 1,00</td><td className="px-4 py-3"><span className="text-blue-600 font-bold">Mudah</span></td><td className="px-4 py-3">Soal terlalu mudah. Pertimbangkan tingkatkan berpikir siswa.</td></tr>
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-slate-500 bg-amber-50 border border-amber-200 px-4 py-3 rounded-xl"><strong>💡 Catatan:</strong> Tes yang baik sebaiknya didominasi oleh soal berkategori <strong>sedang</strong>.</p>
                  </div>
                </section>

                {/* Bagian 2 */}
                <section className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                    <span className="w-7 h-7 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-sm">2</span> 
                    Daya Pembeda (D)
                  </h3>
                  <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <p className="text-sm text-slate-700 mb-2"><strong>Apa yang diukur?</strong> Menunjukkan kemampuan soal dalam membedakan siswa yang menguasai materi dengan yang belum menguasai.</p>
                      <ul className="text-sm text-slate-600 list-disc list-inside">
                        <li><strong>Kelompok Atas</strong> = 27% siswa nilai tertinggi.</li>
                        <li><strong>Kelompok Bawah</strong> = 27% siswa nilai terendah.</li>
                      </ul>
                    </div>
                    <div className="bg-violet-50/50 p-4 rounded-xl border border-violet-100 text-center">
                      <p className="text-sm font-mono text-violet-900 font-semibold bg-white px-3 py-2 rounded-lg shadow-sm border border-violet-100 inline-block">D = (Rata² Atas − Rata² Bawah) ÷ Skor Maks</p>
                    </div>
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      <table className="w-full text-sm text-left text-slate-600">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                          <tr><th className="px-4 py-3">Nilai D</th><th className="px-4 py-3">Kategori</th><th className="px-4 py-3">Rekomendasi</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          <tr className="bg-white"><td className="px-4 py-3 font-medium">≥ 0,40</td><td className="px-4 py-3"><span className="text-emerald-600 font-bold whitespace-nowrap">Sangat Baik</span></td><td className="px-4 py-3">Pertahankan. Sangat efektif membedakan kemampuan.</td></tr>
                          <tr className="bg-slate-50/50"><td className="px-4 py-3 font-medium">0,30 – 0,39</td><td className="px-4 py-3"><span className="text-blue-600 font-bold whitespace-nowrap">Baik</span></td><td className="px-4 py-3">Layak digunakan kembali.</td></tr>
                          <tr className="bg-white"><td className="px-4 py-3 font-medium">0,20 – 0,29</td><td className="px-4 py-3"><span className="text-amber-600 font-bold whitespace-nowrap">Cukup</span></td><td className="px-4 py-3">Sebaiknya direvisi agar lebih baik.</td></tr>
                          <tr className="bg-slate-50/50"><td className="px-4 py-3 font-medium">&lt; 0,20</td><td className="px-4 py-3"><span className="text-rose-600 font-bold whitespace-nowrap">Jelek</span></td><td className="px-4 py-3">Perlu direvisi besar atau diganti.</td></tr>
                          <tr className="bg-rose-50"><td className="px-4 py-3 font-medium text-rose-700">Negatif</td><td className="px-4 py-3"><span className="text-rose-700 font-bold">Sangat Bermasalah</span></td><td className="px-4 py-3 text-rose-700">Periksa kunci jawaban! Siswa pintar justru banyak menjawab salah.</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>

                {/* Bagian 3 & 4 (Grid) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Validitas */}
                  <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                      <span className="w-7 h-7 rounded-full bg-fuchsia-100 text-fuchsia-600 flex items-center justify-center text-sm">3</span> 
                      Validitas Butir
                    </h3>
                    <p className="text-sm text-slate-600 mb-4">Mengukur apakah suatu soal benar-benar mengukur kompetensi yang dituju (Korelasi Pearson).</p>
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      <table className="w-full text-sm text-left text-slate-600">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                          <tr><th className="px-3 py-2">Nilai r</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Ket</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          <tr className="bg-white"><td className="px-3 py-2 font-medium">≥ 0,25</td><td className="px-3 py-2"><span className="text-emerald-600 font-bold">Valid</span></td><td className="px-3 py-2">Layak pakai</td></tr>
                          <tr className="bg-slate-50"><td className="px-3 py-2 font-medium">&lt; 0,25</td><td className="px-3 py-2"><span className="text-rose-600 font-bold">Tdk Valid</span></td><td className="px-3 py-2">Perlu diganti</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </section>

                  {/* Reliabilitas */}
                  <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                      <span className="w-7 h-7 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center text-sm">4</span> 
                      Reliabilitas Tes
                    </h3>
                    <p className="text-sm text-slate-600 mb-4">Menunjukkan tingkat konsistensi seluruh soal dalam satu tes (Cronbach's Alpha).</p>
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      <table className="w-full text-sm text-left text-slate-600">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                          <tr><th className="px-3 py-2">Alpha</th><th className="px-3 py-2">Kategori</th><th className="px-3 py-2">Ket</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          <tr className="bg-white"><td className="px-3 py-2 font-medium">≥ 0,70</td><td className="px-3 py-2"><span className="text-emerald-600 font-bold">Tinggi</span></td><td className="px-3 py-2">Sangat konsisten</td></tr>
                          <tr className="bg-slate-50"><td className="px-3 py-2 font-medium">0,40 - 0,69</td><td className="px-3 py-2"><span className="text-amber-600 font-bold">Sedang</span></td><td className="px-3 py-2">Cukup baik</td></tr>
                          <tr className="bg-white"><td className="px-3 py-2 font-medium">&lt; 0,40</td><td className="px-3 py-2"><span className="text-rose-600 font-bold">Rendah</span></td><td className="px-3 py-2">Perlu perbaikan</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </section>
                </div>

                {/* Bagian 5 */}
                <section className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                    <span className="w-7 h-7 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-sm">5</span> 
                    Analisis Pengecoh
                  </h3>
                  <p className="text-sm text-slate-600 mb-4">Menilai apakah pilihan jawaban yang salah (A, B, C, D, atau E) benar-benar mampu mengecoh siswa. Pengecoh yang baik sebaiknya dipilih oleh <strong>minimal 5% peserta</strong>.</p>
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full text-sm text-left text-slate-600">
                      <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                        <tr><th className="px-4 py-3">Kondisi</th><th className="px-4 py-3">Interpretasi</th><th className="px-4 py-3">Tindakan</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr className="bg-white"><td className="px-4 py-3 font-medium">Dipilih ≥ 5% siswa</td><td className="px-4 py-3"><span className="text-emerald-600 font-bold">Berfungsi</span></td><td className="px-4 py-3">Pertahankan.</td></tr>
                        <tr className="bg-slate-50/50"><td className="px-4 py-3 font-medium">Dipilih &lt; 5% siswa</td><td className="px-4 py-3"><span className="text-amber-600 font-bold">Kurang Berfungsi</span></td><td className="px-4 py-3">Pertimbangkan revisi opsi.</td></tr>
                        <tr className="bg-white"><td className="px-4 py-3 font-medium">Dipilih 0% siswa</td><td className="px-4 py-3"><span className="text-rose-600 font-bold">Tidak Berfungsi</span></td><td className="px-4 py-3">Ganti pengecoh dengan pilihan yang lebih meyakinkan.</td></tr>
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* Bagian 6 */}
                <section className="bg-slate-800 p-6 md:p-8 rounded-2xl shadow-lg border border-slate-700 text-white">
                  <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
                    🎯 Rekomendasi Pengambilan Keputusan
                  </h3>
                  <div className="space-y-3">
                    <div className="flex gap-4 p-4 rounded-xl bg-slate-700/50 border border-slate-600 items-start">
                      <span className="text-xl">✅</span>
                      <div>
                        <p className="font-bold text-emerald-400 mb-1">Pertahankan soal</p>
                        <p className="text-sm text-slate-300">Tingkat kesukaran sedang, daya pembeda baik, valid, dan pengecoh berfungsi.</p>
                      </div>
                    </div>
                    <div className="flex gap-4 p-4 rounded-xl bg-slate-700/50 border border-slate-600 items-start">
                      <span className="text-xl">⚠️</span>
                      <div>
                        <p className="font-bold text-amber-400 mb-1">Revisi seperlunya</p>
                        <p className="text-sm text-slate-300">Tingkat kesukaran terlalu mudah/sukar, tetapi daya pembeda masih baik.</p>
                      </div>
                    </div>
                    <div className="flex gap-4 p-4 rounded-xl bg-slate-700/50 border border-slate-600 items-start">
                      <span className="text-xl">🛠️</span>
                      <div>
                        <p className="font-bold text-orange-400 mb-1">Perbaiki sebelum digunakan kembali</p>
                        <p className="text-sm text-slate-300">Daya pembeda rendah, validitas rendah, atau pengecoh tidak berfungsi.</p>
                      </div>
                    </div>
                    <div className="flex gap-4 p-4 rounded-xl bg-rose-900/40 border border-rose-800 items-start">
                      <span className="text-xl">🚫</span>
                      <div>
                        <p className="font-bold text-rose-400 mb-1">Jangan digunakan</p>
                        <p className="text-sm text-rose-200">Daya pembeda negatif. Periksa ulang kunci jawaban, redaksi, atau kemungkinan kesalahan soal!</p>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
            
            {/* Footer Modal */}
            <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end">
              <button 
                onClick={() => setShowGuide(false)}
                className="px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-sm"
              >
                Tutup Panduan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
