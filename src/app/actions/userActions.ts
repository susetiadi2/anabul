'use server'

import { createClient } from '@supabase/supabase-js'

export async function resetUserPassword(userId: string) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return { 
        success: false, 
        error: 'Sistem belum dikonfigurasi untuk fitur ini. Silakan tambahkan SUPABASE_SERVICE_ROLE_KEY di Environment Variables Vercel.' 
      }
    }

    // Gunakan service_role_key untuk masuk sebagai admin dewa
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Reset password ke 'user123456'
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: 'user123456' }
    )

    if (error) {
      console.error("Gagal reset password:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Terjadi kesalahan internal server.' }
  }
}

export async function sendResetLinkToUser(userId: string) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return {
        success: false,
        error: 'Sistem belum dikonfigurasi untuk fitur ini. Silakan tambahkan SUPABASE_SERVICE_ROLE_KEY di Environment Variables.'
      }
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Ambil user auth untuk mendapatkan email
    const { data, error: getErr } = await supabaseAdmin.auth.admin.getUserById(userId)
    if (getErr || !data || !data.user) {
      console.error('Gagal mengambil user untuk reset:', getErr)
      return { success: false, error: getErr?.message || 'User tidak ditemukan' }
    }

    const email = data.user.email
    if (!email) return { success: false, error: 'Email pengguna tidak tersedia.' }

    const resetRedirectUrl = process.env.NEXT_PUBLIC_PASSWORD_RESET_REDIRECT || (process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/reset-password` : null)
    if (!resetRedirectUrl) {
      return {
        success: false,
        error: 'Redirect URL untuk reset password belum dikonfigurasi. Tambahkan NEXT_PUBLIC_PASSWORD_RESET_REDIRECT atau NEXT_PUBLIC_APP_URL di environment.'
      }
    }

    // Kirim tautan reset password menggunakan API auth (server-side)
    const { error: sendErr } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: resetRedirectUrl
    } as any)

    if (sendErr) {
      console.error('Gagal mengirim tautan reset:', sendErr)
      return { success: false, error: sendErr.message }
    }

    // Attempt to write an audit log; ignore if table doesn't exist or fails
    try {
      await supabaseAdmin.from('admin_password_resets').insert({
        target_user_id: userId,
        email,
        created_at: new Date().toISOString()
      })
    } catch (e) {
      // swallow errors from logging to avoid failing the main action
      console.error('Audit log failed for password reset:', e)
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Terjadi kesalahan internal server.' }
  }
}

export async function getUserEmail(userId: string) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return { success: false, error: 'Sistem belum dikonfigurasi untuk fitur ini.' }
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { data, error: getErr } = await supabaseAdmin.auth.admin.getUserById(userId)
    if (getErr || !data || !data.user) return { success: false, error: getErr?.message || 'User tidak ditemukan' }

    return { success: true, email: data.user.email || null }
  } catch (error: any) {
    return { success: false, error: error.message || 'Terjadi kesalahan internal server.' }
  }
}

export async function updateUserEmail(userId: string, newEmail: string) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return { success: false, error: 'Sistem belum dikonfigurasi untuk fitur ini.' }
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email: newEmail
    })

    if (error) return { success: false, error: error.message }

    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message || 'Terjadi kesalahan internal server.' }
  }
}

export async function removeUserProfile(userId: string) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return { success: false, error: 'Sistem belum dikonfigurasi untuk fitur ini.' }
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    } as any)

    // Hapus dari tabel user_profiles
    const { error } = await supabaseAdmin.from('user_profiles').delete().eq('id', userId)
    if (error) return { success: false, error: error.message }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Terjadi kesalahan internal server.' }
  }
}
