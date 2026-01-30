import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import AdminInbox from './pages/AdminInbox';
import AgentDashboard from './pages/AgentDashboard';
import DatabaseViewer from './pages/DatabaseViewer';
import TestWebhook from './pages/TestWebhook';
import PrivacyPolicy from './pages/PrivacyPolicy';
import ProtectedRoute from './components/ProtectedRoute';
import { useGetMeQuery } from './features/auth/authApi';
import './App.css';

function AppContent() {
  const { isLoading } = useGetMeQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/test-webhook" element={<TestWebhook />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />

      {/* Admin Routes */}
      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/inbox" element={<AdminInbox />} />
        <Route path="/admin/inbox/:pageId" element={<AdminInbox />} />
        <Route path="/database" element={<DatabaseViewer />} />
      </Route>

      {/* Agent Routes */}
      <Route element={<ProtectedRoute allowedRoles={['agent', 'admin']} />}>
        <Route path="/dashboard" element={<AgentDashboard />} />
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
