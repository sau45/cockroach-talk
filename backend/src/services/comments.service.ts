import { Types } from 'mongoose';
import { Comment, IComment } from '../models/Comment.js';
import { EDIT_WINDOW_MS } from '../config/constants.js';

export type SortMode = 'best' | 'new' | 'old' | 'controversial';

export async function getCommentsForRoom(roomId: string, sort: SortMode = 'best', requesterTag?: string): Promise<IComment[]> {
  const query: any = {
    roomId,
    $or: [
      { isShadowBanned: { $ne: true } },
      ...(requesterTag ? [{ authorTag: requesterTag }] : [])
    ]
  };

  const comments = await Comment.find(query).lean();

  const sorted = (comments as unknown as IComment[]).sort((a, b) => {
    if (sort === 'best') return b.score - a.score;
    if (sort === 'new') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sort === 'old') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (sort === 'controversial') {
      const activityA = (a.upvotes || 0) + (a.downvotes || 0);
      const activityB = (b.upvotes || 0) + (b.downvotes || 0);
      return activityB - activityA;
    }
    return 0;
  });

  return sorted;
}

export async function createComment(data: {
  roomId: string;
  authorTag: string;
  authorName: string;
  authorAvatarType?: 'initials' | 'identicon' | 'emoji';
  authorAvatarValue?: string;
  authorAccentColor?: string;
  authorBubbleStyle?: 'sharp' | 'rounded' | 'outline';
  authorStatus?: string;
  body: string;
  parentId?: string | null;
  isShadowBanned?: boolean;
  toxicityScore?: number;
}): Promise<{ success: boolean; comment?: IComment; parentDoc?: IComment | null; message?: string }> {
  let depth = 0;
  let rootId: Types.ObjectId | null = null;
  let parentDoc: IComment | null = null;

  if (data.parentId && Types.ObjectId.isValid(data.parentId)) {
    parentDoc = await Comment.findById(data.parentId);
    if (!parentDoc) {
      return { success: false, message: 'Parent comment not found' };
    }
    if (parentDoc.roomId !== data.roomId) {
      return { success: false, message: 'Room mismatch' };
    }

    depth = Math.min((parentDoc.depth || 0) + 1, 6);
    rootId = parentDoc.rootId || (parentDoc._id as Types.ObjectId);

    await Comment.findByIdAndUpdate(data.parentId, { $inc: { replyCount: 1 } });
  }

  const comment = new Comment({
    roomId: data.roomId,
    authorTag: data.authorTag,
    authorName: data.authorName,
    authorAvatarType: data.authorAvatarType || 'initials',
    authorAvatarValue: data.authorAvatarValue || '',
    authorAccentColor: data.authorAccentColor || 'cyber-purple',
    authorBubbleStyle: data.authorBubbleStyle || 'rounded',
    authorStatus: data.authorStatus || '',
    body: data.body,
    parentId: data.parentId && Types.ObjectId.isValid(data.parentId) ? new Types.ObjectId(data.parentId) : null,
    rootId,
    depth,
    isShadowBanned: !!data.isShadowBanned,
    toxicityScore: data.toxicityScore || 0
  });

  if (!rootId) {
    comment.rootId = comment._id as Types.ObjectId;
  }

  await comment.save();

  return { success: true, comment, parentDoc };
}

export async function editComment(
  id: string,
  authorTag: string,
  newBody: string
): Promise<{ success: boolean; comment?: IComment; message?: string; statusCode?: number }> {
  if (!Types.ObjectId.isValid(id)) {
    return { success: false, message: 'Invalid comment ID', statusCode: 400 };
  }

  const comment = await Comment.findById(id);
  if (!comment) {
    return { success: false, message: 'Comment not found', statusCode: 404 };
  }

  if (comment.authorTag !== authorTag) {
    return { success: false, message: 'Unauthorized', statusCode: 403 };
  }

  if (comment.isDeleted) {
    return { success: false, message: 'Comment has been deleted', statusCode: 400 };
  }

  const age = Date.now() - new Date(comment.createdAt).getTime();
  if (age > EDIT_WINDOW_MS) {
    return { success: false, message: '15-minute edit window expired', statusCode: 403 };
  }

  comment.body = newBody;
  comment.editedAt = new Date();
  await comment.save();

  return { success: true, comment };
}

export async function deleteComment(
  id: string,
  authorTag: string,
  isAdmin: boolean = false
): Promise<{ success: boolean; roomId?: string; parentId?: string | null; message?: string; statusCode?: number }> {
  if (!Types.ObjectId.isValid(id)) {
    return { success: false, message: 'Invalid comment ID', statusCode: 400 };
  }

  const comment = await Comment.findById(id);
  if (!comment) {
    return { success: false, message: 'Comment not found', statusCode: 404 };
  }

  if (comment.authorTag !== authorTag && !isAdmin) {
    return { success: false, message: 'Unauthorized', statusCode: 403 };
  }

  const roomId = comment.roomId;
  const parentId = comment.parentId ? comment.parentId.toString() : null;

  // Hard delete as per original server.js
  await Comment.findByIdAndDelete(id);

  if (parentId) {
    await Comment.findByIdAndUpdate(parentId, { $inc: { replyCount: -1 } });
  }

  return { success: true, roomId, parentId };
}
