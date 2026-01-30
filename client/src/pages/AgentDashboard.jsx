import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useGetUserPagesQuery } from '../features/admin/adminApi';
import { useGetConversationsQuery } from '../features/conversations/conversationsApi';
import { useSocket } from '../hooks/useSocket';
import { useNotifications } from '../hooks/useNotifications';
import ChatWindow from '../components/ChatWindow';
import Sidebar from '../components/Sidebar';
import { Layout, MessageSquare, LogOut, Filter, Bell, BellOff } from 'lucide-react';
import { useLogoutMutation } from '../features/auth/authApi';
import { useNavigate } from 'react-router-dom';

const AgentDashboard = () => {
    const { user } = useSelector((state) => state.auth);
    const [selectedPageId, setSelectedPageId] = useState('all'); // 'all' for unified inbox
    const [selectedConversationId, setSelectedConversationId] = useState(null);
    const [logout] = useLogoutMutation();
    const navigate = useNavigate();

    useSocket(); // Enable real-time updates

    // Fetch assigned pages
    const { data: pagesData, isLoading: pagesLoading } = useGetUserPagesQuery(user?.id, {
        skip: !user?.id
    });

    const pages = pagesData?.pages || [];

    // Fetch conversations based on selected page
    const { data: conversationsData, isLoading: convLoading } = useGetConversationsQuery(
        selectedPageId === 'all' ? 'all' : selectedPageId,
        {
            skip: !selectedPageId
        }
    );

    const conversations = Array.isArray(conversationsData)
        ? conversationsData
        : (conversationsData?.conversations || []);

    const { notificationsEnabled, requestPermission, showNotification, toggleNotifications } = useNotifications();

    // Listen for new messages
    useEffect(() => {
        const handleNewMessage = (e) => {
            const data = e.detail;
            if (!data) return;

            showNotification(
                'New Message',
                `Message from ${data.user_name || data.sender_name || 'Customer'}`
            );
        };

        window.addEventListener('new-message', handleNewMessage);
        return () => window.removeEventListener('new-message', handleNewMessage);
    }, [showNotification]);

    const handleLogout = async () => {
        await logout().unwrap();
        navigate('/login');
    };

    // Get conversation count by page
    const getPageConversationCount = (pageId) => {
        if (!conversations) return 0;
        return conversations.filter(c => c.page_id === pageId).length;
    };

    return (
        <div className="flex h-screen flex-col bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/20">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 px-6 py-3 flex justify-between items-center shadow-sm z-10">
                <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-xl shadow-md">
                        <MessageSquare className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            Agent Workspace
                        </h1>
                        <p className="text-xs text-gray-500">
                            {selectedPageId === 'all' ? 'All Pages' : pages.find(p => p.id === selectedPageId)?.name}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={toggleNotifications}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${notificationsEnabled
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        title={notificationsEnabled ? 'Notifications On' : 'Enable Notifications'}
                    >
                        {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                        {notificationsEnabled ? 'On' : 'Off'}
                    </button>
                    <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                        <div className="text-right">
                            <p className="text-xs text-gray-500">Logged in as</p>
                            <p className="text-sm font-semibold text-gray-900">{user?.username}</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg font-medium transition-all flex items-center gap-1"
                        >
                            <LogOut className="w-4 h-4" />
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Pages Filter Sidebar */}
                <div className="w-64 bg-white border-r flex flex-col shadow-sm z-10">
                    <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
                        <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                            <Filter className="w-4 h-4" />
                            Filter by Page
                        </h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {/* All Pages Option */}
                        <button
                            onClick={() => {
                                setSelectedPageId('all');
                                setSelectedConversationId(null);
                            }}
                            className={`w-full text-left p-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-between ${selectedPageId === 'all'
                                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md'
                                : 'text-gray-700 hover:bg-gray-100 border border-transparent'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <Layout className="w-4 h-4" />
                                <span>All Pages</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${selectedPageId === 'all'
                                ? 'bg-white/20 text-white'
                                : 'bg-blue-100 text-blue-600'
                                }`}>
                                {conversations.length}
                            </span>
                        </button>

                        {/* Individual Pages */}
                        <div className="pt-2 border-t border-gray-100 mt-2">
                            <p className="text-xs text-gray-500 font-semibold px-3 py-1">Specific Pages</p>
                            {pagesLoading ? (
                                <div className="p-4 text-center text-sm text-gray-500">Loading...</div>
                            ) : pages.length === 0 ? (
                                <div className="p-4 text-center text-sm text-gray-500">No pages assigned</div>
                            ) : (
                                pages.map(page => (
                                    <button
                                        key={page.id}
                                        onClick={() => {
                                            setSelectedPageId(page.id);
                                            setSelectedConversationId(null);
                                        }}
                                        className={`w-full text-left p-3 rounded-xl text-sm font-medium transition-all flex items-center justify-between ${selectedPageId === page.id
                                            ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                            : 'text-gray-700 hover:bg-gray-50 border border-transparent'
                                            }`}
                                    >
                                        <span className="truncate">{page.name}</span>
                                        {selectedPageId === page.id && (
                                            <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Conversations Sidebar */}
                <Sidebar
                    conversations={conversations}
                    isLoading={convLoading}
                    selectedId={selectedConversationId}
                    onSelect={setSelectedConversationId}
                />

                {/* Chat Window */}
                <ChatWindow
                    conversationId={selectedConversationId}
                    conversationName={conversations.find(c => c.id === selectedConversationId)?.user_name}
                />
            </div>
        </div>
    );
};

export default AgentDashboard;
