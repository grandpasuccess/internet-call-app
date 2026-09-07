import { useCallback, useRef, useState, useEffect } from 'react';
import { webrtcService } from '../services/webrtc';
import { socketService } from '../services/socket';
import { useAuth } from '../hooks/useAuth';

/**
 * useCall — manages the entire call lifecycle
 * Handles: initiate, accept, reject, end, mute, camera toggle, ICE exchange
 */
export const useCall = () => {
  const { user } = useAuth();
  const [callState, setCallState] = useState('idle'); // idle | ringing | connecting | connected | ending
  const [remoteUserId, setRemoteUserId] = useState(null);
  const [remoteUsername, setRemoteUsername] = useState(null);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [error, setError] = useState(null);
  
  const peerConnectionRef = useRef(null);
  const durationIntervalRef = useRef(null);
  const localStreamRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endCall();
    };
  }, []);

  // Cleanup duration timer when call ends
  useEffect(() => {
    if (callState === 'connected') {
      durationIntervalRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [callState]);

  const startCall = useCallback(async (toUserId) => {
    if (!user) return;
    setError(null);
    setCallState('ringing');
    setRemoteUserId(toUserId);
    
    try {
      // Get local media
      const localStream = await webrtcService.getLocalStream(true, true);
      localStreamRef.current = localStream;
      
      // Get ICE servers
      const iceServers = await webrtcService.getICEServers();
      
      // Create peer connection
      const pc = await webrtcService.createPeerConnection(toUserId, iceServers);
      peerConnectionRef.current = pc;
      
      // Add local tracks
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
      
      // Create and send offer
      const offer = await webrtcService.createOffer(toUserId);
      
      // Emit call request via socket
      socketService.emit('call_request', {
        toUserId,
        fromUsername: user.username,
        offerSdp: offer.sdp,
        offerType: offer.type,
      });
      
      // Create call record on backend
      socketService.emit('create_call', { toUserId });
      
      setCallState('connecting');
    } catch (err) {
      console.error('Start call error:', err);
      setError(err.message || 'Failed to start call');
      setCallState('idle');
      setRemoteUserId(null);
    }
  }, [user]);

  const acceptCall = useCallback(async () => {
    if (!incomingCall || !peerConnectionRef.current) return;
    
    try {
      const { fromUserId, fromUsername, offerSdp, offerType } = incomingCall;
      setRemoteUserId(fromUserId);
      setRemoteUsername(fromUsername);
      
      // Get local media
      const localStream = await webrtcService.getLocalStream(true, true);
      localStreamRef.current = localStream;
      
      const iceServers = await webrtcService.getICEServers();
      const pc = peerConnectionRef.current;
      
      // Add local tracks
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
      
      // Set remote description (the offer)
      await webrtcService.setRemoteDescription(fromUserId, { sdp: offerSdp, type: offerType });
      
      // Create answer
      const answer = await webrtcService.createAnswer(fromUserId);
      
      // Send answer via socket
      socketService.emit('answer', {
        toUserId: fromUserId,
        answerSdp: answer.sdp,
        answerType: answer.type,
      });
      
      // Accept on backend
      socketService.emit('call_accept', { callId: incomingCall.callId });
      
      setCallState('connected');
      setIncomingCall(null);
    } catch (err) {
      console.error('Accept call error:', err);
      setError(err.message || 'Failed to accept call');
      setCallState('ringing');
    }
  }, [incomingCall]);

  const rejectCall = useCallback(() => {
    if (!incomingCall) return;
    
    socketService.emit('call_reject', {
      callId: incomingCall.callId,
      reason: 'User declined',
    });
    
    setIncomingCall(null);
    setCallState('idle');
  }, [incomingCall]);

  const endCall = useCallback(async () => {
    const pc = peerConnectionRef.current;
    
    if (pc) {
      // Send end signal first
      socketService.emit('call_end', { 
        callId: incomingCall?.callId || 'current',
      });
      
      // Close peer connection
      webrtcService.closePeerConnection(remoteUserId);
      peerConnectionRef.current = null;
    }
    
    // Release local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    setCallState('idle');
    setRemoteUserId(null);
    setRemoteUsername(null);
    setDuration(0);
    setIsMuted(false);
    setIsVideoOff(false);
    setIncomingCall(null);
    setError(null);
  }, [incomingCall, remoteUserId]);

  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    
    const audioTracks = localStreamRef.current.getAudioTracks();
    if (audioTracks.length > 0) {
      const track = audioTracks[0];
      track.enabled = !track.enabled;
      setIsMuted(!track.enabled);
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (!localStreamRef.current) return;
    
    const videoTracks = localStreamRef.current.getVideoTracks();
    if (videoTracks.length > 0) {
      const track = videoTracks[0];
      track.enabled = !track.enabled;
      setIsVideoOff(!track.enabled);
    }
  }, []);

  const handleRemoteOffer = useCallback(async (offerData) => {
    if (!user) return;
    
    try {
      setCallState('connecting');
      setRemoteUserId(offerData.fromUserId);
      setRemoteUsername(offerData.fromUsername);
      
      // Get local media
      const localStream = await webrtcService.getLocalStream(true, true);
      localStreamRef.current = localStream;
      
      const iceServers = await webrtcService.getICEServers();
      const pc = await webrtcService.createPeerConnection(offerData.fromUserId, iceServers);
      peerConnectionRef.current = pc;
      
      // Add local tracks
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
      
      // Set remote description
      await webrtcService.setRemoteDescription(offerData.fromUserId, offerData);
      
      // Create answer
      const answer = await webrtcService.createAnswer(offerData.fromUserId);
      
      // Send answer
      socketService.emit('answer', {
        toUserId: offerData.fromUserId,
        answerSdp: answer.sdp,
        answerType: answer.type,
      });
      
      setCallState('connected');
    } catch (err) {
      console.error('Handle remote offer error:', err);
      setError(err.message || 'Failed to connect call');
      setCallState('idle');
      setRemoteUserId(null);
    }
  }, [user]);

  const handleRemoteAnswer = useCallback(async (answerData) => {
    if (!peerConnectionRef.current) return;
    
    try {
      await webrtcService.setRemoteDescription(remoteUserId, answerData);
    } catch (err) {
      console.error('Handle remote answer error:', err);
    }
  }, [remoteUserId]);

  const handleRemoteICECandidate = useCallback(async (candidateData) => {
    if (!peerConnectionRef.current) return;
    
    try {
      await webrtcService.addICECandidate(remoteUserId, candidateData.candidate);
    } catch (err) {
      console.error('Handle ICE candidate error:', err);
    }
  }, [remoteUserId]);

  const handleRemoteHangup = useCallback(() => {
    setCallState('idle');
    setRemoteUserId(null);
    setRemoteUsername(null);
    setDuration(0);
    setIncomingCall(null);
    setError(null);
  }, []);

  // Register socket listeners (only once)
  useEffect(() => {
    socketService.on('incoming_call', setIncomingCall);
    socketService.on('call_accepted', handleRemoteAnswer);
    socketService.on('offer', handleRemoteOffer);
    socketService.on('answer', handleRemoteAnswer);
    socketService.on('ice_candidate', handleRemoteICECandidate);
    socketService.on('call_ended', handleRemoteHangup);
    socketService.on('call_error', (err) => setError(err.error || 'Call error'));
    
    return () => {
      socketService.off('incoming_call');
      socketService.off('call_accepted');
      socketService.off('offer');
      socketService.off('answer');
      socketService.off('ice_candidate');
      socketService.off('call_ended');
      socketService.off('call_error');
    };
  }, [handleRemoteOffer, handleRemoteAnswer, handleRemoteICECandidate, handleRemoteHangup]);

  return {
    callState,
    remoteUserId,
    remoteUsername,
    duration,
    isMuted,
    isVideoOff,
    incomingCall,
    error,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    localStreamRef,
    peerConnectionRef,
  };
};
