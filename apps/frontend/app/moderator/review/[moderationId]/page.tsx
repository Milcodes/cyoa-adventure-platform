'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'
import { apiClient } from '@/lib/api/client'
import TopNav from '@/components/TopNav'
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  User,
  Calendar,
  FileText,
  MessageSquare,
  GitBranch,
  Eye
} from 'lucide-react'

interface ModerationDetails {
  id: string
  story_id: string
  author_id: string
  submitted_at: string
  author_notes?: string
  story: {
    id: string
    title: string
    description: string
    genre: string
    created_at: string
  }
  author: {
    display_name: string
    email: string
  }
}

interface Node {
  id: string
  text_content: string
  media_url?: string
  choices: Array<{ id: string; text: string }>
}

export default function ReviewModerationPage() {
  const router = useRouter()
  const params = useParams()
  const moderationId = params.moderationId as string
  const { user, isAuthenticated } = useAuthStore()

  const [moderation, setModeration] = useState<ModerationDetails | null>(null)
  const [nodes, setNodes] = useState<Node[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [decision, setDecision] = useState<'approved' | 'rejected' | null>(null)
  const [moderatorNotes, setModeratorNotes] = useState('')

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login')
      return
    }

    if (user?.role !== 'moderator' && user?.role !== 'admin') {
      router.push('/dashboard')
      return
    }

    loadModerationDetails()
  }, [moderationId, isAuthenticated, user, router])

  const loadModerationDetails = async () => {
    setLoading(true)
    setError('')

    try {
      // Get moderation status (this will give us story details)
      const { data: moderationData } = await apiClient.get(
        `/moderation/stories/${moderationId}/status`
      )

      // For now, we'll fetch pending to find this specific moderation
      const { data: pendingData } = await apiClient.get('/moderation/pending')
      const foundModeration = pendingData.find((m: any) => m.id === moderationId)

      if (foundModeration) {
        setModeration(foundModeration)

        // Load story nodes
        const { data: nodesData } = await apiClient.get(
          `/stories/${foundModeration.story_id}/nodes`
        )
        setNodes(nodesData)
      } else {
        setError('Moderation nem található')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Betöltés sikertelen')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitReview = async () => {
    if (!decision) {
      alert('Kérlek válassz döntést (Jóváhagyás vagy Elutasítás)')
      return
    }

    if (decision === 'rejected' && !moderatorNotes.trim()) {
      alert('Elutasítás esetén kötelező megadni az indoklást')
      return
    }

    setSubmitting(true)

    try {
      await apiClient.patch(`/moderation/${moderationId}/review`, {
        status: decision,
        notes: moderatorNotes.trim() || undefined
      })

      alert(`Történet ${decision === 'approved' ? 'jóváhagyva' : 'elutasítva'}!`)
      router.push('/moderator')
    } catch (err: any) {
      alert('Hiba: ' + (err.response?.data?.message || 'Ismeretlen hiba'))
    } finally {
      setSubmitting(false)
    }
  }

  const handlePreviewStory = () => {
    if (moderation) {
      window.open(`/play/${moderation.story_id}`, '_blank')
    }
  }

  if (!isAuthenticated || (user?.role !== 'moderator' && user?.role !== 'admin')) {
    return null
  }

  return (
    <div className="min-h-screen">
      <TopNav />

      <main className="pt-20 px-6 pb-12">
        <div className="max-w-7xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => router.push('/moderator')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            Vissza a várólistához
          </button>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-12 h-12 animate-spin text-primary-500" />
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded mb-6 flex items-center gap-3">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          {/* Content */}
          {!loading && !error && moderation && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Story Details */}
              <div className="lg:col-span-2 space-y-6">
                {/* Story Info */}
                <div className="game-panel p-6">
                  <h1 className="text-3xl font-bold mb-4">{moderation.story.title}</h1>

                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Leírás:</p>
                      <p className="text-gray-300">
                        {moderation.story.description || 'Nincs leírás'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 mb-1">Műfaj:</p>
                        <p className="text-gray-300 capitalize">{moderation.story.genre}</p>
                      </div>

                      <div>
                        <p className="text-gray-500 mb-1">Létrehozva:</p>
                        <p className="text-gray-300">
                          {new Date(moderation.story.created_at).toLocaleDateString('hu-HU')}
                        </p>
                      </div>
                    </div>

                    {moderation.author_notes && (
                      <div className="p-4 bg-game-dark rounded-lg border border-game-border">
                        <p className="text-sm text-gray-500 mb-2 flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" />
                          Szerző megjegyzése:
                        </p>
                        <p className="text-gray-300">{moderation.author_notes}</p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handlePreviewStory}
                    className="w-full mt-6 game-button flex items-center justify-center gap-2"
                  >
                    <Eye className="w-5 h-5" />
                    Történet előnézete
                  </button>
                </div>

                {/* Nodes Preview */}
                <div className="game-panel p-6">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <GitBranch className="w-5 h-5" />
                    Node-ok ({nodes.length})
                  </h2>

                  {nodes.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">
                      ⚠️ A történetben nincsenek node-ok!
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {nodes.map((node, idx) => (
                        <div
                          key={node.id}
                          className="p-4 bg-game-dark rounded-lg border border-game-border"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                              <span className="text-primary-500 font-bold">{idx + 1}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-300 line-clamp-2 mb-2">
                                {node.text_content}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span>{node.choices.length} választás</span>
                                {node.media_url && <span>Média csatolva</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Review Panel */}
              <div className="space-y-6">
                {/* Author Info */}
                <div className="game-panel p-6">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Szerző információk
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Név:</p>
                      <p className="text-sm font-medium">{moderation.author.display_name}</p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 mb-1">Email:</p>
                      <p className="text-sm">{moderation.author.email}</p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 mb-1">Beküldve:</p>
                      <p className="text-sm">
                        {new Date(moderation.submitted_at).toLocaleString('hu-HU')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Review Decision */}
                <div className="game-panel p-6">
                  <h3 className="text-lg font-bold mb-4">Elbírálás</h3>

                  {/* Decision Buttons */}
                  <div className="space-y-3 mb-6">
                    <button
                      onClick={() => setDecision('approved')}
                      className={`w-full p-4 rounded-lg border-2 transition-all ${
                        decision === 'approved'
                          ? 'border-green-500 bg-green-500/20'
                          : 'border-game-border hover:border-green-500/50'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-3">
                        <CheckCircle className={`w-6 h-6 ${decision === 'approved' ? 'text-green-500' : 'text-gray-400'}`} />
                        <span className={`font-bold ${decision === 'approved' ? 'text-green-500' : 'text-gray-400'}`}>
                          Jóváhagyás
                        </span>
                      </div>
                    </button>

                    <button
                      onClick={() => setDecision('rejected')}
                      className={`w-full p-4 rounded-lg border-2 transition-all ${
                        decision === 'rejected'
                          ? 'border-red-500 bg-red-500/20'
                          : 'border-game-border hover:border-red-500/50'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-3">
                        <XCircle className={`w-6 h-6 ${decision === 'rejected' ? 'text-red-500' : 'text-gray-400'}`} />
                        <span className={`font-bold ${decision === 'rejected' ? 'text-red-500' : 'text-gray-400'}`}>
                          Elutasítás
                        </span>
                      </div>
                    </button>
                  </div>

                  {/* Moderator Notes */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium mb-2">
                      Megjegyzés {decision === 'rejected' && <span className="text-red-500">*</span>}
                    </label>
                    <textarea
                      value={moderatorNotes}
                      onChange={(e) => setModeratorNotes(e.target.value)}
                      className="w-full px-4 py-3 bg-game-dark border border-game-border rounded-lg focus:border-primary-500 focus:outline-none"
                      rows={4}
                      placeholder={
                        decision === 'rejected'
                          ? 'Írd le az elutasítás okát...'
                          : 'Opcionális megjegyzés...'
                      }
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    onClick={handleSubmitReview}
                    disabled={!decision || submitting}
                    className="w-full game-button flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Feldolgozás...
                      </>
                    ) : (
                      <>
                        <FileText className="w-5 h-5" />
                        Elbírálás beküldése
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
