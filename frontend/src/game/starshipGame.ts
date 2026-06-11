export type GamePhase = 'menu' | 'playing' | 'paused' | 'gameover'

export interface Vec2 {
  x: number
  y: number
}

export interface Star {
  x: number
  y: number
  speed: number
  size: number
  brightness: number
}

export interface Bullet {
  x: number
  y: number
  vy: number
  damage: number
  friendly: boolean
  width: number
  height: number
}

export interface Enemy {
  x: number
  y: number
  width: number
  height: number
  hp: number
  maxHp: number
  speed: number
  type: 'scout' | 'fighter' | 'cruiser'
  shootCooldown: number
  wobble: number
  wobbleSpeed: number
  points: number
}

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
}

export interface Player {
  x: number
  y: number
  width: number
  height: number
  speed: number
  lives: number
  invincible: number
  shootCooldown: number
}

export interface GameState {
  phase: GamePhase
  width: number
  height: number
  score: number
  wave: number
  combo: number
  comboTimer: number
  player: Player
  bullets: Bullet[]
  enemies: Enemy[]
  particles: Particle[]
  stars: Star[]
  keys: Set<string>
  spawnTimer: number
  waveEnemiesLeft: number
  waveEnemiesSpawned: number
  waveEnemiesTotal: number
  shake: number
  elapsed: number
}

const PLAYER_W = 36
const PLAYER_H = 44

export function createGame(width: number, height: number): GameState {
  const stars: Star[] = []
  for (let i = 0; i < 120; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      speed: 0.3 + Math.random() * 2.5,
      size: Math.random() * 2 + 0.5,
      brightness: 0.3 + Math.random() * 0.7,
    })
  }

  return {
    phase: 'menu',
    width,
    height,
    score: 0,
    wave: 1,
    combo: 0,
    comboTimer: 0,
    player: {
      x: width / 2,
      y: height - 80,
      width: PLAYER_W,
      height: PLAYER_H,
      speed: 320,
      lives: 3,
      invincible: 0,
      shootCooldown: 0,
    },
    bullets: [],
    enemies: [],
    particles: [],
    stars,
    keys: new Set(),
    spawnTimer: 0,
    waveEnemiesLeft: 0,
    waveEnemiesSpawned: 0,
    waveEnemiesTotal: 0,
    shake: 0,
    elapsed: 0,
  }
}

function spawnParticles(state: GameState, x: number, y: number, color: string, count: number) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = 40 + Math.random() * 180
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.3 + Math.random() * 0.5,
      maxLife: 0.8,
      color,
      size: 2 + Math.random() * 4,
    })
  }
}

function spawnEnemy(state: GameState) {
  const wave = state.wave
  const roll = Math.random()
  let type: Enemy['type'] = 'scout'
  let hp = 1
  let speed = 80 + wave * 8
  let points = 100
  let width = 28
  let height = 28

  if (wave >= 3 && roll > 0.7) {
    type = 'cruiser'
    hp = 4 + Math.floor(wave / 2)
    speed = 50 + wave * 4
    points = 400
    width = 48
    height = 40
  } else if (wave >= 2 && roll > 0.4) {
    type = 'fighter'
    hp = 2 + Math.floor(wave / 3)
    speed = 65 + wave * 6
    points = 200
    width = 34
    height = 32
  }

  const margin = width
  state.enemies.push({
    x: margin + Math.random() * (state.width - margin * 2),
    y: -height,
    width,
    height,
    hp,
    maxHp: hp,
    speed,
    type,
    shootCooldown: 1 + Math.random() * 2,
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: 1 + Math.random() * 2,
    points,
  })
}

function startWave(state: GameState) {
  state.waveEnemiesTotal = 5 + state.wave * 3
  state.waveEnemiesSpawned = 0
  state.waveEnemiesLeft = state.waveEnemiesTotal
  state.spawnTimer = 0.5
}

export function startGame(state: GameState) {
  state.phase = 'playing'
  state.score = 0
  state.wave = 1
  state.combo = 0
  state.comboTimer = 0
  state.bullets = []
  state.enemies = []
  state.particles = []
  state.elapsed = 0
  state.player = {
    x: state.width / 2,
    y: state.height - 80,
    width: PLAYER_W,
    height: PLAYER_H,
    speed: 320,
    lives: 3,
    invincible: 0,
    shootCooldown: 0,
  }
  startWave(state)
}

function rectsOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by
}

