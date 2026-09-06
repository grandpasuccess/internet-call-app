import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getSocket, onSocketEvent, initSocket } from '../services/socket';
import { callService } from '../services/callService';
import { authService } from '../services/authService';
import { api } from '../services/api';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [activeCall, setActiveCall] = useState(null);
  const [callStatus, setCallStatus] = useState('idle'); // idle, ringing, connected, ended
  const [message, setMessage] = useState(null);
  const socket = getSocket();

  // Fetch online users on mount
  useEffect(() => {
    if (!user) return;

    const fetchOnlineUsers = async () => {
      try {
        const res = await api.get('/users/online');
        setOnlineUsers(res.data.users || []);
      } catch (err) {
        console.error('Failed to fetch online users:', err);
      }
    };

    fetchOnlineUsers();
  }, [user]);

  // Listen for online/offline events
  useEffect(() => {
    if (!socket) return;

    const unsubOnline = onSocketEvent('user_online', ({ userId }) => {
      setOnlineUsers((prev) => {
        if (prev.some((u) => u.id === userId)) return prev;
        return [...prev, { id: userId, onlineAt: Date.now() }];
      });
    });

    const unsubOffline = onSocketEvent('user_offline', ({ userId }) => {
      setOnlineUsers((prev) => prev.filter((u) => u.id !== userId));
    });

    const unsubIncomingCall = onSocketEvent('incoming_call', (data) => {
      setCallStatus('ringing');
      setActiveCall({
        callId: data.callId,
        fromUserId: data.fromUserId,
        fromUsername: data.fromUsername,
        direction: 'incoming',
      });
    });

    const unsubCallAccepted = onSocketEvent('call_accepted', () => {
      setCallStatus('connected');
    });

    const unsubCallEnded = onSocketEvent('call_ended', () => {
      setCallStatus('ended');
      setActiveCall(null);
    });

    const unsubCallRejected = onSocketEvent('call_rejected', () => {
      setCallStatus('idle');
      setActiveCall(null);
      setMessage('Call was rejected');
    });

    return () => {
      unsubOnline();
      unsubOffline();
      unsubIncomingCall();
      unsubCallAccepted();
      unsubCallEnded();
      unsubCallRejected();
    };
  }, [socket]);

  // Handle incoming call acceptance
  const handleAcceptCall = useCallback(async () => {
    if (!activeCall) return;
    setCallStatus('connecting');

    try {
      await callService.acceptCall(activeCall.callId);
      // Status will update via socket event
    } catch (err) {
      console.error('Failed to accept call:', err);
      setCallStatus('idle');
      setActiveCall(null);
    }
  }, [activeCall]);

  // Handle incoming call rejection
  const handleRejectCall = useCallback(async () => {
    if (!activeCall) return;

    try {
      await callService.rejectCall(activeCall.callId, 'User declined');
      setCallStatus('idle');
      setActiveCall(null);
    } catch (err) {
      console.error('Failed to reject call:', err);
    }
  }, [activeCall]);

  // Initiate a call to a user
  const handleCallUser = useCallback(async (toUserId, toUsername) => {
    setCallStatus('ringing');

    try {
      const call = await callService.initiateCall(toUserId, user?.username || 'You');
      setActiveCall({
        callId: call.callId || call.id,
        toUserId,
        toUsername,
        direction: 'outgoing',
      });
    } catch (err) {
      console.error('Failed to initiate call:', err);
      setCallStatus('idle');
      setMessage('Failed to start call');
    }
  }, [user]);

  // End the current call
  const handleEndCall = useCallback(async () => {
    if (!activeCall) return;

    try {
      await callService.endCall(activeCall.callId);
    } catch (err) {
      console.error('Failed to end call:', err);
    }

    setCallStatus('idle');
    setActiveCall(null);
  }, [activeCall]);

  // Logout handler
  const handleLogout = async () => {
    await authService.logout();
    window.location.href = '/login';
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-info">
          <h2>Welcome, {user?.username || 'User'}</h2>
          <span className={`status-badge status-${callStatus === 'connected' ? 'active' : 'idle'}`}>
            {callStatus === 'connected' ? 'In Call' : callStatus === 'ringing' ? 'Calling...' : 'Available'}
          </span>
        </div>
        <button className="btn btn-logout" onClick={handleLogout}>
          Log Out
        </button>
      </header>

      {message && (
        <div className="message-banner">
          <p>{message}</p>
          <button className="btn btn-sm" onClick={() => setMessage(null)}>Dismiss</button>
        </div>
      )}

      {callStatus === 'ringing' && activeCall && (
        <div className="call-modal">
          <div className="call-modal-content">
           <h3>{activeCall?.direction === 'incoming' ? 'Incoming Call' : 'Calling...'}</h3>
            <p className="call-user">
              {activeCall.fromUsername || activeCall.toUsername}
            </p>
            <div className="call-modal-actions">
              {activeCall.direction === 'incoming' ? (
                <>
                  <button className="btn btn-accept" onClick={handleAcceptCall}>
                    Accept
                  </button>
                  <button className="btn btn-reject" onClick={handleRejectCall}>
                    Reject
                  </button>
                </>
              ) : (
                <button className="btn btn-end" onClick={handleEndCall}>
                  End Call
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="dashboard-content">
        <section className="online-users-section">
          <h3>Online Users ({onlineUsers.length})</h3>
          {onlineUsers.length === 0 ? (
            <p className="empty-state">No users online right now.</p>
          ) : (
            <ul className="user-list">
              {onlineUsers.map((u) => (
                <li key={u.id} className={`user-item ${activeCall?.toUserId === u.id ? 'calling' : ''}`}>
                  <span className="user-avatar">{u.username?.charAt(0).toUpperCase()}</span>
                  <span className="user-name">{u.username}</span>
                  <button
                    className="btn btn-call"
                    onClick={() => handleCallUser(u.id, u.username)}
                    disabled={callStatus === 'ringing' || callStatus === 'connected'}
                  >
                    Call
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {activeCall && callStatus === 'connected' && (
          <section className="active-call-section">
            <CallPanel call={activeCall} onEnd={handleEndCall} />
          </section>
        )}
      </div>
    </div>
  );
}

// Inline CallPanel component for active calls
function CallPanel({ call, onEnd }) {
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCallDuration((d) => d + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="call-panel">
      <div className="call-panel-header">
        <h3>Active Call</h3>
        <button className="btn btn-end" onClick={onEnd}>
          End Call
        </button>
      </div>
      <div className="call-timer">{formatDuration(callDuration)}</div>
      <div className="call-participant">
        <span className="participant-label">With:</span>
        <span className="participant-name">{call.toUsername || call.fromUsername}</span>
      </div>
      <CallControls onEnd={onEnd} />
    </div>
  );
}

function CallControls({ onEnd }) {
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);

  return (
    <div className="call-controls">
      <button
        className={`call-btn ${muted ? 'active' : ''}`}
        onClick={() => setMuted(!muted)}
        title={muted ? 'Unmute' : 'Mute'}
      >
        <span className="btn-icon">{muted ? '🔇' : '🎤'}</span>
      </button>
      <button
        className={`call-btn ${videoOff ? 'active' : ''}`}
        onClick={() => setVideoOff(!videoOff)}
        title={videoOff ? 'Turn camera on' : 'Turn camera off'}
      >
        <span className="btn-icon">{videoOff ? '📷❌' : '📷'}</span>
      </button>
      <button className="call-btn call-end-btn" onClick={onEnd} title="End call">
        <span className="btn-icon">📞❌</span>
      </button>
    </div>
  );
}
