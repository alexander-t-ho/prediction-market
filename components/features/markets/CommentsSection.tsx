'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';

interface Comment {
  id: string;
  content: string;
  hasSpoiler: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatar: string | null;
  };
  replies?: Comment[];
}

interface CommentsSectionProps {
  marketId: string;
}

function CommentItem({
  comment,
  marketId,
  onReply,
  onDelete,
  isReply = false,
}: {
  comment: Comment;
  marketId: string;
  onReply?: (parentId: string) => void;
  onDelete?: (commentId: string) => void;
  isReply?: boolean;
}) {
  const { user } = useAuth();
  const [showSpoiler, setShowSpoiler] = useState(false);
  const isOwner = user?.id === comment.user.id;

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const commentDate = new Date(date);
    const seconds = Math.floor((now.getTime() - commentDate.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return commentDate.toLocaleDateString();
  };

  return (
    <div className={`${isReply ? 'ml-12 mt-3' : ''}`}>
      <Card variant="bordered" padding="md">
        <div className="flex gap-3">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="h-10 w-10 rounded-full bg-accent-primary/20 flex items-center justify-center text-accent-primary font-semibold">
              {comment.user.displayName.charAt(0).toUpperCase()}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-text-primary">
                {comment.user.displayName}
              </span>
              <span className="text-xs text-text-secondary">
                @{comment.user.username}
              </span>
              <span className="text-xs text-text-secondary">•</span>
              <span className="text-xs text-text-secondary">
                {formatTimeAgo(comment.createdAt)}
              </span>
            </div>

            {/* Spoiler Warning */}
            {comment.hasSpoiler && !showSpoiler ? (
              <div className="my-2">
                <div className="inline-flex items-center gap-2 px-3 py-2 bg-warning/20 border border-warning rounded">
                  <span className="text-sm text-warning font-medium">⚠️ Spoiler Warning</span>
                  <button
                    onClick={() => setShowSpoiler(true)}
                    className="text-xs text-warning underline hover:no-underline"
                  >
                    Show
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-text-secondary whitespace-pre-wrap break-words">
                {comment.content}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-3 mt-2">
              {!isReply && onReply && (
                <button
                  onClick={() => onReply(comment.id)}
                  className="text-xs text-text-secondary hover:text-accent-primary transition-colors"
                >
                  Reply
                </button>
              )}
              {isOwner && onDelete && (
                <button
                  onClick={() => onDelete(comment.id)}
                  className="text-xs text-text-secondary hover:text-danger transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-3 mt-3">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              marketId={marketId}
              onDelete={onDelete}
              isReply={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CommentsSection({ marketId }: CommentsSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [hasSpoiler, setHasSpoiler] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  useEffect(() => {
    loadComments();
  }, [marketId]);

  const loadComments = async () => {
    try {
      const response = await fetch(`/api/markets/${marketId}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/markets/${marketId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          content: newComment.trim(),
          hasSpoiler,
          parentId: replyingTo,
        }),
      });

      if (response.ok) {
        setNewComment('');
        setHasSpoiler(false);
        setReplyingTo(null);
        await loadComments();
      }
    } catch (error) {
      console.error('Error posting comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!user || !confirm('Are you sure you want to delete this comment?')) return;

    try {
      const response = await fetch(
        `/api/comments/${commentId}?userId=${user.id}&isAdmin=${user.isAdmin}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        await loadComments();
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleReply = (parentId: string) => {
    setReplyingTo(parentId);
    const parent = comments.find((c) => c.id === parentId);
    if (parent) {
      setNewComment(`@${parent.user.username} `);
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      {/* Comment Form */}
      {user ? (
        <Card variant="elevated" padding="lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              {replyingTo && (
                <div className="mb-2 flex items-center gap-2 text-sm text-text-secondary">
                  <span>Replying to comment</span>
                  <button
                    type="button"
                    onClick={() => {
                      setReplyingTo(null);
                      setNewComment('');
                    }}
                    className="text-accent-primary hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              )}
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={replyingTo ? 'Write a reply...' : 'Share your thoughts...'}
                className="w-full rounded-lg border border-border bg-background-primary px-4 py-3 text-text-primary placeholder-text-secondary focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20"
                rows={3}
                disabled={submitting}
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasSpoiler}
                  onChange={(e) => setHasSpoiler(e.target.checked)}
                  className="rounded border-border text-accent-primary focus:ring-accent-primary"
                />
                Contains spoilers
              </label>

              <Button type="submit" disabled={!newComment.trim() || submitting}>
                {submitting ? 'Posting...' : replyingTo ? 'Post Reply' : 'Post Comment'}
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <Card variant="bordered" padding="lg">
          <p className="text-center text-text-secondary">
            Please log in to post comments
          </p>
        </Card>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <Card variant="bordered" padding="lg">
            <p className="text-center text-text-secondary">
              No comments yet. Be the first to comment!
            </p>
          </Card>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              marketId={marketId}
              onReply={handleReply}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}
