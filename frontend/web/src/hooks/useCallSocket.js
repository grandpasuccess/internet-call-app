import { socketService } from '../services/socket';
import { webrtcService } from '../services/webrtc';

const handlers = new Map();

/**
 * Register socket event handlers for a specific call session
 */
export const useCallSocket = () => {
  const register = (callId, handlersMap) => {
    handlers.set(callId, { ...handlersMap });
    
    socketService.on('incoming_call', (data) => {
      if (handlersMap.onIncomingCall) handlersMap.onIncomingCall(data);
    });
    
    socketService.on('call_accepted', (data) => {
      if (handlersMap.onCallAccepted) handlersMap.onCallAccepted(data);
    });
    
    socketService.on('call_rejected', (data) => {
      if (handlersMap.onCallRejected) handlersMap.onCallRejected(data);
    });
    
    socketService.on('call_ended', (data) => {
      if (handlersMap.onCallEnded) handlersMap.onCallEnded(data);
    });
    
    socketService.on('call_connected', (data) => {
      if (handlersMap.onCallConnected) handlersMap.onCallConnected(data);
    });
    
    socketService.on('offer', (data) => {
      if (handlersMap.onOffer) handlersMap.onOffer(data);
    });
    
    socketService.on('answer', (data) => {
      if (handlersMap.onAnswer) handlersMap.onAnswer(data);
    });
    
    socketService.on('ice_candidate', (data) => {
      if (handlersMap.onICECandidate) handlersMap.onICECandidate(data);
    });
    
    socketService.on('call_error', (data) => {
      if (handlersMap.onError) handlersMap.onError(data);
    });
  };

  const unregister = (callId) => {
    const h = handlers.get(callId);
    if (h) {
      socketService.off('incoming_call');
      socketService.off('call_accepted');
      socketService.off('call_rejected');
      socketService.off('call_ended');
      socketService.off('call_connected');
      socketService.off('offer');
      socketService.off('answer');
      socketService.off('ice_candidate');
      socketService.off('call_error');
      handlers.delete(callId);
    }
  };

  const cleanup = () => {
    handlers.forEach((_, callId) => unregister(callId));
    handlers.clear();
  };

  return { register, unregister, cleanup };
};

/**
 * Send call request to another user
 */
export const requestCall = (toUserId, fromUsername) => {
  socketService.emit('call_request', {
    toUserId,
    fromUsername: fromUsername || 'Unknown',
  });
};

/**
 * Accept an incoming call
 */
export const acceptCall = (callId) => {
  socketService.emit('call_accept', { callId });
};

/**
 * Reject an incoming call
 */
export const rejectCall = (callId, reason = 'User declined') => {
  socketService.emit('call_reject', { callId, reason });
};

/**
 * End a call
 */
export const endCall = (callId) => {
  socketService.emit('call_end', { callId });
};

/**
 * Send SDP offer
 */
export const sendOffer = (toUserId, offer) => {
  socketService.emit('offer', {
    toUserId,
    offer: {
      sdp: offer.sdp,
      type: offer.type || 'offer',
    },
  });
};

/**
 * Send SDP answer
 */
export const sendAnswer = (toUserId, answer) => {
  socketService.emit('answer', {
    toUserId,
    answer: {
      sdp: answer.sdp,
      type: answer.type || 'answer',
    },
  });
};

/**
 * Send ICE candidate
 */
export const sendICECandidate = (toUserId, candidate) => {
  socketService.emit('ice_candidate', {
    toUserId,
    candidate: {
      candidate: candidate.candidate,
      sdpMid: candidate.sdpMid,
      sdpMLineIndex: candidate.sdpMLineIndex,
    },
  });
};
