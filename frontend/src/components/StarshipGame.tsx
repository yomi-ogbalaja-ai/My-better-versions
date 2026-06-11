import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createGame,
  drawGame,
  handleKeyDown,
  handleKeyUp,
  updateGame,
  type GameState,
} from '../game/starshipGame'

interface Score {
  name: string
  score: number
}

const StarshipGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<GameState | null>(null)
  const frameRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const [hudScore, setHudScore] = useState(0)
  const [phase, setPhase] = useState<string>('menu')
  const [leaderboard, setLeaderboard] = useState<Score[]>([])
  const [playerName, setPlayerName] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const prevPhaseRef = useRef('menu')
  const prevScoreRef = useRef(0)

  const fetchScores = useCallback(() => {
    fetch('/api/scores')
      .then((r) => r.json())
      .then((data: Score[]) => setLeaderboard(data))
      .catch(() => setLeaderboard([]))
  }, [])

  useEffect(() => {
    fetchScores()
  }, [fetchScores])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const w = parent.clientWidth
      const h = Math.min(parent.clientHeight, 640)
      canvas.width = w
      canvas.height = h
      if (!stateRef.current) {
        stateRef.current = createGame(w, h)
      } else {
        stateRef.current.width = w
        stateRef.current.height = h
      }
    }

    resize()
    window.addEventListener('resize', resize)

    const onKeyDown = (e: KeyboardEvent) => {
      if (!stateRef.current) return
      if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault()
      }
      handleKeyDown(stateRef.current, e.key)
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (!stateRef.current) return
      handleKeyUp(stateRef.current, e.key)
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    const loop = (time: number) => {
      const state = stateRef.current
      const ctx = canvas.getContext('2d')
      if (state && ctx) {
        const dt = Math.min((time - lastTimeRef.current) / 1000, 0.05)
        lastTimeRef.current = time
        if (dt > 0) {
          updateGame(state, dt)
          if (state.score !== prevScoreRef.current) {
            prevScoreRef.current = state.score
            setHudScore(state.score)
          }
          if (state.phase !== prevPhaseRef.current) {
            prevPhaseRef.current = state.phase
            setPhase(state.phase)
            if (state.phase === 'playing') setSubmitted(false)
          }
        }
        drawGame(ctx, state)
      }
      frameRef.current = requestAnimationFrame(loop)
    }

    lastTimeRef.current = performance.now()
    frameRef.current = requestAnimationFrame(loop)

    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      cancelAnimationFrame(frameRef.current)
    }
  }, [])

  const submitScore = () => {
    const name = playerName.trim() || 'Pilot'
    fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, score: hudScore }),
    })
      .then((r) => r.json())
      .then((data: Score[]) => {
        setLeaderboard(data)
        setSubmitted(true)
      })
      .catch(() => {})
  }

  return (
    <div className="flex-1 overflow-auto bg-gray-900">
      <div className="p-6 h-full flex flex-col lg:flex-row gap-6">
        <div className="flex-1 flex flex-col min-h-0">
          <div className="mb-4">
            <h1 className="text-3xl font-bold text-white">Starship</h1>
            <p className="text-gray-400 text-sm mt-1">
              Defend the galaxy. Destroy waves of enemy ships and climb the leaderboard.
            </p>
          </div>
          <div className="flex-1 rounded-xl overflow-hidden border border-gray-700 shadow-2xl min-h-[400px]">
            <canvas ref={canvasRef} className="w-full h-full block" tabIndex={0} />
          </div>
          <div className="mt-3 flex items-center justify-between text-sm text-gray-500 font-mono">
            <span>Score: {hudScore.toLocaleString()}</span>
            <span>WASD / Arrows — Move · Space — Fire · P — Pause</span>
          </div>
        </div>

        <div className="w-full lg:w-72 flex flex-col gap-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
            <h2 className="text-lg font-semibold text-white mb-4">Leaderboard</h2>
            {leaderboard.length === 0 ? (
              <p className="text-gray-500 text-sm">No scores yet. Be the first!</p>
            ) : (
              <ol className="space-y-2">
                {leaderboard.map((entry, i) => (
                  <li
                    key={`${entry.name}-${entry.score}-${i}`}
                    className="flex justify-between items-center text-sm font-mono"
                  >
                    <span className="text-gray-400 w-6">{i + 1}.</span>
                    <span className="text-white flex-1 truncate mx-2">{entry.name}</span>
                    <span className="text-cyan-400">{entry.score.toLocaleString()}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {phase === 'gameover' && !submitted && (
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
              <h2 className="text-lg font-semibold text-white mb-3">Submit Score</h2>
              <input
                type="text"
                maxLength={20}
                placeholder="Your callsign"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 text-white text-sm font-mono mb-3 focus:outline-none focus:border-primary"
              />
              <button
                onClick={submitScore}
                className="w-full py-2 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary-600 transition-colors"
              >
                Submit to Leaderboard
              </button>
            </div>
          )}

          <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
            <h2 className="text-lg font-semibold text-white mb-3">Enemy Types</h2>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-orange-500" />
                Scout — fast, weak
              </li>
              <li className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-purple-500" />
                Fighter — shoots back
              </li>
              <li className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                Cruiser — heavy armor
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StarshipGame
