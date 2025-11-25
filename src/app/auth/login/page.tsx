'use client'

import { useState } from 'react'
import { getSupabaseClient } from '@/lib/supabaseClient'

export default function LoginPage() {
  const supabase = getSupabaseClient()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const redirectTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}/auth/callback`
          : 'http://localhost:3000/auth/callback'

      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      })

      if (authError) {
        setError(authError.message)
      } else {
        setSuccess(true)
      }
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white border border-gray-200 shadow-xl rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Sign in to Nest</h1>
          <p className="text-sm text-gray-600 mb-6">
            We&apos;ll email you a magic link to sign in.
          </p>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
                placeholder="you@example.com"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                Check your email for the login link.
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-amber-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Sending...' : 'Send magic link'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
