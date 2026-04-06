const express = require('express');
const multer = require('multer');
const Post = require('../models/Post');
const requireAuth = require('../middleware/requireAuth');
const authOptional = require('../middleware/authOptional');
const upload = require('../config/multer');

const router = express.Router();

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    return fallback;
  }
  return parsed;
};

const getMediaType = (mimetype = '') => {
  if (mimetype.startsWith('video/')) {
    return 'video';
  }

  if (mimetype.toLowerCase().includes('gif')) {
    return 'gif';
  }

  return 'image';
};

const optimizeCloudinaryUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return '';
  }

  if (url.includes('/upload/f_auto,q_auto/')) {
    return url;
  }

  return url.replace('/upload/', '/upload/f_auto,q_auto/');
};

const extractObjectId = (value) => {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object' && value._id) {
    return String(value._id);
  }

  return String(value);
};

const normalizeVisibility = (value, fallback = 'public') => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();

  if (normalized === 'community' || normalized === 'private') {
    return 'community';
  }

  if (normalized === 'public') {
    return 'public';
  }

  return fallback;
};

const toCommentResponse = (comment) => {
  const commentObj =
    comment && typeof comment.toObject === 'function'
      ? comment.toObject()
      : comment || {};
  const user = commentObj.userId || {};

  return {
    _id: commentObj._id,
    text: commentObj.text || '',
    createdAt: commentObj.createdAt,
    userId: {
      _id: user._id || null,
      name: user.name || 'EcoShore User',
      role: user.role || null,
    },
  };
};

const toPostResponse = (post, currentUserId = null) => {
  if (!post) {
    return null;
  }

  const postObj = typeof post.toObject === 'function' ? post.toObject() : post;
  const user = postObj.userId || {};
  const likes = Array.isArray(postObj.likes) ? postObj.likes : [];
  const comments = Array.isArray(postObj.comments) ? postObj.comments : [];
  const currentUserIdStr = extractObjectId(currentUserId);
  const isLiked = currentUserIdStr
    ? likes.some(
        (likeUserId) => extractObjectId(likeUserId) === currentUserIdStr
      )
    : false;

  return {
    _id: postObj._id,
    userId: {
      _id: user._id || null,
      name: user.name || 'EcoShore User',
      role: user.role || null,
    },
    text: postObj.text || '',
    media: Array.isArray(postObj.media) ? postObj.media : [],
    visibility: normalizeVisibility(postObj.visibility),
    likesCount: likes.length,
    isLiked,
    commentsCount: comments.length,
    recentComments: comments.slice(-2).map(toCommentResponse),
    createdAt: postObj.createdAt,
  };
};

router.post(
  '/create',
  requireAuth,
  (req, res, next) => {
    upload.array('media', 5)(req, res, (error) => {
      if (!error) {
        return next();
      }

      if (error instanceof multer.MulterError) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(400).json({
        success: false,
        message: error.message || 'Media upload failed. Please try again.',
      });
    });
  },
  async (req, res, next) => {
    try {
      const text = String(req.body.text || '').trim();
      const visibility = normalizeVisibility(req.body.visibility, 'public');
      const files = Array.isArray(req.files) ? req.files : [];

      if (!text && files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Please provide text or at least one media file.',
        });
      }

      const media = files.map((file) => ({
        url: optimizeCloudinaryUrl(file.path || file.secure_url || ''),
        type: getMediaType(file.mimetype),
      }));

      const createdPost = await Post.create({
        userId: req.user.id,
        text,
        media,
        visibility,
      });

      const post = await Post.findById(createdPost._id)
        .populate('userId', 'name role')
        .lean();

      return res.status(201).json({
        success: true,
        message: 'Post created successfully.',
        data: toPostResponse(post, req.user.id),
      });
    } catch (error) {
      return next(error);
    }
  }
);

