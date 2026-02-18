import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminLogin from './pages/admin/Login';
// import SupportStaffLogin from './pages/supportstaff/Login';
import AdminLayout from './components/Layout/AdminLayout';
// import SupportStaffLayout from './components/Layout/SupportStaffLayout';
import ServerManagement from './pages/admin/ServerManagement';
import Dashboard from './pages/admin/Dashboard';
import SupportStaffManagement from './pages/admin/SupportStaffManagement';
import ServerAllocation from './pages/admin/ServerAllocation';
import DeviceModelManagement from './pages/admin/DeviceModelManagement';
import StaffCredentials from './pages/admin/StaffCredentials';
import ServerWiseReport from './pages/admin/reports/ServerWiseReport';
import TicketMasterReport from './pages/admin/reports/TicketMasterReport';
import NotificationSetting from './pages/admin/NotificationSetting';
import { AuthProvider } from './context/AuthContext';
import { AdminProtectedRoute, SupportStaffProtectedRoute } from './components/ProtectedRoute';
import SessionTimeoutManager from './components/SessionTimeoutManager';
// import SupportStaffDashboard from './pages/supportstaff/Dashboard';
// import StaffMaster from './pages/supportstaff/reports/StaffMaster';
// import SupportStaffProfile from './pages/supportstaff/Profile';

// Placeholder components for routes we haven't converted yet
const DashboardPlaceholder = ({ role }) => (
  <div className="p-8 text-center">
    <h2 className="text-2xl font-bold mb-4">{role} Dashboard</h2>
    <p className="text-gray-600">This module is currently being converted. Please check back in a few minutes!</p>
    <div className="mt-6 p-10 bg-white rounded-xl shadow-lg border border-dashed border-gray-300">
      <div className="animate-pulse flex flex-col items-center">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    </div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <SessionTimeoutManager />
        <Routes>
          {/* Default Redirect */}
          <Route path="/" element={<Navigate to="/admin/login" replace />} />

          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />

          <Route element={
            <AdminProtectedRoute>
              <AdminLayout />
            </AdminProtectedRoute>
          }>
            <Route path="/admin/dashboard" element={<Dashboard />} />
            <Route path="/admin/server" element={<ServerManagement />} />
            <Route path="/admin/supportstaff" element={<SupportStaffManagement />} />
            <Route path="/admin/serverallocationtostaff" element={<ServerAllocation />} />
            <Route path="/admin/reports/serverwise" element={<ServerWiseReport />} />
            <Route path="/admin/reports/ticketmaster" element={<TicketMasterReport />} />
            <Route path="/admin/staffcredential" element={<StaffCredentials />} />
            <Route path="/admin/devicemodel" element={<DeviceModelManagement />} />
            <Route path="/admin/settings" element={<NotificationSetting />} />
            <Route path="/admin/settings/smslog" element={<NotificationSetting />} />
          </Route>

          {/* Support Staff Routes */}
          {/* <Route path="/support/login" element={<SupportStaffLogin />} />

          <Route element={
            <SupportStaffProtectedRoute>
              <SupportStaffLayout />
            </SupportStaffProtectedRoute>
          }>
            <Route path="/support/dashboard" element={<SupportStaffDashboard />} />
            <Route path="/support/reports/staffmaster" element={<StaffMaster />} />
            <Route path="/support/profile" element={<SupportStaffProfile />} />
          </Route> */}

          {/* 404 Redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
