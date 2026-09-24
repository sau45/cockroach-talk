'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { apiClient } from '@/lib/api';

interface IceServerConfig {
  iceServers: RTCIceServer[];
}

export interface WebRTCPeerStream {
  socketId: string;
  stream: MediaStream;
  hasVideo: boolean;
  hasAudio: boolean;
}

interface UseWebRTCProps {
  socket: Socket | null;
  roomId: string;
  isMuted: boolean;
  isVideoEnabled: boolean;
  onSpeakingChange?: (isSpeaking: boolean) => void;
  onCameraError?: (errorMsg: string) => void;
}

export function useWebRTC({
  socket,
  roomId,
  isMuted,
  isVideoEnabled,
  onSpeakingChange,
  onCameraError
}: UseWebRTCProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isMediaReady, setIsMediaReady] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteScreenStream, setRemoteScreenStream] = useState<MediaStream | null>(null);
  const [activeScreenSharer, setActiveScreenSharer] = useState<string | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isRoomBeingRecorded, setIsRoomBeingRecorded] = useState(false);
  const [recorderName, setRecorderName] = useState<string | null>(null);

  // Recording References
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const mediaStreamDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  // References
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const remoteAudiosRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const iceCandidateBuffers = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const iceServersRef = useRef<RTCIceServer[]>([
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const onSpeakingChangeRef = useRef(onSpeakingChange);
  const onCameraErrorRef = useRef(onCameraError);
  const isMutedRef = useRef(isMuted);
  const prevVideoEnabledRef = useRef<boolean>(isVideoEnabled);

  useEffect(() => {
    onSpeakingChangeRef.current = onSpeakingChange;
  }, [onSpeakingChange]);

  useEffect(() => {
    onCameraErrorRef.current = onCameraError;
  }, [onCameraError]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Update localStreamRef whenever localStream state changes
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  // 1. Fetch TURN / STUN credentials securely from backend
  useEffect(() => {
    let isMounted = true;
    async function loadIceServers() {
      try {
        const config = await apiClient<IceServerConfig>('/api/turn-credentials');
        if (isMounted && config?.iceServers && config.iceServers.length > 0) {
          iceServersRef.current = config.iceServers;
          console.log('[WebRTC] Loaded ICE / TURN configuration with servers:', config.iceServers.length);
        }
      } catch (err) {
        console.warn('[WebRTC] Failed to load TURN credentials, falling back to STUN:', err);
      }
    }
    loadIceServers();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Setup Audio Volume Analyser for speaking detection
  const setupAudioMeter = useCallback(
    (stream: MediaStream) => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;

        if (!audioContextRef.current) {
          audioContextRef.current = new AudioCtx();
        }

        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume().catch(() => {});
        }

        const source = audioContextRef.current.createMediaStreamSource(stream);
        const analyser = audioContextRef.current.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        let wasSpeaking = false;
        let lastCheckTime = 0;

        // Throttled volume meter check (approx 13 times/sec instead of 60fps) to keep main thread silky smooth for 8 participants
        const checkVolume = (timestamp: number) => {
          if (!analyserRef.current || isMutedRef.current) {
            if (wasSpeaking) {
              wasSpeaking = false;
              onSpeakingChangeRef.current?.(false);
            }
            animFrameRef.current = requestAnimationFrame(checkVolume);
            return;
          }

          if (timestamp - lastCheckTime >= 75) {
            lastCheckTime = timestamp;
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
              sum += dataArray[i];
            }
            const average = sum / bufferLength;
            const isSpeaking = average > 14;

            if (isSpeaking !== wasSpeaking) {
              wasSpeaking = isSpeaking;
              onSpeakingChangeRef.current?.(isSpeaking);
            }
          }

          animFrameRef.current = requestAnimationFrame(checkVolume);
        };

        animFrameRef.current = requestAnimationFrame(checkVolume);
      } catch (e) {
        console.warn('[WebAudio] AudioMeter setup error:', e);
      }
    },
    []
  );

  // Helper to cap video sender bitrate to 250kbps @ 24fps
  const capSenderBitrate = (sender: RTCRtpSender) => {
    try {
      const params = sender.getParameters();
      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}];
      }
      params.encodings[0].maxBitrate = 250000;
      params.encodings[0].maxFramerate = 24;
      sender.setParameters(params).catch(() => {});
    } catch (e) {}
  };

  // 3. Acquire Local Media (Mic & Optional Camera)
  const initLocalMedia = useCallback(
    async (requestVideo: boolean) => {
      try {
        setPermissionError(null);

        const constraints: MediaStreamConstraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1
          },
          video: requestVideo
            ? {
                width: { ideal: 480, max: 640 },
                height: { ideal: 360, max: 480 },
                frameRate: { ideal: 24, max: 24 },
                facingMode: 'user'
              }
            : false
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        // Apply mute state
        stream.getAudioTracks().forEach((track) => {
          track.enabled = !isMutedRef.current;
        });

        // Apply video state
        stream.getVideoTracks().forEach((track) => {
          track.enabled = requestVideo;
        });

        // If replacing an old stream, stop old tracks
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((t) => {
            if (!stream.getTracks().includes(t)) {
              t.stop();
            }
          });
        }

        localStreamRef.current = stream;
        setLocalStream(stream);
        setIsMediaReady(true);
        setupAudioMeter(stream);

        // Sync new tracks to all active peer connections & trigger SDP renegotiation
        const audioTrack = stream.getAudioTracks()[0] || null;
        const videoTrack = stream.getVideoTracks()[0] || null;

        peerConnections.current.forEach(async (pc, targetSocketId) => {
          try {
            const transceivers = pc.getTransceivers();
            if (audioTrack) {
              const aTrans = transceivers.find(
                (t) => t.receiver.track.kind === 'audio' || t.sender.track?.kind === 'audio'
              );
              if (aTrans?.sender) {
                await aTrans.sender.replaceTrack(audioTrack);
              }
            }

            const vTrans = transceivers.find(
              (t) => t.receiver.track.kind === 'video' || t.sender.track?.kind === 'video'
            );
            if (vTrans?.sender) {
              await vTrans.sender.replaceTrack(videoTrack);
              if (videoTrack) capSenderBitrate(vTrans.sender);
            }

            // Re-negotiate WebRTC SDP offer so remote peers receive active audio/video tracks
            if (socket) {
              const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
              await pc.setLocalDescription(offer);
              socket.emit('signal-offer', { targetSocketId, offer });
            }
          } catch (e) {
            console.warn(`[WebRTC] Error syncing tracks to peer ${targetSocketId}:`, e);
          }
        });

        return stream;
      } catch (err: any) {
        console.error('[WebRTC] Media permission error:', err);
        let msg = 'Failed to access camera or microphone.';
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          msg = 'Permission denied. Please allow microphone and camera access in your browser settings.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          msg = 'No camera or microphone found on your device.';
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          msg = 'Camera or microphone is already in use by another application.';
        }
        setPermissionError(msg);
        onCameraErrorRef.current?.(msg);
        return null;
      }
    },
    [setupAudioMeter]
  );

  // 4. Initial mic acquisition on mount
  useEffect(() => {
    initLocalMedia(isVideoEnabled);
  }, []); // Run once on mount

  // 5. Handle Mute Toggle on Audio Tracks
  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !isMuted;
      });

      // Sync updated track state to senders & renegotiate SDP to ensure audio is unmuted across peers
      peerConnections.current.forEach(async (pc, targetSocketId) => {
        const audioTrack = localStreamRef.current?.getAudioTracks()[0] || null;
        const aTrans = pc.getTransceivers().find(
          (t) => t.receiver.track.kind === 'audio' || t.sender.track?.kind === 'audio'
        );
        if (aTrans?.sender && audioTrack) {
          await aTrans.sender.replaceTrack(audioTrack);
        }
        if (socket) {
          try {
            const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
            await pc.setLocalDescription(offer);
            socket.emit('signal-offer', { targetSocketId, offer });
          } catch (e) {}
        }
      });
    }
  }, [isMuted, socket]);

  // 6. Handle Camera Toggle: Stop/Start track & replace track on peer senders
  useEffect(() => {
    if (prevVideoEnabledRef.current === isVideoEnabled) {
      return;
    }
    prevVideoEnabledRef.current = isVideoEnabled;

    async function handleVideoToggle() {
      if (isVideoEnabled) {
        const existingTrack = localStreamRef.current?.getVideoTracks()[0];
        if (existingTrack && existingTrack.readyState === 'live') {
          existingTrack.enabled = true;
          peerConnections.current.forEach(async (pc, targetSocketId) => {
            const vTrans = pc.getTransceivers().find(
              (t) => t.receiver.track.kind === 'video' || t.sender.track?.kind === 'video'
            );
            if (vTrans?.sender) {
              await vTrans.sender.replaceTrack(existingTrack);
              capSenderBitrate(vTrans.sender);
            }
            if (socket) {
              const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
              await pc.setLocalDescription(offer);
              socket.emit('signal-offer', { targetSocketId, offer });
            }
          });
        } else {
          await initLocalMedia(true);
        }
      } else {
        if (localStreamRef.current) {
          localStreamRef.current.getVideoTracks().forEach((track) => {
            track.enabled = false;
            track.stop();
            localStreamRef.current?.removeTrack(track);
          });
        }

        peerConnections.current.forEach(async (pc) => {
          try {
            const vTrans = pc.getTransceivers().find(
              (t) => t.receiver.track.kind === 'video' || t.sender.track?.kind === 'video'
            );
            if (vTrans?.sender) {
              await vTrans.sender.replaceTrack(null);
            }
          } catch (e) {
            console.warn('[WebRTC] Error removing video track from sender:', e);
          }
        });
      }
    }

    if (isMediaReady) {
      handleVideoToggle();
    }
  }, [isVideoEnabled, isMediaReady, initLocalMedia, socket]);

  // Helper: Flush buffered ICE candidates
  const flushIceCandidates = async (socketId: string, pc: RTCPeerConnection) => {
    const queue = iceCandidateBuffers.current.get(socketId) || [];
    while (queue.length > 0) {
      const cand = queue.shift();
      if (cand) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
        } catch (e) {
          console.warn('[WebRTC] Error adding buffered ICE candidate:', e);
        }
      }
    }
  };

  // Helper: Attach Remote Audio Element with autoplay protection
  const attachRemoteAudio = useCallback((socketId: string, stream: MediaStream) => {
    let audioEl = remoteAudiosRef.current.get(socketId);
    if (!audioEl) {
      audioEl = document.createElement('audio');
      audioEl.autoplay = true;
      remoteAudiosRef.current.set(socketId, audioEl);
    }
    audioEl.srcObject = stream;
    audioEl.play().catch((err) => {
      console.warn('[WebRTC] Remote audio autoplay blocked:', err);
      const resumeAudio = () => {
        audioEl?.play().catch(() => {});
        document.removeEventListener('click', resumeAudio);
        document.removeEventListener('touchstart', resumeAudio);
      };
      document.addEventListener('click', resumeAudio);
      document.addEventListener('touchstart', resumeAudio);
    });
  }, []);

  // 7. Call Recording Engine (MediaRecorder + AudioContext Multi-Participant Audio Mixer)
  const startRecording = useCallback(() => {
    if (isRecording) return false;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }

      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {});
      }

      const mediaDest = audioContextRef.current.createMediaStreamDestination();
      mediaStreamDestinationRef.current = mediaDest;

      // DynamicsCompressorNode to prevent digital clipping when multiple people speak
      const compressor = audioContextRef.current.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-24, audioContextRef.current.currentTime);
      compressor.knee.setValueAtTime(30, audioContextRef.current.currentTime);
      compressor.ratio.setValueAtTime(12, audioContextRef.current.currentTime);
      compressor.attack.setValueAtTime(0.003, audioContextRef.current.currentTime);
      compressor.release.setValueAtTime(0.25, audioContextRef.current.currentTime);
      compressor.connect(mediaDest);

      // Mix local mic stream
      if (localStreamRef.current && localStreamRef.current.getAudioTracks().length > 0) {
        try {
          const localSource = audioContextRef.current.createMediaStreamSource(localStreamRef.current);
          localSource.connect(compressor);
        } catch (e) {
          console.warn('[Recorder] Error mixing local stream:', e);
        }
      }

      // Mix all remote stage peer audio streams
      remoteAudiosRef.current.forEach((audioEl) => {
        if (audioEl.srcObject && (audioEl.srcObject as MediaStream).getAudioTracks().length > 0) {
          try {
            const remoteSource = audioContextRef.current!.createMediaStreamSource(
              audioEl.srcObject as MediaStream
            );
            remoteSource.connect(compressor);
          } catch (e) {
            console.warn('[Recorder] Error mixing remote stream:', e);
          }
        }
      });

      recordedChunksRef.current = [];
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
      }

      const recorder = new MediaRecorder(mediaDest.stream, {
        mimeType,
        audioBitsPerSecond: 128000
      });

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        if (recordedChunksRef.current.length > 0) {
          const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          document.body.appendChild(a);
          a.style.display = 'none';
          a.href = url;
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          a.download = `CockroachTalk-Recording-${timestamp}.webm`;
          a.click();
          setTimeout(() => {
            window.URL.revokeObjectURL(url);
            a.remove();
          }, 100);
        }
        recordedChunksRef.current = [];
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);

      // Broadcast recording status via socket for privacy & transparency
      if (socket) {
        socket.emit('recording-toggle', { isRecording: true });
      }

      return true;
    } catch (err) {
      console.error('[WebRTC] Failed to start recording:', err);
      return false;
    }
  }, [isRecording, socket]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    setIsRecording(false);

    if (socket) {
      socket.emit('recording-toggle', { isRecording: false });
    }
  }, [socket]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // 8. Create RTCPeerConnection for a target peer
  const createPeerConnection = useCallback(
    (targetSocketId: string, isInitiator: boolean) => {
      if (peerConnections.current.has(targetSocketId)) {
        peerConnections.current.get(targetSocketId)?.close();
        peerConnections.current.delete(targetSocketId);
      }

      const pc = new RTCPeerConnection({ iceServers: iceServersRef.current });
      peerConnections.current.set(targetSocketId, pc);

      try {
        const currentStream = localStreamRef.current;
        const audioTrack = currentStream?.getAudioTracks()[0] || null;
        const videoTrack = currentStream?.getVideoTracks()[0] || null;

        if (audioTrack && currentStream) {
          pc.addTrack(audioTrack, currentStream);
        } else {
          pc.addTransceiver('audio', { direction: 'sendrecv' });
        }

        if (videoTrack && currentStream) {
          const sender = pc.addTrack(videoTrack, currentStream);
          capSenderBitrate(sender);
        } else {
          const transceiver = pc.addTransceiver('video', { direction: 'sendrecv' });
          if (transceiver.sender) {
            capSenderBitrate(transceiver.sender);
          }
        }
      } catch (e) {
        console.warn('[WebRTC] Transceiver setup error:', e);
      }

      // Handle ICE Candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('signal-candidate', {
            targetSocketId,
            candidate: event.candidate
          });
        }
      };

      // Handle ICE Connection State & Automatic Restart
      pc.oniceconnectionstatechange = () => {
        console.log(`[WebRTC] ICE State (${targetSocketId}):`, pc.iceConnectionState);
        if (pc.iceConnectionState === 'failed') {
          pc.restartIce();
        }
      };

      // Handle Remote Tracks
      pc.ontrack = (event) => {
        console.log(`[WebRTC] Received remote track (${event.track.kind}) from:`, targetSocketId);

        let remoteStream = remoteStreamsRef.current.get(targetSocketId);
        if (!remoteStream) {
          remoteStream = new MediaStream();
          remoteStreamsRef.current.set(targetSocketId, remoteStream);
        }

        if (!remoteStream.getTracks().includes(event.track)) {
          remoteStream.addTrack(event.track);
        }

        event.track.onended = () => {
          if (remoteStream && remoteStream.getTracks().includes(event.track)) {
            remoteStream.removeTrack(event.track);
            setRemoteStreams(new Map(remoteStreamsRef.current));
          }
        };

        if (event.track.kind === 'audio') {
          attachRemoteAudio(targetSocketId, remoteStream);
        }

        setRemoteStreams(new Map(remoteStreamsRef.current));
      };

      // Initiator creates and sends offer
      if (isInitiator && socket) {
        pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
          .then(async (offer) => {
            await pc.setLocalDescription(offer);
            socket.emit('signal-offer', {
              targetSocketId,
              offer
            });
          })
          .catch((err) => {
            console.error('[WebRTC] Error creating offer:', err);
          });
      }

      return pc;
    },
    [attachRemoteAudio, socket]
  );

  // 9. Wire Socket.io Signaling & Recording Listeners
  useEffect(() => {
    if (!socket) return;

    const handleRoomPeers = async ({ peers }: { peers: any[] }) => {
      console.log('[WebRTC] Received room-peers list:', peers.length);
      for (const peer of peers) {
        if (peer.socketId && peer.socketId !== socket.id) {
          createPeerConnection(peer.socketId, true);
        }
      }
    };

    const handlePeerJoined = async ({ peer }: { peer: any }) => {
      console.log('[WebRTC] Peer joined room:', peer?.displayName, peer?.socketId);
      if (peer?.socketId && peer.socketId !== socket.id) {
        if (!peerConnections.current.has(peer.socketId)) {
          createPeerConnection(peer.socketId, false);
        }
      }
    };

    const handleSignalOffer = async ({ senderSocketId, offer }: any) => {
      console.log('[WebRTC] Received offer from:', senderSocketId);
      let pc = peerConnections.current.get(senderSocketId);
      if (!pc) {
        pc = createPeerConnection(senderSocketId, false);
      }

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        await flushIceCandidates(senderSocketId, pc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('signal-answer', {
          targetSocketId: senderSocketId,
          answer
        });
      } catch (err) {
        console.error('[WebRTC] Error handling signal-offer:', err);
      }
    };

    const handleSignalAnswer = async ({ senderSocketId, answer }: any) => {
      console.log('[WebRTC] Received answer from:', senderSocketId);
      const pc = peerConnections.current.get(senderSocketId);
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          await flushIceCandidates(senderSocketId, pc);
        } catch (err) {
          console.error('[WebRTC] Error handling signal-answer:', err);
        }
      }
    };

    const handleSignalCandidate = async ({ senderSocketId, candidate }: any) => {
      const pc = peerConnections.current.get(senderSocketId);
      if (candidate) {
        if (pc && pc.remoteDescription && pc.remoteDescription.type) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.warn('[WebRTC] Error adding ICE candidate:', e);
          }
        } else {
          if (!iceCandidateBuffers.current.has(senderSocketId)) {
            iceCandidateBuffers.current.set(senderSocketId, []);
          }
          iceCandidateBuffers.current.get(senderSocketId)!.push(candidate);
        }
      }
    };

    const handlePeerLeft = ({ socketId }: { socketId: string }) => {
      console.log('[WebRTC] Peer left, tearing down connection:', socketId);
      const pc = peerConnections.current.get(socketId);
      if (pc) {
        pc.close();
        peerConnections.current.delete(socketId);
      }

      const audioEl = remoteAudiosRef.current.get(socketId);
      if (audioEl) {
        audioEl.srcObject = null;
        audioEl.remove();
        remoteAudiosRef.current.delete(socketId);
      }

      iceCandidateBuffers.current.delete(socketId);
      remoteStreamsRef.current.delete(socketId);
      setRemoteStreams(new Map(remoteStreamsRef.current));
    };

    const handleScreenShareToggle = ({ socketId, isScreenSharing: sharing }: any) => {
      if (!sharing) {
        setRemoteScreenStream(null);
        setActiveScreenSharer(null);
      } else {
        setActiveScreenSharer(socketId);
        const stream = remoteStreamsRef.current.get(socketId);
        if (stream) setRemoteScreenStream(stream);
      }
    };

    // Handle incoming Room Recording In Progress notification (Privacy & Transparency)
    const handleRecordingToggle = ({
      socketId,
      isRecording: remoteRecording,
      recorderName: name
    }: any) => {
      if (remoteRecording) {
        setIsRoomBeingRecorded(true);
        setRecorderName(name || 'Participant');
      } else {
        setIsRoomBeingRecorded(false);
        setRecorderName(null);
      }
    };

    socket.on('room-peers', handleRoomPeers);
    socket.on('peer-joined', handlePeerJoined);
    socket.on('signal-offer', handleSignalOffer);
    socket.on('signal-answer', handleSignalAnswer);
    socket.on('signal-candidate', handleSignalCandidate);
    socket.on('peer-left', handlePeerLeft);
    socket.on('screen-share-toggle', handleScreenShareToggle);
    socket.on('recording-toggle', handleRecordingToggle);

    return () => {
      socket.off('room-peers', handleRoomPeers);
      socket.off('peer-joined', handlePeerJoined);
      socket.off('signal-offer', handleSignalOffer);
      socket.off('signal-answer', handleSignalAnswer);
      socket.off('signal-candidate', handleSignalCandidate);
      socket.off('peer-left', handlePeerLeft);
      socket.off('screen-share-toggle', handleScreenShareToggle);
      socket.off('recording-toggle', handleRecordingToggle);
    };
  }, [socket, createPeerConnection]);

  // 10. Full Lifecycle Teardown on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }

      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }

      peerConnections.current.forEach((pc) => pc.close());
      peerConnections.current.clear();

      remoteAudiosRef.current.forEach((audio) => {
        audio.srcObject = null;
        audio.remove();
      });
      remoteAudiosRef.current.clear();
      remoteStreamsRef.current.clear();
      iceCandidateBuffers.current.clear();
    };
  }, []);

  // Screen Share Toggle Helper
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStream) {
        screenStream.getTracks().forEach((t) => t.stop());
        setScreenStream(null);
      }
      setIsScreenSharing(false);

      const videoTrack = isVideoEnabled ? localStreamRef.current?.getVideoTracks()[0] || null : null;
      peerConnections.current.forEach(async (pc) => {
        const vSender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (vSender) {
          await vSender.replaceTrack(videoTrack);
        }
      });
      socket?.emit('screen-share-toggle', { isScreenSharing: false });
    } else {
      try {
        const display = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' } as any,
          audio: false
        });
        const track = display.getVideoTracks()[0];
        if (!track) return;

        setScreenStream(display);
        setIsScreenSharing(true);

        peerConnections.current.forEach(async (pc) => {
          const vSender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
          if (vSender) {
            await vSender.replaceTrack(track);
          }
        });

        socket?.emit('screen-share-toggle', { isScreenSharing: true });

        track.onended = () => {
          toggleScreenShare();
        };
      } catch (err) {
        console.warn('[WebRTC] Screen share failed or was cancelled:', err);
      }
    }
  };

  return {
    localStream,
    remoteStreams,
    permissionError,
    initLocalMedia,
    screenStream,
    isScreenSharing,
    remoteScreenStream,
    toggleScreenShare,
    isRecording,
    isRoomBeingRecorded,
    recorderName,
    startRecording,
    stopRecording,
    toggleRecording
  };
}