function killEnemy(state: GameState, enemy: Enemy, index: number) {
  const comboBonus = 1 + state.combo * 0.1
  state.score += Math.floor(enemy.points * comboBonus)
  state.combo++
  state.comboTimer = 2.5
  spawnParticles(state, enemy.x, enemy.y, '#ff6b35', 12)
  spawnParticles(state, enemy.x, enemy.y, '#ffd700', 6)
  state.enemies.splice(index, 1)
  state.waveEnemiesLeft--
  state.shake = 4
}

export function updateGame(state: GameState, dt: number) {
  if (state.phase !== 'playing') return

  state.elapsed += dt
  state.shake = Math.max(0, state.shake - dt * 20)

  if (state.comboTimer > 0) {
    state.comboTimer -= dt
    if (state.comboTimer <= 0) state.combo = 0
  }

  for (const star of state.stars) {
    star.y += star.speed * dt * 60
    if (star.y > state.height) {
      star.y = 0
      star.x = Math.random() * state.width
    }
  }

  const p = state.player
  if (p.invincible > 0) p.invincible -= dt

  let dx = 0
  let dy = 0
  if (state.keys.has('ArrowLeft') || state.keys.has('a')) dx -= 1
  if (state.keys.has('ArrowRight') || state.keys.has('d')) dx += 1
  if (state.keys.has('ArrowUp') || state.keys.has('w')) dy -= 1
  if (state.keys.has('ArrowDown') || state.keys.has('s')) dy += 1

  if (dx !== 0 || dy !== 0) {
    const len = Math.hypot(dx, dy)
    p.x += (dx / len) * p.speed * dt
    p.y += (dy / len) * p.speed * dt
  }

  const halfW = p.width / 2
  const halfH = p.height / 2
  p.x = Math.max(halfW, Math.min(state.width - halfW, p.x))
  p.y = Math.max(halfH, Math.min(state.height - halfH, p.y))

  if (p.shootCooldown > 0) p.shootCooldown -= dt
  const shooting = state.keys.has(' ') || state.keys.has('Space')
  if (shooting && p.shootCooldown <= 0) {
    p.shootCooldown = 0.12
    state.bullets.push({
      x: p.x,
      y: p.y - p.height / 2,
      vy: -520,
      damage: 1,
      friendly: true,
      width: 4,
      height: 14,
    })
  }

  if (state.waveEnemiesSpawned < state.waveEnemiesTotal) {
    state.spawnTimer -= dt
    if (state.spawnTimer <= 0) {
      spawnEnemy(state)
      state.waveEnemiesSpawned++
      state.spawnTimer = Math.max(0.3, 1.2 - state.wave * 0.08)
    }
  } else if (state.enemies.length === 0 && state.waveEnemiesLeft <= 0) {
    state.wave++
    startWave(state)
  }

  for (const enemy of state.enemies) {
    enemy.y += enemy.speed * dt
    enemy.wobble += enemy.wobbleSpeed * dt
    enemy.x += Math.sin(enemy.wobble) * 30 * dt

    enemy.shootCooldown -= dt
    if (enemy.shootCooldown <= 0 && enemy.type !== 'scout') {
      enemy.shootCooldown = enemy.type === 'cruiser' ? 1.8 : 2.5
      state.bullets.push({
        x: enemy.x,
        y: enemy.y + enemy.height / 2,
        vy: 280 + state.wave * 15,
        damage: 1,
        friendly: false,
        width: 4,
        height: 10,
      })
    }
  }

  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const b = state.bullets[i]
    b.y += b.vy * dt

    if (b.y < -20 || b.y > state.height + 20) {
      state.bullets.splice(i, 1)
      continue
    }

    if (b.friendly) {
      for (let j = state.enemies.length - 1; j >= 0; j--) {
        const e = state.enemies[j]
        if (rectsOverlap(
          b.x - b.width / 2, b.y - b.height / 2, b.width, b.height,
          e.x - e.width / 2, e.y - e.height / 2, e.width, e.height,
        )) {
          e.hp -= b.damage
          state.bullets.splice(i, 1)
          if (e.hp <= 0) killEnemy(state, e, j)
          else spawnParticles(state, b.x, b.y, '#fff', 3)
          break
        }
      }
    } else if (p.invincible <= 0) {
      if (rectsOverlap(
        b.x - b.width / 2, b.y - b.height / 2, b.width, b.height,
        p.x - p.width / 2, p.y - p.height / 2, p.width, p.height,
      )) {
        state.bullets.splice(i, 1)
        p.lives--
        p.invincible = 2
        state.combo = 0
        state.shake = 8
        spawnParticles(state, p.x, p.y, '#0F6AF2', 15)
        if (p.lives <= 0) state.phase = 'gameover'
      }
    }
  }

  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e = state.enemies[i]
    if (e.y - e.height / 2 > state.height + 20) {
      state.enemies.splice(i, 1)
      state.waveEnemiesLeft--
      continue
    }
    if (p.invincible <= 0 && rectsOverlap(
      p.x - p.width / 2, p.y - p.height / 2, p.width, p.height,
      e.x - e.width / 2, e.y - e.height / 2, e.width, e.height,
    )) {
      p.lives--
      p.invincible = 2
      state.combo = 0
      state.shake = 8
      spawnParticles(state, e.x, e.y, '#ff4444', 12)
      state.enemies.splice(i, 1)
      state.waveEnemiesLeft--
      if (p.lives <= 0) state.phase = 'gameover'
    }
  }

  for (let i = state.particles.length - 1; i >= 0; i--) {
    const part = state.particles[i]
    part.life -= dt
    part.x += part.vx * dt
    part.y += part.vy * dt
    part.vx *= 0.96
    part.vy *= 0.96
    if (part.life <= 0) state.particles.splice(i, 1)
  }
}

