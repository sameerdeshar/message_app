import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { socket } from '../lib/socket';
import { conversationsApi } from '../features/conversations/conversationsApi';
import { messagesApi } from '../features/messages/messagesApi';

/**
 * useSocket Hook
 * Manages Socket.IO connection and real-time event handling
 * Integrates with RTK Query cache invalidation
 */
export const useSocket = () => {
    const dispatch = useDispatch();

    useEffect(() => {
        // Connect socket
        socket.connect();

        // Handle new messages
        socket.on('new_message', (data) => {
            console.log('📨 New message received:', data);

            // Invalidate RTK Query caches to refetch data
            dispatch(conversationsApi.util.invalidateTags(['Conversations']));

            if (data.conversation_id || data.conversationId) {
                dispatch(messagesApi.util.invalidateTags([
                    { type: 'Messages', id: data.conversation_id || data.conversationId }
                ]));
            }

            // Trigger notification event for matching direction (from customer)
            if (!data.is_from_page) {
                const event = new CustomEvent('new-message', { detail: data });
                window.dispatchEvent(event);
            }
        });

        // Handle conversation updates
        socket.on('conversation_updated', (data) => {
            console.log('💬 Conversation updated:', data);
            dispatch(conversationsApi.util.invalidateTags(['Conversations']));
        });

        // Connection status
        socket.on('connect', () => {
            console.log('✅ Socket.IO connected:', socket.id);
        });

        socket.on('disconnect', () => {
            console.log('🔌 Socket.IO disconnected');
        });

        socket.on('connect_error', (error) => {
            console.error('❌ Socket.IO connection error:', error);
        });

        // Cleanup on unmount
        return () => {
            socket.off('new_message');
            socket.off('conversation_updated');
            socket.off('connect');
            socket.off('disconnect');
            socket.off('connect_error');
        };
    }, [dispatch]);

    return socket;
};

export default useSocket;
