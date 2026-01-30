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

const ChatWindow = ({ conversationId, conversationName: propName }) => {
    const [message, setMessage] = useState('');
    const [isEditingName, setIsEditingName] = useState(false);
    const [newName, setNewName] = useState('');
    const [imagePreview, setImagePreview] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [showMediaPicker, setShowMediaPicker] = useState(false);
    const [selectedMediaUrl, setSelectedMediaUrl] = useState(null);
    const [isNoteOpen, setIsNoteOpen] = useState(false);
    const { user } = useSelector((state) => state.auth);

    const { data: conversationData } = useGetConversationQuery(conversationId, {
        skip: !conversationId
    });

    // Check if we have PSID (user_id in DB)
    const customerId = conversationData?.user_id;

    const { data, isLoading } = useGetMessagesQuery(conversationId, {
        skip: !conversationId
    });

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
    const scrollRef = useRef(null);
    const menuRef = useRef(null);
    const fileInputRef = useRef(null);

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

    const messages = Array.isArray(data) ? data : (data?.messages || []);

    // Auto-scroll to bottom
    const scrollToBottom = (instant = false) => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: instant ? 'auto' : 'smooth'
            });
        }
    };

    useEffect(() => {
        if (messages?.length > 0) {
            scrollToBottom();
        }
    }, [messages]);

    // Scroll when conversation changes
    useEffect(() => {
        if (conversationId) {
            scrollToBottom(true);
        }
    }, [conversationId]);

    // Mark messages as read when conversation is opened
    useEffect(() => {
        if (conversationId && messages?.length > 0) {
            // Mark as read after a short delay to ensure user actually opened it
            const timer = setTimeout(() => {
                markAsRead(conversationId).catch(err =>
                    console.error('Failed to mark as read:', err)
                );
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [conversationId, messages?.length, markAsRead]);

    // Derive name: Prop name first, then first message name, then fallback
    const derivedName = propName || messages.find(m => m && !m.is_from_page)?.user_name || 'Customer';

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
                alert('Failed to send image. Please try again.');
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

    const handleDeleteMessage = async (id) => {
        if (!window.confirm('Are you sure you want to delete this message?')) return;
        try {
            await deleteMessage(id).unwrap();
        } catch (err) {
            console.error('Failed to delete message:', err);
        }
    };

    const handleCleanup = async (period) => {
        const labels = { '7d': '7 days', '1m': '1 month', '3m': '3 months' };
        if (!window.confirm(`Delete all messages older than ${labels[period]}?`)) return;
        try {
            await deleteOlder({ conversationId, period }).unwrap();
            setShowMenu(false);
        } catch (err) {
            console.error('Failed to cleanup:', err);
        }
    };

    const handleDeleteLatest = async () => {
        if (!window.confirm('Delete the latest message?')) return;
        try {
            await deleteLatest(conversationId).unwrap();
            setShowMenu(false);
        } catch (err) {
            console.error('Failed to delete latest:', err);
        }
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
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                        <User className="w-6 h-6" />
                    </div>
                    {isEditingName ? (
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                            <h2 className="font-bold text-gray-900">{derivedName}</h2>
                            <button
                                onClick={() => {
                                    setNewName(derivedName);
                                    setIsEditingName(true);
                                }}
                                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            >
                                <Edit2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                </div>

                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setIsNoteOpen(!isNoteOpen)}
                        className={`p-2 rounded-full transition-colors ${isNoteOpen ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-200'}`}
                        title="Customer Notes"
                    >
                        <StickyNote className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition-colors"
                        title="Chat Options"
                    >
                        <MoreVertical className="w-5 h-5" />
                    </button>

                    {showMenu && (
                        <div className="absolute right-0 mt-2 w-56 bg-white border rounded-lg shadow-xl z-50 py-1 overflow-hidden">
                            <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b bg-gray-50">
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
                                onClick={() => handleCleanup('7d')}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                                <History className="w-4 h-4" />
                                Older than 7 Days
                            </button>
                            <button
                                onClick={() => handleCleanup('1m')}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                                <History className="w-4 h-4" />
                                Older than 1 Month
                            </button>
                            <button
                                onClick={() => handleCleanup('3m')}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                                <History className="w-4 h-4" />
                                Older than 3 Months
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/30">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm">
                        <MessageSquare className="w-12 h-12 mb-2 opacity-20" />
                        <p>No messages yet in this conversation</p>
                    </div>
                ) : (
                    messages.map((msg) => (
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
                                <p className={`text-[10px] mt-1 text-right ${msg.is_from_page ? 'text-blue-100' : 'text-gray-400'}`}>
                                    {new Date(msg.timestamp || msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
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
        </div>
    );
};

export default ChatWindow;
