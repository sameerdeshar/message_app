import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.MODE === 'production'
    ? window.location.origin
    : 'http://localhost:3000';

/**
 * Socket.IO client instance
 * Configured with credentials for session support
 */
export const socket = io(SOCKET_URL, {
    withCredentials: true,
    transports: ['websocket', 'polling'],
    autoConnect: true,
});

export default socket;
