"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/auth/supabase"
import { MainLayout } from "@/components/layout/MainLayout"
import { Breadcrumb } from "@/components/layout/Breadcrumb"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Library,
  FileText,
  Users,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight
} from "lucide-react"
import Link from "next/link"

interface AdminStats {
  totalCourses: number
  totalContributions: number
  pendingContributions: number
  approvedContributions: number
  recentActivity: {
    type: string
    description: string
    timestamp: string
  }[]
}

export default function AdminPage() {
  const router = useRouter()
  const { session, loading: authLoading } = useAuth()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const apiBaseUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000"

  useEffect(() => {
    const fetchStats = async () => {
      if (!session?.access_token) {
        setIsLoading(false)
        return
      }

      try {
        // Fetch courses count
        const coursesResponse = await fetch(`${apiBaseUrl}/api/community/courses`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })
        const coursesData = coursesResponse.ok ? await coursesResponse.json() : { courses: [] }

        // Calculate stats from available data
        const courses = coursesData.courses || []

        // For now, we'll use placeholder stats since we don't have a dedicated admin stats endpoint
        setStats({
          totalCourses: courses.length,
          totalContributions: courses.reduce((acc: number, c: any) => acc + (c.contribution_count || 0), 0),
          pendingContributions: 0, // Would need backend support
          approvedContributions: 0, // Would need backend support
          recentActivity: [
            {
              type: "course",
              description: "Course created or updated",
              timestamp: new Date().toISOString(),
            },
          ],
        })
      } catch (error) {
        console.error("Error fetching admin stats:", error)
        setStats({
          totalCourses: 0,
          totalContributions: 0,
          pendingContributions: 0,
          approvedContributions: 0,
          recentActivity: [],
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (!authLoading) {
      fetchStats()
    }
  }, [session?.access_token, authLoading, apiBaseUrl])

  if (authLoading || isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    )
  }

  if (!session) {
    router.push("/login")
    return null
  }

  return (
    <MainLayout>
      <div className="h-full overflow-auto bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumb items={[{ label: "Admin" }]} className="mb-6" />

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="mt-2 text-muted-foreground">
              Manage courses, review contributions, and monitor platform activity.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard
              title="Total Courses"
              value={stats?.totalCourses || 0}
              icon={Library}
              description="Active courses"
              trend="+5%"
            />
            <StatsCard
              title="Total Contributions"
              value={stats?.totalContributions || 0}
              icon={FileText}
              description="All contributions"
            />
            <StatsCard
              title="Pending Review"
              value={stats?.pendingContributions || 0}
              icon={Clock}
              description="Awaiting approval"
              highlight={stats?.pendingContributions ? stats.pendingContributions > 0 : false}
            />
            <StatsCard
              title="Approved"
              value={stats?.approvedContributions || 0}
              icon={CheckCircle2}
              description="Published materials"
            />
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Library className="w-5 h-5 text-primary" />
                  Course Management
                </CardTitle>
                <CardDescription>
                  Create, edit, and manage courses with full classification control.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Link href="/admin/courses">
                    <Button className="w-full justify-between">
                      Manage Courses
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Link href="/admin/courses?action=create">
                    <Button variant="outline" className="w-full justify-between">
                      Create New Course
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Contribution Review
                </CardTitle>
                <CardDescription>
                  Review and approve pending contributions from community members.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Link href="/admin/contributions">
                    <Button className="w-full justify-between">
                      Review Contributions
                      {stats?.pendingContributions ? (
                        <span className="bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full">
                          {stats.pendingContributions}
                        </span>
                      ) : (
                        <ArrowRight className="w-4 h-4" />
                      )}
                    </Button>
                  </Link>
                  <Link href="/admin/contributions?status=approved">
                    <Button variant="outline" className="w-full justify-between">
                      View Approved
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Recent Activity
              </CardTitle>
              <CardDescription>
                Latest updates and changes across the platform.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {stats.recentActivity.map((activity, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        {activity.type === "course" && <Library className="w-5 h-5 text-primary" />}
                        {activity.type === "contribution" && <FileText className="w-5 h-5 text-primary" />}
                        {activity.type === "user" && <Users className="w-5 h-5 text-primary" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {activity.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No recent activity to display.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}

function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  highlight,
}: {
  title: string
  value: number
  icon: React.ElementType
  description: string
  trend?: string
  highlight?: boolean
}) {
  return (
    <Card className={highlight ? "border-destructive" : ""}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            highlight ? "bg-destructive/10" : "bg-primary/10"
          }`}>
            <Icon className={`w-6 h-6 ${highlight ? "text-destructive" : "text-primary"}`} />
          </div>
        </div>
        {trend && (
          <div className="mt-4 flex items-center gap-1 text-xs text-green-600">
            <TrendingUp className="w-3 h-3" />
            <span>{trend} from last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
