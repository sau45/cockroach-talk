'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Mic, Users, Lock } from 'lucide-react';
import { useSocket } from '@/hooks/useSocket';
import { useAuthorTag } from '@/hooks/useAuthorTag';
import { useRoom } from '@/hooks/useRoom';
import { useWebRTC } from '@/hooks/useWebRTC';
import { StageGrid } from '@/components/room/StageGrid';
import { WaitingQueue } from '@/components/room/WaitingQueue';
import { RoomDock } from '@/components/room/RoomDock';
import { PresentationArea } from '@/components/screen-share/PresentationArea';
import { JunctionsSidebar } from '@/components/room/JunctionsSidebar';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { PermissionNotice } from '@/components/video-chat';
import { SpeakerProfileModal } from '@/components/room/SpeakerProfileModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { isConsentComplete } from '@/components/onboarding/ConsentGate';
import { ProfileCustomizerModal } from '@/components/profile/ProfileCustomizerModal';

export default function RoomPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = (params?.roomId as string) || 'maharashtra';

  const [password, setPassword] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [hasUnreadChat, setHasUnreadChat] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [hasConsented, setHasConsented] = useState<boolean>(() => isConsentComplete());

  const { socket } = useSocket();
  const { user, customizeProfile, rerollName } = useAuthorTag();

  useEffect(() => {
    const handleConsentUpdate = () => {
      setHasConsented(true);
    };
    window.addEventListener('ct-consent-updated', handleConsentUpdate);
    return () => {
      window.removeEventListener('ct-consent-updated', handleConsentUpdate);
    };
  }, []);

  const {
    roomState,
    role,
    isMuted,
    isVideoEnabled,
    isSpeaking,
    toastMessage,
    emojis,
    error,
    isMyModerator,
    isSeniorMod,
    myQueuePosition,
    isHandRaised,
    toggleMute,
    toggleVideo,
    setSpeaking,
    toggleHand,
    submitQuickComment,
    sendEmoji,
    admitUser,
    removeUser,
    muteSpeaker
  } = useRoom({
    socket,
    roomId,
    user,
    password,
    enabled: hasConsented
  });

  const [cameraError, setCameraError] = useState<string | null>(null);

  const handleSpeakingChange = React.useCallback(
    (speaking: boolean) => setSpeaking(speaking),
    [setSpeaking]
  );
  const handleCameraError = React.useCallback(
    (err: string) => setCameraError(err),
    []
  );

  const {
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
    toggleRecording
  } = useWebRTC({
    socket,
    roomId,
    isMuted,
    isVideoEnabled,
    onSpeakingChange: handleSpeakingChange,
    onCameraError: handleCameraError
  });

  // Active presentation stream
  const activeStream = isScreenSharing ? screenStream : remoteScreenStream;
  const isPresenter = isScreenSharing;

  return (
    <div className="relative min-h-[calc(100vh-64px)] pb-32">
      {/* Recording In Progress Notification Banner (Privacy & Transparency) */}
      {(isRecording || isRoomBeingRecorded) && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 px-4 py-1.5 rounded-full border-2 border-destructive bg-destructive text-white font-mono text-xs font-bold flex items-center gap-2 shadow-brutal animate-pulse">
          <span className="h-2.5 w-2.5 rounded-full bg-white animate-ping" />
          <span>🔴 RECORDING IN PROGRESS ({isRecording ? 'You are recording stage audio' : `${recorderName || 'Participant'} is recording stage audio`})</span>
        </div>
      )}

      {/* Emoji Overlay */}
      <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
        {emojis.map((e) => (
          <div
            key={e.id}
            style={{ left: `${e.x}%`, top: `${e.y}%` }}
            className="absolute text-4xl animate-bounce transition-all duration-1000"
          >
            {e.emoji}
          </div>
        ))}
      </div>

      {/* Toast Alert Banner */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-brutal-sm border-2 border-border bg-card shadow-brutal text-xs font-mono font-bold text-foreground animate-in fade-in duration-200">
          {toastMessage}
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between gap-4 border-b-2 border-border pb-4">
          <div className="flex items-center gap-3">
            <Button asChild variant="outline" size="icon" className="h-9 w-9">
              <Link href="/junctions" title="Back to Junctions">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black font-mono uppercase text-foreground">
                  {roomState?.name || roomId}
                </h1>
                {roomState?.isCustom && (
                  <Badge variant="secondary" className="text-[10px]">
                    Custom Room
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground font-mono">
                {role === 'active'
                  ? isSeniorMod
                    ? '★ You are the ROOM LEAD (Stage Host)'
                    : isMyModerator
                    ? '🛡️ You are an ACTIVE STAGE MODERATOR'
                    : '🎙️ You are an ACTIVE SPEAKER on stage'
                  : myQueuePosition
                  ? `⏳ You are #${myQueuePosition} in the WAITING QUEUE (Raise hand to speak)`
                  : '⏳ You are in the WAITING QUEUE / Audience'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {role === 'active' && isSeniorMod ? (
              <Badge className="bg-accent-gold text-black font-mono text-xs py-1 px-2.5 gap-1 font-bold shadow-sm">
                ★ Room Lead
              </Badge>
            ) : role === 'active' && isMyModerator ? (
              <Badge className="bg-accent-gold/20 text-accent-gold border-accent-gold/40 font-mono text-xs py-1 px-2.5 gap-1 font-bold">
                🛡️ Stage Mod
              </Badge>
            ) : null}

            <Badge variant="default" className="text-xs font-mono py-1 px-3 gap-1.5">
              <Mic className="h-3.5 w-3.5" /> Stage: {roomState?.activeMembers.length || 0}/8
            </Badge>
          </div>
        </div>

        {/* Two-Column Layout */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Main Stage & Queue Column */}
          <div className="flex-1 w-full space-y-6">
            {/* Screen Share Area */}
            {activeStream && (
              <PresentationArea
                stream={activeStream}
                isPresenter={isPresenter}
                presenterName={isPresenter ? 'Your Screen' : 'Shared Screen'}
                onStopPresenting={toggleScreenShare}
              />
            )}

            {/* Active Stage Section */}
            <div className="space-y-3">
              {/* Device Permission Error Notice */}
              <PermissionNotice
                error={permissionError || cameraError}
                onRetry={() => {
                  setCameraError(null);
                  initLocalMedia(isVideoEnabled);
                }}
              />

              <div className="flex items-center justify-between">
                <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <span>🔥 Speaker Stage</span>
                  {isMyModerator && (
                    <span className="text-[10px] text-accent-gold bg-accent-gold/10 px-1.5 py-0.5 rounded border border-accent-gold/40">
                      ★ Moderator Controls Active
                    </span>
                  )}
                </h2>

                <div className="text-xs font-mono font-bold text-muted-foreground bg-card border border-border px-2 py-0.5 rounded-brutal-sm">
                  <span>{roomState?.activeMembers?.length || 0}/8 Speakers</span>
                </div>
              </div>

              {/* Unified 8-Speaker Stage Grid with Embedded Camera Feeds */}
              <StageGrid
                activeMembers={roomState?.activeMembers || []}
                myTag={user?.tag}
                isMyModerator={isMyModerator}
                isSeniorMod={isSeniorMod}
                seniorModSocketId={roomState?.seniorModSocketId}
                localStream={localStream}
                remoteStreams={remoteStreams}
                isVideoEnabled={isVideoEnabled}
                isSelfSpeaking={isSpeaking}
                isLoading={!roomState}
                onRemoveUser={(socketId, tag) => removeUser(socketId, tag)}
                onMuteSpeaker={(socketId, tag) => muteSpeaker(socketId, tag)}
              />
            </div>

            {/* Waiting Queue */}
            <div className="space-y-3 pt-4 border-t-2 border-border/80">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  <span>Waiting Queue ({roomState?.waitingQueue.length || 0})</span>
                </h3>
              </div>

              <WaitingQueue
                waitingQueue={roomState?.waitingQueue || []}
                myTag={user?.tag}
                isMyModerator={isMyModerator}
                isLoading={!roomState}
                onAdmitUser={(socketId, tag) => admitUser(socketId, tag)}
                onToggleHand={toggleHand}
              />
            </div>
          </div>

          {/* Right Column: Junctions Directory Sidebar */}
          <div className="hidden lg:block">
            <JunctionsSidebar currentRoomId={roomId} />
          </div>
        </div>
      </div>

      {/* Floating Bottom Dock */}
      <RoomDock
        role={role}
        isMuted={isMuted}
        isVideoEnabled={isVideoEnabled}
        onToggleVideo={toggleVideo}
        isScreenSharing={isScreenSharing}
        isChatOpen={chatOpen}
        hasUnreadChat={hasUnreadChat}
        isHandRaised={isHandRaised}
        queuePosition={myQueuePosition}
        isMyModerator={isMyModerator}
        isSeniorMod={isSeniorMod}
        onToggleMute={toggleMute}
        onToggleScreenShare={toggleScreenShare}
        onToggleChat={() => {
          setChatOpen((prev) => !prev);
          setHasUnreadChat(false);
        }}
        onToggleHand={toggleHand}
        onSubmitQuickComment={submitQuickComment}
        onSendEmoji={sendEmoji}
        onLeaveRoom={() => router.push('/junctions')}
        onOpenProfile={() => setProfileOpen(true)}
        isRecording={isRecording}
        onToggleRecording={toggleRecording}
      />

      {/* Profile Customizer Modal */}
      <ProfileCustomizerModal
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        user={user}
        onSaveProfile={customizeProfile}
        onRerollName={rerollName}
        socket={socket}
      />

      {/* Chat Sidebar Drawer */}
      <ChatWindow
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        roomId={roomId}
        socket={socket}
        user={user}
      />

      {/* Password Required Dialog for Custom Room */}
      <Dialog open={!!error && error.includes('password')} onOpenChange={() => {}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Password Protected Room</DialogTitle>
            <DialogDescription>
              This custom room requires a password to enter.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setPassword(passwordInput);
            }}
            className="space-y-4 pt-2"
          >
            <Input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Enter password"
              autoFocus
              required
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/junctions')}
              >
                Back to Junctions
              </Button>
              <Button type="submit">Join Room</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
