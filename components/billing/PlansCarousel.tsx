"use client";
import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle2, ArrowRight, ChevronLeft, ChevronRight, 
  Sparkles, Layers, SlidersHorizontal, Grid
} from "lucide-react";

export interface PlanItem {
  _id?: string;
  name: string;
  description?: string;
  monthlyPrice: number;
  annualPrice: number;
  currency?: string;
  maxStores: number;
  discountPercent?: number;
  features: string[];
  isPopular?: boolean;
  isActive?: boolean;
  [key: string]: any;
}

interface PlansCarouselProps {
  plans: any[];
  billingCycle: "monthly" | "annual";
  activePlanId?: string | null;
  activeBillingCycle?: string;
  tenantStatus?: string;
  onSelectPlan: (plan: any, cycle: "monthly" | "annual") => void;
  isAdminPreview?: boolean;
  onEditPlan?: (plan: any) => void;
}

export default function PlansCarousel({
  plans,
  billingCycle,
  activePlanId,
  activeBillingCycle,
  tenantStatus,
  onSelectPlan,
  isAdminPreview = false,
  onEditPlan
}: PlansCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"carousel" | "grid">("carousel");
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  if (!plans || plans.length === 0) {
    return (
      <div className="card text-center p-8">
        <Layers size={36} className="text-secondary mx-auto mb-3" />
        <p className="text-secondary text-sm">No subscription tiers configured yet.</p>
      </div>
    );
  }

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : plans.length - 1));
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -360, behavior: "smooth" });
    }
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < plans.length - 1 ? prev + 1 : 0));
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 360, behavior: "smooth" });
    }
  };

  return (
    <div className="w-full">
      {/* Carousel Navigation Header Controls */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
            Available Plans ({plans.length})
          </span>
          <span className="text-xs text-muted">
            • Showing {billingCycle === "annual" ? "Annual (Save 17%)" : "Monthly"} billing
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Mode Switcher: Carousel vs Compare Grid */}
          <div className="inline-flex items-center p-1 rounded-lg bg-surface-dark border border-subtle">
            <button
              type="button"
              onClick={() => setViewMode("carousel")}
              className={`btn btn-sm ${viewMode === "carousel" ? "btn-primary" : "btn-ghost"}`}
              style={{ padding: "4px 10px", fontSize: 12, height: 28, minHeight: 0 }}
              title="Carousel Slider View"
            >
              <SlidersHorizontal size={13} />
              <span className="hidden sm:inline">Slider</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`btn btn-sm ${viewMode === "grid" ? "btn-primary" : "btn-ghost"}`}
              style={{ padding: "4px 10px", fontSize: 12, height: 28, minHeight: 0 }}
              title="Grid View"
            >
              <Grid size={13} />
              <span className="hidden sm:inline">All Plans</span>
            </button>
          </div>

          {/* Prev / Next Arrows */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrev}
              className="btn btn-secondary btn-sm p-1.5 rounded-lg border border-subtle hover:border-accent-orange text-white"
              style={{ width: 32, height: 32, padding: 0 }}
              title="Previous plan"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs text-secondary font-medium px-1">
              {currentIndex + 1} / {plans.length}
            </span>
            <button
              type="button"
              onClick={handleNext}
              className="btn btn-secondary btn-sm p-1.5 rounded-lg border border-subtle hover:border-accent-orange text-white"
              style={{ width: 32, height: 32, padding: 0 }}
              title="Next plan"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Render Cards: Carousel or Grid */}
      {viewMode === "carousel" ? (
        <div className="relative">
          {/* Snap Horizontal Scroll Track */}
          <div
            ref={scrollContainerRef}
            className="flex gap-6 overflow-x-auto pb-4 pt-2 px-1 scroll-smooth snap-x snap-mandatory"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "var(--surface-dark-alt) transparent",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {plans.map((p, idx) => {
              const price = billingCycle === "annual" ? p.annualPrice : p.monthlyPrice;
              const isCurrentActivePlan =
                tenantStatus === "active" &&
                activePlanId === p._id &&
                activeBillingCycle === billingCycle;
              const isMulti = p.maxStores > 1;

              // Clean short button label to prevent button overflow
              const shortPlanName = p.name.replace(/\s*Plan$/i, "");

              return (
                <div
                  key={p._id || idx}
                  className="snap-center shrink-0 w-full sm:w-[340px] md:w-[360px]"
                >
                  <div
                    className="card h-full flex flex-col justify-between"
                    style={{
                      padding: "28px 24px",
                      position: "relative",
                      border: isCurrentActivePlan
                        ? "2px solid #10b981"
                        : p.isPopular
                        ? "2px solid var(--accent-primary)"
                        : "1px solid var(--border-subtle)",
                      background: "var(--surface-dark)",
                      boxShadow: isCurrentActivePlan
                        ? "0 8px 30px rgba(16,185,129,0.15)"
                        : p.isPopular
                        ? "0 8px 30px rgba(249,115,22,0.18)"
                        : "var(--shadow-sm)",
                    }}
                  >
                    {/* Top Badges */}
                    {isCurrentActivePlan ? (
                      <div
                        style={{
                          position: "absolute",
                          top: -12,
                          right: 20,
                          background: "linear-gradient(135deg, #10b981, #059669)",
                          color: "#fff",
                          fontSize: 11,
                          fontWeight: 800,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          padding: "4px 12px",
                          borderRadius: 999,
                          boxShadow: "0 2px 8px rgba(16,185,129,0.3)",
                        }}
                      >
                        ✓ Current Plan
                      </div>
                    ) : p.isPopular ? (
                      <div
                        style={{
                          position: "absolute",
                          top: -12,
                          right: 20,
                          background: "linear-gradient(135deg, #ea580c, #f97316)",
                          color: "#fff",
                          fontSize: 11,
                          fontWeight: 800,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          padding: "4px 12px",
                          borderRadius: 999,
                          boxShadow: "0 2px 8px rgba(249,115,22,0.3)",
                        }}
                      >
                        ★ Most Popular
                      </div>
                    ) : null}

                    <div>
                      {/* Plan Header */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <h3 className="text-xl font-bold text-white m-0 tracking-tight">
                          {p.name}
                        </h3>
                        {p.maxStores > 1 && (
                          <span className="badge badge-info text-xs py-0.5 px-2">
                            {p.maxStores} Branches
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-secondary mb-5 line-clamp-2" style={{ minHeight: 32 }}>
                        {p.description ||
                          (isMulti
                            ? "Optimized for expanding retail businesses with multi-store sync"
                            : "Perfect for single retail store or boutique outlet operations")}
                      </p>

                      {/* Pricing Tag */}
                      <div className="bg-surface-dark-alt/50 p-4 rounded-xl border border-subtle mb-6">
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-extrabold text-white tracking-tight">
                            PKR {price?.toLocaleString()}
                          </span>
                          <span className="text-xs text-secondary font-medium">
                            / {billingCycle === "annual" ? "year" : "month"}
                          </span>
                        </div>
                        {billingCycle === "annual" && (
                          <div className="text-[11px] text-positive font-semibold mt-1 flex items-center gap-1">
                            <Sparkles size={12} /> Includes 2 Months Free (17% OFF)
                          </div>
                        )}
                      </div>

                      {/* Features List */}
                      <div className="space-y-3 mb-6">
                        <div className="text-[11px] font-bold text-muted uppercase tracking-wider">
                          What&apos;s Included:
                        </div>
                        <div className="flex items-center gap-2.5 text-xs text-slate-200">
                          <CheckCircle2 size={15} color="#10b981" className="shrink-0" />
                          <span>
                            <strong>{p.maxStores} Store Location{p.maxStores > 1 ? "s" : ""}</strong>
                          </span>
                        </div>
                        {p.features?.slice(0, 6).map((feat: string, fIdx: number) => (
                          <div key={fIdx} className="flex items-center gap-2.5 text-xs text-slate-300">
                            <CheckCircle2 size={15} color="#10b981" className="shrink-0" />
                            <span className="truncate">{feat}</span>
                          </div>
                        ))}
                        {p.features?.length > 6 && (
                          <div className="text-[11px] text-muted pl-6">
                            + {p.features.length - 6} additional enterprise features
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="mt-4 pt-4 border-t border-subtle">
                      {isAdminPreview ? (
                        <button
                          type="button"
                          onClick={() => onEditPlan && onEditPlan(p)}
                          className="btn btn-secondary w-full justify-center text-sm py-2.5"
                        >
                          Edit Plan Details
                        </button>
                      ) : isCurrentActivePlan ? (
                        <button
                          type="button"
                          disabled
                          className="btn btn-secondary w-full justify-center text-sm py-2.5 opacity-60 cursor-not-allowed"
                        >
                          ✓ Current Active Plan
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onSelectPlan(p, billingCycle)}
                          className={`btn ${
                            p.isPopular ? "btn-primary" : "btn-secondary"
                          } w-full justify-center text-sm py-2.5 font-semibold`}
                        >
                          <span>Select {shortPlanName}</span>
                          <ArrowRight size={15} className="shrink-0 ml-1" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Dots */}
          <div className="flex justify-center items-center gap-2 mt-4">
            {plans.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setCurrentIndex(idx);
                  if (scrollContainerRef.current) {
                    scrollContainerRef.current.scrollTo({
                      left: idx * 360,
                      behavior: "smooth",
                    });
                  }
                }}
                className={`transition-all rounded-full ${
                  currentIndex === idx
                    ? "w-6 h-2 bg-accent-orange"
                    : "w-2 h-2 bg-slate-700 hover:bg-slate-500"
                }`}
                title={`Go to plan ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      ) : (
        /* Grid View Fallback */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((p, idx) => {
            const price = billingCycle === "annual" ? p.annualPrice : p.monthlyPrice;
            const isCurrentActivePlan =
              tenantStatus === "active" &&
              activePlanId === p._id &&
              activeBillingCycle === billingCycle;
            const isMulti = p.maxStores > 1;
            const shortPlanName = p.name.replace(/\s*Plan$/i, "");

            return (
              <div
                key={p._id || idx}
                className="card h-full flex flex-col justify-between"
                style={{
                  padding: "28px 24px",
                  position: "relative",
                  border: isCurrentActivePlan
                    ? "2px solid #10b981"
                    : p.isPopular
                    ? "2px solid var(--accent-primary)"
                    : "1px solid var(--border-subtle)",
                }}
              >
                {isCurrentActivePlan ? (
                  <div
                    style={{
                      position: "absolute",
                      top: -12,
                      right: 20,
                      background: "linear-gradient(135deg, #10b981, #059669)",
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      padding: "4px 12px",
                      borderRadius: 999,
                    }}
                  >
                    ✓ Current Plan
                  </div>
                ) : p.isPopular ? (
                  <div
                    style={{
                      position: "absolute",
                      top: -12,
                      right: 20,
                      background: "linear-gradient(135deg, #ea580c, #f97316)",
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      padding: "4px 12px",
                      borderRadius: 999,
                    }}
                  >
                    ★ Most Popular
                  </div>
                ) : null}

                <div>
                  <h3 className="text-xl font-bold text-white m-0 mb-2">{p.name}</h3>
                  <p className="text-xs text-secondary mb-4 line-clamp-2">
                    {p.description ||
                      (isMulti
                        ? "Optimized for expanding retail businesses"
                        : "Perfect for single retail store")}
                  </p>
                  <div className="bg-surface-dark-alt/50 p-4 rounded-xl border border-subtle mb-6">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-white">
                        PKR {price?.toLocaleString()}
                      </span>
                      <span className="text-xs text-secondary">
                        / {billingCycle === "annual" ? "year" : "month"}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3 mb-6">
                    <div className="text-[11px] font-bold text-muted uppercase tracking-wider">
                      Included:
                    </div>
                    <div className="flex items-center gap-2.5 text-xs text-slate-200">
                      <CheckCircle2 size={15} color="#10b981" className="shrink-0" />
                      <span>{p.maxStores} Store Location{p.maxStores > 1 ? "s" : ""}</span>
                    </div>
                    {p.features?.map((feat: string, fIdx: number) => (
                      <div key={fIdx} className="flex items-center gap-2.5 text-xs text-slate-300">
                        <CheckCircle2 size={15} color="#10b981" className="shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-subtle">
                  {isAdminPreview ? (
                    <button
                      type="button"
                      onClick={() => onEditPlan && onEditPlan(p)}
                      className="btn btn-secondary w-full justify-center text-sm py-2.5"
                    >
                      Edit Plan Details
                    </button>
                  ) : isCurrentActivePlan ? (
                    <button
                      type="button"
                      disabled
                      className="btn btn-secondary w-full justify-center text-sm py-2.5 opacity-60 cursor-not-allowed"
                    >
                      ✓ Current Active Plan
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSelectPlan(p, billingCycle)}
                      className={`btn ${
                        p.isPopular ? "btn-primary" : "btn-secondary"
                      } w-full justify-center text-sm py-2.5 font-semibold`}
                    >
                      <span>Select {shortPlanName}</span>
                      <ArrowRight size={15} className="shrink-0 ml-1" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
