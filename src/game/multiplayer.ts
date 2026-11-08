import Peer, { type DataConnection } from 'peerjs'
import * as THREE from 'three'
import { riverCenter, riverElevation } from './level'

export interface OpponentState {
  id: string
  name: string
  skin: string
  s: number
  lateral: number
  x: number
  y: number
  z: number
  rotY: number
  pitch: number
  roll: number
  speed: number
  vx: number
  vz: number
  health: number
  score: number
  isAirborne: boolean
  timestamp: number
}

export type MultiplayerRole = 'host' | 'client' | 'none'
export type MultiplayerStatus = 'idle' | 'creating' | 'waiting' | 'joining' | 'connected' | 'in_game' | 'error'

export interface MultiplayerCallbacks {
  onStatusChange?: (status: MultiplayerStatus, message?: string) => void
  onPlayerJoined?: (opponentName: string) => void
  onGameStart?: () => void
  onOpponentUpdate?: (state: OpponentState) => void
  onOpponentCollision?: (impulseX: number, impulseZ: number) => void
  onOpponentDisconnected?: () => void
  onLaunch?: () => void
}

const PEER_PREFIX = 'nr-raft-'

export class MultiplayerManager {
  private peer: Peer | null = null
  private connection: DataConnection | null = null
  private broadcastChannel: BroadcastChannel | null = null
  private localPlayerId = 'p_' + Math.random().toString(36).substring(2, 8)
  
  public role: MultiplayerRole = 'none'
  public roomCode = ''
  public status: MultiplayerStatus = 'idle'
  public opponentName = ''
  public opponentSkin = 'red'
  public opponentState: OpponentState | null = null
  public playerName = 'Pemain 1'
  public playerSkin = 'yellow'
  public isBotMatch = false
  private botS = 14
  private botLateral = 1.2
  private botLateralDir = 1

  constructor(public callbacks: MultiplayerCallbacks = {}) {}

  /**
   * Buat grup baru dengan kode 4 angka (Host)
   */
  async createRoom(customCode?: string): Promise<string> {
    this.cleanup()
    this.role = 'host'
    this.playerName = 'Host'
    this.playerSkin = 'yellow'
    this.opponentSkin = 'red'
    
    // Generate 4-digit code (e.g. 1000 - 9999)
    this.roomCode = customCode || Math.floor(1000 + Math.random() * 9000).toString()
    this.setStatus('creating', `Membuat ruangan ${this.roomCode}...`)

    // 1. Inisialisasi BroadcastChannel untuk pengujian multi-tab lokal super cepat (0 latency, offline)
    this.initBroadcastChannel(this.roomCode)

    // 2. Inisialisasi PeerJS untuk multi-device via internet / LAN
    try {
      const peerId = `${PEER_PREFIX}${this.roomCode}`
      this.peer = new Peer(peerId, {
        debug: 1,
      })

      this.peer.on('open', () => {
        this.setStatus('waiting', `Menunggu lawan bergabung dengan kode: ${this.roomCode}`)
      })

      this.peer.on('connection', (conn) => {
        this.setupConnection(conn)
      })

      this.peer.on('error', (err) => {
        console.warn('PeerJS host note (using local BroadcastChannel fallback if available):', err)
        // Jika ID sudah ada atau error jaringan, status tetap waiting via BroadcastChannel
        if (this.status === 'creating') {
          this.setStatus('waiting', `Menunggu lawan dengan kode: ${this.roomCode}`)
        }
      })
    } catch (e) {
      console.warn('PeerJS init failed, continuing with BroadcastChannel:', e)
      this.setStatus('waiting', `Menunggu lawan dengan kode: ${this.roomCode}`)
    }

    return this.roomCode
  }

