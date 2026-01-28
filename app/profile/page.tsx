"use client"
import { Suspense, useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Settings,
  LogOut,
  User,
  Mail,
  GraduationCap,
  ChevronRight,
  Cpu,
  Edit3,
  Save,
  KeyRound,
  Shield,
  Sparkles,
  X,
  Bell,
  Clock,
  Zap,
  HardDrive,
  MapPin,
  Loader2,
  CheckCircle,
  AlertCircle,
  ArrowUp,
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { MainLayout } from "@/components/layout/MainLayout"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FullscreenButton } from "@/components/layout/fullscreen-button"
import { Breadcrumb } from "@/components/layout/Breadcrumb"
import { ClassificationSelector, UserClassification } from "@/components/classification/ClassificationSelector"
import { ClassificationDisplay } from "@/components/classification/ClassificationDisplay"
import { useAuth } from "@/auth/supabase"

const preferences = [
  { id: "ai_basics", label: "AI Fundamentals" },
  { id: "ml_algorithms", label: "Machine Learning Algorithms" },
  { id: "deep_learning", label: "Deep Learning" },
  { id: "nlp", label: "Natural Language Processing" },
  { id: "cv", label: "Computer Vision" },
  { id: "robotics", label: "AI in Robotics" },
  { id: "ethics", label: "AI Ethics" },
  { id: "data_science", label: "Data Science" },
]

// Random name generator for new users
const ADJECTIVES = ["Swift", "Bright", "Clever", "Curious", "Eager", "Keen", "Sharp", "Bold", "Wise", "Quick"]
const NOUNS = ["Learner", "Scholar", "Student", "Thinker", "Explorer", "Achiever", "Seeker", "Mind", "Star", "Phoenix"]

function generateRandomName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  const num = Math.floor(Math.random() * 100)
  return `${adj}${noun}${num}`
}

