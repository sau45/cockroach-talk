/**
 * CockroachTalk - Real WebRTC & Socket.io Voice Audio Client Module
 * File Responsibility: Manages microphone capture, WebAudio volume analysis, Socket.io signaling, RTCPeerConnection audio streams, and seamless background audio playback.
 */

class WebRTCManager {
  constructor() {
    this.socket = null;
    this.localStream = null;
    this.audioContext = null;
    this.analyser = null;
    this.peerConnections = new Map(); // socketId -> RTCPeerConnection
    this.audioElements = new Map(); // socketId -> HTMLAudioElement
    this.iceCandidateBuffers = new Map(); // socketId -> Array of candidates
    this.currentRoomId = null;
    this.userProfile = null;
    this.isMuted = true;
    this.isVideoEnabled = false;
    
    // Recording State
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;
    this.mediaStreamDestination = null;

    this.callbacks = {
      onPeerJoined: null,
      onPeerLeft: null,
      onPeerMuteChanged: null,
      onPeersLoaded: null,
      onLocalSpeakingState: null,
      onRoomStateUpdate: null,
      onRoleAssigned: null,
      onRemovalToast: null,
      onActionError: null,
      onRoomEmoji: null,
      onChatMessage: null
    };

    this.iceServers = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
  }

  // Load Socket.io client dynamically if not present
  async loadSocketIoClient() {
    if (window.io) return window.io;
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/socket.io/socket.io.js';
      script.onload = () => resolve(window.io);
      script.onerror = (err) => reject(err);
      document.head.appendChild(script);
    });
  }

  // Setup WebAudio Analyser to measure real-time mic volume level
  setupAudioMeter() {
    if (!this.localStream) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      
      if (!this.audioContext) {
        this.audioContext = new AudioCtx();
      }
      
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }
      
      const source = this.audioContext.createMediaStreamSource(this.localStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (!this.analyser || this.isMuted) {
          if (this.callbacks.onLocalSpeakingState) this.callbacks.onLocalSpeakingState(false);
          
          if (this.lastIsSpeaking !== false) {
            this.lastIsSpeaking = false;
            if (this.socket) {
              this.socket.emit('speaking-state', { isSpeaking: false });
            }
          }
          
          requestAnimationFrame(checkVolume);
          return;
        }

        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const isSpeaking = average > 12;

        if (this.callbacks.onLocalSpeakingState) {
          this.callbacks.onLocalSpeakingState(isSpeaking);
        }
        
        if (this.lastIsSpeaking !== isSpeaking) {
          this.lastIsSpeaking = isSpeaking;
          if (this.socket) {
            this.socket.emit('speaking-state', { isSpeaking });
          }
        }

        requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (e) {
      console.warn('[WebAudio] AudioMeter setup error:', e);
    }
  }

  // Synchronize local microphone and camera tracks to all active peer connections
  async syncMicTracksToAllPeers() {
    if (!this.localStream) return;
    const micTrack = this.localStream.getAudioTracks()[0];
    const videoTrack = this.localStream.getVideoTracks()[0];
    
    if (micTrack) micTrack.enabled = !this.isMuted;
    if (videoTrack) videoTrack.enabled = this.isVideoEnabled;

    for (const [socketId, pc] of this.peerConnections.entries()) {
      try {
        const senders = pc.getSenders();
        
        // Sync Audio
        if (micTrack) {
          const audioSender = senders.find(s => s.track && s.track.kind === 'audio') || senders.find(s => !s.track);
          if (audioSender) {
            await audioSender.replaceTrack(micTrack);
          } else {
            pc.addTrack(micTrack, this.localStream);
            // BUGFIX: Renegotiate explicitely because a new track was added asynchronously after initial SDP handshake
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            this.socket.emit('signal-offer', {
              targetSocketId: socketId,
              offer: pc.localDescription,
              senderProfile: this.userProfile
            });
          }
        }
        
        // Sync Video
        if (videoTrack) {
          const videoSender = senders.find(s => s.track && s.track.kind === 'video');
          if (videoSender) {
            await videoSender.replaceTrack(videoTrack);
          } else {
            pc.addTrack(videoTrack, this.localStream);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            this.socket.emit('signal-offer', {
              targetSocketId: socketId,
              offer: pc.localDescription,
              senderProfile: this.userProfile
            });
          }
        }
        
      } catch (e) {
        console.warn('[WebRTC] Track sync error for socket:', socketId, e);
      }
    }
  }

  // Request user microphone and/or camera stream
  async getLocalMicrophone(forceReinit = false) {
    if (this.localStream && !forceReinit) return this.localStream;
    
    // Stop old tracks if reinitializing
    if (this.localStream && forceReinit) {
        this.localStream.getTracks().forEach(track => track.stop());
    }

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: this.isVideoEnabled
      });
      
      this.setupAudioMeter();
      await this.syncMicTracksToAllPeers();
      return this.localStream;
    } catch (err) {
      console.warn('[WebRTC] Media access not granted or unavailable:', err.message);
      return null;
    }
  }

  // Flush queued ICE candidates after remote description is set
  async flushIceCandidateBuffer(socketId, pc) {
    const candidates = this.iceCandidateBuffers.get(socketId) || [];
    while (candidates.length > 0) {
      const candidate = candidates.shift();
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn('[WebRTC] Error adding buffered ICE candidate:', e);
      }
    }
  }

  // Connect to live voice room immediately and register fresh signaling listeners
  async connectToRoom(roomId, userProfile, password = null, callbacks = {}) {
    this.currentRoomId = roomId;
    this.userProfile = userProfile;
    this.callbacks = { ...this.callbacks, ...callbacks };

    try {
      const response = await fetch('/api/turn-credentials');
      const data = await response.json();
      if (data && data.iceServers) {
        this.iceServers = { iceServers: data.iceServers };
        console.log('[WebRTC] Loaded ICE servers from secure endpoint.');
      }
    } catch (e) {
      console.warn('[WebRTC] Failed to load TURN credentials from endpoint:', e);
    }

    const io = window.io || await this.loadSocketIoClient();
    if (!this.socket) {
      this.socket = io();
    }

    // Clean up any stale listeners to guarantee fresh callbacks fire
    this.socket.off('connect');
    this.socket.off('room-peers');
    this.socket.off('peer-joined');
    this.socket.off('signal-offer');
    this.socket.off('signal-answer');
    this.socket.off('signal-candidate');
    this.socket.off('peer-mute-changed');
    this.socket.off('peer-left');
    this.socket.off('room-state-update');
    this.socket.off('role-assigned');
    this.socket.off('removal-toast');
    this.socket.off('action-error');
    this.socket.off('join-error');
    this.socket.off('banned');

    // Set up Socket.io Signaling Listeners
    this.socket.on('connect', () => {
      console.log('[WebRTC] Connected to signaling server with socket ID:', this.socket.id);
      this.socket.emit('join-room', { roomId, userProfile, password });
    });

    if (this.socket.connected) {
      this.socket.emit('join-room', { roomId, userProfile, password });
    }

    // Received room state update (Active debaters + Waiting queue)
    this.socket.on('room-state-update', (state) => {
      if (this.callbacks.onRoomStateUpdate) {
        this.callbacks.onRoomStateUpdate(state);
      }
    });

    // Role assignment update (active vs queue)
    this.socket.on('role-assigned', ({ role }) => {
      if (role === 'queue') {
        this.setMuteState(true);
      }
      if (this.callbacks.onRoleAssigned) {
        this.callbacks.onRoleAssigned({ role });
      }
    });

    // Toast event on removal
    this.socket.on('removal-toast', ({ message }) => {
      if (this.callbacks.onRemovalToast) {
        this.callbacks.onRemovalToast({ message });
      }
    });

    // Action error from server
    this.socket.on('action-error', ({ message }) => {
      if (this.callbacks.onActionError) {
        this.callbacks.onActionError({ message });
      }
    });

    // Join error from server
    this.socket.on('join-error', ({ message }) => {
      if (this.callbacks.onJoinError) {
        this.callbacks.onJoinError({ message });
      } else {
        alert(message);
        window.location.href = 'junctions.html';
      }
    });

    // Banned event from server
    this.socket.on('banned', ({ message }) => {
      if (window.showBannedModal) {
        window.showBannedModal(message);
      } else {
        alert(message || 'You have been banned from CockroachTalk.');
        window.location.href = 'junctions.html';
      }
    });

    // Room Emoji
    this.socket.on('room-emoji', (data) => {
      if (this.callbacks.onRoomEmoji) {
        this.callbacks.onRoomEmoji(data);
      }
    });

    // Room Chat Message
    this.socket.on('room-chat-message', (data) => {
      if (this.callbacks.onChatMessage) {
        this.callbacks.onChatMessage(data);
      }
    });

    // Room is full rejection
    this.socket.on('room-full', ({ maxCapacity }) => {
      alert(`This junction is currently full (Max ${maxCapacity} participants). Please try again later.`);
      window.location.href = 'junctions.html';
    });

    // Received list of existing peers in room
    this.socket.on('room-peers', async ({ peers }) => {
      console.log('[WebRTC] Loaded existing room peers:', peers);
      if (this.callbacks.onPeersLoaded) {
        this.callbacks.onPeersLoaded(peers);
      }

      for (const peer of peers) {
        if (peer.socketId && peer.socketId !== this.socket.id) {
          await this.createPeerConnection(peer.socketId, true);
        }
      }
    });

    // New peer joined room or reloaded page
    this.socket.on('peer-joined', async ({ peer }) => {
      console.log('[WebRTC] Peer joined room:', peer.displayName, peer.socketId);
      if (this.callbacks.onPeerJoined) {
        this.callbacks.onPeerJoined(peer);
      }

      if (peer && peer.socketId && peer.socketId !== this.socket.id) {
        await this.createPeerConnection(peer.socketId, true);
      }
    });

    // Handle Incoming WebRTC Offer
    this.socket.on('signal-offer', async ({ senderSocketId, offer, senderProfile }) => {
      console.log('[WebRTC] Received offer from:', senderSocketId);
      let pc = this.peerConnections.get(senderSocketId);
      if (!pc) {
        pc = await this.createPeerConnection(senderSocketId, false);
      }
      
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      await this.flushIceCandidateBuffer(senderSocketId, pc);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      this.socket.emit('signal-answer', {
        targetSocketId: senderSocketId,
        answer
      });

      await this.syncMicTracksToAllPeers();
    });

    // Handle Incoming WebRTC Answer
    this.socket.on('signal-answer', async ({ senderSocketId, answer }) => {
      console.log('[WebRTC] Received answer from:', senderSocketId);
      const pc = this.peerConnections.get(senderSocketId);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        await this.flushIceCandidateBuffer(senderSocketId, pc);
        await this.syncMicTracksToAllPeers();
      }
    });

    // Handle Incoming ICE Candidate
    this.socket.on('signal-candidate', async ({ senderSocketId, candidate }) => {
      const pc = this.peerConnections.get(senderSocketId);
      if (candidate) {
        if (pc && pc.remoteDescription && pc.remoteDescription.type) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.warn('[WebRTC] Error adding ICE candidate:', e);
          }
        } else {
          if (!this.iceCandidateBuffers.has(senderSocketId)) {
            this.iceCandidateBuffers.set(senderSocketId, []);
          }
          this.iceCandidateBuffers.get(senderSocketId).push(candidate);
        }
      }
    });

    // Peer Mute / Unmute Broadcast
    this.socket.on('peer-mute-changed', (data) => {
      if (this.callbacks.onPeerMuteChanged) {
        this.callbacks.onPeerMuteChanged(data);
      }
    });

    // Peer Left Room
    this.socket.on('peer-left', ({ socketId, tag }) => {
      this.closePeerConnection(socketId);
      if (this.callbacks.onPeerLeft) {
        this.callbacks.onPeerLeft({ socketId, tag });
      }
    });

    // Acquire microphone in background
    this.getLocalMicrophone().catch(() => {});
  }

  // Create WebRTC Peer Connection for target socket ID with audio transceivers
  async createPeerConnection(targetSocketId, isInitiator) {
    if (this.peerConnections.has(targetSocketId)) {
      this.closePeerConnection(targetSocketId);
    }

    const pc = new RTCPeerConnection(this.iceServers);
    this.peerConnections.set(targetSocketId, pc);

    // Attach local microphone/video stream if available, otherwise create empty transceiver
    let trackAdded = false;
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        if (track.kind === 'audio') {
            track.enabled = !this.isMuted;
        } else if (track.kind === 'video') {
            track.enabled = this.isVideoEnabled;
        }
        pc.addTrack(track, this.localStream);
        trackAdded = true;
      });
    }

    // Explicitly add audio transceiver for sendrecv ONLY if no track was added
    if (!trackAdded) {
      try {
        pc.addTransceiver('audio', { direction: 'sendrecv' });
      } catch (e) {}
    }

    // Handle ICE Candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('signal-candidate', {
          targetSocketId,
          candidate: event.candidate
        });
      }
    };

    // Handle ICE Connection State Changes
    pc.oniceconnectionstatechange = () => {
      console.log(`[WebRTC] ICE Connection State (${targetSocketId}):`, pc.iceConnectionState);
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        pc.restartIce();
      }
    };

    // Handle Remote Track (Remote Audio/Video Stream)
    pc.ontrack = (event) => {
      console.log('[WebRTC] Received remote track from socket:', targetSocketId, event.track.kind);
      let remoteStream;
      if (event.streams && event.streams.length > 0) {
        remoteStream = event.streams[0];
      } else {
        const existingEl = this.audioElements.get(targetSocketId);
        remoteStream = (existingEl && existingEl.srcObject) ? existingEl.srcObject : new MediaStream();
        if (!remoteStream.getTracks().includes(event.track)) {
          remoteStream.addTrack(event.track);
        }
      }
      this.attachRemoteAudio(targetSocketId, remoteStream);
    };

    // If initiator, create and send WebRTC offer
    if (isInitiator) {
      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);
      this.socket.emit('signal-offer', {
        targetSocketId,
        offer
      });
    }

    return pc;
  }

  // Attach Remote Audio Stream to HTML5 Audio Element for seamless background playback
  attachRemoteAudio(socketId, stream) {
    let audioEl = this.audioElements.get(socketId);
    let shouldInitPlay = false;
    
    if (!audioEl) {
      audioEl = document.createElement('audio');
      audioEl.autoplay = true;
      audioEl.controls = false;
      audioEl.volume = 1.0;
      audioEl.muted = false;
      audioEl.style.display = 'none'; // Invisible background playback
      document.body.appendChild(audioEl);
      this.audioElements.set(socketId, audioEl);
      shouldInitPlay = true;
    }
    
    if (audioEl.srcObject !== stream) {
      audioEl.srcObject = stream;
      shouldInitPlay = true;
    }
    
    if (!shouldInitPlay) return; // Prevent interrupting playback if stream is already attached
    
    // Play remote audio and handle Chrome/Edge Autoplay Security Policy
    const playAudio = () => {
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      audioEl.play().then(() => {
        console.log('[WebRTC] Remote audio playback active for socket:', socketId);
      }).catch(err => {
        console.warn('[WebRTC] Autoplay waiting for user interaction:', err);
        const resumeOnUserClick = () => {
          if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
          }
          audioEl.play().catch(() => {});
          document.removeEventListener('click', resumeOnUserClick);
          document.removeEventListener('touchstart', resumeOnUserClick);
        };
        document.addEventListener('click', resumeOnUserClick);
        document.addEventListener('touchstart', resumeOnUserClick);
      });
    };
    playAudio();
  }

  // Close Peer Connection and remove audio element
  closePeerConnection(socketId) {
    const pc = this.peerConnections.get(socketId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(socketId);
    }

    this.iceCandidateBuffers.delete(socketId);

    const audioEl = this.audioElements.get(socketId);
    if (audioEl) {
      audioEl.pause();
      audioEl.srcObject = null;
      audioEl.remove();
      this.audioElements.delete(socketId);
    }
  }

  // Toggle Mute / Unmute
  async setMuteState(shouldMute) {
    this.isMuted = shouldMute;
    
    if (!this.localStream && (!shouldMute || this.isVideoEnabled)) {
      await this.getLocalMicrophone(true);
    }

    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    await this.syncMicTracksToAllPeers();

    if (this.socket) {
      this.socket.emit('mute-toggle', { isMuted: shouldMute });
    }
    return !shouldMute;
  }

  // Toggle Video Camera
  async setVideoState(shouldEnable) {
    this.isVideoEnabled = shouldEnable;

    // Force reinit to grab camera stream
    await this.getLocalMicrophone(true);

    if (this.socket) {
      this.socket.emit('video-toggle', { isVideoEnabled: shouldEnable });
    }
    return shouldEnable;
  }

  getStreamFor(socketId) {
    if (!socketId || socketId === this.socket?.id) {
        return this.localStream;
    }
    const audioEl = this.audioElements.get(socketId);
    return audioEl ? audioEl.srcObject : null;
  }

  // Publish Microphone (Unmute)
  async publishMic() {
    return this.setMuteState(false);
  }

  // Raise Hand
  async raiseHand() {
    if (this.socket) {
      this.socket.emit('toggle-queue-hand');
    }
  }

  // Toggle Raise Hand in Waiting Queue
  async toggleQueueHand() {
    if (this.socket) {
      this.socket.emit('toggle-queue-hand');
    }
  }

  // Submit Quick Comment (Unlocked after 60s of waiting, max 30 chars, single-use)
  async submitQuickComment(comment) {
    if (this.socket) {
      this.socket.emit('submit-quick-comment', { comment });
    }
  }

  // Send Emoji Reaction
  async sendEmoji(emoji) {
    if (this.socket) {
      this.socket.emit('send-emoji', { emoji });
    }
  }

  // Send Text Chat Message
  async sendChatMessage(text) {
    if (this.socket) {
      this.socket.emit('send-chat-message', { text });
    }
  }

  // Moderator Admits User from Waiting Queue
  async admitUser(targetSocketId, targetTag) {
    if (this.socket) {
      this.socket.emit('admit-user', { targetSocketId, targetTag });
    }
  }

  // Moderator Removes Active Member to Waiting Queue
  async removeUser(targetSocketId, targetTag) {
    if (this.socket) {
      this.socket.emit('remove-user', { targetSocketId, targetTag });
    }
  }

  // ----- Recording Methods -----

  startRecording() {
    if (this.isRecording) return false;
    
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!this.audioContext) {
        this.audioContext = new AudioCtx();
      }
      
      this.mediaStreamDestination = this.audioContext.createMediaStreamDestination();
      
      // Use a DynamicsCompressorNode to prevent digital clipping when multiple people speak at once
      const compressor = this.audioContext.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-24, this.audioContext.currentTime);
      compressor.knee.setValueAtTime(30, this.audioContext.currentTime);
      compressor.ratio.setValueAtTime(12, this.audioContext.currentTime);
      compressor.attack.setValueAtTime(0.003, this.audioContext.currentTime);
      compressor.release.setValueAtTime(0.25, this.audioContext.currentTime);
      
      compressor.connect(this.mediaStreamDestination);
      
      // Connect local mic
      if (this.localStream) {
        const localSource = this.audioContext.createMediaStreamSource(this.localStream);
        localSource.connect(compressor);
      }
      
      // Connect all remote streams
      this.audioElements.forEach((audioEl) => {
        if (audioEl.srcObject) {
          try {
            // Chrome bug workaround: sometimes remote streams need to be routed explicitly
            const remoteSource = this.audioContext.createMediaStreamSource(audioEl.srcObject);
            remoteSource.connect(compressor);
          } catch(e) {
            console.warn('[WebRTC] Could not connect remote source to recorder:', e);
          }
        }
      });
      
      this.recordedChunks = [];
      // Use highest quality opus codec
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
      }
      
      this.mediaRecorder = new MediaRecorder(this.mediaStreamDestination.stream, { 
        mimeType: mimeType,
        audioBitsPerSecond: 128000 // 128kbps high quality audio
      });
      
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };
      
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        document.body.appendChild(a);
        a.style = 'display: none';
        a.href = url;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        a.download = `CockroachTalk-Recording-${timestamp}.webm`;
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        this.recordedChunks = [];
      };
      
      this.mediaRecorder.start();
      this.isRecording = true;
      console.log('[WebRTC] Started recording stage audio.');
      return true;
    } catch (err) {
      console.error('[WebRTC] Failed to start recording:', err);
      return false;
    }
  }

  stopRecording() {
    if (!this.isRecording || !this.mediaRecorder) return;
    this.mediaRecorder.stop();
    this.isRecording = false;
    console.log('[WebRTC] Stopped recording stage audio.');
  }

  // Leave Room & Clean Up Connections
  async leaveRoom() {
    if (this.socket) {
      this.socket.emit('leave-room');
      this.socket.disconnect();
      this.socket = null;
    }

    if (this.isRecording) {
      this.stopRecording();
    }

    // Stop local microphone tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    // Close all peer connections & audio elements
    this.peerConnections.forEach((pc, id) => this.closePeerConnection(id));
    this.peerConnections.clear();
    this.audioElements.clear();
    this.iceCandidateBuffers.clear();

    console.log('[WebRTC] Left room and cleaned up all connections.');
  }
}

// Singleton Instance exported for clean DRY controller usage
export const WebRTCStub = new WebRTCManager();
