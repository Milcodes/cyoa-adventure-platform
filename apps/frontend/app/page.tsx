import Link from 'next/link'
import { Gamepad2, BookOpen, Sparkles } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-4xl w-full text-center space-y-12">
        {/* Hero Section */}
        <div className="space-y-6 animate-fade-in">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-primary-400 to-purple-500 bg-clip-text text-transparent">
            CYOA Adventure Platform
          </h1>
          <p className="text-2xl text-gray-300">
            Készíts és játssz interaktív kalandjátékokat
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-8 mt-12">
          {/* Login */}
          <Link href="/auth/login">
            <div className="game-panel p-8 hover:border-primary-500 transition-all group">
              <Gamepad2 className="w-16 h-16 mx-auto mb-4 text-primary-500 group-hover:scale-110 transition-transform" />
              <h2 className="text-2xl font-bold mb-2">Bejelentkezés</h2>
              <p className="text-gray-400">Folytasd kalandjaidat</p>
            </div>
          </Link>

          {/* Register */}
          <Link href="/auth/register">
            <div className="game-panel p-8 hover:border-purple-500 transition-all group">
              <Sparkles className="w-16 h-16 mx-auto mb-4 text-purple-500 group-hover:scale-110 transition-transform" />
              <h2 className="text-2xl font-bold mb-2">Regisztráció</h2>
              <p className="text-gray-400">Kezdd el az utazást</p>
            </div>
          </Link>
        </div>

        {/* Features */}
        <div className="mt-16 grid grid-cols-3 gap-6 text-sm">
          <div>
            <BookOpen className="w-8 h-8 mx-auto mb-2 text-primary-400" />
            <p className="text-gray-400">Több száz kaland</p>
          </div>
          <div>
            <Gamepad2 className="w-8 h-8 mx-auto mb-2 text-primary-400" />
            <p className="text-gray-400">Interaktív játékmenet</p>
          </div>
          <div>
            <Sparkles className="w-8 h-8 mx-auto mb-2 text-primary-400" />
            <p className="text-gray-400">Készítsd el saját történeted</p>
          </div>
        </div>
      </div>
    </div>
  )
}
