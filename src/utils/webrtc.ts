import { io, Socket } from 'socket.io-client';

interface WebRTCManagerOptions {
  deviceId: string;
  onSignal?: (signal: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onRemoteStream?: (stream: MediaStream) => void;
  onDataChannelMessage?: (data: any) => void;
  onPeerList?: (peers: string[]) => void;
}

export class WebRTCManager {
  private socket: Socket | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private localStream: MediaStream | null = null;
  private deviceId: string;
  private targetId: string | null = null;

  private options: WebRTCManagerOptions;

  constructor(options: WebRTCManagerOptions) {
    this.options = options;
    this.deviceId = options.deviceId;
  }

  // Initialize Socket.io connection
  async initialize(): Promise<void> {
    // Determine Socket.io URL
    const socketUrl = import.meta.env.DEV 
      ? window.location.origin 
      : window.location.origin;

    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('Connected to signaling server');
      this.socket?.emit('register', this.deviceId);
    });

    this.socket.on('peer-list', (peers: string[]) => {
      this.options.onPeerList?.(peers);
    });

    this.socket.on('signal', async ({ from, signal }) => {
      await this.handleSignal(from, signal);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from signaling server');
      this.options.onDisconnect?.();
    });
  }

  // Create offer and connect to a peer
  async connectToPeer(targetId: string): Promise<void> {
    this.targetId = targetId;
    this.createPeerConnection();
    
    // Create data channel
    this.dataChannel = this.peerConnection!.createDataChannel('remote-control');
    this.setupDataChannel(this.dataChannel);

    // Create offer
    const offer = await this.peerConnection!.createOffer();
    await this.peerConnection!.setLocalDescription(offer);
    
    // Send offer
    this.socket?.emit('signal', {
      to: targetId,
      from: this.deviceId,
      signal: this.peerConnection!.localDescription,
    });
  }

  // Handle incoming signal
  private async handleSignal(from: string, signal: any): Promise<void> {
    if (!this.peerConnection) {
      this.targetId = from;
      this.createPeerConnection();
      
      this.peerConnection!.ondatachannel = (event) => {
        this.dataChannel = event.channel;
        this.setupDataChannel(this.dataChannel);
      };
    }

    if (signal.type === 'offer') {
      await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(signal));
      const answer = await this.peerConnection!.createAnswer();
      await this.peerConnection!.setLocalDescription(answer);
      
      this.socket?.emit('signal', {
        to: from,
        from: this.deviceId,
        signal: this.peerConnection!.localDescription,
      });
    } else if (signal.type === 'answer') {
      await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(signal));
    } else if (signal.candidate) {
      await this.peerConnection!.addIceCandidate(new RTCIceCandidate(signal));
    }
  }

  // Create peer connection
  private createPeerConnection(): void {
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.targetId) {
        this.socket?.emit('signal', {
          to: this.targetId,
          from: this.deviceId,
          signal: event.candidate,
        });
      }
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      if (this.peerConnection?.connectionState === 'connected') {
        this.options.onConnect?.();
      } else if (this.peerConnection?.connectionState === 'disconnected' || 
                 this.peerConnection?.connectionState === 'failed') {
        this.options.onDisconnect?.();
      }
    };

    // Handle incoming tracks
    this.peerConnection.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.options.onRemoteStream?.(event.streams[0]);
      }
    };

    // Add local stream if we have one
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection!.addTrack(track, this.localStream!);
      });
    }
  }

  // Set up data channel
  private setupDataChannel(channel: RTCDataChannel): void {
    channel.onopen = () => {
      console.log('Data channel opened');
    };

    channel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.options.onDataChannelMessage?.(data);
      } catch (e) {
        console.error('Failed to parse data channel message:', e);
      }
    };

    channel.onclose = () => {
      console.log('Data channel closed');
    };
  }

  // Set local screen stream
  setLocalStream(stream: MediaStream): void {
    this.localStream = stream;
    
    if (this.peerConnection) {
      stream.getTracks().forEach(track => {
        this.peerConnection!.addTrack(track, stream);
      });
    }
  }

  // Send data over data channel
  sendData(data: any): void {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(data));
    }
  }

  // Disconnect
  disconnect(): void {
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.targetId = null;
  }

  // Cleanup
  destroy(): void {
    this.disconnect();
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}
