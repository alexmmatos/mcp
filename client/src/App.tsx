import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Projects from './pages/Projects'
import NewProject from './pages/NewProject'
import ProjectDetail from './pages/ProjectDetail'
import McpServer from './pages/McpServer'
import McpDocs from './pages/McpDocs'
import Profile from './pages/Profile'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'
import AuditLogs from './pages/AuditLogs'
import SetupWizard from './pages/SetupWizard'
import SharePage from './pages/SharePage'
import Templates from './pages/Templates'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token')
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

function RequireSetup({ children }: { children: React.ReactNode }) {
  const done = localStorage.getItem('setupComplete')
  return done ? <>{children}</> : <Navigate to="/setup" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/share/:token" element={<SharePage />} />

        {/* Setup wizard — shown once after first login */}
        <Route path="/setup" element={
          <RequireAuth><SetupWizard /></RequireAuth>
        } />

        {/* Protected app */}
        <Route path="/*" element={
          <RequireAuth>
            <RequireSetup>
              <Layout>
                <Routes>
                  <Route path="/" element={<Projects />} />
                  <Route path="/projects/new" element={<NewProject />} />
                  <Route path="/projects/:id" element={<ProjectDetail />} />
                  <Route path="/projects/:id/docs" element={<McpDocs />} />
                  <Route path="/mcp-server" element={<McpServer />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/audit-logs" element={<AuditLogs />} />
                  <Route path="/templates" element={<Templates />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            </RequireSetup>
          </RequireAuth>
        } />
      </Routes>
    </BrowserRouter>
  )
}
