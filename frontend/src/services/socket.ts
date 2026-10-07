import { io, Socket } from 'socket.io-client';

class SocketService {
  private static instance: SocketService;
  private socket: Socket | null = null;
  private socketUrl: string;

  private constructor() {
    this.socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
  }

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  public connect(): Socket {
    if (!this.socket) {
      this.socket = io(this.socketUrl, {
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        transports: ['websocket', 'polling'],
      });

      this.socket.on('connect', () => {
        console.log(`[SocketService] Connected to real-time server with ID: ${this.socket?.id}`);
      });

      this.socket.on('connected', (payload) => {
        console.log('[SocketService] Server handshake received:', payload);
      });

      this.socket.on('disconnect', (reason) => {
        console.log(`[SocketService] Disconnected: ${reason}`);
      });

      this.socket.on('connect_error', (error) => {
        console.warn(`[SocketService] Connection error:`, error.message);
      });
    }

    if (this.socket.disconnected) {
      this.socket.connect();
    }

    return this.socket;
  }

  public getSocket(): Socket | null {
    return this.socket;
  }

  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  public getSocketId(): string | undefined {
    return this.socket?.id;
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  public on(event: string, callback: (...args: any[]) => void): void {
    this.socket?.on(event, callback);
  }

  public off(event: string, callback?: (...args: any[]) => void): void {
    this.socket?.off(event, callback);
  }

  public emit(event: string, data?: any): void {
    this.socket?.emit(event, data);
  }
}

export const socketService = SocketService.getInstance();
export default socketService;
