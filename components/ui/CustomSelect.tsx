import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
}

export default function CustomSelect({ value, onChange, options, placeholder = "Select an option", className = "" }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        className="input"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          textAlign: "left"
        }}
        onClick={(e) => {
          e.preventDefault();
          setIsOpen(!isOpen);
        }}
      >
        <span style={{ color: selectedOption ? "#e2e8f0" : "#64748b" }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={16} color="#818cf8" style={{ transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "none" }} />
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 4,
            background: "#0e1423",
            border: "1px solid rgba(99, 102, 241, 0.2)",
            borderRadius: 6,
            zIndex: 100,
            maxHeight: 200,
            overflowY: "auto",
            boxShadow: "0 8px 30px rgba(0,0,0,0.5)"
          }}
        >
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              style={{
                padding: "10px 14px",
                cursor: "pointer",
                color: opt.value === value ? "#ffffff" : "#e2e8f0",
                background: opt.value === value ? "rgba(99, 102, 241, 0.2)" : "transparent",
                transition: "background 0.15s"
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = opt.value === value ? "rgba(99, 102, 241, 0.2)" : "rgba(255,255,255,0.05)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = opt.value === value ? "rgba(99, 102, 241, 0.2)" : "transparent")}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
