'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'
import { apiClient } from '@/lib/api/client'
import TopNav from '@/components/TopNav'
import {
  ArrowLeft,
  Save,
  Plus,
  Edit,
  Trash2,
  Play,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  Code,
  GitBranch,
  Star,
  Loader2,
  AlertCircle,
  Check
} from 'lucide-react'

interface Story {
  id: string
  title: string
  description: string
  genre: string
  status: string
  start_node_id: string | null
}

interface Node {
  id: string
  text_content: string
  media_url?: string
  media_layout?: 'image' | 'video' | 'html' | 'audio'
  choices: Array<{
    id: string
    text: string
    target_node_id: string
  }>
}

const mediaLayouts = [
  { id: 'image', name: 'Kép', icon: ImageIcon },
  { id: 'video', name: 'Videó', icon: Film },
  { id: 'audio', name: 'Hang', icon: Music },
  { id: 'html', name: 'HTML', icon: Code }
]

export default function StoryEditorPage() {
  const router = useRouter()
  const params = useParams()
  const storyId = params.storyId as string
  const { isAuthenticated, user } = useAuthStore()

  const [story, setStory] = useState<Story | null>(null)
  const [nodes, setNodes] = useState<Node[]>([])
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Form states
  const [storyForm, setStoryForm] = useState({
    title: '',
    description: '',
    genre: 'adventure'
  })

  const [nodeForm, setNodeForm] = useState({
    text_content: '',
    media_url: '',
    media_layout: 'image' as 'image' | 'video' | 'html' | 'audio',
    html_content: '',
    auto_progression_delay: 0
  })

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login')
      return
    }

    if (user?.role !== 'author' && user?.role !== 'admin') {
      router.push('/dashboard')
      return
    }

    loadStory()
    loadNodes()
  }, [storyId, isAuthenticated, user, router])

  const loadStory = async () => {
    try {
      const { data } = await apiClient.get(`/stories/${storyId}`)
      setStory(data)
      setStoryForm({
        title: data.title,
        description: data.description || '',
        genre: data.genre
      })
    } catch (err: any) {
      setError('Történet betöltése sikertelen')
    }
  }

  const loadNodes = async () => {
    setLoading(true)
    try {
      const { data } = await apiClient.get(`/stories/${storyId}/nodes`)
      setNodes(data)
    } catch (err: any) {
      setError('Node-ok betöltése sikertelen')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveStory = async () => {
    setSaving(true)
    setError('')

    try {
      const { data } = await apiClient.patch(`/stories/${storyId}`, storyForm)
      setStory(data)
      alert('Történet mentve!')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Mentés sikertelen')
    } finally {
      setSaving(false)
    }
  }

  const handleCreateNode = async () => {
    try {
      const { data } = await apiClient.post(`/stories/${storyId}/nodes`, {
        text_content: 'Új node - szerkeszd ezt a szöveget'
      })
      setNodes([...nodes, data])
      setSelectedNode(data)
      setNodeForm({
        text_content: data.text_content,
        media_url: data.media_url || '',
        media_layout: data.media_layout || 'image',
        html_content: data.html_content || '',
        auto_progression_delay: data.auto_progression_delay || 0
      })
    } catch (err: any) {
      alert('Node létrehozása sikertelen')
    }
  }

  const handleSelectNode = (node: Node) => {
    setSelectedNode(node)
    setNodeForm({
      text_content: node.text_content,
      media_url: node.media_url || '',
      media_layout: node.media_layout || 'image',
      html_content: '',
      auto_progression_delay: 0
    })
  }

  const handleSaveNode = async () => {
    if (!selectedNode) return

    setSaving(true)
    try {
      const { data } = await apiClient.patch(
        `/stories/${storyId}/nodes/${selectedNode.id}`,
        nodeForm
      )
      setNodes(nodes.map(n => n.id === selectedNode.id ? data : n))
      setSelectedNode(data)
      alert('Node mentve!')
    } catch (err: any) {
      alert('Mentés sikertelen')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteNode = async (nodeId: string) => {
    if (!confirm('Biztosan törölöd ezt a node-ot?')) return

    try {
      await apiClient.delete(`/stories/${storyId}/nodes/${nodeId}`)
      setNodes(nodes.filter(n => n.id !== nodeId))
      if (selectedNode?.id === nodeId) {
        setSelectedNode(null)
      }
    } catch (err: any) {
      alert('Törlés sikertelen')
    }
  }

  const handleSetStartNode = async (nodeId: string) => {
    try {
      await apiClient.patch(`/stories/${storyId}`, { start_node_id: nodeId })
      setStory(prev => prev ? { ...prev, start_node_id: nodeId } : null)
      alert('Kezdő node beállítva!')
    } catch (err: any) {
      alert('Beállítás sikertelen')
    }
  }

  const handleAddChoice = async () => {
    if (!selectedNode) return

    try {
      const { data } = await apiClient.post(
        `/stories/${storyId}/nodes/${selectedNode.id}/choices`,
        {
          text: 'Új választási lehetőség',
          target_node_id: selectedNode.id // temp, user should change this
        }
      )
      setSelectedNode({
        ...selectedNode,
        choices: [...selectedNode.choices, data]
      })
      setNodes(nodes.map(n =>
        n.id === selectedNode.id
          ? { ...n, choices: [...n.choices, data] }
          : n
      ))
    } catch (err: any) {
      alert('Választás hozzáadása sikertelen')
    }
  }

  const handleDeleteChoice = async (choiceId: string) => {
    if (!selectedNode || !confirm('Törölni szeretnéd ezt a választást?')) return

    try {
      await apiClient.delete(
        `/stories/${storyId}/nodes/${selectedNode.id}/choices/${choiceId}`
      )
      const updatedChoices = selectedNode.choices.filter(c => c.id !== choiceId)
      setSelectedNode({
        ...selectedNode,
        choices: updatedChoices
      })
      setNodes(nodes.map(n =>
        n.id === selectedNode.id
          ? { ...n, choices: updatedChoices }
          : n
      ))
    } catch (err: any) {
      alert('Törlés sikertelen')
    }
  }

  if (!isAuthenticated || (user?.role !== 'author' && user?.role !== 'admin')) {
    return null
  }

  return (
    <div className="min-h-screen">
      <TopNav storyTitle={story?.title} showStoryTitle={true} />

      <main className="pt-20 px-6 pb-12">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => router.push('/creator')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            Vissza a történeteimhez
          </button>

          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded mb-6 flex items-center gap-3">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Panel - Story Info & Nodes List */}
            <div className="space-y-6">
              {/* Story Info */}
              <div className="game-panel p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Történet Alapadatok
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Cím</label>
                    <input
                      type="text"
                      value={storyForm.title}
                      onChange={(e) => setStoryForm({ ...storyForm, title: e.target.value })}
                      className="w-full px-3 py-2 bg-game-dark border border-game-border rounded focus:border-primary-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Leírás</label>
                    <textarea
                      value={storyForm.description}
                      onChange={(e) => setStoryForm({ ...storyForm, description: e.target.value })}
                      className="w-full px-3 py-2 bg-game-dark border border-game-border rounded focus:border-primary-500 focus:outline-none"
                      rows={3}
                    />
                  </div>

                  <button
                    onClick={handleSaveStory}
                    disabled={saving}
                    className="w-full game-button flex items-center justify-center gap-2"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Mentés
                  </button>
                </div>
              </div>

              {/* Nodes List */}
              <div className="game-panel p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <GitBranch className="w-5 h-5" />
                    Node-ok ({nodes.length})
                  </h2>
                  <button
                    onClick={handleCreateNode}
                    className="p-2 bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
                    title="Új node"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                  </div>
                ) : nodes.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">
                    Még nincs node. Hozz létre egyet!
                  </p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {nodes.map((node) => (
                      <div
                        key={node.id}
                        className={`p-3 rounded-lg border-2 transition-colors cursor-pointer ${
                          selectedNode?.id === node.id
                            ? 'border-primary-500 bg-primary-500/10'
                            : 'border-game-border hover:border-game-hover'
                        }`}
                        onClick={() => handleSelectNode(node)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">
                              {node.text_content.substring(0, 40)}...
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {node.choices.length} választás
                            </p>
                          </div>

                          {story?.start_node_id === node.id && (
                            <span title="Kezdő node">
                              <Star className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                            </span>
                          )}
                        </div>

                        <div className="flex gap-1 mt-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSetStartNode(node.id)
                            }}
                            className="flex-1 px-2 py-1 text-xs bg-game-hover hover:bg-game-border rounded"
                          >
                            Kezdő
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteNode(node.id)
                            }}
                            className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 rounded"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel - Node Editor */}
            <div className="lg:col-span-2">
              {selectedNode ? (
                <div className="game-panel p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold">Node Szerkesztő</h2>
                    <button
                      onClick={handleSaveNode}
                      disabled={saving}
                      className="game-button flex items-center gap-2"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Node Mentése
                    </button>
                  </div>

                  <div className="space-y-6">
                    {/* Text Content */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Szöveg Tartalom</label>
                      <textarea
                        value={nodeForm.text_content}
                        onChange={(e) => setNodeForm({ ...nodeForm, text_content: e.target.value })}
                        className="w-full px-4 py-3 bg-game-dark border border-game-border rounded-lg focus:border-primary-500 focus:outline-none"
                        rows={6}
                        placeholder="Írd le, mi történik ebben a jelenetben..."
                      />
                    </div>

                    {/* Media Layout */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Média Típus</label>
                      <div className="grid grid-cols-4 gap-2">
                        {mediaLayouts.map((layout) => {
                          const Icon = layout.icon
                          return (
                            <button
                              key={layout.id}
                              type="button"
                              onClick={() =>
                                setNodeForm({ ...nodeForm, media_layout: layout.id as any })
                              }
                              className={`p-3 rounded-lg border-2 transition-colors flex flex-col items-center gap-2 ${
                                nodeForm.media_layout === layout.id
                                  ? 'border-primary-500 bg-primary-500/20'
                                  : 'border-game-border hover:border-game-hover'
                              }`}
                            >
                              <Icon className="w-6 h-6" />
                              <span className="text-xs">{layout.name}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Media URL */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Média URL</label>
                      <input
                        type="text"
                        value={nodeForm.media_url}
                        onChange={(e) => setNodeForm({ ...nodeForm, media_url: e.target.value })}
                        className="w-full px-4 py-3 bg-game-dark border border-game-border rounded-lg focus:border-primary-500 focus:outline-none"
                        placeholder="https://example.com/image.jpg"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Használd a /media endpointot fájl feltöltéshez
                      </p>
                    </div>

                    {/* Choices */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-sm font-medium">Választási Lehetőségek</label>
                        <button
                          onClick={handleAddChoice}
                          className="flex items-center gap-2 px-3 py-1 bg-primary-500 hover:bg-primary-600 rounded text-sm"
                        >
                          <Plus className="w-4 h-4" />
                          Új Választás
                        </button>
                      </div>

                      <div className="space-y-2">
                        {selectedNode.choices.length === 0 ? (
                          <p className="text-gray-400 text-center py-4 text-sm">
                            Még nincs választási lehetőség
                          </p>
                        ) : (
                          selectedNode.choices.map((choice, idx) => (
                            <div
                              key={choice.id}
                              className="p-3 bg-game-dark border border-game-border rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <span className="w-6 h-6 rounded-full bg-primary-500/20 flex items-center justify-center text-sm">
                                  {idx + 1}
                                </span>
                                <p className="flex-1 text-sm">{choice.text}</p>
                                <button
                                  onClick={() => handleDeleteChoice(choice.id)}
                                  className="p-1 hover:bg-red-600/20 rounded transition-colors"
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </button>
                              </div>
                              <p className="text-xs text-gray-500 mt-2 ml-9">
                                → Node: {choice.target_node_id.substring(0, 8)}...
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Preview */}
                    <div>
                      <button
                        onClick={() => router.push(`/play/${storyId}`)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                      >
                        <Play className="w-5 h-5" />
                        Történet Előnézete
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="game-panel p-12 text-center">
                  <GitBranch className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                  <h3 className="text-xl font-bold mb-2">Válassz egy node-ot</h3>
                  <p className="text-gray-400">
                    Válassz ki egy node-ot a bal oldali listából, vagy hozz létre egy újat
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
