/**
 * WebRTC Service
 * Handles media streams, peer connections, and SDP/ICE exchange
 */
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class WebRTCError extends Error {
  constructor(message, code = 'WEBRTC_ERROR') {
    super(message);
    this.code = code;
  }
}

class WebRTCService {
  constructor() {
    this.localStream = null;
    this.peerConnections = new Map();
    this.iceServers = null;
  }

  /**
   * Fetch ICE servers from backend
   */
  async getICEServers() {
    if (this.iceServers) return this.iceServers;

    try {
      const res = await fetch(`${API_URL}/webrtc/config`);
      if (!res.ok) throw new WebRTCError('Failed to fetch ICE servers');
      const data = await res.json();
      this.iceServers = data.iceServers;
      return this.iceServers;
    } catch (err) {
      // Fallback to STUN only if backend unavailable
      console.warn('Using fallback ICE servers:', err.message);
      return [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ];
    }
  }

  /**
   * Request and get local media stream
   */
  async getLocalStream({ audio = true, video = true } = {}) {
    if (this.localStream) {
      return this.localStream;
    }

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: { width: 640, height: 480, frameRate: 30 },
      });
      return this.localStream;
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        throw new WebRTCError('Camera/microphone permission denied', 'PERMISSION_DENIED');
      }
      if (err.name === 'NotFoundError') {
        throw new WebRTCError('No camera or microphone found', 'DEVICE_NOT_FOUND');
      }
      throw new WebRTCError(`Failed to get media: ${err.message}`, 'GET_MEDIA_FAILED');
    }
  }

  /**
   * Release local media stream
   */
  releaseLocalStream() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
  }

  /**
   * Create a new RTCPeerConnection for a remote user
   */
  async createPeerConnection(remoteUserId, iceServers) {
    if (this.peerConnections.has(remoteUserId)) {
      const existing = this.peerConnections.get(remoteUserId);
      if (existing.connectionState !== 'closed') {
        existing.close();
      }
      this.peerConnections.delete(remoteUserId);
    }

    const servers = iceServers || await this.getICEServers();

    const pc = new RTCPeerConnection({
      iceServers,
      iceCandidatePoolSize: 10,
    });

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Connection state for ${remoteUserId}:`, pc.connectionState);
    };

    // Handle ICE connection state changes
    pc.oniceconnectionstatechange = () => {
      console.log(`[WebRTC] ICE state for ${remoteUserId}:`, pc.iceConnectionState);
    };

    // Handle incoming tracks
    pc.ontrack = (event) => {
      console.log(`[WebRTC] Remote track received from ${remoteUserId}:`, event.track.kind);
      // Signal that we received a track — the UI will listen for this
      this._emit('remote-track', { userId: remoteUserId, track: event.track });
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`[WebRTC] ICE candidate from ${remoteUserId}:`, event.candidate);
        this._emit('ice-candidate', {
          userId: remoteUserId,
          candidate: event.candidate,
        });
      }
    };

    // Add local stream tracks if we have one
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        try {
          pc.addTrack(track, this.localStream);
        } catch (err) {
          console.warn(`Failed to add track ${track.kind}:`, err);
        }
      });
    }

    this.peerConnections.set(remoteUserId, pc);
    return pc;
  }

  /**
   * Get peer connection for a user
   */
  getPeerConnection(remoteUserId) {
    return this.peerConnections.get(remoteUserId) || null;
  }

  /**
   * Remove and close a peer connection
   */
  removePeerConnection(remoteUserId) {
    const pc = this.peerConnections.get(remoteUserId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(remoteUserId);
    }
  }

  /**
   * Close all peer connections
   */
  closeAllConnections() {
    this.peerConnections.forEach((pc, userId) => {
      pc.close();
    });
    this.peerConnections.clear();
  }

  /**
   * Create an offer for a remote user
   */
  async createOffer(remoteUserId) {
    const pc = this.peerConnections.get(remoteUserId);
    if (!pc) {
      throw new WebRTCError(`No peer connection for user ${remoteUserId}`);
    }

    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);
      return offer;
    } catch (err) {
      throw new WebRTCError(`Failed to create offer: ${err.message}`, 'CREATE_OFFER_FAILED');
    }
  }

  /**
   * Create an answer for an incoming offer
   */
  async createAnswer(remoteUserId) {
    const pc = this.peerConnections.get(remoteUserId);
    if (!pc) {
      throw new WebRTCError(`No peer connection for user ${remoteUserId}`);
    }

    try {
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      return answer;
    } catch (err) {
      throw new WebRTCError(`Failed to create answer: ${err.message}`, 'CREATE_ANSWER_FAILED');
    }
  }

  /**
   * Set remote description (offer or answer)
   */
  async setRemoteDescription(remoteUserId, description) {
    const pc = this.peerConnections.get(remoteUserId);
    if (!pc) {
      throw new WebRTCError(`No peer connection for user ${remoteUserId}`);
    }

    try {
      await pc.setRemoteDescription(
        new RTCSessionDescription({ type: description.type, sdp: description.sdp })
      );
    } catch (err) {
      throw new WebRTCError(`Failed to set remote description: ${err.message}`, 'SET_REMOTE_DESC_FAILED');
    }
  }

  /**
   * Add ICE candidate to peer connection
   */
  async addICECandidate(remoteUserId, candidate) {
    const pc = this.peerConnections.get(remoteUserId);
    if (!pc) {
      console.warn(`No peer connection for user ${remoteUserId}, skipping ICE candidate`);
      return;
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.warn(`Failed to add ICE candidate for ${remoteUserId}:`, err);
    }
  }

  /**
   * Mute/unmute audio track
   */
  setAudioEnabled(enabled) {
    if (!this.localStream) return;
    this.localStream.getAudioTracks().forEach(track => {
      track.enabled = enabled;
    });
  }

  /**
   * Enable/disable video track
   */
  setVideoEnabled(enabled) {
    if (!this.localStream) return;
    this.localStream.getVideoTracks().forEach(track => {
      track.enabled = enabled;
    });
  }

  /**
   * Check if audio is currently enabled
   */
  isAudioEnabled() {
    if (!this.localStream) return true;
    return this.localStream.getAudioTracks().every(track => track.enabled);
  }

  /**
   * Check if video is currently enabled
   */
  isVideoEnabled() {
    if (!this.localStream) return true;
    return this.localStream.getVideoTracks().every(track => track.enabled);
  }

  /**
   * Simple event emitter for internal events
   */
  _events = {};

  _on(event, callback) {
    if (!this._events[event]) this._events[event] = [];
    this._events[event].push(callback);
  }

  _emit(event, data) {
    if (this._events[event]) {
      this._events[event].forEach(cb => cb(data));
    }
  }

  _off(event, callback) {
    if (this._events[event]) {
      this._events[event] = this._events[event].filter(cb => cb !== callback);
    }
  }
}

// Singleton instance
export const webrtcService = new WebRTCService();

export default webrtcService;
