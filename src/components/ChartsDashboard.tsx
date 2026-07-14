'use client'

import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts'

interface Props {
  analysisResult: any
  kkm: number
}

const COLORS_PIE = ['#10b981', '#f43f5e']
const COLORS_DIST = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe']

// Tooltip kustom yang lebih bersih
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 shadow-lg rounded-lg px-3 py-2 text-xs">
        <p className="font-bold text-slate-700 mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }}>{p.name}: <span className="font-semibold">{typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</span></p>
        ))}
      </div>
    )
  }
  return null
}

// Card wrapper bersih
const ChartCard = ({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
    <div className="mb-4">
      <h4 className="font-bold text-slate-800 text-sm">{title}</h4>
      {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
    {children}
  </div>
)

export default function ChartsDashboard({ analysisResult, kkm }: Props) {
  const { analyzedData, studentData, summary, classStats } = analysisResult

  // ── 1. Data Ketuntasan ──────────────────────────────────────────
  const tuntas = summary.tuntas
  const total = studentData?.length || 0
  const belumTuntas = total - tuntas
  const ketuntasanData = [
    { name: 'Tuntas (Pengayaan)', value: tuntas },
    { name: 'Belum Tuntas (Remedial)', value: belumTuntas },
  ]

  // ── 2. Distribusi Nilai Siswa ───────────────────────────────────
  const buckets = [
    { label: '0–20', min: 0, max: 20 },
    { label: '21–40', min: 21, max: 40 },
    { label: '41–60', min: 41, max: 60 },
    { label: '61–80', min: 61, max: 80 },
    { label: '81–100', min: 81, max: 100 },
  ]
  const distribusiNilai = buckets.map(b => ({
    label: b.label,
    Siswa: studentData?.filter((s: any) => s.finalScore >= b.min && s.finalScore <= b.max).length ?? 0,
  }))

  // ── 3. Kualitas Soal ────────────────────────────────────────────
  const dipakai = analyzedData.filter((d: any) => d.decision === 'Dipakai').length
  const revisi = analyzedData.filter((d: any) => d.decision === 'Revisi').length
  const dibuang = analyzedData.filter((d: any) => d.decision === 'Dibuang' || d.decision === 'Gugur').length
  const kualitasSoal = [
    { label: 'Dipakai', Jumlah: dipakai, fill: '#10b981' },
    { label: 'Revisi', Jumlah: revisi, fill: '#f59e0b' },
    { label: 'Dibuang', Jumlah: dibuang, fill: '#f43f5e' },
  ]

  // ── 4. Tingkat Kesukaran per Butir ─────────────────────────────
  const kesukaranData = analyzedData.map((d: any) => ({
    soal: `S${d.id}`,
    P: parseFloat(d.p.toFixed(3)),
  }))

  // ── 5. Daya Beda per Butir ─────────────────────────────────────
  const dayaBedaData = analyzedData.map((d: any) => ({
    soal: `S${d.id}`,
    D: parseFloat(d.d.toFixed(3)),
  }))

  // ── 6. Validitas per Butir ─────────────────────────────────────
  const validitasData = analyzedData.map((d: any) => ({
    soal: `S${d.id}`,
    Validitas: parseFloat(d.validity.toFixed(3)),
    valid: d.valStatus === 'Valid',
  }))

  // ── 7. Efektivitas Distraktor ──────────────────────────────────
  const distractorKeys: string[] = []
  analyzedData.forEach((d: any) => {
    if (d.distractorData) {
      Object.keys(d.distractorData).forEach(k => {
        if (!distractorKeys.includes(k)) distractorKeys.push(k)
      })
    }
  })
  const distractorData = analyzedData.map((d: any) => {
    const row: any = { soal: `S${d.id}` }
    if (d.distractorData) {
      Object.entries(d.distractorData).forEach(([opt, data]: any) => {
        row[opt] = data.pct
      })
    }
    return row
  })
  const DISTRACTOR_COLORS: Record<string, string> = {
    A: '#f43f5e', B: '#3b82f6', C: '#8b5cf6', D: '#f59e0b', E: '#14b8a6'
  }

  return (
    <div className="space-y-4">
      {/* ─── Row 1: Ketuntasan + Kualitas Soal ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard title="Ketuntasan Belajar" subtitle={`KKTP ${kkm} — Total ${total} siswa`}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={ketuntasanData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={4}
                dataKey="value"
                label={({ name, percent }) => `${((percent || 0) * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {ketuntasanData.map((_, i) => (
                  <Cell key={i} fill={COLORS_PIE[i]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Kualitas Soal" subtitle="Rekapitulasi keputusan per butir">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={kualitasSoal} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="Jumlah" radius={[6, 6, 0, 0]}>
                {kualitasSoal.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ─── Row 2: Distribusi Nilai ─── */}
      <ChartCard title="Distribusi Nilai Siswa" subtitle="Persebaran nilai akhir ke dalam kelompok rentang">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={distribusiNilai} barSize={36}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="Siswa" radius={[6, 6, 0, 0]}>
              {distribusiNilai.map((_, i) => (
                <Cell key={i} fill={COLORS_DIST[i]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ─── Row 3: Tingkat Kesukaran + Daya Beda ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard title="Tingkat Kesukaran (P)" subtitle="0 = sangat sukar · 1 = sangat mudah">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={kesukaranData} margin={{ left: -10 }}>
              <defs>
                <linearGradient id="gradP" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="soal" tick={{ fontSize: 10 }} interval={Math.floor(kesukaranData.length / 10)} />
              <YAxis domain={[0, 1]} tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              {/* Zona Ideal P: 0.3–0.7 */}
              <Area type="monotone" dataKey="P" stroke="#6366f1" fill="url(#gradP)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="mt-2 flex gap-3 text-[10px] text-slate-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"/>0.30–0.70 = Sedang (Ideal)</span>
          </div>
        </ChartCard>

        <ChartCard title="Daya Beda (D)" subtitle="Semakin tinggi semakin baik (min ≥ 0.20)">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={dayaBedaData} margin={{ left: -10 }}>
              <defs>
                <linearGradient id="gradD" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="soal" tick={{ fontSize: 10 }} interval={Math.floor(dayaBedaData.length / 10)} />
              <YAxis domain={[-0.5, 1]} tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="D" stroke="#f59e0b" fill="url(#gradD)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="mt-2 flex gap-3 text-[10px] text-slate-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"/>D &lt; 0.20 = Buruk, perlu direvisi</span>
          </div>
        </ChartCard>
      </div>

      {/* ─── Row 4: Validitas per Butir ─── */}
      <ChartCard title="Validitas Butir Soal" subtitle="Batang hijau = Valid · Batang merah = Tidak Valid">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={validitasData} margin={{ left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="soal" tick={{ fontSize: 10 }} interval={Math.floor(validitasData.length / 10)} />
            <YAxis domain={[-1, 1]} tick={{ fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="Validitas" radius={[4, 4, 0, 0]}>
              {validitasData.map((entry: any, i: number) => (
                <Cell key={i} fill={entry.valid ? '#10b981' : '#f43f5e'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ─── Row 5: Efektivitas Distraktor ─── */}
      {distractorKeys.length > 0 && (
        <ChartCard title="Efektivitas Distraktor per Butir" subtitle="Distribusi persentase siswa yang memilih tiap opsi jawaban">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={distractorData} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="soal" tick={{ fontSize: 10 }} interval={Math.floor(distractorData.length / 10)} />
              <YAxis unit="%" tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              {distractorKeys.map(key => (
                <Bar key={key} dataKey={key} stackId="a" fill={DISTRACTOR_COLORS[key] ?? '#94a3b8'} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  )
}
