import { Types } from 'mongoose';
import { Comment, IComment } from '../models/Comment.js';
import { Vote } from '../models/Vote.js';

export async function processVote(
  commentId: string,
  userTag: string,
  value: 1 | -1 | 0
): Promise<{ success: boolean; comment?: IComment; message?: string }> {
  if (!Types.ObjectId.isValid(commentId)) {
    return { success: false, message: 'Invalid comment ID' };
  }

  const comment = await Comment.findById(commentId);
  if (!comment) {
    return { success: false, message: 'Comment not found' };
  }

  if (comment.authorTag === userTag) {
    return { success: false, message: 'Cannot vote on your own comment' };
  }

  // Find existing vote
  const existingVote = await Vote.findOne({
    commentId: new Types.ObjectId(commentId),
    userTag
  });

  const oldValue = existingVote ? existingVote.value : 0;
  const delta = value - oldValue;

  if (delta === 0) {
    return { success: true, comment }; // No change
  }

  // Upsert or remove vote
  if (value === 0) {
    await Vote.findOneAndDelete({
      commentId: new Types.ObjectId(commentId),
      userTag
    });
  } else {
    await Vote.findOneAndUpdate(
      { commentId: new Types.ObjectId(commentId), userTag },
      { value },
      { upsert: true, new: true }
    );
  }

  let incUp = 0;
  let incDown = 0;

  if (oldValue === 1) incUp = -1;
  else if (oldValue === -1) incDown = -1;

  if (value === 1) incUp = 1;
  else if (value === -1) incDown = 1;

  const updatedComment = await Comment.findByIdAndUpdate(
    commentId,
    {
      $inc: {
        score: delta,
        upvotes: incUp,
        downvotes: incDown
      }
    },
    { new: true }
  );

  return { success: true, comment: updatedComment || comment };
}
