import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetConversationsQuery } from '../features/conversations/conversationsApi';
import { useSocket } from '../hooks/useSocket';
import ChatWindow from '../components/ChatWindow';
import Sidebar from '../components/Sidebar';
import { ArrowLeft } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { useEffect } from 'react';

const AdminInbox = () => {
    const { pageId } = useParams();
    const navigate = useNavigate();
    const [selectedConversationId, setSelectedConversationId] = useState(null);
    const [page, setPage] = useState(1);
    const [allConversations, setAllConversations] = useState([]);
    const [hasMore, setHasMore] = useState(true);

    useSocket(); // Enable real-time updates
    const { showNotification } = useNotifications();

    // Listen for new messages
    useEffect(() => {
        const handleNewMessage = (e) => {
            const data = e.detail;
            if (!data) return;

            // Show notification
            showNotification('New Message', `Message from ${data.user_name || data.sender_name || 'Customer'}`);

            // Optional: Update list locally if needed (Socket usually handles real-time via invalidation or separate event)
            // But since we are managing local state for pagination, we might need to prepend manually if not using tags invalidation
            // For now, let's rely on refresh or simple effect if the query auto-updates
        };
        window.addEventListener('new-message', handleNewMessage);
        return () => window.removeEventListener('new-message', handleNewMessage);
    }, [showNotification]);

    // Reset pagination when pageId changes
    useEffect(() => {
        setPage(1);
        setAllConversations([]);
        setHasMore(true);
    }, [pageId]);

    const { data, isLoading, isFetching } = useGetConversationsQuery({ pageId, page, limit: 30 });

    useEffect(() => {
        if (data) {
            const newConversations = data.data || []; // Handle new format
            const pagination = data.pagination;

            if (page === 1) {
                setAllConversations(newConversations);
            } else {
                // Append only if we haven't already (simple check to avoid dupes from strict mode re-renders)
                setAllConversations(prev => {
                    const existingIds = new Set(prev.map(c => c.id));
                    const uniqueNew = newConversations.filter(c => !existingIds.has(c.id));
                    return [...prev, ...uniqueNew];
                });
            }

            if (pagination) {
                setHasMore(pagination.hasMore);
            } else {
                setHasMore(newConversations.length === 30); // Fallback
            }
        }
    }, [data, page]);

    const handleLoadMore = () => {
        if (!isFetching && hasMore) {
            setPage(prev => prev + 1);
        }
    };

    return (
        <div className="flex h-screen flex-col">
            {/* Header for navigation */}
            <div className="bg-white border-b px-4 py-3 flex items-center gap-4 shadow-sm">
                <button
                    onClick={() => navigate('/admin')}
                    className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Back to Dashboard
                </button>
                <h1 className="text-xl font-bold border-l pl-4 border-gray-300">
                    {pageId ? 'Page Inbox' : 'Master Inbox'}
                </h1>
                {!pageId && (
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                        All Pages
                    </span>
                )}
            </div>

            <div className="flex flex-1 overflow-hidden">
                <Sidebar
                    conversations={allConversations}
                    isLoading={isLoading && page === 1}
                    selectedId={selectedConversationId}
                    onSelect={setSelectedConversationId}
                    onLoadMore={handleLoadMore}
                    hasMore={hasMore}
                    isFetchingMore={isFetching && page > 1}
                />
                <ChatWindow
                    conversationId={selectedConversationId}
                    conversationName={allConversations.find(c => c.id === selectedConversationId)?.user_name}
                    pageName={allConversations.find(c => c.id === selectedConversationId)?.page_name}
                />
            </div>
        </div>
    );
};

export default AdminInbox;
