"use client";
import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
  compact?: boolean;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  limit,
  onPageChange,
  onLimitChange,
  pageSizeOptions = [10, 25, 50, 100],
  itemLabel = "records",
  compact = false
}: PaginationProps) {
  // If no items at all, don't show pagination or show simple 0 records
  if (totalItems === 0) return null;

  const startItem = Math.min((currentPage - 1) * limit + 1, totalItems);
  const endItem = Math.min(currentPage * limit, totalItems);

  // Generate numbered page buttons (e.g. 1 ... 4 5 6 ... 10)
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 3) {
        start = 2;
        end = 4;
      } else if (currentPage >= totalPages - 2) {
        start = totalPages - 3;
        end = totalPages - 1;
      }

      if (start > 2) pages.push("...");
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push("...");

      pages.push(totalPages);
    }
    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div 
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 16,
        padding: "16px 20px",
        background: "rgba(15,23,42,0.4)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        borderRadius: "0 0 14px 14px"
      }}
    >
      {/* Left: Range and Count Indicator & Page Size Selector */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, color: "#94a3b8" }}>
          Showing <strong style={{ color: "#f8fafc" }}>{startItem}–{endItem}</strong> of{" "}
          <strong style={{ color: "#f8fafc" }}>{totalItems.toLocaleString()}</strong> {itemLabel}
        </span>

        {onLimitChange && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, color: "#64748b" }}>Per page:</span>
            <select
              value={limit}
              onChange={(e) => {
                onLimitChange(Number(e.target.value));
                onPageChange(1); // Reset to page 1 on limit change
              }}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#e2e8f0",
                fontSize: 12,
                borderRadius: 8,
                padding: "4px 8px",
                cursor: "pointer",
                outline: "none"
              }}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt} style={{ background: "#1e293b", color: "#fff" }}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Page Navigation Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {/* First Page */}
        {!compact && (
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(1)}
            title="First Page"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
              color: currentPage <= 1 ? "#475569" : "#94a3b8",
              cursor: currentPage <= 1 ? "not-allowed" : "pointer",
              transition: "all 0.15s ease"
            }}
          >
            <ChevronsLeft size={16} />
          </button>
        )}

        {/* Previous Page */}
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          title="Previous Page"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
            color: currentPage <= 1 ? "#475569" : "#cbd5e1",
            cursor: currentPage <= 1 ? "not-allowed" : "pointer",
            transition: "all 0.15s ease"
          }}
        >
          <ChevronLeft size={16} />
        </button>

        {/* Numbered Buttons */}
        {pages.map((p, idx) => {
          if (p === "...") {
            return (
              <span key={`dots-${idx}`} style={{ padding: "0 4px", color: "#64748b", fontSize: 13 }}>
                …
              </span>
            );
          }

          const pageNum = Number(p);
          const isActive = pageNum === currentPage;

          return (
            <button
              key={`page-${pageNum}`}
              type="button"
              onClick={() => onPageChange(pageNum)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 32,
                height: 32,
                padding: "0 8px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                border: isActive ? "1px solid #F7931A" : "1px solid #2A2A2E",
                background: isActive ? "#FF9500" : "rgba(255,255,255,0.03)",
                color: isActive ? "#ffffff" : "#9CA3AF",
                boxShadow: isActive ? "0 2px 10px rgba(247,147,26,0.35)" : "none",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              {pageNum}
            </button>
          );
        })}

        {/* Next Page */}
        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          title="Next Page"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
            color: currentPage >= totalPages ? "#475569" : "#cbd5e1",
            cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
            transition: "all 0.15s ease"
          }}
        >
          <ChevronRight size={16} />
        </button>

        {/* Last Page */}
        {!compact && (
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(totalPages)}
            title="Last Page"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
              color: currentPage >= totalPages ? "#475569" : "#94a3b8",
              cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
              transition: "all 0.15s ease"
            }}
          >
            <ChevronsRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
