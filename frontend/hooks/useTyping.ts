'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';

interface UseTypingProps {
  socket: Socket | null;
  myTag?: string;
}

export function useTyping({ socket, myTag }: UseTypingProps) {
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!socket) return;

    const handleTyping = ({ tag, name, isTyping }: { tag: string; name: string; isTyping: boolean }) => {
      if (tag === myTag) return; // Ignore own typing

      setTypingUsers((prev) => {
        const next = new Map(prev);
        if (isTyping) {
          next.set(tag, name);
        } else {
          next.delete(tag);
        }
        return next;
      });
    };

    socket.on('thread:typing', handleTyping);

    return () => {
      socket.off('thread:typing', handleTyping);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [socket, myTag]);

  const onUserTyping = useCallback(() => {
    if (!socket) return;
    socket.emit('thread:typing', true);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      socket.emit('thread:typing', false);
    }, 2000);
  }, [socket]);

  const onUserStopTyping = useCallback(() => {
    if (!socket) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    socket.emit('thread:typing', false);
  }, [socket]);

  const getTypingMessage = useCallback(() => {
    const names = Array.from(typingUsers.values());
    if (names.length === 0) return null;
    if (names.length === 1) return `${names[0]} is typing...`;
    if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`;
    return `${names[0]}, ${names[1]}, and ${names.length - 2} other(s) are typing...`;
  }, [typingUsers]);

  return {
    onUserTyping,
    onUserStopTyping,
    typingMessage: getTypingMessage()
  };
}
