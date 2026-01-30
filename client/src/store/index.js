import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { authApi } from '../features/auth/authApi';
import { conversationsApi } from '../features/conversations/conversationsApi';
import { messagesApi } from '../features/messages/messagesApi';
import { adminApi } from '../features/admin/adminApi';
import { databaseApi } from '../features/database/databaseApi';
import { notesApi } from '../features/notes/notesApi';
import authReducer from '../features/auth/authSlice';

/**
 * Redux Store Configuration
 * Includes RTK Query API slices and auth state
 */
export const store = configureStore({
    reducer: {
        // RTK Query API reducers
        [authApi.reducerPath]: authApi.reducer,
        [conversationsApi.reducerPath]: conversationsApi.reducer,
        [messagesApi.reducerPath]: messagesApi.reducer,
        [adminApi.reducerPath]: adminApi.reducer,
        [databaseApi.reducerPath]: databaseApi.reducer,
        [notesApi.reducerPath]: notesApi.reducer,

        // Regular reducers
        auth: authReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(
            authApi.middleware,
            conversationsApi.middleware,
            messagesApi.middleware,
            adminApi.middleware,
            databaseApi.middleware,
            notesApi.middleware
        ),
});

// Enable refetchOnFocus and refetchOnReconnect behaviors
setupListeners(store.dispatch);

export default store;
