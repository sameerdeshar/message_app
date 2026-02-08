import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useGetMeQuery } from '../features/auth/authApi';

const ProtectedRoute = ({ allowedRoles = [] }) => {
    const { user, isAuthenticated } = useSelector((state) => state.auth);
    const { isLoading } = useGetMeQuery();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xl">Loading...</div>
            </div>
        );
    }

    if (!isAuthenticated || !user) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
