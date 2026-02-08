import { useCallback, useState, useEffect } from 'react';

/**
 * useNotifications Hook
 * Provides functions to request permission and show browser notifications with sound.
 * Manages the enabled/disabled state internally with localStorage persistence.
 */
export const useNotifications = () => {
    const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
        return localStorage.getItem('notifications_enabled') === 'true';
    });

    const requestPermission = async () => {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            const granted = permission === 'granted';
            if (granted) {
                setNotificationsEnabled(true);
                localStorage.setItem('notifications_enabled', 'true');
            }
            return granted;
        }
        return false;
    };

    const toggleNotifications = async () => {
        if (!notificationsEnabled) {
            return await requestPermission();
        } else {
            setNotificationsEnabled(false);
            localStorage.setItem('notifications_enabled', 'false');
            return false;
        }
    };

    const showNotification = useCallback((title, body) => {
        // Read directly from state to ensure it's current
        if (notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification(title, {
                body,
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                tag: 'new-message',
                requireInteraction: false
            });

            notification.onclick = () => {
                window.focus();
                notification.close();
            };

            // Enhanced Notification Sound (Using your existing MP3)
            try {
                // Pointing to your specific file in the public folder
                const audio = new Audio('/facebook_notification.mp3');
                audio.volume = 0.8;
                audio.play().catch(() => {
                    // Modern Synthetic Chime Fallback (if browser blocks audio)
                    try {
                        const context = new (window.AudioContext || window.webkitAudioContext)();
                        const now = context.currentTime;

                        const playPing = (freq, delay, volume) => {
                            const osc = context.createOscillator();
                            const g = context.createGain();
                            osc.type = 'sine';
                            osc.frequency.setValueAtTime(freq, now + delay);
                            g.gain.setValueAtTime(0, now + delay);
                            g.gain.linearRampToValueAtTime(volume, now + delay + 0.01);
                            g.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.5);
                            osc.connect(g);
                            g.connect(context.destination);
                            osc.start(now + delay);
                            osc.stop(now + delay + 0.6);
                        };

                        // Play a pleasant "Ding-Ding"
                        playPing(880, 0, 0.1);          // Note 1 (Bright)
                        playPing(1318.51, 0.05, 0.07);  // Note 2 (Shimmer)
                    } catch (e) { }
                });
            } catch (e) { }
        }
    }, [notificationsEnabled]);

    return {
        notificationsEnabled,
        requestPermission,
        toggleNotifications,
        showNotification
    };
};

export default useNotifications;
