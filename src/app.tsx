import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppProviders } from "./components/providers";
import { AppLayout } from "./components/app-layout";
import DashboardPage from "./pages/dashboard";
import ModelsListPage from "./pages/models/list";
import LogsListPage from "./pages/call-logs/list";
import UsagePage from "./pages/usage";
import RoutingRulesPage from "./pages/routing/list";
import ProxyTestPage from "./pages/proxy/test";
import ProxyLogsPage from "./pages/proxy-logs/list";
import AccessKeysListPage from "./pages/access-keys/list";
import NotFoundPage from "./pages/not-found";
import "./app.css";

export default function App() {
  return (
    <AppProviders>
      <BrowserRouter basename={import.meta.env.VITE_BASE}>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="models" element={<ModelsListPage />} />
            <Route path="logs" element={<LogsListPage />} />
            <Route path="usage" element={<UsagePage />} />
            <Route path="routing" element={<RoutingRulesPage />} />
            <Route path="proxy" element={<ProxyTestPage />} />
            <Route path="proxy-logs" element={<ProxyLogsPage />} />
            <Route path="access-keys" element={<AccessKeysListPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AppProviders>
  );
}
