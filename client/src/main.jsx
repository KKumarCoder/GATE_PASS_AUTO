import Users from './pages/Users';
import {can, homeFor} from '../../shared/access.mjs';
import { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Loading } from "./components/UI";
import AppLayout from "./layouts/AppLayout";
import { Login, ResetPassword, ParentApproval, ParentPass } from "./pages/Auth";
const Dashboard = lazy(() => import("./pages/Dashboard"));
import Students from "./pages/Students";
import { Passes, NewPass, PassDetail } from "./pages/Passes";
const Guard = lazy(() => import("./pages/Guard"));
const GateScanner = lazy(() => import("./pages/GateScanner"));
const GatePassPrint = lazy(() => import("./pages/GatePassPrint"));
import {
  Visitors,
  Staff,
  Logs,
  Reports,
  Settings,
  GlobalSearch,
} from "./pages/Operations";
import "./styles.css";
import "./workspace.css";
const home = homeFor;
function Protected({ permission, children }) {
  const { user, loading } = useAuth(),
    location = useLocation();
  if (loading) return <Loading />;
  if (!user)
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (permission && !can(user,permission))
    return <Navigate to={home(user)} replace />;
  return children;
}
function LoginRoute() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  return user ? <Navigate to={home(user)} replace /> : <Login />;
}
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<Loading />}>
          <Toaster
            containerClassName="no-print"
            position="top-right"
            toastOptions={{ duration: 4500 }}
          />
          <Routes>
            <Route path="/login" element={<LoginRoute />} />
            <Route path="/gate/scanner" element={<Protected permission="gate.move"><GateScanner /></Protected>} />
            <Route path="/gatepasses/:id/print" element={<Protected permission="passes.view"><GatePassPrint /></Protected>} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/parent/pass/:token" element={<ParentPass />} />
            <Route path="/parent/approve/:token" element={<ParentApproval />} />
            <Route
              element={
                <Protected>
                  <AppLayout />
                </Protected>
              }
            >
              <Route
                index
                element={
                  <Protected permission="reports.view">
                    <Dashboard />
                  </Protected>
                }
              />
              <Route
                path="students"
                element={
                  <Protected permission="students.view">
                    <Students />
                  </Protected>
                }
              />
              <Route
                path="gatepasses"
                element={
                  <Protected permission="passes.view">
                    <Passes />
                  </Protected>
                }
              />
              <Route
                path="gatepasses/new"
                element={
                  <Protected permission="passes.create">
                    <NewPass />
                  </Protected>
                }
              />
              <Route path="gatepasses/:id" element={<Protected permission="passes.view"><PassDetail /></Protected>} />
              <Route
                path="pending"
                element={
                  <Protected permission="passes.view">
                    <Passes pending />
                  </Protected>
                }
              />
              <Route
                path="outside"
                element={
                  <Protected permission="reports.view">
                    <Passes outside />
                  </Protected>
                }
              />
              <Route
                path="visitors"
                element={
                  <Protected permission="visitors.view">
                    <Visitors />
                  </Protected>
                }
              />
              <Route path="staff" element={<Protected permission="staff.view"><Staff /></Protected>} />
              <Route path="no-access" element={<div className="card"><h1>No modules assigned</h1><p>Contact your administrator to enable access.</p></div>} />
              <Route
                path="users"
                element={
                  <Protected permission="users.manage">
                    <Users />
                  </Protected>
                }
              />
              <Route
                path="logs"
                element={
                  <Protected permission="logs.view">
                    <Logs />
                  </Protected>
                }
              />
              <Route
                path="notifications"
                element={
                  <Protected permission="notifications.view">
                    <Logs notifications />
                  </Protected>
                }
              />
              <Route
                path="reports"
                element={
                  <Protected permission="reports.view">
                    <Reports />
                  </Protected>
                }
              />
              <Route
                path="settings"
                element={
                  <Protected permission="settings.manage">
                    <Settings />
                  </Protected>
                }
              />
              <Route
                path="search"
                element={
                  <Protected permission="students.view">
                    <GlobalSearch />
                  </Protected>
                }
              />
              {["guard", "guard/scanner", "gate/verify/:token"].map((path) => (
                <Route
                  key={path}
                  path={path}
                  element={
                    <Protected permission="gate.verify">
                      <Guard />
                    </Protected>
                  }
                />
              ))}
              <Route
                path="*"
                element={
                  <div className="card">
                    <h1>Page not found</h1>
                    <a href="/">Return to workspace</a>
                  </div>
                }
              />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
createRoot(document.getElementById("root")).render(<App />);
