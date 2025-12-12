import Link from 'next/link'

export default async function AuthCodeError({
    searchParams,
}: {
    searchParams: Promise<{ error?: string }>
}) {
    const params = await searchParams
    const error = params.error

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-md">
                <div className="bg-white border border-gray-200 shadow-xl rounded-2xl p-8 text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Authentication Error</h1>
                    <p className="text-sm text-gray-600 mb-6">
                        {error ? (
                            <span className="block p-2 bg-red-50 text-red-600 rounded mt-2 font-mono text-xs break-all">
                                {decodeURIComponent(error)}
                            </span>
                        ) : (
                            'There was a problem signing you in. The link may have expired or already been used.'
                        )}
                    </p>
                    <Link
                        href="/auth/login"
                        className="inline-block rounded-lg bg-amber-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-amber-700"
                    >
                        Try Again
                    </Link>
                </div>
            </div>
        </div>
    )
}