function generateUsername(email: string): string {
  const localPart = email.split("@")[0]
  return localPart.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map(part => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function ProfilePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { session, user, loading: authLoading } = useAuth()

  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [school, setSchool] = useState("")
  const [username, setUsername] = useState("")
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>(["ai_basics", "ml_algorithms"])
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("profile")
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState(false)

  // Stats state
  const [stats, setStats] = useState({
    coursesEnrolled: 0,
    coursesCompleted: 0,
    aiSessions: 0,
    avgScore: 0,
    joinedDate: "",
  })

  // Classification state
  const [classification, setClassification] = useState<UserClassification | null>(null)
  const [classificationLoading, setClassificationLoading] = useState(false)
  const [classificationSaving, setClassificationSaving] = useState(false)
  const [classificationError, setClassificationError] = useState<string | null>(null)
  const [classificationSuccess, setClassificationSuccess] = useState(false)

  const apiBaseUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000"

  // Initialize user data from auth
  useEffect(() => {
    if (user) {
      // Get name from user metadata or generate random
      const displayName = user.user_metadata?.full_name ||
                          user.user_metadata?.name ||
                          generateRandomName()
      setName(displayName)
      setEmail(user.email || "")
      setUsername(user.user_metadata?.username || generateUsername(user.email || ""))
      setSchool(user.user_metadata?.school || "")

      // Set joined date
      const joinedDate = new Date(user.created_at)
      setStats(prev => ({
        ...prev,
        joinedDate: joinedDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })
      }))
    }
  }, [user])

  // Fetch user stats
  useEffect(() => {
    const fetchStats = async () => {
      if (!session?.access_token) return

      try {
        // Fetch course progress
        const progressRes = await fetch(`${apiBaseUrl}/api/community/my-progress`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })

        if (progressRes.ok) {
          const progressData = await progressRes.json()
          const courses = progressData.courses || []
          const completed = courses.filter((c: { progress_pct: number }) => c.progress_pct >= 100).length

          setStats(prev => ({
            ...prev,
            coursesEnrolled: courses.length,
            coursesCompleted: completed,
          }))
        }

        // TODO: Fetch AI session stats when endpoint is available
        // For now, calculate based on course activity
      } catch (err) {
        console.error("Error fetching stats:", err)
      }
    }

    if (!authLoading && session) {
      fetchStats()
    }
  }, [authLoading, session, apiBaseUrl])

  // Save profile changes
  const saveProfile = useCallback(async () => {
    if (!session?.access_token) return

    setProfileSaving(true)
    try {
      // Update user metadata via Supabase
      const { createClient } = await import("@supabase/supabase-js")
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: name,
          username: username,
          school: school,
        }
      })

      if (error) throw error

      setProfileSuccess(true)
      setIsEditing(false)
      setTimeout(() => setProfileSuccess(false), 3000)
    } catch (err) {
      console.error("Error saving profile:", err)
    } finally {
      setProfileSaving(false)
    }
  }, [session?.access_token, name, username, school])

  // Check if we should auto-switch to classification tab
  useEffect(() => {
    const complete = searchParams.get("complete")
    if (complete === "classification") {
      setActiveTab("classification")
    }
  }, [searchParams])

  // Fetch classification on mount
  useEffect(() => {
    const fetchClassification = async () => {
      if (!session?.access_token) return

      setClassificationLoading(true)
      try {
        const response = await fetch(`${apiBaseUrl}/api/user/classification`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        })

        if (response.ok) {
          const data = await response.json()
          if (data.classification) {
            setClassification(data.classification)
          }
        }
      } catch (err) {
        console.error("Error fetching classification:", err)
      } finally {
        setClassificationLoading(false)
      }
    }

    if (!authLoading && session) {
      fetchClassification()
    }
  }, [authLoading, session, apiBaseUrl])

  // Save classification
  const saveClassification = useCallback(async () => {
    if (!session?.access_token || !classification) return

    setClassificationSaving(true)
    setClassificationError(null)
    setClassificationSuccess(false)

    try {
      const response = await fetch(`${apiBaseUrl}/api/user/classification`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(classification),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Failed to save classification")
      }

      setClassificationSuccess(true)
      setTimeout(() => setClassificationSuccess(false), 3000)
    } catch (err) {
      setClassificationError(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setClassificationSaving(false)
    }
  }, [session?.access_token, classification, apiBaseUrl])

  // Promote to next class
  const promoteClass = useCallback(async () => {
    if (!session?.access_token) return

    setClassificationSaving(true)
    setClassificationError(null)

    try {
      const response = await fetch(`${apiBaseUrl}/api/user/classification/promote`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Failed to promote class")
      }

      const data = await response.json()
      setClassification(data.classification)
      setClassificationSuccess(true)
      setTimeout(() => setClassificationSuccess(false), 3000)
    } catch (err) {
      setClassificationError(err instanceof Error ? err.message : "Failed to promote")
    } finally {
      setClassificationSaving(false)
    }
  }, [session?.access_token, apiBaseUrl])

  useEffect(() => {
    if (!isEditing) {
      setIsOpen(false)
    }
  }, [isEditing])

  // Function to toggle fullscreen mode
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.log(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullScreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullScreen(false);
      }
    }
  };

  // Listen for fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Manual tab rendering function
  const renderTabContent = () => {
    switch (activeTab) {
      case "profile":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-foreground font-medium flex items-center mb-2">
                <User className="h-4 w-4 mr-2 text-primary" />
                Name
              </Label>
              <div className="relative group">
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isEditing}
                  className={`bg-background border-border text-foreground font-medium ${
                    isEditing
                      ? "focus-visible:ring-primary/20 focus-visible:border-primary"
                      : "cursor-not-allowed opacity-80"
                  }`}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email" className="text-foreground font-medium flex items-center mb-2">
                <Mail className="h-4 w-4 mr-2 text-primary" />
                Email
              </Label>
              <div className="relative group">
                <Input
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!isEditing}
                  className={`bg-background border-border text-foreground font-medium ${
                    isEditing
                      ? "focus-visible:ring-primary/20 focus-visible:border-primary"
                      : "cursor-not-allowed opacity-80"
                  }`}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="school" className="text-foreground font-medium flex items-center mb-2">
                <GraduationCap className="h-4 w-4 mr-2 text-primary" />
                School
              </Label>
              <div className="relative group">
                <Input
                  id="school"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  disabled={!isEditing}
                  className={`bg-background border-border text-foreground font-medium ${
                    isEditing
                      ? "focus-visible:ring-primary/20 focus-visible:border-primary"
                      : "cursor-not-allowed opacity-80"
                  }`}
                />
              </div>
            </div>

            {/* AI-Powered Badge */}
            <Card className="mt-6 border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-start">
                  <div className="mr-3 mt-1">
                    <div className="rounded-full bg-primary/10 p-2">
                      <Cpu className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-foreground font-medium flex items-center">
                      AI Tutor Profile
                      <span className="ml-2 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold">
                        Active
                      </span>
                    </h4>
                    <p className="text-muted-foreground text-sm mt-1">
                      Your AI tutor is personalized based on your learning preferences and activity.
                      The more you interact, the more it adapts to your learning style.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "preferences":
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-foreground font-medium flex items-center mb-2">
                <Sparkles className="h-4 w-4 mr-2 text-primary" />
                Learning Preferences
              </Label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => isEditing && setIsOpen(!isOpen)}
                  className={`w-full text-left bg-background border border-border rounded-md px-3 py-2 text-foreground font-medium ${
                    isEditing
                      ? "cursor-pointer hover:border-primary focus:border-primary focus:ring-1 focus:ring-primary/20"
                      : "cursor-not-allowed opacity-80"
                  }`}
                >
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPreferences.length > 0 ? (
                      selectedPreferences.map((id) => (
                        <div
                          key={id}
                          className="bg-primary/10 border border-primary/30 rounded-full px-2 py-0.5 text-xs text-primary font-medium flex items-center"
                        >
                          {preferences.find((p) => p.id === id)?.label}
                          {isEditing && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPreferences(selectedPreferences.filter(p => p !== id))
                              }}
                              className="ml-1 text-primary hover:text-primary/80"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      ))
                    ) : (
                      <span className="text-muted-foreground">Select preferences</span>
                    )}
                  </div>
                </button>

                {isOpen && isEditing && (
                  <div className="absolute z-10 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {preferences.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center space-x-2 p-2 hover:bg-primary/5"
                      >
                        <Checkbox
                          id={item.id}
                          checked={selectedPreferences.includes(item.id)}
                          onCheckedChange={(checked) => {
                            setSelectedPreferences(
                              checked
                                ? [...selectedPreferences, item.id]
                                : selectedPreferences.filter((id) => id !== item.id),
                            )
                          }}
                          className="border-primary data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                        <label htmlFor={item.id} className="flex-grow cursor-pointer text-foreground font-medium">
                          {item.label}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4">
              <Label className="text-foreground font-medium flex items-center mb-3">
                <Bell className="h-4 w-4 mr-2 text-primary" />
                Notification Settings
              </Label>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notify_courses"
                    defaultChecked
                    className="border-primary data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <label htmlFor="notify_courses" className="text-sm text-foreground font-medium">Course updates and new materials</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notify_messages"
                    defaultChecked
                    className="border-primary data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <label htmlFor="notify_messages" className="text-sm text-foreground font-medium">New messages and replies</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notify_ai"
                    className="border-primary data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <label htmlFor="notify_ai" className="text-sm text-foreground font-medium">AI-generated learning suggestions</label>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Label className="text-foreground font-medium flex items-center mb-3">
                <Cpu className="h-4 w-4 mr-2 text-primary" />
                AI Assistant Preferences
              </Label>

              <Card className="border-border">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="ai_hints"
                          defaultChecked
                          className="border-primary data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                        <label htmlFor="ai_hints" className="text-sm text-foreground font-medium">Show AI hints during courses</label>
                      </div>
                      <div className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full font-semibold">
                        Recommended
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="ai_recommend"
                        defaultChecked
                        className="border-primary data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <label htmlFor="ai_recommend" className="text-sm text-foreground font-medium">Personalized course recommendations</label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="ai_analysis"
                        defaultChecked
                        className="border-primary data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <label htmlFor="ai_analysis" className="text-sm text-foreground font-medium">AI learning pattern analysis</label>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border">
                    <div className="flex items-center">
                      <div className="bg-primary/10 p-1.5 rounded-full text-primary mr-2">
                        <HardDrive className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-xs text-muted-foreground font-medium">
                        Your AI learning data is securely stored and used only to improve your experience.
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case "security":
        return (
          <div className="space-y-5">
            <div>
              <h3 className="text-foreground font-semibold mb-3 flex items-center">
                <KeyRound className="h-4 w-4 mr-2 text-primary" />
                Password & Authentication
              </h3>

              <Card className="border-border hover:border-primary/30 hover:shadow-md transition-all cursor-pointer">
                <CardContent className="p-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="bg-primary/10 p-2 rounded-full mr-3 transition-colors">
                        <KeyRound className="h-4 w-4 text-primary" />
                      </div>
                      <div className="text-left">
                        <div className="font-medium text-foreground">Change Password</div>
                        <div className="text-xs text-muted-foreground mt-0.5">Last changed 45 days ago</div>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <h3 className="text-foreground font-semibold mb-3 flex items-center">
                <Clock className="h-4 w-4 mr-2 text-primary" />
                Active Sessions
              </h3>

              <Card className="border-border mb-4">
                <CardContent className="p-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-foreground font-medium">Current Session</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Chrome on Windows • Toronto, Canada</div>
                    </div>
                    <div className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full flex items-center font-semibold">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary mr-1.5 animate-pulse"></span>
                      Active Now
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button className="bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 w-full font-medium">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out All Devices
              </Button>
            </div>
          </div>
        );

      case "classification":
        return (
          <div className="space-y-5">
            {classificationError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{classificationError}</AlertDescription>
              </Alert>
            )}

            {classificationSuccess && (
              <Alert className="border-emerald-200 bg-emerald-50">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <AlertDescription className="text-emerald-700">
                  Classification saved successfully!
                </AlertDescription>
              </Alert>
            )}

            <div>
              <h3 className="text-foreground font-semibold mb-3 flex items-center">
                <MapPin className="h-4 w-4 mr-2 text-primary" />
                Your Classification
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Set your State, City, Board, and Class to see courses tailored for you.
              </p>

              {classificationLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ClassificationSelector
                  value={classification || undefined}
                  onChange={(newClassification) => setClassification(newClassification)}
                  showAllFields={true}
                  disabled={classificationSaving}
                />
              )}
            </div>

            {classification && (
              <div className="pt-4">
                <h3 className="text-foreground font-semibold mb-3 flex items-center">
                  <GraduationCap className="h-4 w-4 mr-2 text-primary" />
                  Current Classification
                </h3>
                <Card className="border-border">
                  <CardContent className="p-4">
                    <ClassificationDisplay classification={classification} />
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                onClick={saveClassification}
                disabled={classificationSaving || !classification?.state_id || !classification?.city_id || !classification?.board_id || !classification?.class_level}
                className="bg-primary hover:bg-primary/90"
              >
                {classificationSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Classification
              </Button>

              {classification && classification.class_level < 12 && (
                <Button
                  variant="outline"
                  onClick={promoteClass}
                  disabled={classificationSaving}
                  className="border-primary/30 text-primary hover:bg-primary/5"
                >
                  <ArrowUp className="w-4 h-4 mr-2" />
                  Promote to Class {(classification.class_level || 0) + 1}
                </Button>
              )}
            </div>

            <Card className="mt-4 border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-start">
                  <div className="mr-3 mt-1">
                    <div className="rounded-full bg-primary/10 p-2">
                      <MapPin className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-foreground font-medium">Why is this important?</h4>
                    <p className="text-muted-foreground text-sm mt-1">
                      Your classification helps us show you courses that match your curriculum,
                      connect you with students in your area, and provide relevant study materials.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <MainLayout>
      <div className="flex-1 bg-background relative">
        <ScrollArea className="h-[calc(100vh-64px)]" type="hover">
          {/* Fullscreen button */}
          <FullscreenButton
            isFullScreen={isFullScreen}
            onToggle={toggleFullScreen}
          />

          <div className="max-w-7xl mx-auto px-14 sm:px-20 lg:px-28 pt-6 sm:pt-8 pb-8">
            {/* Breadcrumb */}
            <Breadcrumb items={[{ label: "Profile" }]} className="mb-6" />

            <section>
              <div className="mb-8">
                <div className="space-y-1">
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">User Profile</h1>
                  <p className="text-muted-foreground">Manage your account information and preferences</p>
                </div>
              </div>

              <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Profile Summary Card */}
                <div className="md:col-span-1">
                  <Card className="overflow-hidden bg-card rounded-xl shadow-sm border border-border transition-all hover:shadow-md hover:border-primary/30 sticky top-6">
                    <div className="relative h-20 bg-gradient-to-r from-primary/20 to-primary/10 overflow-hidden">
                      {/* Decorative pattern */}
                      <div className="absolute inset-0 opacity-30"
                        style={{
                          backgroundImage: "linear-gradient(hsl(var(--muted-foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--muted-foreground)) 1px, transparent 1px)",
                          backgroundSize: "20px 20px"
                        }}>
                      </div>
                    </div>

                    <CardContent className="pt-0 relative -mt-10 px-5 pb-4">
                      <div className="flex flex-col items-center text-center">
                        <Avatar className="w-20 h-20 border-3 border-background shadow-md">
                          <AvatarImage
                            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image.png-FPfEiipvdvhwsMSNzwhzUEfKWZ1Ubm.jpeg"
                            alt="Profile picture of an orange cat"
                          />
                          <AvatarFallback className="text-xl font-bold bg-primary text-primary-foreground">SZ</AvatarFallback>
                        </Avatar>

                        <h2 className="mt-3 text-xl font-bold text-foreground">{name}</h2>
                        <p className="text-primary font-medium flex items-center justify-center">
                          @samzhong
                          <span className="inline-block ml-2 px-1.5 py-0.5 bg-primary/10 rounded-full text-[10px] border border-primary/30 font-semibold">
                            <Zap className="inline-block h-2.5 w-2.5 mr-0.5 text-primary" />
                            PRO
                          </span>
                        </p>
                        <p className="text-muted-foreground font-medium mt-0.5">{school}</p>

                        <div className="w-full mt-4 space-y-1.5">
                          <div className="flex items-center justify-between py-1.5 border-t border-border">
                            <span className="text-muted-foreground font-medium">Joined</span>
                            <span className="text-foreground font-medium">March 2023</span>
                          </div>
                          <div className="flex items-center justify-between py-1.5 border-t border-border">
                            <span className="text-muted-foreground font-medium">Courses</span>
                            <span className="text-foreground font-medium">12 completed</span>
                          </div>
                          <div className="flex items-center justify-between py-1.5 border-t border-border">
                            <span className="text-muted-foreground font-medium">Status</span>
                            <span className="text-primary font-medium flex items-center">
                              <span className="h-2 w-2 rounded-full bg-primary mr-1.5 animate-pulse"></span>
                              Active
                            </span>
                          </div>
                        </div>

                        {/* AI stats section */}
                        <div className="mt-4 pt-3 border-t border-border w-full">
                          <h3 className="text-primary text-sm font-semibold flex items-center justify-start">
                            <Cpu className="h-3.5 w-3.5 mr-1.5" />
                            AI Learning Stats
                          </h3>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <div className="bg-muted rounded-md p-2 border border-border">
                              <div className="text-primary text-xs font-medium">AI Sessions</div>
                              <div className="text-foreground text-base font-bold">28</div>
                            </div>
                            <div className="bg-muted rounded-md p-2 border border-border">
                              <div className="text-primary text-xs font-medium">Score</div>
                              <div className="text-foreground text-base font-bold">92%</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Main Settings Area with Custom Tabs */}
                <div className="md:col-span-2">
                  <Card className="overflow-hidden bg-card rounded-xl shadow-sm border border-border transition-all hover:shadow-md hover:border-primary/30">
                    <CardHeader className="border-b border-border bg-card pb-2 px-5 pt-4">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg font-bold text-foreground flex items-center">
                          Account Settings
                        </CardTitle>
                        {isEditing ? (
                          <Button
                            onClick={() => {
                              console.log("Saving changes:", { name, email, school, selectedPreferences })
                              setIsEditing(false)
                            }}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                            size="sm"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Save Changes
                          </Button>
                        ) : (
                          <Button
                            onClick={() => setIsEditing(true)}
                            variant="outline"
                            className="border-primary/30 text-primary hover:bg-primary/5 hover:text-primary font-medium"
                            size="sm"
                          >
                            <Edit3 className="h-4 w-4 mr-2" />
                            Edit Profile
                          </Button>
                        )}
                      </div>
                    </CardHeader>

                    {/* Custom tabs */}
                    <div>
                      <div className="border-b border-border bg-card flex">
                        <button
                          className={`h-10 px-5 flex items-center font-medium ${activeTab === 'profile'
                            ? 'text-foreground border-b-2 border-primary'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                          onClick={() => setActiveTab('profile')}
                        >
                          <User className={`h-4 w-4 mr-2 ${activeTab === 'profile' ? 'text-primary' : 'text-muted-foreground'}`} />
                          Profile
                        </button>
                        <button
                          className={`h-10 px-5 flex items-center font-medium ${activeTab === 'preferences'
                            ? 'text-foreground border-b-2 border-primary'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                          onClick={() => setActiveTab('preferences')}
                        >
                          <Sparkles className={`h-4 w-4 mr-2 ${activeTab === 'preferences' ? 'text-primary' : 'text-muted-foreground'}`} />
                          Preferences
                        </button>
                        <button
                          className={`h-10 px-5 flex items-center font-medium ${activeTab === 'security'
                            ? 'text-foreground border-b-2 border-primary'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                          onClick={() => setActiveTab('security')}
                        >
                          <Shield className={`h-4 w-4 mr-2 ${activeTab === 'security' ? 'text-primary' : 'text-muted-foreground'}`} />
                          Security
                        </button>
                        <button
                          className={`h-10 px-5 flex items-center font-medium ${activeTab === 'classification'
                            ? 'text-foreground border-b-2 border-primary'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                          onClick={() => setActiveTab('classification')}
                        >
                          <MapPin className={`h-4 w-4 mr-2 ${activeTab === 'classification' ? 'text-primary' : 'text-muted-foreground'}`} />
                          Classification
                          {!classification && (
                            <span className="ml-2 w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                          )}
                        </button>
                      </div>

                      <CardContent className="p-5">
                        {renderTabContent()}
                      </CardContent>
                    </div>
                  </Card>
                </div>
              </div>
            </section>
          </div>
        </ScrollArea>
      </div>
    </MainLayout>
  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    }>
      <ProfilePageContent />
    </Suspense>
  )
}