export function drawGame(ctx: CanvasRenderingContext2D, state: GameState) {
  const { width, height } = state
  const shakeX = state.shake > 0 ? (Math.random() - 0.5) * state.shake : 0
  const shakeY = state.shake > 0 ? (Math.random() - 0.5) * state.shake : 0

  ctx.save()
  ctx.translate(shakeX, shakeY)

  const bg = ctx.createLinearGradient(0, 0, 0, height)
  bg.addColorStop(0, '#050818')
  bg.addColorStop(0.5, '#0a1030')
  bg.addColorStop(1, '#12082a')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, width, height)

  for (const star of state.stars) {
    ctx.fillStyle = `rgba(200, 220, 255, ${star.brightness})`
    ctx.beginPath()
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2)
    ctx.fill()
  }

  for (const b of state.bullets) {
    if (b.friendly) {
      ctx.fillStyle = '#4fcfe7'
      ctx.shadowColor = '#4fcfe7'
      ctx.shadowBlur = 8
    } else {
      ctx.fillStyle = '#ff6b6b'
      ctx.shadowColor = '#ff6b6b'
      ctx.shadowBlur = 6
    }
    ctx.fillRect(b.x - b.width / 2, b.y - b.height / 2, b.width, b.height)
    ctx.shadowBlur = 0
  }

  for (const e of state.enemies) {
    drawEnemy(ctx, e)
  }

  if (state.phase === 'playing' || state.phase === 'paused') {
    const p = state.player
    if (p.invincible <= 0 || Math.floor(p.invincible * 10) % 2 === 0) {
      drawPlayer(ctx, p.x, p.y, p.width, p.height)
    }
  }

  for (const part of state.particles) {
    const alpha = part.life / part.maxLife
    ctx.globalAlpha = alpha
    ctx.fillStyle = part.color
    ctx.beginPath()
    ctx.arc(part.x, part.y, part.size * alpha, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  ctx.restore()

  drawHUD(ctx, state)

  if (state.phase === 'menu') drawOverlay(ctx, state, 'STARSHIP', 'Press SPACE to launch', '')
  if (state.phase === 'paused') drawOverlay(ctx, state, 'PAUSED', 'Press P to resume', '')
  if (state.phase === 'gameover') {
    drawOverlay(ctx, state, 'GAME OVER', `Final Score: ${state.score}`, 'Press SPACE to try again')
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.save()
  ctx.translate(x, y)

  ctx.shadowColor = '#0F6AF2'
  ctx.shadowBlur = 15

  const engineGrad = ctx.createLinearGradient(0, h / 2, 0, h / 2 + 20)
  engineGrad.addColorStop(0, '#4fcfe7')
  engineGrad.addColorStop(1, 'transparent')
  ctx.fillStyle = engineGrad
  ctx.beginPath()
  ctx.moveTo(-6, h / 2)
  ctx.lineTo(0, h / 2 + 16 + Math.random() * 4)
  ctx.lineTo(6, h / 2)
  ctx.fill()

  ctx.fillStyle = '#0F6AF2'
  ctx.beginPath()
  ctx.moveTo(0, -h / 2)
  ctx.lineTo(-w / 2, h / 2)
  ctx.lineTo(0, h / 2 - 8)
  ctx.lineTo(w / 2, h / 2)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = '#75B7F9'
  ctx.beginPath()
  ctx.moveTo(0, -h / 2 + 6)
  ctx.lineTo(-w / 4, h / 4)
  ctx.lineTo(0, h / 4 - 4)
  ctx.lineTo(w / 4, h / 4)
  ctx.closePath()
  ctx.fill()

  ctx.shadowBlur = 0
  ctx.restore()
}

function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy) {
  ctx.save()
  ctx.translate(e.x, e.y)

  let color = '#ff6b35'
  let accent = '#ffd700'
  if (e.type === 'fighter') {
    color = '#cd4af5'
    accent = '#e79ff9'
  } else if (e.type === 'cruiser') {
    color = '#eb3737'
    accent = '#ff8888'
  }

  ctx.shadowColor = color
  ctx.shadowBlur = 10
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(0, e.height / 2)
  ctx.lineTo(-e.width / 2, -e.height / 2)
  ctx.lineTo(0, -e.height / 2 + 6)
  ctx.lineTo(e.width / 2, -e.height / 2)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = accent
  ctx.beginPath()
  ctx.moveTo(0, e.height / 4)
  ctx.lineTo(-e.width / 4, -e.height / 4)
  ctx.lineTo(0, -e.height / 4 + 2)
  ctx.lineTo(e.width / 4, -e.height / 4)
  ctx.closePath()
  ctx.fill()

  if (e.maxHp > 1) {
    const barW = e.width
    const barH = 4
    const hpRatio = e.hp / e.maxHp
    ctx.shadowBlur = 0
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.fillRect(-barW / 2, -e.height / 2 - 10, barW, barH)
    ctx.fillStyle = hpRatio > 0.5 ? '#389f3d' : '#fcc90d'
    ctx.fillRect(-barW / 2, -e.height / 2 - 10, barW * hpRatio, barH)
  }

  ctx.shadowBlur = 0
  ctx.restore()
}

function drawHUD(ctx: CanvasRenderingContext2D, state: GameState) {
  const { width } = state
  ctx.font = 'bold 16px "JetBrains Mono", monospace'
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'left'
  ctx.fillText(`SCORE ${state.score.toLocaleString()}`, 16, 28)

  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.fillText(`WAVE ${state.wave}`, width / 2, 28)

  ctx.textAlign = 'right'
  const hearts = '♥'.repeat(state.player.lives) + '♡'.repeat(Math.max(0, 3 - state.player.lives))
  ctx.fillStyle = '#eb3737'
  ctx.fillText(hearts, width - 16, 28)

  if (state.combo > 1) {
    ctx.textAlign = 'center'
    ctx.fillStyle = '#fcc90d'
    ctx.font = 'bold 14px "JetBrains Mono", monospace'
    ctx.fillText(`${state.combo}x COMBO`, width / 2, 52)
  }
}

function drawOverlay(ctx: CanvasRenderingContext2D, state: GameState, title: string, subtitle: string, hint: string) {
  const { width, height } = state
  ctx.fillStyle = 'rgba(5, 8, 24, 0.75)'
  ctx.fillRect(0, 0, width, height)

  ctx.textAlign = 'center'
  ctx.font = 'bold 48px "JetBrains Mono", monospace'
  ctx.fillStyle = '#4fcfe7'
  ctx.shadowColor = '#4fcfe7'
  ctx.shadowBlur = 20
  ctx.fillText(title, width / 2, height / 2 - 30)
  ctx.shadowBlur = 0

  ctx.font = '18px "JetBrains Mono", monospace'
  ctx.fillStyle = '#fff'
  ctx.fillText(subtitle, width / 2, height / 2 + 20)

  if (hint) {
    ctx.font = '14px "JetBrains Mono", monospace'
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.fillText(hint, width / 2, height / 2 + 60)
  }

  if (state.phase === 'menu') {
    ctx.font = '13px "JetBrains Mono", monospace'
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    const controls = 'WASD / Arrows — Move  •  Space — Fire  •  P — Pause'
    ctx.fillText(controls, width / 2, height - 40)
  }
}

export function handleKeyDown(state: GameState, key: string) {
  state.keys.add(key)
  if (key === ' ' || key === 'Space') {
    if (state.phase === 'menu') startGame(state)
    else if (state.phase === 'gameover') startGame(state)
  }
  if (key === 'p' || key === 'P') {
    if (state.phase === 'playing') state.phase = 'paused'
    else if (state.phase === 'paused') state.phase = 'playing'
  }
}

export function handleKeyUp(state: GameState, key: string) {
  state.keys.delete(key)
}
