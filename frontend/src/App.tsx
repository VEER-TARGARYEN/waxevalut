import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "@/components/shell/AppShell";
import { RecallPage } from "@/pages/RecallPage";
import { EntityPage } from "@/pages/EntityPage";
import { GraphPage } from "@/pages/GraphPage";

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<RecallPage />} />
        <Route path="/entity/:name" element={<EntityPage />} />
        <Route path="/graph" element={<GraphPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
