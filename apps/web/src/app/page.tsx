import { DashboardPage } from "@/components/dashboard-page";
import { ErrorBoundary } from "@/components/shared/error-boundary";

export default function Home() {
  return (
    <ErrorBoundary>
      <DashboardPage />
    </ErrorBoundary>
  );
}
