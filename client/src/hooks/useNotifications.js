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

            // Enhanced Notification Sound (Professional "Ding")
            try {
                // Using a reliable public URL for a "ding" sound
                const audio = new Audio('/facebook_notification.mp3');
                audio.volume = 0.8;
                audio.play().catch(() => {
                    // Fallback synthetic beep if external assets are blocked
                    try {
                        const context = new (window.AudioContext || window.webkitAudioContext)();
                        const oscillator = context.createOscillator();
                        const gain = context.createGain();
                        oscillator.connect(gain);
                        gain.connect(context.destination);
                        oscillator.type = 'sine';
                        oscillator.frequency.setValueAtTime(880, context.currentTime);
                        gain.gain.setValueAtTime(0.1, context.currentTime);
                        oscillator.start();
                        oscillator.stop(context.currentTime + 0.1);
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
