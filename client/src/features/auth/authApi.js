import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const API_URL = import.meta.env.MODE === 'production'
    ? '/api'
    : 'http://localhost:3000/api';

/**
 * Auth API - RTK Query
 * Handles authentication endpoints with automatic caching
 */
export const authApi = createApi({
    reducerPath: 'authApi',
    baseQuery: fetchBaseQuery({
        baseUrl: API_URL,
        credentials: 'include' // Important for cookies/sessions
    }),
    tagTypes: ['Auth'],
    endpoints: (builder) => ({
        // Login
        login: builder.mutation({
            query: (credentials) => ({
                url: '/auth/login',
                method: 'POST',
                body: credentials,
            }),
            invalidatesTags: ['Auth'],
        }),

        // Register
        register: builder.mutation({
            query: (userData) => ({
                url: '/auth/register',
                method: 'POST',
                body: userData,
            }),
        }),

        // Get current user
        getMe: builder.query({
            query: () => '/auth/me',
            providesTags: ['Auth'],
            // Prevent automatic refetch on mount that could cause flicker
            keepUnusedDataFor: 60,
        }),

        // Logout
        logout: builder.mutation({
            query: () => ({
                url: '/auth/logout',
                method: 'POST',
            }),
            invalidatesTags: ['Auth'],
        }),
    }),
});

export const {
    useLoginMutation,
    useRegisterMutation,
    useGetMeQuery,
    useLogoutMutation,
} = authApi;
