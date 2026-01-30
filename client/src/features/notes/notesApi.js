import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const notesApi = createApi({
    reducerPath: 'notesApi',
    baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
    tagTypes: ['Note'],
    endpoints: (builder) => ({
        getNote: builder.query({
            query: (customerId) => `/notes/${customerId}`,
            providesTags: (result, error, customerId) => [{ type: 'Note', id: customerId }],
        }),
        saveNote: builder.mutation({
            query: ({ customerId, content }) => ({
                url: `/notes/${customerId}`,
                method: 'POST',
                body: { content },
            }),
            invalidatesTags: (result, error, { customerId }) => [{ type: 'Note', id: customerId }],
        }),
        deleteNote: builder.mutation({
            query: (customerId) => ({
                url: `/notes/${customerId}`,
                method: 'DELETE',
            }),
            invalidatesTags: (result, error, customerId) => [{ type: 'Note', id: customerId }],
        }),
    }),
});

export const {
    useGetNoteQuery,
    useSaveNoteMutation,
    useDeleteNoteMutation,
} = notesApi;
