'use client';

import { useState, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import { CommentItem } from '@/types';

export function useVotes(
  comments: CommentItem[],
  setComments: React.Dispatch<React.SetStateAction<CommentItem[]>>
) {
  const [userVotes, setUserVotes] = useState<Record<string, number>>({});

  const voteComment = useCallback(
    async (commentId: string, value: 1 | -1) => {
      const currentVote = userVotes[commentId] || 0;
      const newVote = currentVote === value ? 0 : value;
      const delta = newVote - currentVote;

      // Optimistic update
      setUserVotes((prev) => ({ ...prev, [commentId]: newVote }));
      setComments((prev) =>
        prev.map((c) => {
          if (c._id === commentId) {
            let incUp = 0;
            let incDown = 0;
            if (currentVote === 1) incUp = -1;
            if (currentVote === -1) incDown = -1;
            if (newVote === 1) incUp = 1;
            if (newVote === -1) incDown = 1;

            return {
              ...c,
              score: c.score + delta,
              upvotes: c.upvotes + incUp,
              downvotes: c.downvotes + incDown
            };
          }
          return c;
        })
      );

      try {
        await apiClient<{ success: boolean; comment: CommentItem }>(
          `/api/comments/${commentId}/vote`,
          {
            method: 'POST',
            body: JSON.stringify({ value: newVote })
          }
        );
      } catch (err) {
        // Rollback on failure
        setUserVotes((prev) => ({ ...prev, [commentId]: currentVote }));
        setComments((prev) =>
          prev.map((c) => (c._id === commentId ? { ...c, score: c.score - delta } : c))
        );
        console.error('Vote failed:', err);
      }
    },
    [userVotes, setComments]
  );

  return { userVotes, voteComment };
}
