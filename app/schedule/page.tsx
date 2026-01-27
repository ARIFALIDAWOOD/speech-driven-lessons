"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight, Plus, CalendarIcon, Loader2 } from 'lucide-react'
import { format, addDays, subDays, parse, differenceInMinutes, startOfDay } from "date-fns"
import { useRouter } from "next/navigation"

import { MainNav } from "@/components/main-nav"
import { CourseDetails } from "@/components/course-details"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useAuth } from "@/auth/supabase"

// Time slots from 8:00 AM to 8:00 PM
const timeSlots = Array.from({ length: 13 }, (_, i) => {
    const hour = i + 8
    return `${hour.toString().padStart(2, "0")}:00`
})

interface Appointment {
    id: string
    title: string
    tutor: string
    email: string
    zoomLink: string
    date: string
    startTime: string
    endTime: string
    description: string
    currentState?: string
    isPaused?: boolean
}

export default function SchedulePage() {
    const router = useRouter()
    const { session, loading: authLoading } = useAuth()
    const [selectedCourse, setSelectedCourse] = useState<Appointment | null>(null)
    const [selectedDate, setSelectedDate] = useState<Date>(new Date())
    const [appointments, setAppointments] = useState<Appointment[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Fetch scheduled sessions from backend
    const fetchScheduledSessions = useCallback(async () => {
        if (!session?.access_token) {
            setIsLoading(false)
            return
        }

        try {
            setIsLoading(true)
            setError(null)

            const apiUrl = `${process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000"}/api/tutor-session/scheduled`

            const response = await fetch(apiUrl, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                },
            })

            if (!response.ok) {
                const errorText = await response.text().catch(() => "Unknown error")
                throw new Error(`Failed to fetch scheduled sessions: ${response.status} ${response.statusText}. ${errorText}`)
            }

            const data = await response.json()
            setAppointments(data.sessions || [])
        } catch (err) {
            console.error("Error fetching scheduled sessions:", err)

            // Provide more specific error messages
            let errorMessage = "Failed to fetch sessions"
            if (err instanceof TypeError && err.message === "Failed to fetch") {
                const apiUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000"
                errorMessage = `Cannot connect to backend server at ${apiUrl}. Please ensure the backend server is running.`
            } else if (err instanceof Error) {
                errorMessage = err.message
            }

            setError(errorMessage)
        } finally {
            setIsLoading(false)
        }
    }, [session?.access_token])

    useEffect(() => {
        // Wait for auth to finish loading
        if (authLoading) {
            return
        }

        // Only fetch if we have a session with an access token
        if (session?.access_token) {
            fetchScheduledSessions()
        } else {
            // No session available, stop loading
            setIsLoading(false)
        }
    }, [session, authLoading, fetchScheduledSessions])

    const handlePrevDay = () => setSelectedDate(subDays(selectedDate, 1))
    const handleNextDay = () => setSelectedDate(addDays(selectedDate, 1))

    const handleNewAppointment = () => {
        // Navigate to the learn page to start a new session
        router.push("/learn")
    }

    const handleResumeSession = (sessionId: string) => {
        // Navigate to the session page to resume
        router.push(`/learn/session/${sessionId}`)
    }

    const getAppointmentStyle = (appointment: Appointment) => {
        const startTime = parse(appointment.startTime, "HH:mm", new Date())
        const endTime = parse(appointment.endTime, "HH:mm", new Date())
        const dayStart = parse("08:00", "HH:mm", new Date())

        const startMinutes = differenceInMinutes(startTime, dayStart)
        const duration = differenceInMinutes(endTime, startTime)

        const topPercentage = (startMinutes / (12 * 60)) * 100
        const heightPercentage = (duration / (12 * 60)) * 100

        return {
            top: `${topPercentage}%`,
            height: `${heightPercentage}%`,
        }
    }

    return (
        <div className="flex h-screen">
            <MainNav />
            <div className="flex flex-1">
                <div className="flex-1">
                    <div className="flex h-14 items-center justify-between border-b px-4">
                        <div className="flex items-center gap-4">
                            <Input
                                placeholder="Search sessions..."
                                className="w-[200px]"
                            />
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" onClick={handlePrevDay}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="min-w-[240px] justify-start text-left font-normal">
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {format(selectedDate, "MMMM d, yyyy")}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={selectedDate}
                                            onSelect={(date) => date && setSelectedDate(date)}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                <Button variant="ghost" size="icon" onClick={handleNextDay}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        <Button onClick={handleNewAppointment}>
                            <Plus className="mr-2 h-4 w-4" />
                            New Learning Session
                        </Button>
                    </div>

                    {/* Error state */}
                    {error && (
                        <div className="m-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-red-800">{error}</p>
                            <button
                                onClick={fetchScheduledSessions}
                                className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                            >
                                Try again
                            </button>
                        </div>
                    )}

                    {/* Loading state */}
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                            <span className="ml-2 text-gray-600">Loading sessions...</span>
                        </div>
                    ) : (
                        <ScrollArea className="h-[calc(100vh-3.5rem)]">
                            <div className="relative" style={{ height: "calc(12 * 60px)" }}>
                                {timeSlots.map((timeSlot, index) => (
                                    <div
                                        key={timeSlot}
                                        className="absolute w-full border-b py-2"
                                        style={{ top: `${index * 60}px`, height: "60px" }}
                                    >
                                        <div className="absolute left-0 w-20 px-4 text-sm text-muted-foreground">
                                            {timeSlot}
                                        </div>
                                    </div>
                                ))}
                                {appointments
                                    .filter(appointment => appointment.date === format(selectedDate, "yyyy-MM-dd"))
                                    .map((appointment) => (
                                        <button
                                            key={appointment.id}
                                            onClick={() => setSelectedCourse(appointment)}
                                            className="absolute left-24 right-4 rounded-lg bg-primary/10 p-2 text-left hover:bg-primary/20"
                                            style={getAppointmentStyle(appointment)}
                                        >
                                            <p className="font-medium">{appointment.title}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {appointment.startTime} - {appointment.endTime}
                                                {appointment.isPaused && (
                                                    <span className="ml-2 text-yellow-600">(Paused)</span>
                                                )}
                                            </p>
                                        </button>
                                    ))
                                }
                                {appointments.filter(a => a.date === format(selectedDate, "yyyy-MM-dd")).length === 0 && (
                                    <div className="absolute left-24 right-4 top-1/3 text-center text-gray-500">
                                        <p>No sessions scheduled for this day.</p>
                                        <Button
                                            variant="link"
                                            onClick={handleNewAppointment}
                                            className="mt-2"
                                        >
                                            Start a new learning session
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    )}
                </div>
                {selectedCourse && (
                    <CourseDetails
                        course={selectedCourse}
                        selectedDate={selectedDate}
                        onClose={() => setSelectedCourse(null)}
                        onResume={() => handleResumeSession(selectedCourse.id)}
                    />
                )}
            </div>
        </div>
    )
}
