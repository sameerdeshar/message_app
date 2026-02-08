import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Send, User, Edit2, Check, X, MessageSquare, MoreVertical, Trash2, History, Image as ImageIcon, X as XIcon, Library, StickyNote } from 'lucide-react';
import { useUpdateConversationMutation, useGetConversationQuery } from '../features/conversations/conversationsApi';
import NotePanel from './NotePanel';
import {
    useGetMessagesQuery,
    useSendMessageMutation,
    useDeleteMessageMutation,
    useDeleteOlderMessagesMutation,
    useDeleteLatestMessageMutation,
    useMarkAsReadMutation,
    useUploadImageMutation
} from '../features/messages/messagesApi';
import { useGetMediaQuery } from '../features/database/databaseApi';
import { useGetNoteQuery } from '../features/notes/notesApi';
import ConfirmModal from './ConfirmModal';
import Toast from './Toast';

const ChatWindow = ({ conversationId, conversationName: propName, pageName: propPageName }) => {
    const [message, setMessage] = useState('');
    const [isEditingName, setIsEditingName] = useState(false);
    const [newName, setNewName] = useState('');
    const [imagePreview, setImagePreview] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [showMediaPicker, setShowMediaPicker] = useState(false);
    const [selectedMediaUrl, setSelectedMediaUrl] = useState(null);
    const [isNoteOpen, setIsNoteOpen] = useState(false);

    // Modal & Toast State
    const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', onConfirm: () => { } });
    const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

    const { user } = useSelector((state) => state.auth);

    const { data, isLoading } = useGetMessagesQuery({ conversationId }, {
        skip: !conversationId
    });

    // Extract PSID (user_id in DB) from the conversation metadata
    const customerId = data?.conversation?.user_id;

    // Fetch note for the pinned preview and status badge
    const { data: note } = useGetNoteQuery(customerId, { skip: !customerId });

    const [sendMessage, { isLoading: sending }] = useSendMessageMutation();
    const [updateConversation] = useUpdateConversationMutation();
    const [deleteMessage] = useDeleteMessageMutation();
    const [deleteOlder] = useDeleteOlderMessagesMutation();
    const [deleteLatest] = useDeleteLatestMessageMutation();
    const [markAsRead] = useMarkAsReadMutation();
    const [uploadImage, { isLoading: uploading }] = useUploadImageMutation();
    const { data: mediaData, isLoading: loadingMedia } = useGetMediaQuery(undefined, {
        skip: !showMediaPicker
    });

    const [showMenu, setShowMenu] = useState(false);
    const [accumulatedMessages, setAccumulatedMessages] = useState([]);
    const [pagination, setPagination] = useState({ hasMore: false, oldestId: null });
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const scrollRef = useRef(null);
    const menuRef = useRef(null);
    const fileInputRef = useRef(null);
    const isInitialLoad = useRef(true);
    const previousScrollHeightRef = useRef(0);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const rawMessages = Array.isArray(data) ? data : (data?.messages || []);

    // Sync accumulated messages with RTK Query data
    useEffect(() => {
        if (!isLoading && data) {
            if (isInitialLoad.current) {
                setAccumulatedMessages(rawMessages);
                setPagination(data.pagination || { hasMore: false, oldestId: null });
                isInitialLoad.current = false;
                // Auto-scroll to bottom on first load
                setTimeout(() => scrollToBottom(true), 0);
            }
        }
    }, [data, isLoading, rawMessages]);

    // Reset when conversation changes
    useEffect(() => {
        setAccumulatedMessages([]);
        setPagination({ hasMore: false, oldestId: null });
        isInitialLoad.current = true;
        setIsFetchingMore(false);
    }, [conversationId]);

    // Update messages when a NEW message arrives (e.g. via tags invalidation or manual update)
    // Actually, RTK query will update 'data', which triggers the first useEffect. 
    // But we only want to sync the *latest* if it's a real-time update.
    useEffect(() => {
        if (data?.messages && !isInitialLoad.current && !isFetchingMore) {
            // If data shifted (e.g. new message added), we should merge carefully.
            // Simplest: if newest msg in data is newer than our newest, append it.
            const newestInRef = accumulatedMessages[accumulatedMessages.length - 1];
            const newestInData = data.messages[data.messages.length - 1];
            if (newestInData && (!newestInRef || newestInData.id > newestInRef.id)) {
                setAccumulatedMessages(prev => {
                    const existingIds = new Set(prev.map(m => m.id));
                    const toAdd = data.messages.filter(m => !existingIds.has(m.id));
                    return [...prev, ...toAdd];
                });
            }
        }
    }, [data, isFetchingMore]);

    // Helper to fetch more messages
    const fetchMoreMessages = async () => {
        if (isFetchingMore || !pagination.hasMore || !pagination.oldestId) return;

        setIsFetchingMore(true);
        previousScrollHeightRef.current = scrollRef.current.scrollHeight;

        try {
            const response = await fetch(`${import.meta.env.MODE === 'production' ? '/api' : 'http://localhost:3000/api'}/messages/${conversationId}?before=${pagination.oldestId}&limit=30`, {
                credentials: 'include'
            });
            const result = await response.json();

            if (result.messages) {
                setAccumulatedMessages(prev => [...result.messages, ...prev]);
                setPagination(result.pagination);
            }
        } catch (error) {
            console.error("Failed to fetch more messages:", error);
        } finally {
            setIsFetchingMore(false);
        }
    };

    // Scroll listener for infinite scroll (detect top)
    const handleScroll = () => {
        if (!scrollRef.current) return;

        const { scrollTop } = scrollRef.current;
        if (scrollTop === 0 && pagination.hasMore && !isFetchingMore) {
            fetchMoreMessages();
        }
    };

    // Restore scroll position after prepending messages
    useEffect(() => {
        if (!isFetchingMore && previousScrollHeightRef.current > 0 && scrollRef.current) {
            const newScrollHeight = scrollRef.current.scrollHeight;
            const heightDiff = newScrollHeight - previousScrollHeightRef.current;
            scrollRef.current.scrollTop = heightDiff;
            previousScrollHeightRef.current = 0;
        }
    }, [accumulatedMessages, isFetchingMore]);

    // Auto-scroll to bottom
    const scrollToBottom = (instant = false) => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: instant ? 'auto' : 'smooth'
            });
        }
    };

    // Scroll when conversation changes
    useEffect(() => {
        if (conversationId) {
            scrollToBottom(true);
        }
    }, [conversationId]);

    // Mark messages as read when conversation is opened
    useEffect(() => {
        if (conversationId && accumulatedMessages?.length > 0) {
            // Mark as read after a short delay to ensure user actually opened it
            const timer = setTimeout(() => {
                markAsRead(conversationId).catch(err =>
                    console.error('Failed to mark as read:', err)
                );
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [conversationId, accumulatedMessages?.length, markAsRead]);

    // Derive name: Prop name first, then first message name, then fallback
    const derivedName = propName || accumulatedMessages.find(m => m && !m.is_from_page)?.user_name || 'Customer';

    const handleImageSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Check if it's an image
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('Image size must be less than 5MB');
            return;
        }

        setImageFile(file);

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveImage = () => {
        setImageFile(null);
        setImagePreview(null);
        setSelectedMediaUrl(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSelectMedia = (url) => {
        setSelectedMediaUrl(url);
        setImagePreview(url);
        setImageFile(null); // Clear manual upload if pick from library
        setShowMediaPicker(false);
    };

    const handleSend = async (e) => {
        e.preventDefault();

        // Send image if selected (either file or existing URL)
        if (imageFile || selectedMediaUrl) {
            try {
                if (imageFile) {
                    const formData = new FormData();
                    formData.append('image', imageFile);
                    if (message.trim()) {
                        formData.append('message', message.trim());
                    }
                    await uploadImage({ conversationId, formData }).unwrap();
                } else if (selectedMediaUrl) {
                    await sendMessage({
                        conversationId,
                        message: message.trim(),
                        imageUrl: selectedMediaUrl,
                        sender_id: 'page'
                    }).unwrap();
                }

                setMessage('');
                handleRemoveImage();
                setTimeout(() => scrollToBottom(), 100);
            } catch (error) {
                console.error('Failed to send image:', error);
                const errorMsg = error.data?.error || 'Failed to send image. Please try again.';
                setToast({ show: true, message: errorMsg, type: 'error' });
            }
            return;
        }

        // Send text message
        if (!message.trim() || !conversationId) return;

        try {
            await sendMessage({
                conversationId,
                message: message.trim(),
                sender_id: 'page'
            }).unwrap();
            setMessage('');
            setTimeout(() => scrollToBottom(), 100);
        } catch (error) {
            console.error('Failed to send message:', error);
            const errorMsg = error.data?.error || 'Failed to send message. Please try again.';
            setToast({ show: true, message: errorMsg, type: 'error' });
        }
    };

    const handleUpdateName = async () => {
        if (!newName.trim()) return;
        try {
            await updateConversation({ conversationId, name: newName.trim() }).unwrap();
            setIsEditingName(false);
        } catch (err) {
            console.error('Failed to update name:', err);
        }
    };

    const handleDeleteMessage = (id) => {
        setModalConfig({
            isOpen: true,
            title: 'Delete Message',
            message: 'Are you sure you want to delete this message? Only you will see it as deleted.',
            confirmText: 'Delete',
            onConfirm: async () => {
                try {
                    await deleteMessage(id).unwrap();
                    setAccumulatedMessages(prev => prev.filter(m => m.id !== id));
                    setModalConfig(prev => ({ ...prev, isOpen: false }));
                } catch (err) {
                    console.error('Failed to delete message:', err);
                }
            }
        });
    };

    const handleCleanup = (period) => {
        const labels = { '1d': '24 hours', '2d': '2 days', '7d': '7 days', '15d': '15 days' };
        setModalConfig({
            isOpen: true,
            title: 'Clear History',
            message: `Are you sure you want to delete all messages older than ${labels[period]}? This cannot be undone.`,
            confirmText: 'Delete Messages',
            onConfirm: async () => {
                try {
                    await deleteOlder({ conversationId, period }).unwrap();
                    // Simplest cleanup: refresh from first page or filter local
                    // For now, let's just trigger a re-load of the first page to be safe
                    isInitialLoad.current = true;
                    // Alternatively, filter by timestamp locally
                    setShowMenu(false);
                    setModalConfig(prev => ({ ...prev, isOpen: false }));
                } catch (err) {
                    console.error('Failed to cleanup:', err);
                }
            }
        });
    };

    const handleDeleteLatest = () => {
        setModalConfig({
            isOpen: true,
            title: 'Delete Latest',
            message: 'Permanently remove the most recent message in this conversation?',
            confirmText: 'Remove',
            onConfirm: async () => {
                try {
                    await deleteLatest(conversationId).unwrap();
                    setAccumulatedMessages(prev => prev.slice(0, -1));
                    setShowMenu(false);
                    setModalConfig(prev => ({ ...prev, isOpen: false }));
                } catch (err) {
                    console.error('Failed to delete latest:', err);
                }
            }
        });
    };

    if (!conversationId) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
                <p className="text-gray-500">Select a conversation to start messaging</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-white">
            <div className="px-6 py-4 border-b flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-30 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-11 h-11 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full flex items-center justify-center text-blue-600 shadow-inner">
                        <User className="w-6 h-6" />
                    </div>

                    <div>
                        {isEditingName ? (
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleUpdateName();
                                        if (e.key === 'Escape') setIsEditingName(false);
                                    }}
                                />
                                <button onClick={handleUpdateName} className="p-1 text-green-600 hover:bg-green-50 rounded">
                                    <Check className="w-4 h-4" />
                                </button>
                                <button onClick={() => setIsEditingName(false)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <h2 className="font-bold text-gray-900 text-lg tracking-tight">{derivedName}</h2>
                                <button
                                    onClick={() => {
                                        setNewName(derivedName);
                                        setIsEditingName(true);
                                    }}
                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <Edit2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}
                        <p className="text-xs text-blue-500 font-bold ml-1 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                            {propPageName || data?.conversation?.page_name || 'Facebook Customer'}
                        </p>
                    </div>

                    {/* NEW LOCATION: Notes Button */}
                    <button
                        onClick={() => setIsNoteOpen(!isNoteOpen)}
                        className={`ml-4 flex items-center gap-2 px-3 py-1.5 rounded-full transition-all border ${isNoteOpen
                            ? 'bg-amber-100 text-amber-700 border-amber-200 shadow-inner'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-amber-300 hover:bg-amber-50/50 hover:shadow-sm'
                            }`}
                        title="Customer Notes"
                    >
                        <StickyNote className={`w-4 h-4 ${isNoteOpen ? 'fill-amber-700' : ''}`} />
                        <span className="text-xs font-bold">Notes</span>
                        {note?.content && (
                            <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                            </span>
                        )}
                    </button>
                </div>

                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="p-2 text-gray-400 hover:bg-gray-100/80 hover:text-gray-600 rounded-full transition-all"
                        title="Chat Options"
                    >
                        <MoreVertical className="w-5 h-5" />
                    </button>

                    {showMenu && (
                        <div className="absolute right-0 mt-2 w-60 bg-white border border-gray-100 rounded-xl shadow-2xl z-50 py-2 overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-right">
                            <div className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50/50">
                                Message Management
                            </div>
                            <button
                                onClick={handleDeleteLatest}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete Latest Message
                            </button>
                            <div className="border-t"></div>
                            <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b bg-gray-50">
                                Cleanup (History)
                            </div>
                            <button
                                onClick={() => handleCleanup('1d')}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                                <History className="w-4 h-4" />
                                Older than 24 Hours
                            </button>
                            <button
                                onClick={() => handleCleanup('2d')}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                                <History className="w-4 h-4" />
                                Older than 2 Days
                            </button>
                            <button
                                onClick={() => handleCleanup('7d')}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                                <History className="w-4 h-4" />
                                Older than 7 Days
                            </button>
                            <button
                                onClick={() => handleCleanup('15d')}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                                <History className="w-4 h-4" />
                                Older than 15 Days
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Messages */}
            <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/30 relative"
            >
                {/* Infinite Scroll Loader at Top */}
                {isFetchingMore && (
                    <div className="flex justify-center py-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    </div>
                )}

                {/* Pinned Note Preview - Centered and Visible */}
                {note?.content && (
                    <div className="sticky top-0 z-20 flex justify-center w-full pointer-events-none">
                        <div className="bg-[#fffbeb] border-2 border-amber-300 p-3 rounded-2xl shadow-[0_8px_30px_rgba(251,191,36,0.15)] flex items-start gap-3 backdrop-blur-md cursor-pointer hover:border-amber-400 group transition-all w-fit max-w-[400px] pointer-events-auto mt-2"
                            onClick={() => setIsNoteOpen(true)}
                        >
                            <div className="mt-0.5 p-1.5 bg-amber-400 rounded-lg">
                                <StickyNote className="w-3.5 h-3.5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[13px] text-amber-950 font-bold line-clamp-2 leading-relaxed">
                                    {note.content}
                                </p>
                                {note.last_editor_name && (
                                    <p className="text-[10px] text-amber-600 mt-1 font-mono uppercase tracking-widest font-black">
                                        — {note.last_editor_name}
                                    </p>
                                )}
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-amber-400 p-1.5 rounded-lg">
                                <Edit2 className="w-3.5 h-3.5 text-white" />
                            </div>
                        </div>
                    </div>
                )}

                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : accumulatedMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm">
                        <MessageSquare className="w-12 h-12 mb-2 opacity-20" />
                        <p>No messages yet in this conversation</p>
                    </div>
                ) : (
                    accumulatedMessages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.is_from_page ? 'justify-end' : 'justify-start'}`}>
                            <div className={`group relative max-w-[70%] px-4 py-2 rounded-2xl shadow-sm ${msg.is_from_page
                                ? 'bg-blue-600 text-white rounded-br-none'
                                : 'bg-white text-gray-900 border border-gray-100 rounded-bl-none'
                                }`}>
                                {/* Delete Button */}
                                <button
                                    onClick={() => handleDeleteMessage(msg.id)}
                                    className={`absolute top-0 ${msg.is_from_page ? '-left-8' : '-right-8'} p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all`}
                                    title="Delete Message"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>

                                <p className="text-sm whitespace-pre-wrap">{msg.text || msg.message}</p>
                                {msg.image_url && (
                                    <div className="mt-2 rounded-lg overflow-hidden border border-gray-200/50 bg-black/5 flex items-center justify-center">
                                        <img
                                            src={msg.image_url}
                                            alt="Attachment"
                                            className="w-full max-h-72 object-cover hover:scale-105 transition-transform duration-300 cursor-zoom-in"
                                            onClick={() => window.open(msg.image_url, '_blank')}
                                        />
                                    </div>
                                )}
                                <div className={`flex items-center justify-end gap-2 mt-1 ${msg.is_from_page ? 'text-blue-100' : 'text-gray-400'}`}>
                                    {!!msg.is_from_page && msg.agent_name && (
                                        <span className="text-[10px] opacity-75 font-medium">
                                            Sent by {msg.agent_name} •
                                        </span>
                                    )}
                                    <p className="text-[10px]">
                                        {new Date(msg.timestamp || msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 border-t bg-white">
                {/* Image Preview */}
                {imagePreview && (
                    <div className="mb-3 relative inline-block">
                        <img
                            src={imagePreview}
                            alt="Preview"
                            className="w-32 h-32 object-cover rounded-lg border shadow-sm"
                        />
                        <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                            <XIcon className="w-4 h-4" />
                        </button>
                    </div>
                )}

                <div className="flex gap-2">
                    {/* Hidden file input */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                    />

                    {/* Image upload button */}
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Upload Image"
                    >
                        <ImageIcon className="w-5 h-5" />
                    </button>

                    {/* Media library button */}
                    <button
                        type="button"
                        onClick={() => setShowMediaPicker(true)}
                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Media Library"
                    >
                        <Library className="w-5 h-5" />
                    </button>

                    <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={(imageFile || selectedMediaUrl) ? "Add a caption (optional)" : "Type a message..."}
                        className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                        type="submit"
                        disabled={(sending || uploading) || (!message.trim() && !imageFile && !selectedMediaUrl)}
                        className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {uploading ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Sending...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4" />
                                Send
                            </>
                        )}
                    </button>
                </div>
            </form>

            {/* Media Picker Modal */}
            {showMediaPicker && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden">
                        <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white">
                            <div>
                                <h3 className="text-lg font-bold">Media Library</h3>
                                <p className="text-xs text-gray-500">Select an existing file to send</p>
                            </div>
                            <button
                                onClick={() => setShowMediaPicker(false)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            {loadingMedia ? (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"></div>
                                    <p className="text-gray-500">Loading your media...</p>
                                </div>
                            ) : !mediaData?.files || mediaData.files.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                    <ImageIcon className="w-16 h-16 mb-4 opacity-10" />
                                    <p>No media files found in your library</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {mediaData.files.map((file) => (
                                        <div
                                            key={file.name}
                                            onClick={() => handleSelectMedia(file.url)}
                                            className="group cursor-pointer relative aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-primary transition-all shadow-sm hover:shadow-md"
                                        >
                                            <img
                                                src={file.url}
                                                alt={file.name}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                <div className="bg-primary text-white p-2 rounded-full scale-0 group-hover:scale-100 transition-transform duration-200 shadow-lg">
                                                    <Check className="w-5 h-5" />
                                                </div>
                                            </div>
                                            <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                                <p className="text-[10px] text-white truncate font-medium">{file.name}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t bg-gray-50 text-right">
                            <button
                                onClick={() => setShowMediaPicker(false)}
                                className="px-6 py-2 rounded-xl text-gray-600 font-semibold hover:bg-gray-200 transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Note Panel (Sliding Drawer) */}
            {customerId && (
                <NotePanel
                    customerId={customerId}
                    isOpen={isNoteOpen}
                    onClose={() => setIsNoteOpen(false)}
                />
            )}

            {/* Confirmation Modal */}
            <ConfirmModal
                isOpen={modalConfig.isOpen}
                title={modalConfig.title}
                message={modalConfig.message}
                confirmText={modalConfig.confirmText}
                confirmColor={modalConfig.confirmColor}
                onConfirm={modalConfig.onConfirm}
                onCancel={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
            />

            {/* Toast Notifications */}
            {toast.show && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast({ ...toast, show: false })}
                />
            )}
        </div>
    );
};

export default ChatWindow;
