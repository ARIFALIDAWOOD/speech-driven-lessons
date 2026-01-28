"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/auth/supabase"
import { MainLayout } from "@/components/layout/MainLayout"
import { Breadcrumb } from "@/components/layout/Breadcrumb"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  FileText,
  Image as ImageIcon,
  Youtube,
  Link as LinkIcon,
  Type,
  Loader2,
  CheckCircle2,
  XCircle,
  Eye,
  AlertCircle,
  Clock,
  ExternalLink,
} from "lucide-react"

type ContributionType = "pdf" | "image" | "youtube" | "link" | "text"
type ContributionStatus = "pending" | "approved" | "rejected"

interface Contribution {
  id: string
  course_id: string
  course_title?: string
  user_id: string
  user_email?: string
  title: string
  description?: string
  file_url?: string
  contribution_type: ContributionType
  contribution_metadata?: {
    youtube_url?: string
    link_url?: string
    text_content?: string
  }
  status: ContributionStatus
  created_at: string
  reviewed_at?: string
  reviewed_by?: string
}

const contributionTypeIcons: Record<ContributionType, React.ElementType> = {
  pdf: FileText,
  image: ImageIcon,
  youtube: Youtube,
  link: LinkIcon,
  text: Type,
}

const contributionTypeLabels: Record<ContributionType, string> = {
  pdf: "PDF Document",
  image: "Image",
  youtube: "YouTube Video",
  link: "External Link",
  text: "Text Content",
}

const statusColors: Record<ContributionStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
}

function AdminContributionsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { session, loading: authLoading } = useAuth()

  const [contributions, setContributions] = useState<Contribution[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<ContributionStatus>(
    (searchParams.get("status") as ContributionStatus) || "pending"
  )

  // Preview dialog
  const [previewContribution, setPreviewContribution] = useState<Contribution | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const apiBaseUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000"

  // Fetch contributions
  useEffect(() => {
    const fetchContributions = async () => {
      if (!session?.access_token) {
        setIsLoading(false)
        return
      }

      try {
        // Fetch all courses first
        const coursesResponse = await fetch(`${apiBaseUrl}/api/community/courses`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })

        if (!coursesResponse.ok) {
          setIsLoading(false)
          return
        }

        const coursesData = await coursesResponse.json()
        const courses = coursesData.courses || []

        // Fetch contributions for each course
        const allContributions: Contribution[] = []

        for (const course of courses) {
          try {
            const contribResponse = await fetch(
              `${apiBaseUrl}/api/community/courses/${course.id}/contributions`,
              {
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                },
              }
            )

            if (contribResponse.ok) {
              const contribData = await contribResponse.json()
              const courseContributions = (contribData.contributions || []).map((c: any) => ({
                ...c,
                course_id: course.id,
                course_title: course.title,
              }))
              allContributions.push(...courseContributions)
            }
          } catch (error) {
            console.error(`Error fetching contributions for course ${course.id}:`, error)
          }
        }

        setContributions(allContributions)
      } catch (error) {
        console.error("Error fetching contributions:", error)
      } finally {
        setIsLoading(false)
      }
    }

    if (!authLoading) {
      fetchContributions()
    }
  }, [session?.access_token, authLoading, apiBaseUrl])

  const filteredContributions = contributions.filter((c) => c.status === activeTab)

  const handleApprove = async (contribution: Contribution) => {
    if (!session?.access_token) return

    setIsProcessing(true)

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/community/courses/${contribution.course_id}/contributions/${contribution.id}/approve`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      )

      if (response.ok) {
        setContributions(
          contributions.map((c) =>
            c.id === contribution.id ? { ...c, status: "approved" as ContributionStatus } : c
          )
        )
        setSuccessMessage("Contribution approved successfully")
        setPreviewContribution(null)
        setTimeout(() => setSuccessMessage(null), 3000)
      }
    } catch (error) {
      console.error("Error approving contribution:", error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async (contribution: Contribution) => {
    if (!session?.access_token) return

    setIsProcessing(true)

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/community/courses/${contribution.course_id}/contributions/${contribution.id}/reject`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      )

      if (response.ok) {
        setContributions(
          contributions.map((c) =>
            c.id === contribution.id ? { ...c, status: "rejected" as ContributionStatus } : c
          )
        )
        setSuccessMessage("Contribution rejected")
        setPreviewContribution(null)
        setTimeout(() => setSuccessMessage(null), 3000)
      }
    } catch (error) {
      console.error("Error rejecting contribution:", error)
    } finally {
      setIsProcessing(false)
    }
  }

  const renderContributionPreview = (contribution: Contribution) => {
    const type = contribution.contribution_type || "pdf"
    const metadata = contribution.contribution_metadata || {}

    switch (type) {
      case "youtube":
        const youtubeUrl = metadata.youtube_url || ""
        const videoId = youtubeUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)?.[1]
        return videoId ? (
          <div className="aspect-video">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              className="w-full h-full rounded-lg"
              allowFullScreen
            />
          </div>
        ) : (
          <p className="text-muted-foreground">Invalid YouTube URL</p>
        )

      case "link":
        return (
          <div className="p-4 bg-muted rounded-lg">
            <a
              href={metadata.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-primary hover:underline"
            >
              <ExternalLink className="w-4 h-4" />
              {metadata.link_url}
            </a>
          </div>
        )

      case "text":
        return (
          <div className="p-4 bg-muted rounded-lg max-h-64 overflow-y-auto">
            <p className="whitespace-pre-wrap">{metadata.text_content}</p>
          </div>
        )

      case "image":
        return contribution.file_url ? (
          <img
            src={contribution.file_url}
            alt={contribution.title}
            className="max-w-full max-h-96 rounded-lg mx-auto"
          />
        ) : (
          <p className="text-muted-foreground">Image not available</p>
        )

      case "pdf":
      default:
        return contribution.file_url ? (
          <div className="space-y-4">
            <iframe
              src={contribution.file_url}
              className="w-full h-96 rounded-lg border"
              title={contribution.title}
            />
            <a
              href={contribution.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary hover:underline"
            >
              <ExternalLink className="w-4 h-4" />
              Open in new tab
            </a>
          </div>
        ) : (
          <p className="text-muted-foreground">File not available</p>
        )
    }
  }

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
          <Breadcrumb
            items={[
              { label: "Admin", href: "/admin" },
              { label: "Contributions" },
            ]}
            className="mb-6"
          />

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              Contribution Review
            </h1>
            <p className="mt-2 text-muted-foreground">
              Review and moderate community contributions.
            </p>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <p className="text-green-700 dark:text-green-300">{successMessage}</p>
            </div>
          )}

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ContributionStatus)}>
            <TabsList className="mb-6">
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Pending
                {contributions.filter((c) => c.status === "pending").length > 0 && (
                  <Badge variant="secondary">
                    {contributions.filter((c) => c.status === "pending").length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="approved" className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Approved
              </TabsTrigger>
              <TabsTrigger value="rejected" className="flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                Rejected
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {filteredContributions.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      No {activeTab} contributions to display.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredContributions.map((contribution) => {
                    const TypeIcon = contributionTypeIcons[contribution.contribution_type || "pdf"]
                    return (
                      <Card key={contribution.id} className="overflow-hidden">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <TypeIcon className="w-4 h-4 text-primary" />
                              </div>
                              <Badge className={statusColors[contribution.status]}>
                                {contribution.status}
                              </Badge>
                            </div>
                          </div>
                          <CardTitle className="text-lg mt-3">{contribution.title}</CardTitle>
                          <CardDescription>
                            {contributionTypeLabels[contribution.contribution_type || "pdf"]}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="text-sm">
                              <span className="text-muted-foreground">Course: </span>
                              <span className="font-medium">{contribution.course_title}</span>
                            </div>
                            {contribution.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {contribution.description}
                              </p>
                            )}
                            <div className="text-xs text-muted-foreground">
                              Submitted {new Date(contribution.created_at).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-2 pt-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => setPreviewContribution(contribution)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Preview
                              </Button>
                              {contribution.status === "pending" && (
                                <>
                                  <Button
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => handleApprove(contribution)}
                                  >
                                    <CheckCircle2 className="w-4 h-4 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleReject(contribution)}
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Preview Dialog */}
          <Dialog
            open={!!previewContribution}
            onOpenChange={(open) => !open && setPreviewContribution(null)}
          >
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              {previewContribution && (
                <>
                  <DialogHeader>
                    <DialogTitle>{previewContribution.title}</DialogTitle>
                    <DialogDescription>
                      {contributionTypeLabels[previewContribution.contribution_type || "pdf"]} •{" "}
                      {previewContribution.course_title}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    {previewContribution.description && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Description</h4>
                        <p className="text-sm text-muted-foreground">
                          {previewContribution.description}
                        </p>
                      </div>
                    )}

                    <div>
                      <h4 className="text-sm font-medium mb-2">Preview</h4>
                      {renderContributionPreview(previewContribution)}
                    </div>
                  </div>

                  {previewContribution.status === "pending" && (
                    <DialogFooter>
                      <Button
                        variant="destructive"
                        onClick={() => handleReject(previewContribution)}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => handleApprove(previewContribution)}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Approve
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  )}
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </MainLayout>
  )
}

export default function AdminContributionsPage() {
  return (
    <Suspense fallback={
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    }>
      <AdminContributionsPageContent />
    </Suspense>
  )
}
