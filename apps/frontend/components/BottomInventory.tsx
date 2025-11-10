'use client'

import { useState } from 'react'
import {
  Package,
  ChevronUp,
  Coins,
  Heart,
  Shield,
  Zap,
  Star
} from 'lucide-react'

interface InventoryItem {
  item_id: string
  quantity: number
}

interface Wallet {
  currency: string
  amount: number
}

interface Stat {
  stat_name: string
  value: number
}

interface BottomInventoryProps {
  inventory?: InventoryItem[]
  wallets?: Wallet[]
  stats?: Stat[]
}

const walletIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  gold: Coins,
  silver: Coins,
  crystals: Star,
  gems: Star,
  energy: Zap
}

const statIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  health: Heart,
  hp: Heart,
  armor: Shield,
  defense: Shield,
  attack: Zap,
  strength: Zap,
  magic: Star
}

export default function BottomInventory({
  inventory = [],
  wallets = [],
  stats = []
}: BottomInventoryProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const hasContent = inventory.length > 0 || wallets.length > 0 || stats.length > 0

  if (!hasContent) {
    return null
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40">
      {/* Expanded Panel */}
      {isExpanded && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-30"
            onClick={() => setIsExpanded(false)}
          />
          <div className="relative z-40 bg-game-dark/98 backdrop-blur-sm border-t border-game-border max-h-96 overflow-y-auto">
            <div className="max-w-7xl mx-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Inventory Section */}
                {inventory.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <Package className="w-5 h-5 text-primary-500" />
                      Inventory
                    </h3>
                    <div className="space-y-2">
                      {inventory.map((item) => (
                        <div
                          key={item.item_id}
                          className="game-panel p-3 flex items-center justify-between"
                        >
                          <span className="font-medium">{item.item_id}</span>
                          <span className="text-gray-400">x{item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Wallets Section */}
                {wallets.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <Coins className="w-5 h-5 text-yellow-500" />
                      Pénztárca
                    </h3>
                    <div className="space-y-2">
                      {wallets.map((wallet) => {
                        const Icon = walletIcons[wallet.currency.toLowerCase()] || Coins
                        return (
                          <div
                            key={wallet.currency}
                            className="game-panel p-3 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4 text-yellow-500" />
                              <span className="font-medium capitalize">{wallet.currency}</span>
                            </div>
                            <span className="text-yellow-500 font-bold">{wallet.amount}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Stats Section */}
                {stats.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-green-500" />
                      Statisztikák
                    </h3>
                    <div className="space-y-2">
                      {stats.map((stat) => {
                        const Icon = statIcons[stat.stat_name.toLowerCase()] || Star
                        return (
                          <div
                            key={stat.stat_name}
                            className="game-panel p-3 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4 text-green-500" />
                              <span className="font-medium capitalize">{stat.stat_name}</span>
                            </div>
                            <span className="text-green-500 font-bold">{stat.value}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Collapsed Bar */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full bg-game-dark/95 backdrop-blur-sm border-t border-game-border py-3 hover:bg-game-panel transition-colors"
      >
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            {/* Quick Inventory */}
            {inventory.length > 0 && (
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-primary-500" />
                <span className="text-sm font-medium">{inventory.length} tárgy</span>
              </div>
            )}

            {/* Quick Wallets */}
            {wallets.map((wallet) => {
              const Icon = walletIcons[wallet.currency.toLowerCase()] || Coins
              return (
                <div key={wallet.currency} className="flex items-center gap-2">
                  <Icon className="w-5 h-5 text-yellow-500" />
                  <span className="text-sm font-medium text-yellow-500">{wallet.amount}</span>
                </div>
              )
            })}

            {/* Quick Stats */}
            {stats.slice(0, 3).map((stat) => {
              const Icon = statIcons[stat.stat_name.toLowerCase()] || Star
              return (
                <div key={stat.stat_name} className="hidden sm:flex items-center gap-2">
                  <Icon className="w-5 h-5 text-green-500" />
                  <span className="text-sm font-medium text-green-500">{stat.value}</span>
                </div>
              )
            })}
          </div>

          <div className="flex items-center gap-2 text-gray-400">
            <span className="text-sm">{isExpanded ? 'Bezárás' : 'Részletek'}</span>
            <ChevronUp className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </button>
    </div>
  )
}
