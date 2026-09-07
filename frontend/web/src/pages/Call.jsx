import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { requestCall, acceptCall, rejectCall, endCall as endCallSocket, sendAnswer, sendICECandidate } from '../hooks/useCallSocket';
import { webrtcService } from '../services/webrtc';
import './../styles/call.css';

const formatDuration = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export default function CallPage() {
  const { user } = useAuth();
  
  // Call state
  const [callState, setCallState] = useState('idle'); // idle | ringing | connecting | connected
  const [remoteUserId, setRemoteUserId] = useState(null);
  const [remoteUsername, setRemoteUsername] = useState(null);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [error, setError] = useState(null);
  
  // Refs
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const durationIntervalRef = useRef(null);
  const callIdRef = useRef(null);
  const socketRefs = useRef({});

  // Get callee ID from URL
  const calleeId = new URLSearchParams(window.location.search).get('userId');

  // Get local media stream
  const getLocalMedia = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    
    try {
      const stream = await webrtcService.getLocalStream({ audio: true, video: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.error('Failed to get local media:', err);
      setError(err.message.includes('permission') ? 'Camera/microphone access denied' : 'Failed to access media devices');
      throw err;
    }
  }, []);

  // Start duration timer
  const startDurationTimer = useCallback(() => {
    if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    durationIntervalRef.current = setInterval(() => {
      setDuration(d => d + 1);
    }, 1000);
  }, []);

  // Stop duration timer
  const stopDurationTimer = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  }, []);

  // Cleanup call resources
  const cleanupCall = useCallback(() => {
    stopDurationTimer();
    if (peerConnectionRef.current) {
      webrtcService.removePeerConnection(remoteUserId);
      peerConnectionRef.current = null;
    }
    setCallState('idle');
  }, [remoteUserId]);

  // Start a new call (caller side)
  const handleStartCall = useCallback(async () => {
    if (!user || !calleeId) return;
    setError(null);

    try {
      const stream = await getLocalMedia();
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const iceServers = await webrtcService.getICEServers();
      const pc = await webrtcService.createPeerConnection(calleeId, iceServers);
      peerConnectionRef.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      const offer = await webrtcService.createOffer(calleeId);
      await webrtcService.setRemoteDescription(calleeId, offer);

      const callId = Date.now().toString();
      callIdRef.current = callId;
      
      requestCall(calleeId, user.username);
      setCallState('ringing');
      setTimeout(() => setCallState('connecting'), 500);
    } catch (err) {
      console.error('Start call error:', err);
      setError(err.message || 'Failed to start call');
      cleanupCall();
    }
  }, [user, calleeId, getLocalMedia]);

  // Accept an incoming call (callee side)
  const handleAcceptCall = useCallback(async () => {
    if (!incomingCall || !user) return;

    const { fromUserId, fromUsername, offerSdp, offerType, callId } = incomingCall;
    setRemoteUserId(fromUserId);
    setRemoteUsername(fromUsername);
    callIdRef.current = callId;

    try {
      const stream = await getLocalMedia();
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const iceServers = await webrtcService.getICEServers();
      const pc = await webrtcService.createPeerConnection(fromUserId, iceServers);
      peerConnectionRef.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      await webrtcService.setRemoteDescription(fromUserId, {
        sdp: offerSdp,
        type: offerType || 'offer',
      });

      const answer = await webrtcService.createAnswer(fromUserId);
      await webrtcService.setRemoteDescription(fromUserId, {
        sdp: answer.sdp,
        type: 'answer',
      });

      sendAnswer(fromUserId, answer);
      acceptCall(callId);

      setIncomingCall(null);
      setCallState('connected');
      startDurationTimer();
    } catch (err) {
      console.error('Accept call error:', err);
      setError(err.message || 'Failed to accept call');
      setCallState('idle');
    }
  }, [incomingCall, user, getLocalMedia]);

  // Reject incoming call
  const handleRejectCall = useCallback(() => {
    if (!incomingCall) return;
    rejectCall(incomingCall.callId || Date.now().toString());
    setIncomingCall(null);
  }, [incomingCall]);

  // End call
  const handleEndCall = useCallback(() => {
    if (callIdRef.current) {
      endCallSocket(callIdRef.current);
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    webrtcService.closeAllConnections();
    cleanupCall();
    setRemoteUserId(null);
    setRemoteUsername(null);
    setDuration(0);
    setIsMuted(false);
    setIsVideoOff(false);
    setError(null);
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  }, [remoteUserId, cleanupCall]);

  // Toggle mute
  const handleToggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    const track = localStreamRef.current.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsMuted(!track.enabled);
    }
  }, []);

  // Toggle video
  const handleToggleVideo = useCallback(() => {
    if (!localStreamRef.current) return;
    const track = localStreamRef.current.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsVideoOff(!track.enabled);
    }
  }, []);

  // Handle incoming offer (when this user is the callee)
  const handleRemoteOffer = useCallback(async (data) => {
    if (!user) return;
    const { fromUserId, fromUsername, offer, callId } = data;

    setRemoteUserId(fromUserId);
    setRemoteUsername(fromUsername);
    callIdRef.current = callId;
    setCallState('connecting');

    try {
      const stream = await getLocalMedia();
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const iceServers = await webrtcService.getICEServers();
      const pc = await webrtcService.createPeerConnection(fromUserId, iceServers);
      peerConnectionRef.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      await webrtcService.setRemoteDescription(fromUserId, {
        sdp: offer.sdp,
        type: offer.type || 'offer',
      });

      const answer = await webrtcService.createAnswer(fromUserId);
      await webrtcService.setRemoteDescription(fromUserId, {
        sdp: answer.sdp,
        type: 'answer',
      });

      sendAnswer(fromUserId, answer);
      acceptCall(callId);
      setCallState('connected');
      startDurationTimer();
    } catch (err) {
      console.error('Handle offer error:', err);
      setError(err.message || 'Failed to connect');
      setCallState('idle');
    }
  }, [user, getLocalMedia]);

  // Handle remote answer (when this user is the caller)
  const handleRemoteAnswer = useCallback(async (data) => {
    if (!peerConnectionRef.current) return;
    try {
      await webrtcService.setRemoteDescription(remoteUserId, {
        sdp: data.answer.sdp,
        type: data.answer.type || 'answer',
      });
    } catch (err) {
      console.error('Handle answer error:', err);
    }
  }, [remoteUserId]);

  // Handle ICE candidate from remote peer
  const handleRemoteICECandidate = useCallback(async (data) => {
    if (!peerConnectionRef.current) return;
    try {
      await webrtcService.addICECandidate(remoteUserId, data.candidate);
    } catch (err) {
      console.error('ICE candidate error:', err);
    }
  }, [remoteUserId]);

  // Handle remote hangup
  const handleRemoteHangup = useCallback(() => {
    setCallState('idle');
    setRemoteUserId(null);
    setRemoteUsername(null);
    setDuration(0);
    setIncomingCall(null);
    setError(null);
    if (localStreamRef.current) localStreamRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    cleanupCall();
  }, [cleanupCall]);

  // Handle socket errors
  const handleSocketError = useCallback((data) => {
    const msg = data.error || 'Call error occurred';
    setError(msg);
    if (msg.includes('ended') || msg === 'Call ended') {
      handleRemoteHangup();
    }
  }, []);

  // Set up socket listeners
  useEffect(() => {
    if (!user) return;

    socketService.on('incoming_call', (data) => {
      if (data.toUserId === user.id || data.fromUserId) {
        setIncomingCall({ ...data, callId: data.callId || Date.now().toString() });
        setCallState('ringing');
      }
    });

    socketService.on('call_ended', handleRemoteHangup);
    socketService.on('call_error', handleSocketError);
    socketService.on('offer', handleRemoteOffer);

    return () => {
      socketService.off('incoming_call');
      socketService.off('call_ended', handleRemoteHangup);
      socketService.off('call_error', handleSocketError);
      socketService.off('offer', handleRemoteOffer);
    };
  }, [user, handleRemoteHangup, handleSocketError, handleRemoteOffer]);

  // Update video track when toggling
  useEffect(() => {
    if (localStreamRef.current) {
      const tracks = localStreamRef.current.getVideoTracks();
      tracks.forEach(track => { track.enabled = !isVideoOff; });
    }
  }, [isVideoOff]);

  // Update audio track when toggling
  useEffect(() => {
    if (localStreamRef.current) {
      const tracks = localStreamRef.current.getAudioTracks();
      tracks.forEach(track => { track.enabled = !isMuted; });
    }
  }, [isMuted]);

  // Show incoming call overlay
  if (incomingCall && (callState === 'idle' || callState === 'ringing')) {
    return (
      <div className="incoming-call-overlay">
        <div className="incoming-call-card">
          <div className="incoming-call-avatar">
            {remoteUsername?.charAt(0).toUpperCase() || '?'}
          </div>
          <h2 className="incoming-call-name">
            Incoming call from {remoteUsername || 'Unknown'}
          </h2>
          {remoteUserId && (
            <p className="incoming-call-status">User ID: {remoteUserId}</p>
          )}
          <div className="incoming-call-actions">
            <button
              className="incoming-call-btn accept"
              onClick={handleAcceptCall}
              disabled={!user || callState !== 'ringing'}
            >
              Accept
            </button>
            <button
              className="incoming-call-btn reject"
              onClick={handleRejectCall}
            >
              Decline
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main call UI
  return (
    <div className="call-container">
      {/* Remote video (full screen background) */}
      <div className="call-video-grid">
        <div className="call-video-main">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            muted={false}
          />
          {(!remoteVideoRef.current?.srcObject || callState === 'connecting' || callState === 'ringing') && (
            <div
              className="call-video-placeholder"
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #0d0f1a 0%, #1a1a2e 100%)',
                color: 'var(--text-secondary)',
              }}
            >
              {remoteUsername && remoteUsername.charAt(0) && (
                <div
                  className="call-avatar-large"
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--accent), var(--accent-glow))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 48,
                    fontWeight: 700,
                    color: 'white',
                    marginBottom: 16,
                    boxShadow: '0 0 40px rgba(139, 92, 246, 0.3)',
                  }}
                >
                  {remoteUsername.charAt(0).toUpperCase()}
                </div>
              )}
              <p style={{ fontSize: 14 }}>
                {callState === 'connecting' ? 'Connecting...' :
                 callState === 'ringing' ? 'Ringing...' :
                 remoteUsername || 'Waiting for connection...'}
              </p>
              {error && (
                <p style={{ color: 'var(--danger)', marginTop: 8, fontSize: 12 }}>
                  {error}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Local video (PiP) */}
        <div
          className={`call-video-pip ${isVideoOff ? 'off' : ''}`}
          onClick={handleToggleVideo}
        >
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
          />
          {isVideoOff && <span className="call-video-pip-icon">📷</span>}
        </div>

        {/* Call info bar */}
        <div className="call-info">
          <div className="call-timer">{formatDuration(duration)}</div>
          {remoteUsername && (
            <div className="call-participant-name">{remoteUsername}</div>
          )}
        </div>
      </div>

      {/* Call controls */}
      <div className="call-controls">
        <div className="call-controls-left">
          <button
            className={`call-btn ${isMuted ? 'muted' : ''}`}
            onClick={handleToggleMute}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? '🎤🔇' : '🎤'}
          </button>
          <button
            className={`call-btn ${isVideoOff ? 'video-off' : ''}`}
            onClick={handleToggleVideo}
            title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
          >
            {isVideoOff ? '📷❌' : '📷'}
          </button>
        </div>

        <div className="call-controls-center">
          {error && (
            <div className="toast">
              <span style={{ fontSize: '1.1rem' }}>⚠️</span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{error}</span>
              <button className="toast-close" onClick={() => setError(null)}>×</button>
            </div>
          )}
        </div>

        <div className="call-controls-right">
          <button
            className="call-btn end-call"
            onClick={handleEndCall}
            title="End call"
          >
            📞
          </button>
        </div>
      </div>
    </div>
  );
}
