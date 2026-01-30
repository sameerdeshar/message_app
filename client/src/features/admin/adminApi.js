import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const API_URL = import.meta.env.MODE === 'production'
    ? '/api'
    : 'http://localhost:3000/api';

/**
 * Admin API - RTK Query
 * Handles admin-only endpoints with automatic caching
 */
export const adminApi = createApi({
    reducerPath: 'adminApi',
    baseQuery: fetchBaseQuery({
        baseUrl: API_URL,
        credentials: 'include'
    }),
    tagTypes: ['Users', 'Pages', 'Assignments'],
    endpoints: (builder) => ({
        // Get all users
        getUsers: builder.query({
            query: () => '/admin/users',
            providesTags: ['Users'],
        }),

        // Create new user
        createUser: builder.mutation({
            query: (userData) => ({
                url: '/admin/users',
                method: 'POST',
                body: userData,
            }),
            invalidatesTags: ['Users', 'Assignments'],
        }),

        // Delete user
        deleteUser: builder.mutation({
            query: (userId) => ({
                url: `/admin/users/${userId}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Users', 'Assignments'],
        }),

        // Get all pages
        getPages: builder.query({
            query: () => '/admin/pages',
            providesTags: ['Pages'],
        }),

        // Add new page
        addPage: builder.mutation({
            query: (pageData) => ({
                url: '/admin/pages',
                method: 'POST',
                body: pageData,
            }),
            invalidatesTags: ['Pages', 'Assignments'],
        }),

        // Delete page
        deletePage: builder.mutation({
            query: (pageId) => ({
                url: `/admin/pages/${pageId}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Pages', 'Assignments'],
        }),

        // Assign single page to user
        assignPage: builder.mutation({
            query: ({ userId, pageId }) => ({
                url: '/admin/assign',
                method: 'POST',
                body: { userId, pageId },
            }),
            invalidatesTags: ['Users', 'Pages', 'Assignments'],
        }),

        // Bulk assign pages to user
        bulkAssignPages: builder.mutation({
            query: ({ userId, pageIds }) => ({
                url: '/admin/assign/bulk',
                method: 'POST',
                body: { userId, pageIds },
            }),
            invalidatesTags: ['Users', 'Pages', 'Assignments'],
        }),

        // Unassign page from user
        unassignPage: builder.mutation({
            query: ({ userId, pageId }) => ({
                url: '/admin/unassign',
                method: 'POST',
                body: { userId, pageId },
            }),
            invalidatesTags: ['Users', 'Pages', 'Assignments'],
        }),

        // Get all assignments
        getAssignments: builder.query({
            query: () => '/admin/assignments',
            providesTags: ['Assignments'],
        }),

        // Get pages for a user
        getUserPages: builder.query({
            query: (userId) => `/admin/assignments/user/${userId}`,
            providesTags: (result, error, userId) => [
                { type: 'Assignments', id: `USER-${userId}` }
            ],
        }),
    }),
});

export const {
    useGetUsersQuery,
    useCreateUserMutation,
    useDeleteUserMutation,
    useGetPagesQuery,
    useAddPageMutation,
    useDeletePageMutation,
    useAssignPageMutation,
    useBulkAssignPagesMutation,
    useUnassignPageMutation,
    useGetAssignmentsQuery,
    useGetUserPagesQuery,
} = adminApi;
