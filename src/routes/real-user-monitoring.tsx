import { createFileRoute } from "@tanstack/react-router";
import { RealUserMonitoringPage } from "../features/real-user-monitoring/RealUserMonitoringPage.tsx";

export const Route = createFileRoute("/real-user-monitoring")({
  component: RealUserMonitoringPage,
});
