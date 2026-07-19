import { createBrowserClient } from '@supabase/ssr'

export function createClient(cookieOptions?: any) {
  const options = cookieOptions ? { cookieOptions } : {}
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    options
  )
}
