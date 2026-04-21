import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";
import { ClientDashboard } from "@/components/dashboard/ClientDashboard";
import { ManagerDashboard } from "@/components/dashboard/ManagerDashboard";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardIndex,
});

function DashboardIndex() {
  const { role } = useAuth();
  return (
    <DashboardShell>
      {role === "manager" ? <ManagerDashboard /> : <ClientDashboard />}
    </DashboardShell>
  );
}
