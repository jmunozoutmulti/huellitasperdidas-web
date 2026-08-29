'use client';

import { useState } from 'react';
import { showToast } from '@/components/global/Toast';

interface Reply {
    id: number;
    author: string;
    text: string;
    time: string;
    liked: boolean;
}

interface Comment {
    id: number;
    author: string;
    text: string;
    time: string;
    liked: boolean;
    isEditing: boolean;
    showReplyZone: boolean;
    replyText: string;
    replies: Reply[];
}

const initialComments: Comment[] = [
    {
        id: 1,
        author: 'Javier',
        text: 'me trasmito felisidad ver al gatito',
        time: '2 meses',
        liked: false,
        isEditing: false,
        showReplyZone: false,
        replyText: '',
        replies: [],
    },
];

const emojis = ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '🤫', '🤔', '😐', '👍'];

export default function CommentsWidget() {
    const [isCommentsExpanded, setIsCommentsExpanded] = useState(false);
    const [commentInput, setCommentInput] = useState('');
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
    const [comments, setComments] = useState<Comment[]>(initialComments);
    const [openCommentDropdownId, setOpenCommentDropdownId] = useState<number | null>(null);
    const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null);

    const toggleLikeComment = (commentId: number) => {
        setComments((prev) =>
            prev.map((c) => {
                if (c.id === commentId) {
                    const newLiked = !c.liked;
                    showToast(newLiked ? 'Me gusta guardado' : 'Me gusta removido', newLiked ? 'success' : 'info');
                    return { ...c, liked: newLiked };
                }
                return c;
            })
        );
    };

    const handleAddCommentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentInput.trim()) return;

        const newComment: Comment = {
            id: Date.now(),
            author: 'Tú',
            text: commentInput.trim(),
            time: 'Ahora',
            liked: false,
            isEditing: false,
            showReplyZone: false,
            replyText: '',
            replies: [],
        };

        setComments((prev) => [...prev, newComment]);
        setCommentInput('');
        showToast('Comentario añadido', 'success');
    };

    const handleAddReplySubmit = (commentId: number) => {
        setComments((prev) =>
            prev.map((c) => {
                if (c.id === commentId && c.replyText.trim()) {
                    return {
                        ...c,
                        replyText: '',
                        showReplyZone: false,
                        replies: [
                            ...c.replies,
                            {
                                id: Date.now(),
                                author: 'Tú',
                                text: c.replyText.trim(),
                                time: 'Ahora',
                                liked: false,
                            },
                        ],
                    };
                }
                return c;
            })
        );
    };

    const handleSaveEditComment = (commentId: number, newText: string) => {
        if (!newText.trim()) return;
        setComments((prev) =>
            prev.map((c) => (c.id === commentId ? { ...c, text: newText.trim(), isEditing: false } : c))
        );
        showToast('Comentario editado', 'success');
    };

    const handleDeleteComment = (commentId: number) => {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        setOpenCommentDropdownId(null);
        setDeletingCommentId(null);
        showToast('Comentario eliminado', 'error');
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
                    {comments.length} {comments.length === 1 ? 'comentario' : 'comentarios'}
                </span>
                <i className="fa-solid fa-chevron-down accordion-arrow-icon"></i>
            </div>

            <div className="comments-scrollable-deck">
                {comments.map((comment) => (
                    <div key={comment.id} className="comment-node-row">
                        <div className="comment-avatar-fallback">{comment.author[0]}</div>
                        <div className="comment-inner-body">
                            <p className="comment-text-content">
                                <span className="comment-user-heading">{comment.author}</span>{' '}
                                {comment.text}
                            </p>

                            <div className="comment-interactive-bar">
                                <span className="comment-timestamp">{comment.time}</span>
                                <button
                                    type="button"
                                    className="comment-action-link-btn btn-trigger-reply"
                                    onClick={() => {
                                        setComments((prev) =>
                                            prev.map((c) =>
                                                c.id === comment.id ? { ...c, showReplyZone: !c.showReplyZone } : c
                                            )
                                        );
                                    }}
                                >
                                    Responder
                                </button>

                                <button
                                    type="button"
                                    className={`comment-action-icon-btn btn-comment-like ${comment.liked ? 'like-active' : ''}`}
                                    onClick={() => toggleLikeComment(comment.id)}
                                >
                                    <i className={comment.liked ? 'fa-solid fa-heart' : 'fa-regular fa-heart'}></i>
                                </button>

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
                                            className={`comment-floating-menu ${deletingCommentId === comment.id ? 'is-confirming' : ''}`}
                                            style={{ display: 'block' }}
                                        >
                                            <div className="menu-options-view">
                                                <button
                                                    type="button"
                                                    className="menu-option-item btn-comment-edit"
                                                    onClick={() => {
                                                        setComments((prev) =>
                                                            prev.map((c) => (c.id === comment.id ? { ...c, isEditing: true } : c))
                                                        );
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
                                                        onClick={() => handleDeleteComment(comment.id)}
                                                    >
                                                        Sí, eliminar
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {comment.showReplyZone && (
                                <div className="comment-reply-inline-zone" style={{ display: 'block' }}>
                                    <div className="reply-input-wrapper">
                                        <input
                                            type="text"
                                            className="reply-field"
                                            placeholder="Respuesta"
                                            value={comment.replyText}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setComments((prev) =>
                                                    prev.map((c) => (c.id === comment.id ? { ...c, replyText: val } : c))
                                                );
                                            }}
                                        />
                                        <button type="button" className="reply-emoji-btn">
                                            <i className="fa-regular fa-face-smile"></i>
                                        </button>
                                    </div>
                                    <div className="reply-actions-row">
                                        <button
                                            type="button"
                                            className="btn-reply-cancel"
                                            onClick={() => {
                                                setComments((prev) =>
                                                    prev.map((c) =>
                                                        c.id === comment.id ? { ...c, showReplyZone: false, replyText: '' } : c
                                                    )
                                                );
                                            }}
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="button"
                                            className={`btn-reply-save ${comment.replyText.trim().length > 0 ? 'is-active' : ''}`}
                                            disabled={!comment.replyText.trim()}
                                            onClick={() => handleAddReplySubmit(comment.id)}
                                        >
                                            Guardar
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="comment-replies-list">
                                {comment.replies.map((reply) => (
                                    <div key={reply.id} className="comment-node-row comment-reply-row">
                                        <div className="comment-avatar-fallback">{reply.author[0]}</div>
                                        <div className="comment-inner-body">
                                            <p className="comment-text-content">
                                                <span className="comment-user-heading">{reply.author}</span>{' '}
                                                {reply.text}
                                            </p>
                                            <div className="comment-interactive-bar">
                                                <span className="comment-timestamp">{reply.time}</span>
                                                <button type="button" className="comment-action-icon-btn btn-comment-like">
                                                    <i className="fa-regular fa-heart"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {comment.isEditing && (
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
                                        <button
                                            type="button"
                                            className="btn-edit-cancel"
                                            onClick={() => {
                                                setComments((prev) =>
                                                    prev.map((c) => (c.id === comment.id ? { ...c, isEditing: false } : c))
                                                );
                                            }}
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="button"
                                            className="btn-edit-save"
                                            onClick={() => {
                                                const input = document.getElementById(`edit-field-${comment.id}`) as HTMLInputElement;
                                                if (input) handleSaveEditComment(comment.id, input.value);
                                            }}
                                        >
                                            Guardar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="comment-dock-input-zone">
                <form className="comment-dock-form" onSubmit={handleAddCommentSubmit}>
                    <div className="comment-dock-wrapper">
                        <input
                            type="text"
                            className="comment-dock-field"
                            placeholder="Añade un comentario..."
                            value={commentInput}
                            onChange={(e) => setCommentInput(e.target.value)}
                        />
                        <div className="comment-dock-tools">
                            <div className="emoji-picker-wrapper">
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