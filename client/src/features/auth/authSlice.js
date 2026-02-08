import { createSlice } from '@reduxjs/toolkit';
import { authApi } from './authApi';

/**
 * Auth Slice - UI State
 * Manages authentication UI state (separate from API state)
 */
const initialState = {
    user: null,
    isAuthenticated: false,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        // Manual actions if needed
        setUser: (state, action) => {
            state.user = action.payload;
            state.isAuthenticated = !!action.payload;
        },
        clearUser: (state) => {
            state.user = null;
            state.isAuthenticated = false;
        },
    },
    extraReducers: (builder) => {
        // Update state when login succeeds
        builder.addMatcher(
            authApi.endpoints.login.matchFulfilled,
            (state, action) => {
                state.user = action.payload.user;
                state.isAuthenticated = true;
            }
        );

        // Update state when getMe succeeds
        builder.addMatcher(
            authApi.endpoints.getMe.matchFulfilled,
            (state, action) => {
                state.user = action.payload.user;
                state.isAuthenticated = true;
            }
        );

        // Clear state on logout
        builder.addMatcher(
            authApi.endpoints.logout.matchFulfilled,
            (state) => {
                state.user = null;
                state.isAuthenticated = false;
            }
        );

        // Clear state on getMe failure (no valid session)
        builder.addMatcher(
            authApi.endpoints.getMe.matchRejected,
            (state) => {
                state.user = null;
                state.isAuthenticated = false;
            }
        );
    },
});

export const { setUser, clearUser } = authSlice.actions;
export default authSlice.reducer;
