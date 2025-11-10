'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'
import { useGameStore } from '@/lib/store/gameStore'
import { apiClient } from '@/lib/api/client'
import TopNav from '@/components/TopNav'
import BottomInventory from '@/components/BottomInventory'
import {
  Loader2,
  AlertCircle,
  Volume2,
  VolumeX,
  RefreshCcw,
  BookmarkPlus
} from 'lucide-react'

interface Story {
  id: string
  title: string
  description: string
  genre: string
}

interface Choice {
  id: string
  text: string
  target_node_id: string
  conditions?: any
  effects?: any
}

interface Node {
  id: string
  story_id: string
  text_content: string
  media_url?: string
  media_layout?: 'image' | 'video' | 'html' | 'audio'
  html_content?: string
  choices: Choice[]
  auto_progression_delay?: number
}

interface GameState {
  save_id: string
  current_node_id: string
  inventory: Array<{ item_id: string; quantity: number }>
  wallets: Array<{ currency: string; amount: number }>
  stats: Array<{ stat_name: string; value: number }>
  flags: string[]
}

export default function PlayStoryPage() {
  const params = useParams()
  const router = useRouter()
  const storyId = params.storyId as string

  const { isAuthenticated } = useAuthStore()
  const { saveId, updateGameState, resetGame } = useGameStore()

  const [story, setStory] = useState<Story | null>(null)
  const [currentNode, setCurrentNode] = useState<Node | null>(null)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  const [isMuted, setIsMuted] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login')
      return
    }

    initializeGame()
  }, [storyId, isAuthenticated, router])

  const initializeGame = async () => {
    setLoading(true)
    setError('')

    try {
      // Load story details
      const { data: storyData } = await apiClient.get(`/stories/${storyId}`)
      setStory(storyData)

      // Start or continue game
      let gameSave
      if (saveId) {
        // Try to load existing save
        try {
          const { data } = await apiClient.get(`/gameplay/saves/${saveId}`)
          if (data.story_id === storyId) {
            gameSave = data
          }
        } catch (err) {
          // Save not found, start new game
        }
      }

      if (!gameSave) {
        // Start new game - use correct API format
        const { data } = await apiClient.post(`/gameplay/start`, { storyId })

        // Backend returns: { saveId, gameState, currentNode, availableChoices }
        // Transform to internal format
        gameSave = {
          save_id: data.saveId,
          current_node_id: data.currentNode.id,
          inventory: data.gameState.inventory || [],
          wallets: data.gameState.wallets || [],
          stats: data.gameState.stats || [],
          flags: data.gameState.flags || []
        }

        updateGameState({ saveId: data.saveId, currentStoryId: storyId })
        setGameState(gameSave)

        // Set current node directly from response (no need for extra API call)
        setCurrentNode(data.currentNode)
        setLoading(false)
        return
      }

      setGameState(gameSave)

      // Load current node
      await loadNode(gameSave.current_node_id)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Játék betöltése sikertelen')
    } finally {
      setLoading(false)
    }
  }

  const loadNode = async (nodeId: string) => {
    try {
      const { data } = await apiClient.get(`/gameplay/node/${nodeId}`)
      setCurrentNode(data)

      // Auto progression if configured
      if (data.auto_progression_delay && data.choices.length === 1) {
        setTimeout(() => {
          handleChoice(data.choices[0], 0)
        }, data.auto_progression_delay * 1000)
      }
    } catch (err: any) {
      setError('Node betöltése sikertelen')
    }
  }

  const handleChoice = async (choice: Choice, choiceIndex: number) => {
    if (processing || !gameState) return

    setProcessing(true)
    setError('')

    try {
      // API expects saveId and choiceIndex (number)
      const { data } = await apiClient.post(
        `/gameplay/choice`,
        {
          saveId: gameState.save_id,
          choiceIndex: choiceIndex
        }
      )

      // Backend returns: { transition, gameState, currentNode, availableChoices }
      // Transform to internal format
      const updatedGameState = {
        save_id: gameState.save_id,
        current_node_id: data.gameState.currentNodeId,
        inventory: data.gameState.inventory || [],
        wallets: data.gameState.wallets || [],
        stats: data.gameState.stats || [],
        flags: data.gameState.flags || []
      }

      setGameState(updatedGameState)
      updateGameState({
        inventory: data.gameState.inventory,
        wallets: data.gameState.wallets,
        stats: data.gameState.stats,
        flags: data.gameState.flags
      })

      // Set next node directly from response (no need for extra API call)
      setCurrentNode(data.currentNode)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Választás végrehajtása sikertelen')
    } finally {
      setProcessing(false)
    }
  }

  const handleRestart = async () => {
    if (!confirm('Biztosan újraindítod a játékot? Az aktuális előrehaladás elveszik.')) {
      return
    }

    resetGame()
    await initializeGame()
  }

  const handleSaveBookmark = async () => {
    if (!gameState) return

    try {
      await apiClient.post(`/gameplay/saves/${gameState.save_id}/bookmark`)
      alert('Játékállás elmentve!')
    } catch (err: any) {
      alert('Mentés sikertelen')
    }
  }

  const renderMedia = () => {
    if (!currentNode?.media_url) return null

    const layout = currentNode.media_layout || 'image'

    switch (layout) {
      case 'image':
        return (
          <div className="w-full aspect-video rounded-lg overflow-hidden bg-game-panel">
            <img
              src={currentNode.media_url}
              alt="Story scene"
              className="w-full h-full object-cover"
            />
          </div>
        )

      case 'video':
        return (
          <div className="w-full aspect-video rounded-lg overflow-hidden bg-game-panel">
            <video
              src={currentNode.media_url}
              controls
              muted={isMuted}
              className="w-full h-full"
            />
          </div>
        )

      case 'audio':
        return (
          <div className="w-full game-panel p-6 rounded-lg flex items-center justify-center gap-4">
            <Volume2 className="w-8 h-8 text-primary-500" />
            <audio
              src={currentNode.media_url}
              controls
              muted={isMuted}
              className="flex-1"
            />
          </div>
        )

      case 'html':
        return (
          <div className="w-full game-panel p-6 rounded-lg">
            <div
              dangerouslySetInnerHTML={{ __html: currentNode.html_content || '' }}
              className="prose prose-invert max-w-none"
            />
          </div>
        )

      default:
        return null
    }
  }

  const isChoiceAvailable = (choice: Choice): boolean => {
    if (!choice.conditions || !gameState) return true

    // Simple condition checking - this should match backend logic
    // For now, just return true. Real implementation would evaluate JSONLogic
    return true
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navigation */}
      <TopNav storyTitle={story?.title} showStoryTitle={true} />

      {/* Main Content */}
      <main className="flex-1 pt-20 pb-24 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-12 h-12 animate-spin text-primary-500" />
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="game-panel p-6 text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
              <p className="text-red-500 mb-4">{error}</p>
              <button onClick={() => router.push('/dashboard')} className="game-button">
                Vissza a főoldalra
              </button>
            </div>
          )}

          {/* Game Content */}
          {!loading && !error && currentNode && (
            <div className="space-y-6 animate-fade-in">
              {/* Media Section */}
              {currentNode.media_url && (
                <div className="relative">
                  {renderMedia()}

                  {/* Media Controls */}
                  {(currentNode.media_layout === 'video' || currentNode.media_layout === 'audio') && (
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className="absolute top-4 right-4 p-2 bg-black/50 rounded-lg hover:bg-black/70 transition-colors"
                    >
                      {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>
                  )}
                </div>
              )}

              {/* Story Text */}
              <div className="game-panel p-8">
                <div className="prose prose-invert max-w-none">
                  <p className="text-lg leading-relaxed whitespace-pre-wrap">
                    {currentNode.text_content}
                  </p>
                </div>
              </div>

              {/* Choices */}
              <div className="space-y-3">
                {currentNode.choices.length === 0 ? (
                  <div className="game-panel p-6 text-center">
                    <h3 className="text-xl font-bold mb-4">A történet véget ért</h3>
                    <div className="flex gap-4 justify-center">
                      <button onClick={handleRestart} className="game-button flex items-center gap-2">
                        <RefreshCcw className="w-5 h-5" />
                        Újrakezdés
                      </button>
                      <button onClick={() => router.push('/dashboard')} className="game-button">
                        Vissza a főoldalra
                      </button>
                    </div>
                  </div>
                ) : (
                  currentNode.choices.map((choice, index) => {
                    const available = isChoiceAvailable(choice)
                    return (
                      <button
                        key={choice.id}
                        onClick={() => handleChoice(choice, index)}
                        disabled={!available || processing}
                        className={`w-full game-panel p-4 text-left hover:border-primary-500 transition-all transform hover:translate-x-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 ${
                          processing ? 'animate-pulse' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-primary-500 font-bold">{index + 1}</span>
                          </div>
                          <p className="flex-1">{choice.text}</p>
                          {!available && (
                            <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
                              Nem elérhető
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })
                )}
              </div>

              {/* Action Buttons */}
              {currentNode.choices.length > 0 && (
                <div className="flex gap-3 justify-end pt-4">
                  <button
                    onClick={handleSaveBookmark}
                    className="flex items-center gap-2 px-4 py-2 bg-game-panel hover:bg-game-hover rounded-lg transition-colors text-sm"
                  >
                    <BookmarkPlus className="w-4 h-4" />
                    Mentés
                  </button>
                  <button
                    onClick={handleRestart}
                    className="flex items-center gap-2 px-4 py-2 bg-game-panel hover:bg-game-hover rounded-lg transition-colors text-sm"
                  >
                    <RefreshCcw className="w-4 h-4" />
                    Újrakezdés
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Bottom Inventory */}
      {gameState && (
        <BottomInventory
          inventory={gameState.inventory}
          wallets={gameState.wallets}
          stats={gameState.stats}
        />
      )}
    </div>
  )
}
