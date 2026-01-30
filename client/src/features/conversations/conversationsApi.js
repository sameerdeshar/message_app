import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const API_URL = import.meta.env.MODE === 'production'
    ? '/api'
    : 'http://localhost:3000/api';

/**
 * Conversations API - RTK Query
 * Handles conversation endpoints with automatic caching
 */
export const conversationsApi = createApi({
    reducerPath: 'conversationsApi',
    baseQuery: fetchBaseQuery({
        baseUrl: API_URL,
        credentials: 'include'
    }),
    tagTypes: ['Conversations'],
    endpoints: (builder) => ({
        // Get conversations for a specific page
        getConversations: builder.query({
            query: (pageId) => {
                if (pageId) {
                    return `/messages/conversations?pageId=${pageId}`;
                }
                return '/messages/all_conversations';
            },
            providesTags: (result, error, pageId) => [
                { type: 'Conversations', id: pageId ? `PAGE-${pageId}` : 'ALL' }
            ],
        }),

        // Get single conversation
        getConversation: builder.query({
            query: (conversationId) => `/messages/${conversationId}`,
            providesTags: (result, error, id) => [
                { type: 'Conversations', id }
            ],
        }),

        // Update conversation (e.g., update sender name)
        updateConversation: builder.mutation({
            query: ({ conversationId, ...updates }) => ({
                url: `/messages/${conversationId}/name`,
                method: 'PUT',
                body: updates,
            }),
            invalidatesTags: (result, error, { conversationId }) => [
                { type: 'Conversations', id: conversationId },
                { type: 'Messages', id: conversationId },
                'Conversations'
            ],
        }),
    }),
});

export const {
    useGetConversationsQuery,
    useGetConversationQuery,
    useUpdateConversationMutation,
} = conversationsApi;
