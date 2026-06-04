import { create } from 'zustand';
import { useAuthStore } from './authStore';
import { useChatStore } from './chatStore';

interface CallState {
  isInCall: boolean;
  isIncoming: boolean;
  isOutgoing: boolean;
  callType: 'voice' | 'video' | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callDuration: number;
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;

  initCallListeners: () => void;
  startCall: (type: 'voice' | 'video') => Promise<void>;
  acceptCall: () => Promise<void>;
  declineCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  incrementDuration: () => void;
}

let callTimer: any = null;
let peerConnection: RTCPeerConnection | null = null;
const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export const useCallStore = create<CallState>((set, get) => ({
  isInCall: false,
  isIncoming: false,
  isOutgoing: false,
  callType: null,
  localStream: null,
  remoteStream: null,
  callDuration: 0,
  isMuted: false,
  isCameraOff: false,
  isScreenSharing: false,

  initCallListeners: () => {
    const socket = useChatStore.getState().socket;
    if (!socket) return;

    // Incoming Call Ringing
    socket.on('incoming-call', (data: { callerId: string; offer: any; callType: 'voice' | 'video' }) => {
      // Save offer temporarily on socket data or state
      (socket as any).incomingOffer = data.offer;
      (socket as any).callerId = data.callerId;
      
      set({
        isIncoming: true,
        callType: data.callType,
        isOutgoing: false,
        isInCall: false
      });
    });

    // Caller receives Call Answered
    socket.on('call-answered', async (data: { answer: any }) => {
      try {
        if (peerConnection) {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
          set({
            isInCall: true,
            isOutgoing: false,
            isIncoming: false
          });
          get().incrementDuration();
        }
      } catch (err) {
        console.warn('WebRTC peer connection answer fail, fallback to simulated call');
        set({
          isInCall: true,
          isOutgoing: false,
          isIncoming: false
        });
        get().incrementDuration();
      }
    });

    // Caller receives call rejected
    socket.on('call-rejected', () => {
      get().endCall();
    });

    // Receive ICE Candidates
    socket.on('ice-candidate', async (data: { candidate: any }) => {
      try {
        if (peerConnection && data.candidate) {
          await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      } catch (err) {
        // Ignored in mock
      }
    });

    // Call Ended by partner
    socket.on('call-ended', () => {
      get().endCall();
    });
  },

  startCall: async (type) => {
    set({ isOutgoing: true, callType: type });
    const socket = useChatStore.getState().socket;
    const auth = useAuthStore.getState();
    if (!socket || !auth.partner || !auth.couple) return;

    try {
      // Attempt to get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === 'video',
        audio: true
      });
      set({ localStream: stream });

      // Create Peer Connection
      peerConnection = new RTCPeerConnection(configuration);
      
      stream.getTracks().forEach((track) => {
        if (peerConnection) {
          peerConnection.addTrack(track, stream);
        }
      });

      peerConnection.ontrack = (event) => {
        set({ remoteStream: event.streams[0] });
      };

      peerConnection.onicecandidate = (event) => {
        if (event.candidate && auth.partner) {
          socket.emit('ice-candidate', {
            coupleId: auth.couple._id,
            recipientId: auth.partner.id,
            candidate: event.candidate
          });
        }
      };

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      socket.emit('call-user', {
        coupleId: auth.couple._id,
        recipientId: auth.partner.id,
        offer: offer,
        callType: type
      });
    } catch (err) {
      console.warn('Camera/Mic access denied or WebRTC unsupported. Using simulated call mode.');
      // Simulated Outgoing Call
      socket.emit('call-user', {
        coupleId: auth.couple._id,
        recipientId: auth.partner.id,
        offer: { type: 'mock-offer' },
        callType: type
      });
    }
  },

  acceptCall: async () => {
    const socket = useChatStore.getState().socket;
    const auth = useAuthStore.getState();
    const callType = get().callType;
    if (!socket || !auth.partner || !auth.couple || !callType) return;

    const incomingOffer = (socket as any).incomingOffer;
    const callerId = (socket as any).callerId;

    set({ isIncoming: false, isInCall: true });
    get().incrementDuration();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: callType === 'video',
        audio: true
      });
      set({ localStream: stream });

      peerConnection = new RTCPeerConnection(configuration);

      stream.getTracks().forEach((track) => {
        if (peerConnection) {
          peerConnection.addTrack(track, stream);
        }
      });

      peerConnection.ontrack = (event) => {
        set({ remoteStream: event.streams[0] });
      };

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice-candidate', {
            coupleId: auth.couple._id,
            recipientId: callerId,
            candidate: event.candidate
          });
        }
      };

      if (incomingOffer && incomingOffer.type !== 'mock-offer') {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(incomingOffer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        socket.emit('call-accepted', {
          coupleId: auth.couple._id,
          callerId: callerId,
          answer: answer
        });
      } else {
        // Mock connection answer
        socket.emit('call-accepted', {
          coupleId: auth.couple._id,
          callerId: callerId,
          answer: { type: 'mock-answer' }
        });
      }
    } catch (err) {
      console.warn('Accept call fallback to simulated call');
      socket.emit('call-accepted', {
        coupleId: auth.couple._id,
        callerId: callerId,
        answer: { type: 'mock-answer' }
      });
    }
  },

  declineCall: () => {
    const socket = useChatStore.getState().socket;
    const callerId = (socket as any).callerId;
    const coupleId = useAuthStore.getState().couple?._id;
    
    if (socket && callerId && coupleId) {
      socket.emit('call-declined', { coupleId, callerId });
    }
    
    set({
      isIncoming: false,
      callType: null
    });
  },

  endCall: () => {
    const socket = useChatStore.getState().socket;
    const auth = useAuthStore.getState();

    if (socket && auth.partner && auth.couple) {
      socket.emit('hang-up', {
        coupleId: auth.couple._id,
        recipientId: auth.partner.id
      });
    }

    if (peerConnection) {
      peerConnection.close();
      peerConnection = null;
    }

    const localStream = get().localStream;
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }

    if (callTimer) {
      clearInterval(callTimer);
      callTimer = null;
    }

    // Save call history on db (post request) - let's make it fire-and-forget
    if (get().isInCall && auth.couple && auth.partner) {
      const type = get().callType || 'voice';
      const duration = get().callDuration;
      // We can post call details to API
      fetch('http://localhost:5000/api/games/spin-submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify({ task: `Completed ${type} call lasting ${duration}s` })
      }).catch(() => {});
    }

    set({
      isInCall: false,
      isIncoming: false,
      isOutgoing: false,
      callType: null,
      localStream: null,
      remoteStream: null,
      callDuration: 0,
      isMuted: false,
      isCameraOff: false,
      isScreenSharing: false
    });
  },

  toggleMute: () => {
    const localStream = get().localStream;
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        set({ isMuted: !audioTrack.enabled });
      }
    } else {
      // Mock mute toggling
      set((state) => ({ isMuted: !state.isMuted }));
    }
  },

  toggleCamera: () => {
    const localStream = get().localStream;
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        set({ isCameraOff: !videoTrack.enabled });
      }
    } else {
      // Mock camera toggling
      set((state) => ({ isCameraOff: !state.isCameraOff }));
    }
  },

  incrementDuration: () => {
    if (callTimer) clearInterval(callTimer);
    callTimer = setInterval(() => {
      set((state) => ({ callDuration: state.callDuration + 1 }));
    }, 1000);
  }
}));
