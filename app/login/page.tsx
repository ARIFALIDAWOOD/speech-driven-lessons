"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { motion } from "framer-motion"
import AnimatedBackground from "@/components/AnimatedBackground"
import { useAuth, auth } from "@/auth/supabase"

function LoginPageContent() {
    const [email, setEmail] = useState("")
    const [error, setError] = useState("")
    const [successMessage, setSuccessMessage] = useState("")
    const [localLoading, setLocalLoading] = useState(false)
    const router = useRouter()
    const searchParams = useSearchParams()
    const { signInWithMagicLink, loading, user } = useAuth()

    const features = [
        {
            text: "Adaptive Learning",
            icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
            description: "Tailored to your unique pace and style",
        },
        {
            text: "Real-time Feedback",
            icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
            description: "Instant guidance for continuous improvement",
        },
        {
            text: "AI-Powered Insights",
            icon: "M13 10V3L4 14h7v7l9-11h-7z",
            description: "Intelligent analysis for optimized learning paths",
        },
    ]

    useEffect(() => {
        // Check for error from auth callback
        const errorParam = searchParams.get('error')
        if (errorParam === 'auth_callback_error') {
            setError('There was an error signing in. Please try again.')
        }
    }, [searchParams])

    useEffect(() => {
        // If user is already logged in, redirect to welcome or the intended destination
        if (user && !loading) {
            const redirectTo = searchParams.get('redirectTo') || '/welcome'
            router.push(redirectTo)
        }
    }, [user, loading, router, searchParams])

    useEffect(() => {
        // On first render, sign out to ensure no lingering session interferes before explicit sign-in
        auth.signOut().catch(err => {
            console.warn("Initial sign-out failed (might be expected if not logged in):", err)
        })
    }, [])

    const handleMagicLinkSignIn = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!email) {
            setError('Please enter your email address')
            return
        }

        try {
            setLocalLoading(true)
            setError('')
            setSuccessMessage('')

            const result = await signInWithMagicLink(email)

            if (result.success) {
                setSuccessMessage('Check your email for the magic link!')
                setEmail('')
            } else {
                setError(result.error?.message || 'Failed to send magic link')
            }
        } catch (error) {
            console.error('Error during magic link sign in:', error)
            setError('Error sending magic link')
        } finally {
            setLocalLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#7A9E7E] via-[#E8EFE8] to-[#F5F7F5] flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7A9E7E] mx-auto"></div>
                    <p className="mt-4 text-[#5D745F]">Loading...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#7A9E7E] via-[#E8EFE8] to-[#F5F7F5] flex font-sans antialiased flex-col lg:flex-row">
            {/* Left Section */}
            <div className="w-full lg:w-3/5 flex flex-col items-center justify-center relative overflow-hidden p-4 lg:p-12 bg-gradient-to-br from-[#4c7b54] to-[#5C7E60]">
                <AnimatedBackground />
                <div className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-[#E8EFE8] to-[#F5F7F5] w-full flex flex-col items-center">
                    <motion.div
                        className="text-center mb-8 lg:mb-16 w-full"
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, ease: "easeOut" }}
                    >
                        <div className="w-full">
                            <h1
                                className="font-extrabold tracking-tight bg-clip-text bg-gradient-to-r from-[#A5C0A7] to-[#F5F7F5] text-transparent mb-4 lg:mb-6 pb-2"
                                style={{
                                    fontSize: 'clamp(1.875rem, 4vw + 1rem, 4.5rem)',
                                    lineHeight: '1.2',
                                    whiteSpace: 'normal',
                                    overflowWrap: 'break-word',
                                    width: 'calc(100% - 2rem)',
                                    marginLeft: 'auto',
                                    marginRight: 'auto',
                                }}
                            >
                                Beyond Traditional Learning
                            </h1>
                        </div>
                        <p className="text-base sm:text-lg md:text-xl lg:text-2xl font-light tracking-wide text-[#F5F7F5] max-w-3xl mx-auto mt-6">
                            Experience AI-driven education that adapts to your pace, learns from your style, and guides your journey
                        </p>
                    </motion.div>

                    <motion.div
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 w-full"
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                    >
                        {features.map(({ text, icon, description }, index) => (
                            <motion.div
                                key={text}
                                className="flex flex-col items-center text-center p-4"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: index * 0.2 }}
                            >
                                <div className="mb-3 sm:mb-4 lg:mb-6 p-3 sm:p-4 bg-[#7A9E7E] rounded-full">
                                    <svg
                                        className="w-6 h-6 sm:w-8 sm:h-8 lg:w-12 lg:h-12 text-[#F5F7F5]"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                                    </svg>
                                </div>
                                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold mb-2 lg:mb-3 tracking-wide text-[#F5F7F5]">
                                    {text}
                                </h3>
                                <p className="text-sm sm:text-base lg:text-lg text-[#E8EFE8] font-light leading-relaxed">
                                    {description}
                                </p>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </div>

            {/* Right Section */}
            <div className="w-full lg:w-2/5 bg-[#E8EFE8] flex items-center justify-center min-h-screen lg:min-h-0">
                <motion.div
                    className="w-full max-w-md p-6 lg:p-12 bg-[#F5F7F5] shadow-lg rounded-lg border border-[#BED0BF]"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <h2 className="text-2xl lg:text-3xl font-bold mb-6 lg:mb-8 text-center text-[#2C3E50] tracking-tight">
                        Welcome
                    </h2>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-red-600 text-sm">{error}</p>
                        </div>
                    )}

                    {successMessage && (
                        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
                            <div className="flex items-center gap-2 mb-2">
                                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <p className="text-green-700 font-medium">Check your email!</p>
                            </div>
                            <p className="text-green-600 text-sm">
                                We've sent a magic link to your email. Click the link to sign in.
                            </p>
                        </div>
                    )}

                    {!successMessage && (
                        <form onSubmit={handleMagicLinkSignIn} className="space-y-4 lg:space-y-6">
                            <div>
                                <Label htmlFor="email" className="text-sm font-medium text-[#5D745F] tracking-wide">
                                    Email Address
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="mt-1 font-light border border-[#BED0BF] rounded-md"
                                    placeholder="Enter your email address"
                                    required
                                    disabled={localLoading}
                                />
                            </div>
                            <Button
                                type="submit"
                                disabled={localLoading || !email}
                                className="w-full bg-gradient-to-br from-[#7A9E7E] to-[#5C7E60] hover:from-[#5C7E60] hover:to-[#7A9E7E] transition-colors duration-300 py-4 lg:py-6 text-base lg:text-lg font-medium tracking-wide text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {localLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                        Sending...
                                    </span>
                                ) : (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        Send Magic Link
                                    </span>
                                )}
                            </Button>
                        </form>
                    )}

                    {successMessage && (
                        <div className="mt-4">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setSuccessMessage('')
                                    setError('')
                                }}
                                className="w-full py-4 lg:py-6 text-base lg:text-lg font-medium tracking-wide border border-[#BED0BF] bg-[#F5F7F5] text-[#7A9E7E] rounded-lg hover:bg-[#E8EFE8]"
                            >
                                Try a different email
                            </Button>
                        </div>
                    )}

                    <p className="mt-6 lg:mt-8 text-center text-sm text-[#5D745F] tracking-wide">
                        No password needed! We'll send a secure link to your email.
                    </p>
                </motion.div>
            </div>
        </div>
    )
}

function LoginLoadingFallback() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-[#7A9E7E] via-[#E8EFE8] to-[#F5F7F5] flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7A9E7E] mx-auto"></div>
                <p className="mt-4 text-[#5D745F]">Loading...</p>
            </div>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={<LoginLoadingFallback />}>
            <LoginPageContent />
        </Suspense>
    )
}
