import { nanoid } from 'nanoid';

export class CollaborationService {
  constructor() {
    this.peerConnections = new Map();
    this.dataChannels = new Map();
    this.roomId = null;
    this.userId = nanoid();
    this.isHost = false;
    this.signalingServer = null;
    this.onMessageCallbacks = new Map();
    
    this.config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
  }

  async init() {
    // Initialize WebRTC adapter
    if (typeof window !== 'undefined' && window.RTCPeerConnection) {
      // WebRTC is available
      this.setupEventListeners();
    } else {
      console.warn('WebRTC not supported in this browser');
    }
  }

  setupEventListeners() {
    // Listen for connection state changes
    window.addEventListener('beforeunload', () => {
      this.disconnect();
    });
  }

  async createRoom() {
    this.roomId = nanoid();
    this.isHost = true;
    
    // In a real implementation, you would connect to a signaling server
    // For now, we'll simulate the signaling process
    console.log(`Created room: ${this.roomId}`);
    
    return this.roomId;
  }

  async joinRoom(roomId) {
    this.roomId = roomId;
    this.isHost = false;
    
    // In a real implementation, you would connect to the signaling server
    // and establish WebRTC connections with other peers
    console.log(`Joined room: ${this.roomId}`);
    
    // Simulate connection to other peers
    await this.connectToPeers();
  }

  async connectToPeers() {
    // This is a simplified implementation
    // In a real app, you would:
    // 1. Connect to a signaling server
    // 2. Exchange ICE candidates
    // 3. Establish data channels with each peer
    
    // Simulate peer connection
    const peerId = nanoid();
    await this.createPeerConnection(peerId);
  }

  async createPeerConnection(peerId) {
    try {
      const peerConnection = new RTCPeerConnection(this.config);
      this.peerConnections.set(peerId, peerConnection);

      // Create data channel
      const dataChannel = peerConnection.createDataChannel('codewave', {
        ordered: true,
        maxRetransmits: 3
      });

      this.setupDataChannel(dataChannel, peerId);
      this.peerConnections.set(peerId, peerConnection);

      // Handle incoming data channels
      peerConnection.ondatachannel = (event) => {
        this.setupDataChannel(event.channel, peerId);
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          // Send candidate to signaling server
          this.sendSignalingMessage({
            type: 'ice-candidate',
            candidate: event.candidate,
            peerId: peerId
          });
        }
      };

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log(`Connection state with ${peerId}:`, peerConnection.connectionState);
        
        if (peerConnection.connectionState === 'connected') {
          this.emit('peer:connected', { peerId });
        } else if (peerConnection.connectionState === 'disconnected') {
          this.emit('peer:disconnected', { peerId });
        }
      };

      return peerConnection;
    } catch (error) {
      console.error('Failed to create peer connection:', error);
      throw error;
    }
  }

  setupDataChannel(dataChannel, peerId) {
    dataChannel.onopen = () => {
      console.log(`Data channel opened with ${peerId}`);
      this.dataChannels.set(peerId, dataChannel);
      this.emit('channel:opened', { peerId });
    };

    dataChannel.onclose = () => {
      console.log(`Data channel closed with ${peerId}`);
      this.dataChannels.delete(peerId);
      this.emit('channel:closed', { peerId });
    };

    dataChannel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message, peerId);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };

    dataChannel.onerror = (error) => {
      console.error(`Data channel error with ${peerId}:`, error);
    };
  }

  handleMessage(message, peerId) {
    const { type, data } = message;
    
    switch (type) {
      case 'code:update':
        this.emit('code:update', { ...data, peerId });
        break;
      case 'cursor:update':
        this.emit('cursor:update', { ...data, peerId });
        break;
      case 'chat:message':
        this.emit('chat:message', { ...data, peerId });
        break;
      case 'user:join':
        this.emit('user:join', { ...data, peerId });
        break;
      case 'user:leave':
        this.emit('user:leave', { ...data, peerId });
        break;
      default:
        console.warn('Unknown message type:', type);
    }
  }

  send(message) {
    const messageStr = JSON.stringify(message);
    
    // Send to all connected peers
    for (const [peerId, dataChannel] of this.dataChannels) {
      if (dataChannel.readyState === 'open') {
        try {
          dataChannel.send(messageStr);
        } catch (error) {
          console.error(`Failed to send message to ${peerId}:`, error);
        }
      }
    }
  }

  sendToPeer(peerId, message) {
    const dataChannel = this.dataChannels.get(peerId);
    if (dataChannel && dataChannel.readyState === 'open') {
      try {
        dataChannel.send(JSON.stringify(message));
      } catch (error) {
        console.error(`Failed to send message to ${peerId}:`, error);
      }
    }
  }

  // Convenience methods for common message types
  sendCodeUpdate(code, cursor = null) {
    this.send({
      type: 'code:update',
      data: {
        code,
        cursor,
        timestamp: Date.now(),
        userId: this.userId
      }
    });
  }

  sendCursorUpdate(cursor) {
    this.send({
      type: 'cursor:update',
      data: {
        cursor,
        timestamp: Date.now(),
        userId: this.userId
      }
    });
  }

  sendChatMessage(message) {
    this.send({
      type: 'chat:message',
      data: {
        message,
        timestamp: Date.now(),
        userId: this.userId
      }
    });
  }

  // Event handling
  on(event, callback) {
    if (!this.onMessageCallbacks.has(event)) {
      this.onMessageCallbacks.set(event, []);
    }
    this.onMessageCallbacks.get(event).push(callback);
  }

  off(event, callback) {
    if (this.onMessageCallbacks.has(event)) {
      const callbacks = this.onMessageCallbacks.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.onMessageCallbacks.has(event)) {
      this.onMessageCallbacks.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  // Signaling server communication (placeholder)
  sendSignalingMessage(message) {
    // In a real implementation, this would send to a signaling server
    console.log('Signaling message:', message);
  }

  // Room management
  getRoomInfo() {
    return {
      roomId: this.roomId,
      isHost: this.isHost,
      userId: this.userId,
      peerCount: this.peerConnections.size,
      connectedPeers: Array.from(this.peerConnections.keys())
    };
  }

  getConnectedPeers() {
    return Array.from(this.peerConnections.keys());
  }

  // Disconnect and cleanup
  async disconnect() {
    // Close all data channels
    for (const [peerId, dataChannel] of this.dataChannels) {
      dataChannel.close();
    }
    this.dataChannels.clear();

    // Close all peer connections
    for (const [peerId, peerConnection] of this.peerConnections) {
      peerConnection.close();
    }
    this.peerConnections.clear();

    // Clear event listeners
    this.onMessageCallbacks.clear();

    // Reset state
    this.roomId = null;
    this.isHost = false;

    console.log('Disconnected from collaboration session');
  }

  // Utility methods
  isConnected() {
    return this.roomId !== null && this.peerConnections.size > 0;
  }

  getConnectionStats() {
    const stats = {
      roomId: this.roomId,
      isHost: this.isHost,
      userId: this.userId,
      peerCount: this.peerConnections.size,
      dataChannelCount: this.dataChannels.size,
      connectedPeers: []
    };

    for (const [peerId, peerConnection] of this.peerConnections) {
      stats.connectedPeers.push({
        peerId,
        connectionState: peerConnection.connectionState,
        dataChannelState: this.dataChannels.get(peerId)?.readyState || 'closed'
      });
    }

    return stats;
  }
} 