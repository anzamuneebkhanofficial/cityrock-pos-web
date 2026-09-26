export default function DashboardSkeleton() {
  return (
    <div style={{ width: "100%" }}>
      {/* Stats Grid Skeleton */}
      <div className="grid-stats mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={`stat-${i}`} className="card" style={{ height: 110, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div className="skeleton" style={{ width: 42, height: 42, borderRadius: 12 }} />
              <div className="skeleton" style={{ width: 40, height: 16, borderRadius: 4 }} />
            </div>
            <div>
              <div className="skeleton" style={{ width: "60%", height: 24, borderRadius: 4, marginBottom: 8 }} />
              <div className="skeleton" style={{ width: "40%", height: 14, borderRadius: 4 }} />
            </div>
          </div>
        ))}
      </div>

      {/* Two Columns Layout Skeleton */}
      <div className="grid-2">
        <div className="card" style={{ height: 300 }}>
          <div className="skeleton" style={{ width: 120, height: 20, borderRadius: 4, marginBottom: 24 }} />
          <div className="skeleton" style={{ width: "100%", height: 40, borderRadius: 8, marginBottom: 12 }} />
          <div className="skeleton" style={{ width: "100%", height: 40, borderRadius: 8, marginBottom: 12 }} />
          <div className="skeleton" style={{ width: "100%", height: 40, borderRadius: 8 }} />
        </div>
        
        <div className="card" style={{ height: 300 }}>
          <div className="skeleton" style={{ width: 100, height: 20, borderRadius: 4, marginBottom: 24 }} />
          <div className="skeleton" style={{ width: "80%", height: 16, borderRadius: 4, marginBottom: 16 }} />
          <div className="skeleton" style={{ width: "90%", height: 16, borderRadius: 4, marginBottom: 16 }} />
          <div className="skeleton" style={{ width: "60%", height: 16, borderRadius: 4, marginBottom: 32 }} />
          <div className="skeleton" style={{ width: 140, height: 36, borderRadius: 8 }} />
        </div>
      </div>
    </div>
  );
}

