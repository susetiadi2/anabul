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