router.get('/', authOptional, async (req, res, next) => {
  try {
    const page = parsePositiveInt(req.query.page, 1);
    const limit = Math.min(parsePositiveInt(req.query.limit, 10), 25);
    const skip = (page - 1) * limit;
    const authorId = String(
      req.query.authorId || req.query.userId || ''
    ).trim();
    const visibility = String(req.query.visibility || '')
      .trim()
      .toLowerCase();
    const query = {};

    if (authorId) {
      query.userId = authorId;
    }

    if (!req.user || visibility === 'public') {
      query.$or = [
        { visibility: 'public' },
        { visibility: { $exists: false } },
      ];
    } else if (visibility === 'community' || visibility === 'private') {
      query.visibility = { $in: ['community', 'private'] };
    }

    const [items, total] = await Promise.all([
      Post.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name role')
        .populate('comments.userId', 'name role')
        .lean(),
      Post.countDocuments(query),
    ]);

    const pages = Math.max(1, Math.ceil(total / limit));

    return res.json({
      success: true,
      data: {
        posts: items.map((item) => toPostResponse(item, req.user?.id || null)),
        pagination: {
          page,
          limit,
          total,
          pages,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/:id/like', requireAuth, async (req, res, next) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      {
        $addToSet: {
          likes: req.user.id,
        },
      },
      { new: true }
    ).select('likes');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.',
      });
    }

    return res.json({
      success: true,
      message: 'Post liked.',
      data: {
        likesCount: Array.isArray(post.likes) ? post.likes.length : 0,
        isLiked: true,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id/like', requireAuth, async (req, res, next) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      {
        $pull: {
          likes: req.user.id,
        },
      },
      { new: true }
    ).select('likes');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.',
      });
    }

    return res.json({
      success: true,
      message: 'Post unliked.',
      data: {
        likesCount: Array.isArray(post.likes) ? post.likes.length : 0,
        isLiked: false,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/:id/comments', requireAuth, async (req, res, next) => {
  try {
    const text = String(req.body.text || '').trim();

    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'Comment text is required.',
      });
    }

    if (text.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Comment text cannot exceed 2000 characters.',
      });
    }

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.',
      });
    }

    post.comments.push({
      userId: req.user.id,
      text,
    });

    await post.save();
    await post.populate('comments.userId', 'name role');

    const latestComment = post.comments[post.comments.length - 1];

    return res.status(201).json({
      success: true,
      message: 'Comment added successfully.',
      data: {
        comment: toCommentResponse(latestComment),
        commentsCount: post.comments.length,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/:id/comments', authOptional, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('comments.userId', 'name role')
      .lean();

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.',
      });
    }

    const comments = (post.comments || []).map(toCommentResponse);

    return res.json({
      success: true,
      data: {
        comments,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const text = String(req.body.text || '').trim();

    if (text.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Post text cannot exceed 2000 characters.',
      });
    }

    const post = await Post.findById(req.params.id)
      .select('userId text media comments likes visibility createdAt')
      .populate('userId', 'name role')
      .populate('comments.userId', 'name role');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.',
      });
    }

    const currentUserId = extractObjectId(req.user.id || req.user._id);
    const isOwner = extractObjectId(post.userId) === currentUserId;

    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Only the post owner can edit this post.',
      });
    }

    const mediaCount = Array.isArray(post.media) ? post.media.length : 0;
    if (!text && mediaCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'Post must contain text or media.',
      });
    }

    post.text = text;
    await post.save();

    return res.json({
      success: true,
      message: 'Post updated successfully.',
      data: toPostResponse(post, req.user.id || req.user._id || null),
    });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id).select('userId');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.',
      });
    }

    const currentUserId = extractObjectId(req.user.id || req.user._id);
    const isOwner = extractObjectId(post.userId) === currentUserId;
    const isAdmin = String(req.user.role || '').toLowerCase() === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to delete this post.',
      });
    }

    await post.deleteOne();

    return res.json({
      success: true,
      message: 'Post deleted successfully.',
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
