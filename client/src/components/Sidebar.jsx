import { useState } from 'react';
import { MessageSquare, Search } from 'lucide-react';

const Sidebar = ({
    conversations = [],
    isLoading,
    selectedId,
    onSelect,
    onLoadMore,
    hasMore,
    isFetchingMore
}) => {

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

    // Sort: newest messages first
    const sortedConversations = [...conversationList].sort((a, b) => {
        if (!a || !b) return 0;
        const timeA = new Date(a.latest_msg_time || a.updated_at || a.last_message_time || 0).getTime();
        const timeB = new Date(b.latest_msg_time || b.updated_at || b.last_message_time || 0).getTime();
        return timeB - timeA;
    });

    const [searchTerm, setSearchTerm] = useState('');

    const filteredConversations = sortedConversations.filter(c =>
        (c.user_name || 'Unknown').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.latest_msg_text || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleScroll = (e) => {
        const { scrollTop, clientHeight, scrollHeight } = e.target;
        if (scrollHeight - scrollTop <= clientHeight + 100) {
            if (onLoadMore && hasMore && !isFetchingMore) {
                onLoadMore();
            }
        }
    };

    return (
        <div className="w-80 border-r bg-white flex flex-col h-full shadow-lg z-20">
            <div className="p-5 border-b bg-white">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800 tracking-tight">
                        Messages
                        <span className="text-xs font-bold bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                            {sortedConversations.length}
                        </span>
                    </h2>
                </div>

                {/* Search Bar */}
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search messages..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-gray-50 border-transparent focus:bg-white focus:border-blue-200 hover:bg-white border rounded-xl pl-9 pr-4 py-2 text-sm transition-all focus:ring-4 focus:ring-blue-500/10 outline-none placeholder:text-gray-400"
                    />
                </div>
            </div>

            <div
                className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1"
                onScroll={handleScroll}
            >
                {filteredConversations.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 flex flex-col items-center mt-10">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                            <MessageSquare className="w-8 h-8 opacity-20" />
                        </div>
                        <p className="font-medium">No messages found</p>
                        <p className="text-xs mt-1 opacity-70">Try a different search term</p>
                    </div>
                ) : (
                    <>
                        {filteredConversations.map((conv) => {
                            if (!conv) return null;
                            const isSelected = selectedId === conv.id;

                            // Determine user name
                            // Fallback to customer table logic if needed, but API usually sends user_name
                            const displayName = conv.user_name || conv.sender_name || 'Unknown User';

                            return (
                                <div
                                    key={conv.id}
                                    onClick={() => onSelect && onSelect(conv.id)}
                                    className={`group p-3 rounded-xl cursor-pointer transition-all duration-200 border border-transparent ${isSelected
                                        ? 'bg-blue-50/80 border-blue-100 shadow-sm'
                                        : 'hover:bg-gray-50 hover:border-gray-100'
                                        }`}
                                >
                                    <div className="flex gap-3">
                                        {/* Avatar Placeholder */}
                                        <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold shadow-sm transition-colors ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-white group-hover:text-blue-600 group-hover:shadow-md'
                                            }`}>
                                            {displayName.charAt(0).toUpperCase()}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-0.5">
                                                <span className={`font-bold truncate text-sm ${isSelected ? 'text-blue-900' : 'text-gray-800'}`}>
                                                    {displayName}
                                                </span>
                                                {(conv.latest_msg_time || conv.last_message_time || conv.updated_at) && (
                                                    <span className={`text-[10px] whitespace-nowrap ml-2 ${isSelected ? 'text-blue-400' : 'text-gray-400'}`}>
                                                        {new Date(conv.latest_msg_time || conv.last_message_time || conv.updated_at).toLocaleDateString(undefined, {
                                                            month: 'short', day: 'numeric'
                                                        })}
                                                    </span>
                                                )}
                                            </div>

                                            {conv.page_name && (
                                                <div className="flex items-center mt-1">
                                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider shadow-sm ${conv.page_id.endsWith('1') ? 'bg-purple-100 text-purple-700' :
                                                        conv.page_id.endsWith('2') ? 'bg-amber-100 text-amber-700' :
                                                            'bg-blue-100 text-blue-700'
                                                        }`}>
                                                        {conv.page_name}
                                                    </span>
                                                </div>
                                            )}

                                            <div className="flex justify-between items-center">
                                                <p className={`text-xs truncate pr-2 flex-1 ${conv.unread_count > 0 ? 'font-bold text-gray-800' : 'text-gray-500'
                                                    }`}>
                                                    {conv.latest_msg_text || conv.text || conv.last_message || 'Sent an attachment'}
                                                </p>

                                                {conv.unread_count > 0 && selectedId !== conv.id && (
                                                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 h-4 min-w-[16px] flex items-center justify-center rounded-full shadow-sm animate-pulse">
                                                        {conv.unread_count}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {isFetchingMore && (
                            <div className="py-4 text-center">
                                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-600 border-r-transparent align-[-0.125em]" role="status">
                                    <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
                                </div>
                            </div>
                        )}
                        {hasMore === false && filteredConversations.length > 0 && (
                            <div className="py-4 text-center text-xs text-gray-400">
                                End of list
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default Sidebar;