  /**
   * Gabung grup yang sudah dibuat menggunakan 4 kode angka (Client / Guest)
   */
  async joinRoom(code: string): Promise<void> {
    const trimmed = code.trim()
    if (!/^\d{4}$/.test(trimmed)) {
      this.setStatus('error', 'Kode harus berupa 4 angka!')
      throw new Error('Kode harus 4 digit angka')
    }
    const cleanCode = trimmed

    this.cleanup()
    this.role = 'client'
    this.roomCode = cleanCode
    this.playerName = 'Player 2'
    this.playerSkin = 'red'
    this.opponentSkin = 'yellow'
    this.setStatus('joining', `Menghubungkan ke kode ${cleanCode}...`)

    // 1. BroadcastChannel untuk multi-tab lokal
    this.initBroadcastChannel(cleanCode)

    // Send broadcast HELLO
    setTimeout(() => {
      this.sendBroadcast({
        type: 'HELLO',
        senderId: this.localPlayerId,
        name: this.playerName,
        skin: this.playerSkin,
      })
    }, 150)

    // 2. PeerJS untuk koneksi WebRTC remote
    try {
      this.peer = new Peer({ debug: 1 })
      this.peer.on('open', () => {
        const hostPeerId = `${PEER_PREFIX}${cleanCode}`
        const conn = this.peer!.connect(hostPeerId, { reliable: false })
        this.setupConnection(conn)
      })
      this.peer.on('error', (err) => {
        console.warn('PeerJS client connect error:', err)
      })
    } catch (e) {
      console.warn('PeerJS client error:', e)
    }

    // Timeout check
    setTimeout(() => {
      if (this.status === 'joining') {
        // Cek apakah BroadcastChannel tersambung
        this.sendBroadcast({
          type: 'HELLO',
          senderId: this.localPlayerId,
          name: this.playerName,
          skin: this.playerSkin,
        })
      }
    }, 1200)
  }

  /**
   * Host memulai permainan bersama
   */
  startGame() {
    if (this.role !== 'host') return
    const msg = { type: 'START' }
    this.send(msg)
    this.setStatus('in_game')
    this.callbacks.onGameStart?.()
  }

  /**
   * Kirim posisi dan status rakit lokal ke lawan (30-60 fps)
   */
  sendState(state: Omit<OpponentState, 'id' | 'name' | 'skin' | 'timestamp'>) {
    if (this.isBotMatch) {
      this.updateBot(state)
      return
    }
    if (this.status !== 'in_game' && this.status !== 'connected') return
    const payload: OpponentState = {
      ...state,
      id: this.localPlayerId,
      name: this.playerName,
      skin: this.playerSkin,
      timestamp: Date.now(),
    }
    this.send({ type: 'SYNC', state: payload })
  }

  /**
   * Beritahu lawan tentang tabrakan rakit-lawan
   */
  sendCollision(nx: number, nz: number) {
    this.send({ type: 'COLLISION', nx, nz })
  }

  sendLaunch() {
    this.send({ type: 'LAUNCH' })
  }

  private send(data: Record<string, unknown>) {
    // Kirim via DataConnection (WebRTC) jika ada
    if (this.connection && this.connection.open) {
      try {
        this.connection.send(data)
      } catch (err) {
        console.warn('Failed to send data via WebRTC:', err)
      }
    }
    // Selalu kirim via BroadcastChannel untuk tab lokal
    this.sendBroadcast(data)
  }

  private initBroadcastChannel(code: string) {
    if (typeof BroadcastChannel === 'undefined') return
    try {
      this.broadcastChannel = new BroadcastChannel(`nr-multiplayer-room-${code}`)
      this.broadcastChannel.onmessage = (event) => {
        this.handleMessage(event.data)
      }
    } catch (e) {
      console.warn('BroadcastChannel not supported:', e)
    }
  }

  private sendBroadcast(data: Record<string, unknown>) {
    if (!this.broadcastChannel) return
    try {
      this.broadcastChannel.postMessage({
        ...data,
        senderId: this.localPlayerId,
      })
    } catch {
      // ignore
    }
  }

  private setupConnection(conn: DataConnection) {
    this.connection = conn
    conn.on('open', () => {
      conn.send({
        type: 'HELLO',
        senderId: this.localPlayerId,
        name: this.playerName,
        skin: this.playerSkin,
      })
    })

    conn.on('data', (data) => {
      this.handleMessage(data)
    })

    conn.on('close', () => {
      this.handleOpponentLeft()
    })
  }

