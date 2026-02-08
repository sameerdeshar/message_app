import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const API_URL = import.meta.env.MODE === 'production'
    ? '/api'
    : 'http://localhost:3000/api';

/**
 * Messages API - RTK Query
 * Handles message endpoints with automatic caching
 */
export const messagesApi = createApi({
    reducerPath: 'messagesApi',
    baseQuery: fetchBaseQuery({
        baseUrl: API_URL,
        credentials: 'include'
    }),
    tagTypes: ['Messages'],
    endpoints: (builder) => ({
        // Get messages for a conversation with pagination
        getMessages: builder.query({
            query: (arg) => {
                const id = typeof arg === 'object' ? arg.conversationId : arg;
                const limit = (typeof arg === 'object' && arg.limit) || 50;
                const before = typeof arg === 'object' ? arg.before : undefined;
                return {
                    url: `/messages/${id}`,
                    params: { limit, before }
                };
            },
            providesTags: (result, error, arg) => {
                const id = typeof arg === 'object' ? arg.conversationId : arg;
                return [{ type: 'Messages', id }];
            },
        }),

        // Send a message
        sendMessage: builder.mutation({
            query: ({ conversationId, message, sender_id }) => ({
                url: `/messages/send`,
                method: 'POST',
                body: { conversationId, message, sender_id },
            }),
            invalidatesTags: (result, error, arg) => {
                const id = typeof arg === 'object' ? arg.conversationId : arg;
                return [
                    { type: 'Messages', id },
                    'Conversations'
                ];
            },
        }),

        // Delete a message
        deleteMessage: builder.mutation({
            query: (messageId) => ({
                url: `/messages/${messageId}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Messages'],
        }),

        // Delete older messages
        deleteOlderMessages: builder.mutation({
            query: ({ conversationId, period }) => ({
                url: `/messages/${conversationId}/cleanup?period=${period}`,
                method: 'DELETE',
            }),
            invalidatesTags: (result, error, arg) => {
                const id = typeof arg === 'object' ? arg.conversationId : arg;
                return [{ type: 'Messages', id }];
            },
        }),

        // Delete latest message
        deleteLatestMessage: builder.mutation({
            query: (conversationId) => ({
                url: `/messages/${conversationId}/latest`,
                method: 'DELETE',
            }),
            invalidatesTags: (result, error, conversationId) => [
                { type: 'Messages', id: conversationId }
            ],
        }),

        // Mark conversation as read
        markAsRead: builder.mutation({
            query: (conversationId) => ({
                url: `/messages/${conversationId}/read`,
                method: 'PUT',
            }),
            invalidatesTags: (result, error, conversationId) => [
                { type: 'Messages', id: conversationId },
                'Conversations' // Update unread count in conversation list
            ],
        }),

        // Upload image
        uploadImage: builder.mutation({
            query: ({ conversationId, formData }) => ({
                url: `/messages/${conversationId}/upload`,
                method: 'POST',
                body: formData,
            }),
            invalidatesTags: (result, error, { conversationId }) => [
                { type: 'Messages', id: conversationId },
                'Conversations'
            ],
        }),
    }),
});

export const {
    useGetMessagesQuery,
    useSendMessageMutation,
    useDeleteMessageMutation,
    useDeleteOlderMessagesMutation,
    useDeleteLatestMessageMutation,
    useMarkAsReadMutation,
    useUploadImageMutation,
} = messagesApi;
