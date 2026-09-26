export default function TableSkeleton({ rows = 5, columns = 6 }: { rows?: number; columns?: number }) {
  return (
    <div style={{ width: "100%" }}>
      {/* Search / Header Bar Skeleton */}
      <div className="card mb-4" style={{ padding: "14px 18px", display: "flex", gap: 12 }}>
        <div className="skeleton" style={{ height: 36, width: "100%", maxWidth: 300, borderRadius: 8 }} />
        <div className="skeleton" style={{ height: 36, width: 100, borderRadius: 8, marginLeft: "auto" }} />
      </div>

      {/* Table Skeleton */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-wrapper">
          <table style={{ width: "100%" }}>
            <thead>
              <tr>
                {[...Array(columns)].map((_, i) => (
                  <th key={`th-${i}`}>
                    <div className="skeleton" style={{ height: 16, width: "60%", borderRadius: 4 }} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(rows)].map((_, i) => (
                <tr key={`tr-${i}`}>
                  {[...Array(columns)].map((_, j) => (
                    <td key={`td-${i}-${j}`}>
                      <div className="skeleton" style={{ height: 20, width: j === 0 ? "80%" : "60%", borderRadius: 4 }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

