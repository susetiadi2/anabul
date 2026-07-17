/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useRef, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { analyzeData } from '@/lib/analyzer'
import { Upload, Save, ArrowLeft, BarChart2, BookOpen, X, Printer, DownloadCloud, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import ChartsDashboard from '@/components/ChartsDashboard'
import { set as idbSet, get as idbGet } from 'idb-keyval'

export default function NewAnalysisPage() {
  const [file, setFile] = useState<File | null>(null)
  const [examType, setExamType] = useState('pg_huruf')
  const [kkm, setKkm] = useState<number | string>(75)
  const [error, setError] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('ringkasan')
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showGuide, setShowGuide] = useState(false)

  // Baca viewId langsung dari URL saat pertama kali render (lazy initializer)
  const [viewId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('viewId');
    }
    return null;
  })
  const isViewMode = !!viewId;

  const today = new Date().toISOString().split('T')[0];
  const [identity, setIdentity] = useState({ 
    mataPelajaran: 'Pendidikan Agama dan Budi Pekerti', mataPelajaranLain: '', 
    tingkatKelas: 'Kelas 7', rombel: '', semester: 'Ganjil', 
    jenisAsesmen: 'Asesmen Formatif (UH)', 
    guru: '', nip: '', sekolah: '',
    kepalaSekolah: '', nipKepalaSekolah: '',
    tahunPelajaran: '2025/2026', tanggalPelaksanaan: today, materiPokok: ''
  })
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const router = useRouter()

  // Fetch profil guru dari Supabase
  useEffect(() => {
    async function fetchProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('user_profiles').select('*').eq('id', user.id).single()
        if (profile) {
          let headmasterName = '';
          let headmasterNip = '';
          if (profile.school_name) {
            const { data: school } = await supabase.from('schools').select('headmaster_name, headmaster_nip').eq('name', profile.school_name).maybeSingle()
            if (school) {
              headmasterName = school.headmaster_name || '';
              headmasterNip = school.headmaster_nip || '';
            }
          }
          
          setIdentity(prev => ({
            ...prev,
            guru: profile.name || '',
            nip: profile.nip || '',
            sekolah: profile.school_name || '',
            kepalaSekolah: headmasterName,
            nipKepalaSekolah: headmasterNip
          }))
        }
      }
    }
    fetchProfile()
  }, [supabase])

  // Load data dari IndexedDB jika ada viewId (mode Viewer)
  useEffect(() => {
    if (!viewId) return;
    const loadFromIdb = async () => {
      try {
        const data = await idbGet(`analysis_${viewId}`);
        if (data) {
          setAnalysisResult(data);
          if (data.identity) {
            setIdentity(prev => ({ ...prev, ...data.identity }));
          }
          setActiveTab('ringkasan');
        } else {
          setError("Data laporan lengkap tidak ditemukan di perangkat ini. Data detail masif hanya tersimpan secara permanen di perangkat lokal (laptop/browser) saat analisis pertama kali dibuat.");
        }
      } catch (err) {
        console.error(err);
        setError("Gagal memuat data dari penyimpanan lokal.");
      }
    }
    loadFromIdb();
  }, [viewId])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError('')
    }
  }

  const handleKkmBlur = () => {
    let val = Number(kkm);
    if (isNaN(val) || kkm === '') val = 75;
    if (val < 0) val = 0;
    if (val > 100) val = 100;
    setKkm(val);
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
        
        const aoa = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], { header: 1 }) as unknown[][]
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

        const result = analyzeData(jsonData, examType, Number(kkm) || 75) as any
        result.identity = identity // Inject identity into result to save it later
        setAnalysisResult(result)
        setIsProcessing(false)
      } catch (err: unknown) { 
        console.error(err)
        let errorMsg = err instanceof Error ? err.message : 'Gagal membaca file. Pastikan format valid.'
        
        if (errorMsg.includes("is not a function") || errorMsg.includes("read") || errorMsg.includes("sheet_to_json")) {
            errorMsg = "FILE RUSAK / BUKAN EXCEL: Pastikan Anda mengunggah file berekstensi .xlsx atau .csv yang valid dan tidak *corrupt*."
        }

        setError(errorMsg)
        setIsProcessing(false)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const downloadTemplate = () => {
    // ── 1. PG (A-E): Pilihan Ganda Huruf ──
    const dataPG_Huruf = [
      ['No', 'Nama Siswa', '1', '2', '3', '4', '5'],
      ['', 'Kunci Jawaban', 'A', 'B', 'C', 'D', 'E'],
      [1, 'Budi Santoso', 'A', 'B', 'C', 'D', 'E'],
      [2, 'Siti Aminah', 'A', 'C', 'B', 'D', 'A'],
      [3, 'Ahmad Fauzi', 'B', 'B', 'C', 'A', 'E']
    ];

    // ── 2. PG (0/1): Pilihan Ganda Dikotomi ──
    const dataPG_Dikotomi = [
      ['No', 'Nama Siswa', '1', '2', '3', '4', '5'],
      ['', 'Kunci Jawaban', 1, 1, 1, 1, 1],
      [1, 'Budi Santoso', 1, 1, 0, 1, 0],
      [2, 'Siti Aminah', 1, 0, 1, 0, 1],
      [3, 'Ahmad Fauzi', 0, 1, 1, 1, 0]
    ];

    // ── 3. Benar/Salah ──
    const dataBS = [
      ['No', 'Nama Siswa', '1', '2', '3', '4', '5'],
      ['', 'Kunci Jawaban', 'B', 'S', 'B', 'S', 'B'],
      [1, 'Budi Santoso', 'B', 'S', 'B', 'S', 'B'],
      [2, 'Siti Aminah', 'B', 'B', 'S', 'S', 'B'],
      [3, 'Ahmad Fauzi', 'S', 'S', 'B', 'B', 'S']
    ];

    // ── 4. Uraian ──
    const dataUraian = [
      ['No', 'Nama Siswa', '1', '2', '3', '4', '5'],
      ['', 'Skor Maksimal', 10, 20, 20, 25, 25],
      [1, 'Budi Santoso', 8, 15, 20, 20, 25],
      [2, 'Siti Aminah', 10, 18, 15, 25, 20],
      [3, 'Ahmad Fauzi', 7, 12, 18, 22, 15]
    ];

    // ── 5. Campuran (PG + Uraian) ──
    const dataCampuran = [
      ['No', 'Nama Siswa', '1', '2', '3', '4', '5'],
      ['', 'Kunci Jawaban', 'A', 'B', 'C', '', ''],
      ['', 'Skor Maksimal', 1, 1, 1, 20, 30],
      [1, 'Budi Santoso', 'A', 'B', 'C', 18, 25],
      [2, 'Siti Aminah', 'A', 'A', 'C', 20, 28],
      [3, 'Ahmad Fauzi', 'B', 'B', 'A', 15, 22]
    ];

    const wb = XLSX.utils.book_new();
    const wscols = [{ wch: 5 }, { wch: 25 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }];

    const sheets = [
      { data: dataPG_Huruf, name: 'PG (A-E)' },
      { data: dataPG_Dikotomi, name: 'PG Dikotomi (0-1)' },
      { data: dataBS, name: 'Benar-Salah' },
      { data: dataUraian, name: 'Uraian' },
      { data: dataCampuran, name: 'Campuran (PG+Uraian)' }
    ];

    sheets.forEach(({ data, name }) => {
      const ws = XLSX.utils.aoa_to_sheet(data);
      ws['!cols'] = wscols;
      XLSX.utils.book_append_sheet(wb, ws, name);
    });

    XLSX.writeFile(wb, "Template_Jawaban_AnasolApp.xlsx");
  };

  const saveToCloud = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Anda harus login terlebih dahulu")

      // 1. Ekstrak hanya metrik dan kesimpulan untuk Supabase (Sangat Ringan)
      const hybridPayload = {
        summary: analysisResult.summary,
        metadata: {
          totalSiswa: analysisResult.studentData?.length || 0,
          totalSoal: analysisResult.analyzedData?.length || 0,
          soalValid: analysisResult.analyzedData?.filter((d: any) => d.valStatus === 'Valid').length || 0,
          soalSukar: analysisResult.analyzedData?.filter((d: any) => d.pCat === 'Sukar').length || 0,
          soalRevisi: analysisResult.analyzedData?.filter((d: any) => ['Revisi', 'Dibuang', 'Gugur'].includes(d.decision)).length || 0
        }
      }

      // 2. Simpan Metadata ke Supabase (Database Utama)
      // Gunakan nama sekolah dari input Identitas (yang bisa diubah pengguna)
      const { data: insertedSession, error } = await supabase.from('analysis_sessions').insert({
        user_id: user.id,
        name: file?.name || 'Analisis Baru',
        exam_type: examType,
        kkm: kkm,
        school_name: identity.sekolah || 'Tidak Diketahui',
        data_payload: hybridPayload // Hanya menyimpan metadata
      }).select('id').single()

      if (error) throw error
      
      // 3. Simpan Data Penuh (Ribuan baris) ke IndexedDB (Lokal Laptop Guru)
      if (insertedSession?.id) {
        await idbSet(`analysis_${insertedSession.id}`, analysisResult)
      }
      
      setShowSuccessModal(true)
      setTimeout(() => {
        router.push('/')
      }, 2500)
    } catch (err: any) {
      alert("Gagal menyimpan: " + err.message + "\n\nPastikan koneksi internet Anda stabil.")
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 sm:p-6 md:p-8">
      <div className={`w-full mx-auto transition-all duration-300 ${!analysisResult ? 'max-w-4xl' : 'max-w-[98%]'}`}>
        <Link href="/" className="inline-flex items-center text-blue-600 font-semibold mb-6 hover:underline print:hidden">
          <ArrowLeft className="w-4 h-4 mr-1" /> Kembali ke Dashboard
        </Link>
        
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8 print:hidden">
          <h1 className="text-2xl font-bold">
            {isViewMode ? 'Arsip Hasil Analisis' : (analysisResult ? 'Hasil Analisis Butir Soal' : 'Buat Analisis Baru')}
          </h1>
          <div className="flex items-center gap-2">
            {analysisResult && (
              <button 
                onClick={() => window.print()}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-700 font-bold text-sm transition-colors shadow-sm"
              >
                <Printer className="w-4 h-4" /> Cetak PDF
              </button>
            )}
            <button 
              onClick={() => setShowGuide(true)} 
              className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 font-bold text-sm transition-colors border border-indigo-200 shadow-sm"
            >
              <BookOpen className="w-4 h-4" /> Panduan Analisis
            </button>
          </div>
        </div>

        {!analysisResult ? (
          isViewMode ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
              {error ? (
                <div className="text-rose-600">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="font-bold">{error}</p>
                  <Link href="/" className="mt-4 inline-block px-4 py-2 bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200 font-semibold transition-colors">Kembali ke Dashboard</Link>
                </div>
              ) : (
                <div className="text-slate-500 animate-pulse">
                  <div className="w-12 h-12 mx-auto mb-4 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                  <p className="font-semibold text-lg">Memuat arsip laporan...</p>
                </div>
              )}
            </div>
          ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <div className="mb-6 bg-slate-50 p-6 rounded-xl border border-slate-200">
              <h3 className="font-bold text-slate-800 mb-4">Identitas Laporan (Untuk Cetak)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Jenis Asesmen</label>
                  <select value={identity.jenisAsesmen} onChange={e => setIdentity({...identity, jenisAsesmen: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm bg-white">
                    <option value="Asesmen Formatif (UH)">Asesmen Formatif (UH)</option>
                    <option value="Asesmen Sumatif Tengah Semester">Sumatif Tengah Semester</option>
                    <option value="Asesmen Sumatif Akhir Semester">Sumatif Akhir Semester</option>
                    <option value="Ujian Sekolah / Madrasah">Ujian Sekolah / Madrasah</option>
                    <option value="Try Out">Try Out</option>
                    <option value="Latihan Soal">Latihan Soal</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Mata Pelajaran</label>
                  <select value={identity.mataPelajaran} onChange={e => setIdentity({...identity, mataPelajaran: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm bg-white">
                    <option value="Pendidikan Agama dan Budi Pekerti">Pendidikan Agama</option>
                    <option value="Pendidikan Pancasila (PPKn)">Pendidikan Pancasila (PPKn)</option>
                    <option value="Bahasa Indonesia">Bahasa Indonesia</option>
                    <option value="Matematika">Matematika</option>
                    <option value="Ilmu Pengetahuan Alam (IPA)">Ilmu Pengetahuan Alam (IPA)</option>
                    <option value="Ilmu Pengetahuan Sosial (IPS)">Ilmu Pengetahuan Sosial (IPS)</option>
                    <option value="Bahasa Inggris">Bahasa Inggris</option>
                    <option value="PJOK">PJOK</option>
                    <option value="Seni Budaya / Prakarya">Seni Budaya / Prakarya</option>
                    <option value="Informatika">Informatika</option>
                    <option value="Muatan Lokal">Muatan Lokal</option>
                    <option value="Lainnya">Lainnya...</option>
                  </select>
                  {identity.mataPelajaran === 'Lainnya' && (
                    <input type="text" value={identity.mataPelajaranLain} onChange={e => setIdentity({...identity, mataPelajaranLain: e.target.value})} placeholder="Ketik mapel..." className="w-full mt-2 px-4 py-2 border border-blue-300 rounded-lg text-sm bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Lingkup Materi / Topik</label>
                  <input type="text" value={identity.materiPokok} onChange={e => setIdentity({...identity, materiPokok: e.target.value})} placeholder="Contoh: Sistem Pencernaan" className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Kelas</label>
                    <select value={identity.tingkatKelas} onChange={e => setIdentity({...identity, tingkatKelas: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
                      {[...Array(12)].map((_, i) => (
                        <option key={i+1} value={`Kelas ${i+1}`}>Kelas {i+1}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Rombel</label>
                    <input type="text" value={identity.rombel} onChange={e => setIdentity({...identity, rombel: e.target.value})} placeholder="Contoh: 1-A" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                  </div>
                </div>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Semester</label>
                    <select value={identity.semester} onChange={e => setIdentity({...identity, semester: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm bg-white">
                      <option value="Ganjil">Ganjil</option>
                      <option value="Genap">Genap</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Thn. Pelajaran</label>
                    <select value={identity.tahunPelajaran} onChange={e => setIdentity({...identity, tahunPelajaran: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
                      <option value="2025/2026">2025/2026</option>
                      <option value="2026/2027">2026/2027</option>
                      <option value="2027/2028">2027/2028</option>
                      <option value="2028/2029">2028/2029</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Tanggal Pelaksanaan</label>
                  <input type="date" value={identity.tanggalPelaksanaan} onChange={e => setIdentity({...identity, tanggalPelaksanaan: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Kepala Sekolah</label>
                  <input type="text" value={identity.kepalaSekolah} onChange={e => setIdentity({...identity, kepalaSekolah: e.target.value})} placeholder="Nama Kepala Sekolah" className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm bg-white mb-2" />
                  <input type="text" value={identity.nipKepalaSekolah} onChange={e => setIdentity({...identity, nipKepalaSekolah: e.target.value})} placeholder="NIP Kepala Sekolah" className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm bg-white" />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-3 font-medium">*Nama Guru dan Sekolah akan otomatis diambil dari profil Anda saat dicetak.</p>
            </div>

            <div className="mb-6">
                <label className="block font-bold text-slate-800 mb-2">1. Pilih Jenis Instrumen</label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {['pg_huruf', 'pg', 'bs', 'uraian', 'campuran'].map(type => (
                        <button key={type} onClick={() => setExamType(type)} className={`py-3 px-2 rounded-xl text-xs font-bold border-2 transition-all ${examType === type ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-600'}`}>
                            {type === 'pg_huruf' ? 'PG (A-E)' : type === 'pg' ? 'PG (0/1)' : type === 'bs' ? 'Benar/Salah' : type === 'uraian' ? 'Uraian' : 'Campuran'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="mb-6">
              <label className="block font-bold text-slate-800 mb-1">2. Nilai KKTP</label>
              <p className="text-xs text-slate-500 mb-3 font-medium">Anda dapat mengganti angka KKTP ini sesuai dengan kebutuhan Anda.</p>
              <input 
                type="number" 
                min="0" max="100"
                value={kkm} 
                onChange={e => setKkm(e.target.value)} 
                onBlur={handleKkmBlur}
                className="w-32 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
              {kkm === '' && <p className="text-rose-500 text-xs mt-1 font-medium">Nilai KKTP wajib diisi (0-100)</p>}
            </div>

            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <label className="block font-bold text-slate-800">3. Upload File Excel</label>
                <button onClick={downloadTemplate} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 rounded-lg hover:bg-emerald-200 transition-colors shadow-sm border border-emerald-200">
                  <DownloadCloud className="w-4 h-4" /> Unduh Template
                </button>
              </div>
              <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-blue-300 bg-blue-50/50 rounded-xl py-10 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition-colors">
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv,.xlsx" className="hidden" />
                  {file ? <div className="font-bold text-blue-700">{file.name}</div> : <><Upload className="w-8 h-8 text-blue-400 mb-2" /> <span className="font-semibold text-slate-600">Klik untuk upload file</span></>}
              </div>
            </div>

            {error && (
              <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-xl mb-6 shadow-sm flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-rose-800 text-sm mb-1">Gagal Menganalisis File</h4>
                  <p className="text-sm text-rose-700 font-medium leading-relaxed">{error}</p>
                  <button onClick={downloadTemplate} className="mt-3 text-xs font-bold text-rose-600 hover:text-rose-800 underline underline-offset-2 flex items-center gap-1 transition-colors">
                    <DownloadCloud className="w-3 h-3" /> Unduh Template Resmi AnasolApp
                  </button>
                </div>
              </div>
            )}

            <button onClick={processFile} disabled={!file || isProcessing || kkm === ''} className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50">
              {isProcessing ? 'Memproses...' : 'Mulai Analisis'}
            </button>
          </div>
          )
        ) : (
          <div className="space-y-6">
            {/* Kop Surat (Tampil di Print dan Layar) */}
            <div className="bg-white border-b-4 border-slate-800 p-6 rounded-t-2xl md:p-8 text-center sm:text-left print:border-b-[6px] print:border-double print:border-black print:rounded-none print:shadow-none print:p-0 print:mb-8 print:block print:text-center print:pb-4">
              <h2 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-wide print:text-2xl print:mb-1">Laporan Analisis Butir Soal</h2>
              <h3 className="text-lg font-bold text-slate-700 uppercase mb-4 print:text-xl print:text-black print:mb-0">{identity.sekolah}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2 text-sm text-slate-800 border-t border-slate-200 pt-4 print:border-t-0 print:pt-6 print:text-left print:text-black">
                <div className="flex"><span className="w-36 font-semibold shrink-0">Mata Pelajaran</span><span className="mr-2">:</span>{identity.mataPelajaran === 'Lainnya' ? (identity.mataPelajaranLain || '-') : identity.mataPelajaran}</div>
                <div className="flex"><span className="w-36 font-semibold shrink-0">Jenis Asesmen</span><span className="mr-2">:</span>{identity.jenisAsesmen || '-'}</div>
                
                <div className="flex"><span className="w-36 font-semibold shrink-0">Lingkup Materi</span><span className="mr-2">:</span><span className="wrap-break-word">{identity.materiPokok || '-'}</span></div>
                <div className="flex"><span className="w-36 font-semibold shrink-0">Thn. Pelajaran</span><span className="mr-2">:</span>{identity.tahunPelajaran || '-'}</div>
                
                <div className="flex"><span className="w-36 font-semibold shrink-0">Kelas/Semester</span><span className="mr-2">:</span>{`${identity.tingkatKelas} ${identity.rombel ? identity.rombel + ' ' : ''}/ ${identity.semester}`}</div>
                <div className="flex"><span className="w-36 font-semibold shrink-0">Tgl. Pelaksanaan</span><span className="mr-2">:</span>{identity.tanggalPelaksanaan ? new Date(identity.tanggalPelaksanaan).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'}) : '-'}</div>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-6 rounded-2xl flex justify-between items-center print:hidden">
              <div>
                <h3 className="font-bold text-lg">Analisis Selesai!</h3>
                <p className="text-sm">Reliabilitas: {analysisResult.summary.reliability} - {analysisResult.summary.relCat}</p>
              </div>
              {!isViewMode && (
                <button onClick={saveToCloud} className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center hover:bg-emerald-700">
                  <Save className="w-4 h-4 mr-2" /> Simpan ke Database
                </button>
              )}
            </div>
            
            <div className="flex border-b border-slate-200 mb-6 mt-4 overflow-x-auto sticky top-0 z-40 bg-slate-50/95 backdrop-blur-md pt-2 rounded-t-xl shadow-sm print:hidden">
              <button onClick={() => setActiveTab('dashboard')} className={`flex items-center gap-1.5 px-6 py-3 font-semibold text-sm transition-colors whitespace-nowrap ${activeTab === 'dashboard' ? 'text-violet-600 border-b-2 border-violet-600' : 'text-slate-500 hover:text-slate-700'}`}>
                <BarChart2 className="w-4 h-4" /> Dashboard Grafik
              </button>
              <button onClick={() => setActiveTab('ringkasan')} className={`px-6 py-3 font-semibold text-sm transition-colors whitespace-nowrap ${activeTab === 'ringkasan' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
                Ringkasan & Statistik
              </button>
              <button onClick={() => setActiveTab('sebaran')} className={`px-6 py-3 font-semibold text-sm transition-colors whitespace-nowrap ${activeTab === 'sebaran' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
                Sebaran Nilai
              </button>
              <button onClick={() => setActiveTab('butir')} className={`px-6 py-3 font-semibold text-sm transition-colors whitespace-nowrap ${activeTab === 'butir' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
                Analisis Butir Soal
              </button>
              <button onClick={() => setActiveTab('siswa')} className={`px-6 py-3 font-semibold text-sm transition-colors whitespace-nowrap ${activeTab === 'siswa' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
                Rencana Tindak Lanjut
              </button>
            </div>

            {/* ── Ringkasan & Statistik: tampil di halaman 1 bersama Kop Surat ── */}
            <div className={`${activeTab === 'ringkasan' ? 'block' : 'hidden'} print:block print:mt-6`}>
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 print:border print:border-black print:rounded-none print:shadow-none">
                  <h3 className="font-bold mb-4 print:text-black print:border-b print:border-black print:pb-2">Statistik Kelas</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 print:flex print:gap-0 print:border print:border-black">
                    <div className="p-4 bg-slate-50 rounded-lg print:flex-1 print:p-2 print:border-r print:border-black print:rounded-none print:bg-white print:text-center print:text-xs">Rata-rata: <br className="hidden md:block"/><span className="font-bold text-lg print:text-base print:block">{analysisResult.classStats.mean}</span></div>
                    <div className="p-4 bg-slate-50 rounded-lg print:flex-1 print:p-2 print:border-r print:border-black print:rounded-none print:bg-white print:text-center print:text-xs">Simpangan Baku: <br className="hidden md:block"/><span className="font-bold text-lg print:text-base print:block">{analysisResult.classStats.sd}</span></div>
                    <div className="p-4 bg-slate-50 rounded-lg print:flex-1 print:p-2 print:border-r print:border-black print:rounded-none print:bg-white print:text-center print:text-xs">Nilai Max: <br className="hidden md:block"/><span className="font-bold text-lg print:text-base print:block">{analysisResult.classStats.max}</span></div>
                    <div className="p-4 bg-slate-50 rounded-lg print:flex-1 print:p-2 print:border-r print:border-black print:rounded-none print:bg-white print:text-center print:text-xs">Nilai Min: <br className="hidden md:block"/><span className="font-bold text-lg print:text-base print:block">{analysisResult.classStats.min}</span></div>
                    <div className="p-4 bg-slate-50 rounded-lg print:flex-1 print:p-2 print:rounded-none print:bg-white print:text-center print:text-xs">Siswa Tuntas: <br className="hidden md:block"/><span className="font-bold text-lg print:text-base print:block">{analysisResult.summary.tuntas} / {analysisResult.studentData.length}</span></div>
                  </div>
                  {/* Reliabilitas - hanya di print */}
                  <div className="hidden print:flex print:items-center print:gap-8 print:mt-4 print:pt-2 print:border-t print:border-slate-300 print:text-sm">
                    <div>Reliabilitas: <strong>{analysisResult.summary.reliability}</strong></div>
                    <div>Kategori: <strong>{analysisResult.summary.relCat}</strong></div>
                    <div>Soal Diterima: <strong>{analysisResult.summary.accepted} / {analysisResult.analyzedData.length} butir</strong></div>
                  </div>
                </div>

                <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-2xl print:border print:border-black print:rounded-none print:bg-white print:p-3">
                  <h3 className="font-bold mb-2 print:text-black print:border-b print:border-black print:pb-1 print:mb-2">Kesimpulan Umum</h3>
                  <p className="text-sm leading-relaxed print:text-xs print:leading-snug print:text-black">{analysisResult.summary.narrative}</p>
                </div>
              </div>
            </div>

            {/* ── Dashboard Grafik: mulai dari halaman 2 ── */}
            <div className={`transition-none print:break-before-page ${activeTab === 'dashboard' ? 'block' : 'overflow-hidden h-0 invisible absolute w-full left-0'} print:block! print:visible! print:h-auto! print:overflow-visible! print:static!`}>
              <ChartsDashboard analysisResult={analysisResult} kkm={Number(kkm)} />
            </div>


            <div className={`${activeTab === 'sebaran' ? 'block' : 'hidden'} print:block sebaran-print-section`}>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:border-none print:shadow-none print:p-0">
                <h3 className="font-bold mb-3 print:text-black print:text-base print:mb-2">Sebaran Jawaban &amp; Nilai Siswa</h3>
                <div className="overflow-x-auto print:overflow-visible">
                  <table className="w-full text-sm text-center border-collapse print:text-[9px] print:w-full">
                    <thead className="text-xs text-slate-700 bg-slate-50 border-b border-t shadow-sm print:bg-slate-100">
                      <tr>
                        <th className="w-12.5 min-w-12.5 px-2 py-4 border-x text-center sticky left-0 z-30 bg-slate-50 border-b border-slate-200 print:static print:left-auto print:w-auto print:px-1 print:py-1.5 print:bg-slate-100 print:border print:border-black" rowSpan={2}>No</th>
                        <th className="w-62.5 min-w-62.5 px-4 py-4 border-x text-left sticky left-12.5 z-30 bg-slate-50 border-b border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] print:static print:left-auto print:min-w-0 print:w-35 print:px-1 print:py-1.5 print:bg-slate-100 print:shadow-none print:border print:border-black" rowSpan={2}>Nama Siswa</th>
                        <th className="px-4 py-2 border-x border-b border-slate-200 bg-slate-100/50 print:px-1 print:py-1.5 print:bg-slate-100 print:border print:border-black print:font-bold" colSpan={analysisResult.analyzedData.length}>Nomor Soal</th>
                        <th className="w-25 min-w-25 px-4 py-4 border-x border-slate-200 bg-slate-50 sticky right-25 z-30 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)] border-b-2 print:static print:right-auto print:w-auto print:px-1 print:py-1.5 print:bg-slate-100 print:shadow-none print:border print:border-black" rowSpan={2}>Skor</th>
                        <th className="w-25 min-w-25 px-4 py-4 border-x border-slate-200 bg-slate-50 sticky right-0 z-30 border-b-2 print:static print:right-auto print:w-auto print:px-1 print:py-1.5 print:bg-slate-100 print:shadow-none print:border print:border-black" rowSpan={2}>Nilai</th>
                      </tr>
                      <tr>
                        {analysisResult.analyzedData.map((q: any) => (
                          <th key={q.id} className="w-11.25 min-w-11.25 max-w-11.25 py-2 border-x border-b border-slate-200 bg-slate-50 font-bold text-[11px] print:w-auto print:min-w-0 print:max-w-none print:px-0.5 print:py-1 print:text-[8px] print:bg-slate-100 print:border print:border-black">{q.id}</th>
                        ))}
                      </tr>
                      {/* Baris Kunci Jawaban / Max Skor */}
                      <tr className="bg-blue-50 border-b-2 border-blue-200 print:bg-blue-100">
                        <td colSpan={2} className="px-4 py-3 font-bold text-right border-x border-blue-200 text-blue-800 sticky left-0 z-30 bg-blue-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] print:static print:left-auto print:px-1 print:py-1 print:text-[8px] print:bg-blue-100 print:shadow-none print:border print:border-black print:text-center">
                          {examType === 'uraian' ? 'Skor Maks :' : (examType === 'campuran' ? 'Kunci/Maks :' : 'Kunci :')}
                        </td>
                        {analysisResult.analyzedData.map((q: any) => (
                          <td key={q.id} className="w-11.25 min-w-11.25 max-w-11.25 py-3 border-x border-blue-200 font-bold text-[12px] text-blue-700 bg-blue-50/80 print:w-auto print:min-w-0 print:px-0.5 print:py-1 print:text-[8px] print:bg-blue-50 print:border print:border-black">
                            {examType === 'uraian' ? q.maxScore : (examType === 'campuran' ? (q.keyAns || q.maxScore) : (q.keyAns || '-'))}
                          </td>
                        ))}
                        <td className="w-25 min-w-25 px-4 py-3 border-x border-blue-200 font-bold text-blue-800 bg-blue-50 sticky right-25 z-30 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)] text-center print:static print:right-auto print:px-1 print:py-1 print:text-[8px] print:shadow-none print:border print:border-black">-</td>
                        <td className="w-25 min-w-25 px-4 py-3 border-x border-blue-200 font-bold text-blue-800 bg-blue-50 sticky right-0 z-30 text-center print:static print:right-auto print:px-1 print:py-1 print:text-[8px] print:shadow-none print:border print:border-black">100</td>
                      </tr>
                    </thead>
                    <tbody>
                      {analysisResult.studentData.map((s: any, idx: number) => (
                        <tr key={idx} className="border-b hover:bg-slate-50 transition-colors group print:border-black">
                          <td className="w-12.5 min-w-12.5 px-2 py-2.5 border-x text-center text-slate-500 sticky left-0 z-10 bg-white group-hover:bg-slate-50 print:static print:left-auto print:px-0.5 print:py-0.5 print:text-[8px] print:border print:border-black print:bg-white">{idx + 1}</td>
                          <td className="w-62.5 min-w-62.5 px-4 py-2.5 border-x text-left font-medium text-slate-700 sticky left-12.5 z-10 bg-white group-hover:bg-slate-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] print:static print:left-auto print:min-w-0 print:w-auto print:px-1 print:py-0.5 print:text-[8px] print:shadow-none print:border print:border-black print:bg-white print:truncate print:max-w-32.5">{s.name}</td>
                          {analysisResult.analyzedData.map((q: any) => {
                            let ansVal = s.itemScores[`${q.id}_ans`]
                            let isCorrect = false
                            
                            if (examType === 'uraian' || (examType === 'campuran' && !q.keyAns)) {
                              ansVal = s.itemScores[q.id]
                              isCorrect = ansVal === q.maxScore
                            } else {
                              const keys = (q.keyAns || "").split(',').map((k: string) => k.trim())
                              isCorrect = keys.includes(ansVal)
                            }
                            
                            const cellColor = (examType === 'uraian' || (examType === 'campuran' && !q.keyAns)) 
                              ? (isCorrect ? 'text-emerald-700 font-bold bg-emerald-50/50' : 'text-slate-700 bg-white')
                              : (isCorrect ? 'text-emerald-700 font-bold bg-emerald-50' : 'text-rose-600 font-medium bg-rose-50')
                              
                            return (
                              <td key={q.id} className={`w-11.25 min-w-11.25 max-w-11.25 p-0 border-x align-middle print:w-auto print:min-w-0 print:border print:border-black print:text-[8px] ${cellColor}`}>
                                <div className="flex items-center justify-center w-full h-full min-h-9 print:min-h-0 print:h-auto print:p-0.5">
                                  {ansVal !== undefined && ansVal !== "" ? ansVal : '-'}
                                </div>
                              </td>
                            )
                          })}
                          <td className="w-25 min-w-25 px-4 py-2.5 border-x font-bold text-slate-600 bg-white group-hover:bg-slate-50 sticky right-25 z-10 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)] text-center print:static print:right-auto print:px-0.5 print:py-0.5 print:text-[8px] print:shadow-none print:border print:border-black print:bg-white">{s.rawScore}</td>
                          <td className="w-25 min-w-25 px-4 py-2.5 border-x font-bold bg-white group-hover:bg-slate-50 sticky right-0 z-10 text-center print:static print:right-auto print:px-0.5 print:py-0.5 print:text-[8px] print:shadow-none print:border print:border-black print:bg-white">
                            <span className={`px-2.5 py-1 rounded-md text-[13px] print:text-[8px] print:px-0 print:py-0 print:rounded-none print:font-bold ${s.finalScore >= kkm ? 'bg-emerald-100 text-emerald-800 print:bg-transparent print:text-black' : 'bg-rose-100 text-rose-800 print:bg-transparent print:text-black'}`}>
                              {s.finalScore}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className={`${activeTab === 'butir' ? 'block' : 'hidden'} print:block print:break-before-page`}>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:border-none print:shadow-none print:p-0">
              <h3 className="font-bold mb-4 print:text-black">Tabel Analisis Butir Soal</h3>
              <div className="overflow-x-auto relative">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b sticky top-15 z-30 shadow-sm">
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
            </div>

            <div className={`${activeTab === 'siswa' ? 'block' : 'hidden'} print:block print:break-before-page`}>
            {(() => {
              const remedial = analysisResult.studentData.filter((s: any) => s.status !== 'Tuntas')
              const pengayaan = analysisResult.studentData.filter((s: any) => s.status === 'Tuntas')
              
              // Soal yang perlu re-teaching: P < 0.3 (Sukar) ATAU validitas rendah DAN keputusan bukan "Dipakai"
              const soalReteaching = analysisResult.analyzedData.filter((item: any) =>
                item.pCat === 'Sukar' || (item.valStatus !== 'Valid' && item.decision !== 'Dipakai')
              )
              // Soal pengecoh bermasalah: ada pengecoh yang tidak efektif (pilihan ganda)
              const soalPengecohBuruk = analysisResult.analyzedData.filter((item: any) => {
                if (!item.distractorData) return false
                return Object.values(item.distractorData).some((d: any) => !d.isKey && !d.isEffective && d.count === 0)
              })

              return (
                <div className="space-y-4">
                  {/* Header info */}
                  <div className="flex items-center justify-between text-sm text-slate-500 mb-2">
                    <span>KKTP: <span className="font-bold text-slate-700">{kkm}</span></span>
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

                  {/* ── Panel Perbaikan Pembelajaran (Re-teaching) ── */}
                  {soalReteaching.length > 0 && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/40 overflow-hidden">
                      <div className="flex items-center justify-between px-5 py-4 border-b border-amber-200">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"/>
                          <span className="font-bold text-amber-800 text-sm">Perbaikan Pembelajaran (Re-teaching)</span>
                        </div>
                        <span className="text-[11px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-full">
                          {soalReteaching.length} Indikator
                        </span>
                      </div>
                      <div className="px-5 py-3 border-b border-amber-100 bg-amber-50/60">
                        <p className="text-xs text-slate-600 leading-relaxed">
                          <span className="font-semibold">Rekomendasi:</span> Materi pada butir soal di bawah ini belum dipahami oleh mayoritas kelas (tingkat kesukaran tinggi / validitas rendah). Guru disarankan melakukan <em>re-teaching</em> atau pengulangan materi sebelum evaluasi berikutnya.
                        </p>
                      </div>
                      <div className="divide-y divide-amber-100">
                        {soalReteaching.map((item: any, i: number) => (
                          <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-amber-50 transition-colors">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold text-amber-700 bg-amber-100 border border-amber-200 w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                                {item.id}
                              </span>
                              <div>
                                <span className="text-sm font-medium text-slate-800">Soal No. {item.id}</span>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${item.pCat === 'Sukar' ? 'bg-rose-100 text-rose-700' : item.pCat === 'Sedang' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                    {item.pCat} (P={item.p.toFixed(2)})
                                  </span>
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${item.valStatus === 'Valid' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                    {item.valStatus}
                                  </span>
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${item.decision === 'Dipakai' ? 'bg-blue-100 text-blue-700' : item.decision === 'Revisi' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'}`}>
                                    → {item.decision}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-xs text-slate-500">Daya Beda</div>
                              <div className={`text-sm font-bold ${item.d < 0.2 ? 'text-rose-600' : item.d < 0.3 ? 'text-amber-600' : 'text-emerald-600'}`}>{item.d.toFixed(2)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="px-5 py-2 bg-amber-100/50 border-t border-amber-200">
                        <p className="text-xs text-amber-700 font-semibold">
                          {soalReteaching.length} butir soal perlu ditindaklanjuti dalam pembelajaran
                        </p>
                      </div>
                    </div>
                  )}

                  {/* ── Panel Pengecoh Tidak Berfungsi ── */}
                  {soalPengecohBuruk.length > 0 && (
                    <div className="rounded-2xl border border-purple-200 bg-purple-50/30 overflow-hidden">
                      <div className="flex items-center justify-between px-5 py-4 border-b border-purple-200">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block"/>
                          <span className="font-bold text-purple-800 text-sm">Pengecoh Tidak Berfungsi (Revisi Soal)</span>
                        </div>
                        <span className="text-[11px] font-bold text-purple-700 bg-purple-100 border border-purple-200 px-2.5 py-1 rounded-full">
                          {soalPengecohBuruk.length} Soal
                        </span>
                      </div>
                      <div className="px-5 py-3 border-b border-purple-100 bg-purple-50/60">
                        <p className="text-xs text-slate-600 leading-relaxed">
                          <span className="font-semibold">Rekomendasi:</span> Pilihan jawaban (pengecoh) pada soal-soal berikut tidak ada yang memilih sama sekali (0%). Soal perlu direvisi agar seluruh opsi berfungsi sebagai pengganggu yang efektif.
                        </p>
                      </div>
                      <div className="divide-y divide-purple-100">
                        {soalPengecohBuruk.map((item: any, i: number) => {
                          const tidakEfektif = Object.entries(item.distractorData).filter(([, d]: any) => !d.isKey && d.count === 0).map(([opt]) => opt)
                          return (
                            <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-purple-50 transition-colors">
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-purple-700 bg-purple-100 border border-purple-200 w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                                  {item.id}
                                </span>
                                <div>
                                  <span className="text-sm font-medium text-slate-800">Soal No. {item.id}</span>
                                  <div className="text-xs text-purple-600 mt-0.5">
                                    Opsi tidak dipilih: <span className="font-bold">{tidakEfektif.join(', ')}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {soalReteaching.length === 0 && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 text-center">
                      <p className="text-sm font-semibold text-emerald-700">✅ Seluruh materi berhasil dipahami dengan baik oleh mayoritas siswa. Tidak ada indikator yang memerlukan re-teaching khusus.</p>
                    </div>
                  )}
                </div>
              )
            })()}
            
            
            {/* Lembar Pengesahan (Hanya muncul saat di-print) */}
            <div className="hidden print:flex justify-between mt-20 pt-8 print:break-inside-avoid text-black text-sm">
              <div className="text-center w-64">
                <p>Mengetahui,</p>
                <p className="font-bold">Kepala Sekolah</p>
                <div className="h-24"></div>
                <p className="font-bold underline">{identity.kepalaSekolah || '...........................................'}</p>
                <p>NIP. {identity.nipKepalaSekolah || '...........................................'}</p>
              </div>
              <div className="text-center w-64">
                <p>..................................., 20....</p>
                <p className="font-bold">Guru Mata Pelajaran</p>
                <div className="h-24"></div>
                <p className="font-bold underline">{identity.guru || '...........................................'}</p>
                <p>NIP. {identity.nip || '...........................................'}</p>
              </div>
            </div>

            </div>

            <button onClick={() => setAnalysisResult(null)} className="text-blue-600 font-semibold text-sm hover:underline print:hidden">
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
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
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
                    <p className="text-sm text-slate-600 mb-4">Menunjukkan tingkat konsistensi seluruh soal dalam satu tes (Cronbach&apos;s Alpha).</p>
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

      {/* Global Print Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 1.5cm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            background-color: white !important;
          }
          /* Fix tab content overlapping or page break issues */
          .max-w-4xl { max-w: 100% !important; margin: 0 !important; padding: 0 !important; }
        }
      `}} />
    </div>
  )
}
