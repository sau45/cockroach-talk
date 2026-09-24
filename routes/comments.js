import express from 'express';
import { body, query, validationResult } from 'express-validator';
import Comment from '../models/Comment.js';
import Vote from '../models/Vote.js';
import rateLimit from 'express-rate-limit';

export default function(io) {
  const router = express.Router();

  const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
  const countGraphemes = (str) => [...segmenter.segment(str)].length;

  // Rate limiters
  const postLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: { success: false, message: 'Too many comments, try again later.' }
  });
  
  const voteLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: { success: false, message: 'Too many votes, try again later.' }
  });

  // Validation middleware
  const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    next();
  };

  const sanitizeBody = (req, res, next) => {
    if (req.body.body) {
      let b = req.body.body.trim().normalize('NFC');
      b = b.replace(/\n{3,}/g, '\n\n');
      
      // Basic strip HTML tags
      b = b.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      
      if (countGraphemes(b) > 1000) {
        return res.status(400).json({ success: false, message: 'Comment exceeds 1000 characters' });
      }
      req.body.body = b;
    }
    next();
  };

  // 1. Fetch comments
  router.get('/', [
    query('roomId').isString().notEmpty()
  ], validate, async (req, res) => {
    try {
      const { roomId } = req.query;
      
      // Fetch all comments for room (for a real app, paginate root comments)
      // Here we fetch the tree.
      const comments = await Comment.find({ roomId }).sort({ score: -1, createdAt: 1 }).lean();
      
      // We send flat array, client will build tree
      res.json({ success: true, comments });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 2. Post a comment
  router.post('/', postLimiter, [
    body('roomId').isString().notEmpty(),
    body('authorTag').isString().notEmpty(),
    body('authorName').isString().notEmpty(),
    body('body').isString().notEmpty(),
    body('parentId').optional({ nullable: true }).isMongoId()
  ], validate, sanitizeBody, async (req, res) => {
    try {
      const { roomId, authorTag, authorName, body, parentId } = req.body;

      let depth = 0;
      let rootId = null;
      let parentDoc = null;

      if (parentId) {
        parentDoc = await Comment.findById(parentId);
        if (!parentDoc) return res.status(404).json({ success: false, message: 'Parent not found' });
        if (parentDoc.roomId !== roomId) return res.status(400).json({ success: false, message: 'Room mismatch' });
        
        depth = Math.min(parentDoc.depth + 1, 6);
        rootId = parentDoc.rootId || parentDoc._id;
        
        // Increment reply count
        await Comment.findByIdAndUpdate(parentId, { $inc: { replyCount: 1 } });
      }

      const comment = new Comment({
        roomId, authorTag, authorName, body, parentId: depth === 6 ? parentId : parentId, rootId, depth
      });
      
      if (!rootId) comment.rootId = comment._id; // Root comment references itself
      
      await comment.save();

      io.to(roomId).emit('thread:new', comment);

      if (parentId && parentDoc) {
        const preview = parentDoc.body.length > 50 ? parentDoc.body.substring(0, 50) + '...' : parentDoc.body;
        io.to(roomId).emit('thread:reply-notify', {
          parentId: parentDoc._id,
          parentPreview: preview,
          replyId: comment._id,
          replyAuthor: comment.authorName
        });
      }

      res.json({ success: true, comment });

    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 3. Edit a comment
  router.patch('/:id', [
    body('authorTag').isString().notEmpty(),
    body('body').isString().notEmpty()
  ], validate, sanitizeBody, async (req, res) => {
    try {
      const { id } = req.params;
      const { authorTag, body } = req.body;

      const comment = await Comment.findById(id);
      if (!comment) return res.status(404).json({ success: false, message: 'Not found' });
      if (comment.authorTag !== authorTag) return res.status(403).json({ success: false, message: 'Unauthorized' });
      if (comment.isDeleted) return res.status(400).json({ success: false, message: 'Deleted' });
      
      // Check 15 mins
      if (Date.now() - new Date(comment.createdAt).getTime() > 15 * 60 * 1000) {
        return res.status(403).json({ success: false, message: 'Edit window expired' });
      }

      comment.body = body;
      comment.editedAt = new Date();
      await comment.save();

      io.to(comment.roomId).emit('thread:updated', comment);
      res.json({ success: true, comment });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 4. Delete a comment
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { authorTag, isAdmin } = req.body; // In real app, from auth token

      const comment = await Comment.findById(id);
      if (!comment) return res.status(404).json({ success: false, message: 'Not found' });
      
      if (comment.authorTag !== authorTag && !isAdmin) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }

      // Hard delete (completely remove)
      await Comment.findByIdAndDelete(id);
      if (comment.parentId) {
        await Comment.findByIdAndUpdate(comment.parentId, { $inc: { replyCount: -1 } });
      }
      io.to(comment.roomId).emit('thread:deleted', { id: comment._id });

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 5. Vote
  router.post('/:id/vote', voteLimiter, [
    body('userTag').isString().notEmpty(),
    body('value').isIn([1, -1, 0]).toInt()
  ], validate, async (req, res) => {
    try {
      const { id } = req.params;
      const { userTag, value } = req.body;

      const comment = await Comment.findById(id);
      if (!comment) return res.status(404).json({ success: false, message: 'Not found' });
      if (comment.authorTag === userTag) return res.status(400).json({ success: false, message: 'Cannot vote on own comment' });

      // Upsert vote
      const existingVote = await Vote.findOne({ commentId: id, userTag });
      const oldValue = existingVote ? existingVote.value : 0;
      
      const delta = value - oldValue;
      if (delta === 0) return res.json({ success: true, comment }); // No change

      if (value === 0) {
        await Vote.findOneAndDelete({ commentId: id, userTag });
      } else {
        await Vote.findOneAndUpdate(
          { commentId: id, userTag },
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

      const updated = await Comment.findByIdAndUpdate(
        id,
        { $inc: { score: delta, upvotes: incUp, downvotes: incDown } },
        { new: true }
      );

      io.to(comment.roomId).emit('thread:vote', { id: comment._id, score: updated.score, upvotes: updated.upvotes, downvotes: updated.downvotes });
      res.json({ success: true, comment: updated });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  return router;
}
