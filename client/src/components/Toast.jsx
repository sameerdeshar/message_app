import { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const Toast = ({ message, type = 'info', onClose, duration = 3000 }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const icons = {
        success: <CheckCircle className="w-5 h-5" />,
        error: <AlertCircle className="w-5 h-5" />,
        warning: <AlertTriangle className="w-5 h-5" />,
        info: <Info className="w-5 h-5" />
    };

    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-orange-500',
        info: 'bg-blue-500'
    };

    return (
        <div className="fixed top-6 right-6 z-[110] animate-in slide-in-from-right duration-300">
            <div className={`${colors[type]} backdrop-blur-md bg-opacity-95 text-white px-5 py-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex items-center gap-4 min-w-[320px] max-w-md border border-white/10`}>
                <div className="flex-shrink-0 p-1 bg-white/20 rounded-full">
                    {icons[type]}
                </div>
                <div className="flex-1">
                    <p className="text-sm font-semibold tracking-wide">{type.charAt(0).toUpperCase() + type.slice(1)}</p>
                    <p className="text-sm font-medium opacity-90 leading-tight">{message}</p>
                </div>
                <button
                    onClick={onClose}
                    className="flex-shrink-0 hover:bg-white/20 rounded-full p-1.5 transition-colors -mr-2"
                >
                    <X className="w-4 h-4 text-white/80" />
                </button>
            </div>
        </div>
    );
};

export default Toast;
