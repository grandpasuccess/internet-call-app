import {
  onSocket,
  offSocket,
  emitSocketEvent,
} from './socket';

/**
 * Call-related socket event handlers
 * Listens for incoming calls, call status updates, and signaling data
 */
let handlers = {};

export const callService = {
  /**
   * Initialize call-related socket listeners
   */
  init(onIncomingCall, onCallAccepted, onCallEnded, onCallError) {
    onSocket('incoming_call', (data) => {
      onIncomingCall(data);
    });

    onSocket('call_accepted', (data) => {
      onCallAccepted(data);
    });

    onSocket('call_rejected', (data) => {
      onCallEnded(data);
    });

    onSocket('call_ended', (data) => {
      onCallEnded(data);
    });

    onSocket('call_error', (data) => {
      onCallError(data);
    });

    onSocket('call_connected', (data) => {
      onCallAccepted(data);
    });
  },

  /**
   * Send call request to another user
   */
  requestCall(toUserId, fromUsername) {
    emitSocketEvent('call_request', {
      toUserId,
      fromUsername: fromUsername || 'Unknown',
    });
  },

  /**
   * Accept an incoming call
   */
  acceptCall(callId) {
    emitSocketEvent('call_accept', { callId });
  },

  /**
   * Reject an incoming call
   */
  rejectCall(callId, reason) {
    emitSocketEvent('call_reject', {
      callId,
      reason: reason || 'User declined',
    });
  },

  /**
   * End the current call
   */
  endCall(callId) {
    emitSocketEvent('call_end', { callId });
  },

  /**
   * Send WebRTC offer (SDP)
   */
  sendOffer(toUserId, offer) {
    emitSocketEvent('offer', {
      toUserId,
      offer: {
        sdp: offer.sdp,
        type: offer.type || 'offer',
      },
    });
  },

  /**
   * Send WebRTC answer (SDP)
   */
  sendAnswer(toUserId, answer) {
    emitSocketEvent('answer', {
      toUserId,
      answer: {
        sdp: answer.sdp,
        type: answer.type || 'answer',
      },
    });
  },

  /**
   * Send ICE candidate
   */
  sendICECandidate(toUserId, candidate) {
    emitSocketEvent('ice_candidate', {
      toUserId,
      candidate: {
        candidate: candidate.candidate,
        sdpMid: candidate.sdpMid,
        sdpMLineIndex: candidate.sdpMLineIndex,
      },
    });
  },

  /**
   * Handle incoming offer
   */
  handleOffer(offerData) {
    return offerData;
  },

  /**
   * Handle incoming answer
   */
  handleAnswer(answerData) {
    return answerData;
  },

  /**
   * Handle incoming ICE candidate
   */
  handleICECandidate(candidateData) {
    return candidateData;
  },

  cleanUp() {
    handlers = {};
  },
};
