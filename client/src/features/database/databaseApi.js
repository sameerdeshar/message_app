import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const API_URL = import.meta.env.MODE === 'production'
    ? '/api'
    : 'http://localhost:3000/api';

/**
 * Database API - RTK Query
 * Handles database management endpoints
 */
export const databaseApi = createApi({
    reducerPath: 'databaseApi',
    baseQuery: fetchBaseQuery({
        baseUrl: API_URL,
        credentials: 'include'
    }),
    tagTypes: ['Tables', 'TableData'],
    endpoints: (builder) => ({
        // Get list of all tables
        getTables: builder.query({
            query: () => '/database/tables',
            providesTags: ['Tables'],
        }),

        // Get table schema (column definitions)
        getTableSchema: builder.query({
            query: (tableName) => `/database/tables/${tableName}/schema`,
        }),

        // Get table data with pagination
        getTableData: builder.query({
            query: ({ tableName, page = 1, limit = 50, sortColumn, sortOrder = 'DESC' }) =>
                `/database/tables/${tableName}/data?page=${page}&limit=${limit}&sortColumn=${sortColumn ?? ''}&sortOrder=${sortOrder}`,
            providesTags: (result, error, { tableName }) => [
                { type: 'TableData', id: tableName }
            ],
        }),

        // Insert new row
        insertRow: builder.mutation({
            query: ({ tableName, data }) => ({
                url: `/database/tables/${tableName}/insert`,
                method: 'POST',
                body: data,
            }),
            invalidatesTags: (result, error, { tableName }) => [
                { type: 'TableData', id: tableName },
                'Tables'
            ],
        }),

        // Update existing row
        updateRow: builder.mutation({
            query: ({ tableName, id, data }) => ({
                url: `/database/tables/${tableName}/update`,
                method: 'PUT',
                body: { id, ...data },
            }),
            invalidatesTags: (result, error, { tableName }) => [
                { type: 'TableData', id: tableName }
            ],
        }),

        // Delete row
        deleteRow: builder.mutation({
            query: ({ tableName, id }) => ({
                url: `/database/tables/${tableName}/delete`,
                method: 'DELETE',
                body: { id },
            }),
            invalidatesTags: (result, error, { tableName }) => [
                { type: 'TableData', id: tableName },
                'Tables'
            ],
        }),

        // Execute custom SQL query
        executeQuery: builder.mutation({
            query: ({ query, confirmed = false }) => ({
                url: '/database/query',
                method: 'POST',
                body: { query, confirmed },
            }),
            invalidatesTags: ['Tables', 'TableData'],
        }),

        // Media management
        getMedia: builder.query({
            query: () => '/database/media',
            providesTags: ['Media'],
        }),

        deleteMedia: builder.mutation({
            query: (filename) => ({
                url: `/database/media/${filename}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Media'],
        }),
    }),
});

export const {
    useGetTablesQuery,
    useGetTableSchemaQuery,
    useGetTableDataQuery,
    useInsertRowMutation,
    useUpdateRowMutation,
    useDeleteRowMutation,
    useExecuteQueryMutation,
    useGetMediaQuery,
    useDeleteMediaMutation,
} = databaseApi;
