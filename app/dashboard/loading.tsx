import DashboardSkeleton from "@/components/skeletons/DashboardSkeleton";

export default function Loading() {
  return (
    <main className="main-content">
      <div className="page-header">
        <div className="skeleton" style={{ height: 28, width: 200, marginBottom: 8, borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 16, width: 300, borderRadius: 4 }} />
      </div>
      <DashboardSkeleton />
    </main>
  );
}