  private handleMessage(raw: unknown) {
    if (!raw || typeof raw !== 'object') return
    const data = raw as Record<string, unknown>
    if (data.senderId === this.localPlayerId) return // abaikan pesan dari diri sendiri

    switch (data.type) {
      case 'HELLO': {
        this.opponentName = (data.name as string) || (this.role === 'host' ? 'Player 2' : 'Host')
        if (this.role === 'host') {
          // Balas HELLO_ACK
          this.send({
            type: 'HELLO_ACK',
            senderId: this.localPlayerId,
            name: this.playerName,
            skin: this.playerSkin,
          })
          this.setStatus('connected', `Lawan tersambung: ${this.opponentName}`)
          this.callbacks.onPlayerJoined?.(this.opponentName)
        } else {
          this.setStatus('connected', `Tersambung ke Host: ${this.opponentName}`)
          this.callbacks.onPlayerJoined?.(this.opponentName)
        }
        break
      }

      case 'HELLO_ACK': {
        this.opponentName = (data.name as string) || 'Host'
        this.setStatus('connected', `Tersambung ke Host: ${this.opponentName}`)
        this.callbacks.onPlayerJoined?.(this.opponentName)
        break
      }

      case 'START': {
        this.setStatus('in_game')
        this.callbacks.onGameStart?.()
        break
      }

      case 'LAUNCH': {
        this.callbacks.onLaunch?.()
        break
      }

      case 'SYNC': {
        const state = data.state as OpponentState
        if (state) {
          this.opponentState = state
          this.callbacks.onOpponentUpdate?.(state)
        }
        break
      }

      case 'COLLISION': {
        const nx = Number(data.nx) || 0
        const nz = Number(data.nz) || 0
        this.callbacks.onOpponentCollision?.(nx, nz)
        break
      }

      case 'LEAVE': {
        this.handleOpponentLeft()
        break
      }
    }
  }

  private handleOpponentLeft() {
    if (this.status === 'in_game' || this.status === 'connected') {
      this.setStatus('waiting', 'Lawan keluar dari permainan.')
      this.opponentState = null
      this.callbacks.onOpponentDisconnected?.()
    }
  }

  private setStatus(status: MultiplayerStatus, message?: string) {
    this.status = status
    this.callbacks.onStatusChange?.(status, message)
  }

  startBotMatch(botName = 'Rival Nusantara') {
    this.cleanup()
    this.isBotMatch = true
    this.role = 'host'
    this.roomCode = 'BOTS'
    this.opponentName = botName
    this.opponentSkin = 'red'
    this.setStatus('in_game')
    setTimeout(() => {
      this.callbacks.onPlayerJoined?.(this.opponentName)
      this.callbacks.onGameStart?.()
    }, 50)
  }

  private updateBot(local: Omit<OpponentState, 'id' | 'name' | 'skin' | 'timestamp'>) {
    if (!this.isBotMatch) return
    const targetS = local.s + Math.sin(local.s * 0.08) * 3.5
    this.botS = THREE.MathUtils.lerp(this.botS, targetS, 0.04)
    this.botLateral += this.botLateralDir * 0.04
    if (this.botLateral > 3.2) this.botLateralDir = -1
    if (this.botLateral < -3.2) this.botLateralDir = 1

    const center = riverCenter(this.botS)
    const curveY = riverElevation(this.botS)
    const worldX = center + this.botLateral
    const worldZ = -this.botS

    this.opponentState = {
      id: 'bot_rival',
      name: this.opponentName,
      skin: 'red',
      s: this.botS,
      lateral: this.botLateral,
      x: worldX,
      y: curveY + 0.35,
      z: worldZ,
      rotY: Math.sin(this.botS * 0.05) * 0.2,
      pitch: -0.05,
      roll: this.botLateralDir * 0.1,
      speed: 10.5,
      vx: this.botLateralDir * 2.0,
      vz: -10.5,
      health: 100,
      score: Math.round(this.botS * 4.2),
      isAirborne: false,
      timestamp: performance.now(),
    }
    this.callbacks.onOpponentUpdate?.(this.opponentState)
  }

  leaveRoom() {
    this.cleanup()
  }

  cleanup() {
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ type: 'LEAVE', senderId: this.localPlayerId })
        this.broadcastChannel.close()
      } catch {
        // ignore
      }
      this.broadcastChannel = null
    }

    if (this.connection) {
      try {
        this.connection.close()
      } catch {
        // ignore
      }
      this.connection = null
    }

    if (this.peer) {
      try {
        this.peer.destroy()
      } catch {
        // ignore
      }
      this.peer = null
    }

    this.role = 'none'
    this.roomCode = ''
    this.status = 'idle'
    this.opponentState = null
    this.opponentName = ''
    this.isBotMatch = false
  }
}
