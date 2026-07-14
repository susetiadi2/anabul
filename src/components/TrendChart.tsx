'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function TrendChart({ sessions }: { sessions: any[] }) {
  if (!sessions || sessions.length === 0) return null

  // Transform data (reverse to show chronological order)
  const data = [...sessions].reverse().map(session => {
    const payload = session.data_payload
    const siswaCount = payload?.studentData?.length || 1
    const tuntas = payload?.summary?.tuntas || 0
    const avgKetuntasan = Math.round((tuntas / siswaCount) * 100)
    
    const dateObj = new Date(session.created_at)
    const dateStr = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
    
    return {
      tanggal: dateStr,
      nama: session.name || 'Analisis Tanpa Judul',
      ketuntasan: avgKetuntasan
    }
  })

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload
      return (
        <div className="bg-white border border-slate-200 shadow-xl rounded-xl p-4 text-sm z-50">
          <p className="font-bold text-slate-800 mb-1">{dataPoint.nama}</p>
          <p className="text-slate-500 text-xs mb-3 flex items-center"><span className="w-2 h-2 rounded-full bg-slate-300 mr-1.5"></span>{label}</p>
          <div className="flex items-center gap-2">
            <div className="w-1 h-10 bg-blue-500 rounded-full"></div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Ketuntasan</p>
              <p className="text-xl font-black text-blue-600">{dataPoint.ketuntasan}%</p>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8 mb-10 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-50 to-transparent rounded-bl-full pointer-events-none opacity-50"></div>
      
      <div className="mb-8 relative z-10">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
          </div>
          <h3 className="font-black text-xl text-slate-800 tracking-tight">Tren Ketuntasan Belajar Siswa</h3>
        </div>
        <p className="text-sm font-medium text-slate-500 ml-11">Grafik pergerakan persentase kelulusan (KKTP) dari waktu ke waktu berdasarkan hasil analisis terbaru Anda.</p>
      </div>
      
      <div className="h-[300px] w-full relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorKetuntasan" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="tanggal" tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
            <YAxis tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} unit="%" />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }} />
            <Area 
              type="monotone" 
              dataKey="ketuntasan" 
              stroke="#2563eb" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorKetuntasan)" 
              activeDot={{ r: 6, strokeWidth: 3, stroke: '#fff', fill: '#2563eb' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
