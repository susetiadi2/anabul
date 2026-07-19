"use client"

import { useEffect, useMemo, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Eye, EyeOff } from 'lucide-react'

function getRecoveryContext(searchParams?: ReturnType<typeof useSearchParams>) {
  if (typeof window === 'undefined') {
    return { hasRecoveryContext: false, invalidLink: false }
  }

  const url = new URL(window.location.href)
  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''))
  const queryParams = new URLSearchParams(url.search)

  const errorDesc = hashParams.get('error_description') || queryParams.get('error_description') || searchParams?.get('error_description')
  const recoveryType = hashParams.get('type') || queryParams.get('type') || searchParams?.get('type')
  const accessToken = hashParams.get('access_token') || queryParams.get('access_token') || searchParams?.get('access_token')
  const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token') || searchParams?.get('refresh_token')
  const tokenHash = hashParams.get('token_hash') || queryParams.get('token_hash') || searchParams?.get('token_hash')
  const code = hashParams.get('code') || queryParams.get('code') || searchParams?.get('code')

  const hasRecoveryContext =
    recoveryType === 'recovery' ||
    Boolean(accessToken) ||
    Boolean(refreshToken) ||
    Boolean(tokenHash) ||
    Boolean(code)

  return {
    hasRecoveryContext,
    invalidLink: Boolean(errorDesc),
  }
}

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])
  const [hasToken, setHasToken] = useState(() => getRecoveryContext().hasRecoveryContext)
  const [invalidLink, setInvalidLink] = useState(() => getRecoveryContext().invalidLink)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  useEffect(() => {
    if (typeof window === 'undefined') return

    const syncRecoveryState = () => {
      const { hasRecoveryContext, invalidLink } = getRecoveryContext(searchParams)
      setHasToken(hasRecoveryContext)
      setInvalidLink(invalidLink)
      return hasRecoveryContext
    }

    const hasRecoveryContext = syncRecoveryState()

    const initializeRecovery = async () => {
      if (!hasRecoveryContext) return

      try {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          if (!error) {
            setHasToken(true)
          }
        }
      } catch {
        setHasToken(true)
      }
    }

    void initializeRecovery()

    const handleHashChange = () => {
      syncRecoveryState()
    }

    window.addEventListener('hashchange', handleHashChange)

    if (!hasRecoveryContext) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        setHasToken(event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN')
      })

      return () => {
        subscription.unsubscribe()
        window.removeEventListener('hashchange', handleHashChange)
      }
    }

    return () => {
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [searchParams, supabase])

  const handleSendResetLink = async () => {
    if (!email.trim()) {
      setMessage({ type: 'error', text: 'Masukkan email terdaftar untuk menerima tautan reset.' })
      return
    }
    setLoading(true)
    setMessage(null)
    try {
      const redirectTo = process.env.NEXT_PUBLIC_PASSWORD_RESET_REDIRECT || `${window.location.origin}/reset-password`
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
      if (error) throw error
      setMessage({ type: 'success', text: 'Jika email terdaftar, tautan reset password telah dikirim. Periksa kotak masuk Anda.' })
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Gagal mengirim tautan reset. Silakan coba lagi.'
      setMessage({ type: 'error', text: message })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password minimal 6 karakter' })
      return
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Konfirmasi password tidak cocok.' })
      return
    }

    setLoading(true)
    setMessage(null)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setMessage({ type: 'success', text: 'Password berhasil diubah. Silakan masuk kembali.' })
      setTimeout(() => router.push('/login'), 1600)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Gagal mengubah password.'
      setMessage({ type: 'error', text: message })
    } finally { setLoading(false) }
  }

  return (
    <div className="w-full max-w-md bg-white border border-slate-100 rounded-3xl p-8 shadow-lg">
      <h2 className="text-xl font-black mb-4 text-slate-800">Reset Password</h2>
      {invalidLink ? (
        <div className="space-y-4">
          <p className="text-sm text-rose-600">Tautan reset tidak valid atau sudah kadaluarsa. Silakan minta tautan baru.</p>
          <button onClick={() => router.push('/login')} className="w-full py-3 border rounded-xl">Kembali ke Login</button>
        </div>
      ) : !hasToken ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Masukkan email yang terdaftar untuk menerima tautan reset password. Setelah tautan dikirim, buka email dan klik link untuk melihat formulir pengubahan password.
          </p>
          <input
            type="email"
            placeholder="Alamat email terdaftar"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border rounded-xl"
          />
          {message && <div className={`text-sm p-3 rounded-xl border ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'}`}>{message.text}</div>}
          <div className="flex gap-2">
            <button onClick={handleSendResetLink} disabled={loading} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">{loading ? 'Mengirim...' : 'Kirim Tautan Reset'}</button>
            <button onClick={() => router.push('/login')} className="py-3 px-4 border rounded-xl">Kembali</button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-bold text-slate-700">Buat Password Baru</label>
            <p className="text-sm text-slate-600">Masukkan password baru Anda dan pastikan konfirmasi cocok.</p>
          </div>

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 border rounded-xl pr-12"
              placeholder="Minimal 6 karakter"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 focus:outline-none"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 border rounded-xl pr-12"
              placeholder="Konfirmasi password"
            />
          </div>

          {message && <div className={`text-sm p-3 rounded-xl border ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'}`}>{message.text}</div>}
          <div className="flex gap-2">
            <button onClick={handleSubmit} disabled={loading} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold">{loading ? 'Memproses...' : 'Ubah Password'}</button>
            <button onClick={() => router.push('/login')} className="py-3 px-4 border rounded-xl">Batal</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <Suspense fallback={<div>Loading...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  )
}
