'use client';

import { useState, useRef, useEffect } from 'react';
import { showToast } from '@/components/global/Toast';
import { useClickOutside } from '@/hooks/useClickOutside';
import { useApp } from '@/context/AppContext';
import { getComments, createComment, updateComment, deleteComment, type ApiComment, CommentsApiError } from '@/lib/commentsApi';

interface CommentsWidgetProps {
    reportId: string;
}

const emojis = ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '🤫', '🤔', '😐', '👍'];

function formatTime(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Ahora';
    if (diffMin < 60) return `${diffMin} min`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs} h`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 30) return `${diffDays} d`;
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths} ${diffMonths === 1 ? 'mes' : 'meses'}`;
}

export default function CommentsWidget({ reportId }: CommentsWidgetProps) {
    const { currentUser, openAuthModal } = useApp();

    const [isCommentsExpanded, setIsCommentsExpanded] = useState(false);
    const [commentInput, setCommentInput] = useState('');
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
    const emojiPickerRef = useRef<HTMLDivElement>(null);
    useClickOutside(emojiPickerRef, () => setIsEmojiPickerOpen(false), isEmojiPickerOpen);

    const [comments, setComments] = useState<ApiComment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [openCommentDropdownId, setOpenCommentDropdownId] = useState<string | null>(null);
    const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [replyingToId, setReplyingToId] = useState<string | null>(null);
    const [replyInput, setReplyInput] = useState('');

    useEffect(() => {
        let isCancelled = false;
        getComments(reportId)
            .then((data) => {
                if (!isCancelled) setComments(data);
            })
            .catch(() => {
                // no bloquear la vista si los comentarios fallan al cargar
            })
            .finally(() => {
                if (!isCancelled) setIsLoading(false);
            });
        return () => {
            isCancelled = true;
        };
    }, [reportId]);

    const totalCount = comments.reduce((sum, c) => sum + 1 + c.replies.length, 0);

    const handleAddCommentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentInput.trim()) return;
        if (!currentUser) {
            openAuthModal();
            return;
        }
        setIsSubmitting(true);
        try {
            const nuevo = await createComment(reportId, commentInput.trim());
            setComments((prev) => [...prev, nuevo]);
            setCommentInput('');
            showToast('Comentario añadido', 'success');
        } catch (err) {
            const message = err instanceof CommentsApiError ? err.message : 'No pudimos publicar tu comentario. Intenta de nuevo.';
            showToast(message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddReplySubmit = async (parentId: string) => {
        if (!replyInput.trim()) return;
        if (!currentUser) {
            openAuthModal();
            return;
        }
        try {
            const nueva = await createComment(reportId, replyInput.trim(), parentId);
            setComments((prev) => prev.map((c) => (c.id === parentId ? { ...c, replies: [...c.replies, nueva] } : c)));
            setReplyInput('');
            setReplyingToId(null);
        } catch (err) {
            const message = err instanceof CommentsApiError ? err.message : 'No pudimos publicar tu respuesta. Intenta de nuevo.';
            showToast(message, 'error');
        }
    };

    const handleSaveEditComment = async (commentId: string, newText: string, isReply: boolean, parentId?: string) => {
        if (!newText.trim()) return;
        try {
            const actualizado = await updateComment(commentId, newText.trim());
            setComments((prev) =>
                isReply
                    ? prev.map((c) =>
                          c.id === parentId
                              ? { ...c, replies: c.replies.map((r) => (r.id === commentId ? actualizado : r)) }
                              : c
                      )
                    : prev.map((c) => (c.id === commentId ? { ...actualizado, replies: c.replies } : c))
            );
            setEditingCommentId(null);
            showToast('Comentario editado', 'success');
        } catch (err) {
            const message = err instanceof CommentsApiError ? err.message : 'No pudimos editar el comentario. Intenta de nuevo.';
            showToast(message, 'error');
        }
    };

    const handleDeleteComment = async (commentId: string, isReply: boolean, parentId?: string) => {
        try {
            await deleteComment(commentId);
            setComments((prev) =>
                isReply
                    ? prev.map((c) =>
                          c.id === parentId ? { ...c, replies: c.replies.filter((r) => r.id !== commentId) } : c
                      )
                    : prev.filter((c) => c.id !== commentId)
            );
            setOpenCommentDropdownId(null);
            setDeletingCommentId(null);
            showToast('Comentario eliminado', 'success');
        } catch (err) {
            const message = err instanceof CommentsApiError ? err.message : 'No pudimos eliminar el comentario. Intenta de nuevo.';
            showToast(message, 'error');
        }
    };

    useEffect(() => {
        if (openCommentDropdownId === null) return;

        const handleClick = (e: MouseEvent) => {
            if (!(e.target as HTMLElement).closest('.dropdown-menu-container')) {
                setOpenCommentDropdownId(null);
            }
        };

        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [openCommentDropdownId]);

    const renderCommentNode = (comment: ApiComment, isReply: boolean, parentId?: string) => {
        const isOwn = currentUser?.id === comment.author_id;
        const isEditing = editingCommentId === comment.id;
        const isConfirmingDelete = deletingCommentId === comment.id;

        return (
            <div key={comment.id} className={isReply ? 'comment-node-row comment-reply-row' : 'comment-node-row'}>
                <div className="comment-avatar-fallback">
                    {comment.author_avatar ? (
                        <img
                            src={comment.author_avatar}
                            alt=""
                            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                        />
                    ) : (
                        comment.author_name[0]
                    )}
                </div>
                <div className="comment-inner-body">
                    {!isEditing && (
                        <p className="comment-text-content">
                            <span className="comment-user-heading">{comment.author_name}</span>{' '}
                            {comment.text}
                        </p>
                    )}

                    <div className="comment-interactive-bar">
                        <span className="comment-timestamp">{formatTime(comment.created_at)}</span>

                        {!isReply && (
                            <button
                                type="button"
                                className="comment-action-link-btn btn-trigger-reply"
                                onClick={() => {
                                    if (!currentUser) {
                                        openAuthModal();
                                        return;
                                    }
                                    setReplyingToId(replyingToId === comment.id ? null : comment.id);
                                    setReplyInput('');
                                }}
                            >
                                Responder
                            </button>
                        )}

                        {isOwn && (
                            <div className="dropdown-menu-container">
                                <button
                                    type="button"
                                    className="comment-action-icon-btn btn-trigger-dropdown"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenCommentDropdownId(openCommentDropdownId === comment.id ? null : comment.id);
                                    }}
                                >
                                    <i className="fa-solid fa-ellipsis-vertical"></i>
                                </button>

                                {openCommentDropdownId === comment.id && (
                                    <div
                                        className={`comment-floating-menu ${isConfirmingDelete ? 'is-confirming' : ''}`}
                                        style={{ display: 'block' }}
                                    >
                                        <div className="menu-options-view">
                                            <button
                                                type="button"
                                                className="menu-option-item btn-comment-edit"
                                                onClick={() => {
                                                    setEditingCommentId(comment.id);
                                                    setOpenCommentDropdownId(null);
                                                }}
                                            >
                                                Editar
                                            </button>
                                            <button
                                                type="button"
                                                className="menu-option-item option-danger btn-comment-delete"
                                                onClick={() => setDeletingCommentId(comment.id)}
                                            >
                                                Eliminar
                                            </button>
                                        </div>

                                        <div className="menu-confirm-view">
                                            <p className="menu-confirm-text">¿Eliminar este comentario?</p>
                                            <div className="menu-confirm-actions">
                                                <button
                                                    type="button"
                                                    className="menu-confirm-btn btn-confirm-cancel"
                                                    onClick={() => setDeletingCommentId(null)}
                                                >
                                                    No
                                                </button>
                                                <button
                                                    type="button"
                                                    className="menu-confirm-btn btn-confirm-delete"
                                                    onClick={() => handleDeleteComment(comment.id, isReply, parentId)}
                                                >
                                                    Sí, eliminar
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {!isReply && replyingToId === comment.id && (
                        <div className="comment-reply-inline-zone" style={{ display: 'block' }}>
                            <div className="reply-input-wrapper">
                                <input
                                    type="text"
                                    className="reply-field"
                                    placeholder="Respuesta"
                                    value={replyInput}
                                    onChange={(e) => setReplyInput(e.target.value)}
                                />
                            </div>
                            <div className="reply-actions-row">
                                <button
                                    type="button"
                                    className="btn-reply-cancel"
                                    onClick={() => {
                                        setReplyingToId(null);
                                        setReplyInput('');
                                    }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    className={`btn-reply-save ${replyInput.trim().length > 0 ? 'is-active' : ''}`}
                                    disabled={!replyInput.trim()}
                                    onClick={() => handleAddReplySubmit(comment.id)}
                                >
                                    Guardar
                                </button>
                            </div>
                        </div>
                    )}

                    {!isReply && comment.replies.length > 0 && (
                        <div className="comment-replies-list">
                            {comment.replies.map((reply) => renderCommentNode(reply, true, comment.id))}
                        </div>
                    )}

                    {isEditing && (
                        <div className="comment-edit-inline-zone" style={{ display: 'block' }}>
                            <div className="reply-input-wrapper">
                                <input
                                    type="text"
                                    className="edit-field"
                                    defaultValue={comment.text}
                                    id={`edit-field-${comment.id}`}
                                />
                            </div>
                            <div className="reply-actions-row">
                                <button type="button" className="btn-edit-cancel" onClick={() => setEditingCommentId(null)}>
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    className="btn-edit-save"
                                    onClick={() => {
                                        const input = document.getElementById(`edit-field-${comment.id}`) as HTMLInputElement;
                                        if (input) handleSaveEditComment(comment.id, input.value, isReply, parentId);
                                    }}
                                >
                                    Guardar
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div
            className={`interactive-comments-widget ${isCommentsExpanded ? 'is-expanded' : ''}`}
            id="comments-widget-container"
        >
            <div
                className="comments-accordion-toggle"
                id="comments-toggle-header"
                onClick={() => setIsCommentsExpanded(!isCommentsExpanded)}
            >
                <span className="comments-counter-text">
                    {isLoading ? 'Cargando comentarios...' : `${totalCount} ${totalCount === 1 ? 'comentario' : 'comentarios'}`}
                </span>
                <i className="fa-solid fa-chevron-down accordion-arrow-icon"></i>
            </div>

            <div className="comments-scrollable-deck">
                {comments.map((comment) => renderCommentNode(comment, false))}
            </div>

            <div className="comment-dock-input-zone">
                <form className="comment-dock-form" onSubmit={handleAddCommentSubmit}>
                    <div className="comment-dock-wrapper">
                        <input
                            type="text"
                            className="comment-dock-field"
                            placeholder={currentUser ? 'Añade un comentario...' : 'Inicia sesión para comentar'}
                            value={commentInput}
                            onChange={(e) => setCommentInput(e.target.value)}
                            onFocus={() => {
                                if (!currentUser) openAuthModal();
                            }}
                            disabled={isSubmitting}
                        />
                        <div className="comment-dock-tools">
                            <button
                                type="submit"
                                className={`dock-tool-btn ${commentInput.trim() ? 'is-active' : ''}`}
                                disabled={!commentInput.trim() || isSubmitting}
                                title="Enviar"
                            >
                                <i className="ti ti-send"></i>
                            </button>
                            <div className="emoji-picker-wrapper" ref={emojiPickerRef}>
                                <button
                                    type="button"
                                    className="dock-tool-btn"
                                    id="btn-comment-emoji"
                                    title="Emojis"
                                    onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                                >
                                    <i className="fa-regular fa-face-smile"></i>
                                </button>

                                {isEmojiPickerOpen && (
                                    <div className="emoji-picker-popover is-open" id="emoji-popover-box">
                                        <div className="emoji-picker-scroll-zone">
                                            <h4 className="emoji-section-title">Emoticonos</h4>
                                            <div className="emoji-grid-layout">
                                                {emojis.map((emoji, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        className="emoji-item-btn"
                                                        onClick={() => {
                                                            setCommentInput((prev) => prev + emoji);
                                                            setIsEmojiPickerOpen(false);
                                                        }}
                                                    >
                                                        {emoji}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}