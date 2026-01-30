import { MessageSquare } from 'lucide-react';

const Sidebar = ({ conversations = [], isLoading, selectedId, onSelect }) => {

    if (isLoading) {
        return (
            <div className="w-80 border-r bg-white p-4">
                <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-10 bg-gray-100 rounded"></div>
                    <div className="h-10 bg-gray-100 rounded"></div>
                </div>
            </div>
        );
    }

    // Ensure conversations is always an array
    const conversationList = Array.isArray(conversations) ? conversations : [];

    if (isLoading) {
        return (
            <div className="w-80 border-r bg-white p-4">
                <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-10 bg-gray-100 rounded"></div>
                    <div className="h-10 bg-gray-100 rounded"></div>
                </div>
            </div>
        );
    }

    // Sort: newest messages first
    const sortedConversations = [...conversationList].sort((a, b) => {
        if (!a || !b) return 0;
        const timeA = new Date(a.latest_msg_time || a.updated_at || a.last_message_time || 0).getTime();
        const timeB = new Date(b.latest_msg_time || b.updated_at || b.last_message_time || 0).getTime();
        return timeB - timeA;
    });

    return (
        <div className="w-80 border-r bg-white flex flex-col h-full">
            <div className="p-4 border-b bg-gray-50">
                <h2 className="text-xl font-bold flex items-center gap-2 text-gray-700">
                    <MessageSquare className="w-5 h-5 text-gray-500" />
                    Messages
                    <span className="text-xs font-normal bg-gray-200 px-2 py-0.5 rounded-full ml-auto">
                        {sortedConversations.length}
                    </span>
                </h2>
            </div>

            <div className="flex-1 overflow-y-auto">
                {sortedConversations.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 flex flex-col items-center">
                        <MessageSquare className="w-12 h-12 text-gray-300 mb-2" />
                        <p>No messages yet</p>
                    </div>
                ) : (
                    sortedConversations.map((conv) => {
                        if (!conv) return null;
                        return (
                            <div
                                key={conv.id}
                                onClick={() => onSelect && onSelect(conv.id)}
                                className={`p-4 border-b cursor-pointer transition-colors ${selectedId === conv.id
                                    ? 'bg-blue-50 border-l-4 border-l-primary'
                                    : 'hover:bg-gray-50 border-l-4 border-l-transparent'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-semibold text-gray-800">{conv.user_name || conv.sender_name || 'Unknown User'}</span>
                                    {(conv.latest_msg_time || conv.last_message_time || conv.updated_at) && (
                                        <span className="text-xs text-gray-400">
                                            {new Date(conv.latest_msg_time || conv.last_message_time || conv.updated_at).toLocaleDateString(undefined, {
                                                month: 'short', day: 'numeric'
                                            })}
                                        </span>
                                    )}
                                </div>

                                {conv.page_name && (
                                    <div className="text-xs font-medium text-blue-600 mb-1 bg-blue-50 inline-block px-1.5 py-0.5 rounded">
                                        {conv.page_name}
                                    </div>
                                )}

                                <div className="flex justify-between items-center mt-1">
                                    <div className="text-sm text-gray-500 truncate pr-2 flex-1">
                                        {conv.latest_msg_text || conv.text || conv.last_message || 'Sent an attachment'}
                                    </div>
                                    {conv.unread_count > 0 && selectedId !== conv.id && (
                                        <span className="bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
                                            {conv.unread_count}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default Sidebar;
