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

    useSocket(); // Enable real-time updates
    const { showNotification } = useNotifications();

    // Listen for new messages
    useEffect(() => {
        const handleNewMessage = (e) => {
            const data = e.detail;
            if (!data) return;
            showNotification('New Message', `Message from ${data.user_name || data.sender_name || 'Customer'}`);
        };
        window.addEventListener('new-message', handleNewMessage);
        return () => window.removeEventListener('new-message', handleNewMessage);
    }, [showNotification]);

    const { data, isLoading } = useGetConversationsQuery(pageId);
    const conversations = Array.isArray(data) ? data : (data?.conversations || []);

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
                    conversations={conversations}
                    isLoading={isLoading}
                    selectedId={selectedConversationId}
                    onSelect={setSelectedConversationId}
                />
                <ChatWindow
                    conversationId={selectedConversationId}
                    conversationName={conversations.find(c => c.id === selectedConversationId)?.user_name}
                />
            </div>
        </div>
    );
};

export default AdminInbox;
