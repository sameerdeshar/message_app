import { useState } from 'react';
import { useLoginMutation } from '../features/auth/authApi';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [login, { isLoading, error: apiError }] = useLoginMutation();
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const result = await login({ username, password }).unwrap();

            // Navigate based on role
            if (result.user.role === 'admin') {
                navigate('/admin');
            } else {
                navigate('/dashboard');
            }
        } catch (err) {
            setError(err.data?.message || 'Invalid credentials');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center p-4">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-2xl shadow-xl w-full max-w-md">
                <h1 className="text-3xl font-bold text-white mb-6 text-center">Meta Messenger</h1>

                {(error || apiError) && (
                    <div className="bg-red-500/20 border border-red-500 text-white p-3 rounded mb-4 text-sm">
                        {error || apiError?.data?.message || 'Login failed'}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-white text-sm font-medium mb-1">Username</label>
                        <input
                            type="text"
                            className="w-full bg-white/20 border border-white/10 rounded px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                            placeholder="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-white text-sm font-medium mb-1">Password</label>
                        <input
                            type="password"
                            className="w-full bg-white/20 border border-white/10 rounded px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-white text-primary font-bold py-2 rounded hover:bg-gray-100 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Logging in...' : 'Login'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
