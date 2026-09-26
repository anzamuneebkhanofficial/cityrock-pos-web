"use client";
import React, { useState, forwardRef } from "react";
import { Eye, EyeOff } from "lucide-react";

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>((props, ref) => {
  const [show, setShow] = useState(false);

  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
      <input
        {...props}
        ref={ref}
        type={show ? "text" : "password"}
        className={`input ${props.className || ""}`}
        style={{ ...props.style, paddingRight: 40 }}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        tabIndex={-1}
        style={{
          position: "absolute",
          right: 12,
          background: "transparent",
          border: "none",
          padding: 0,
          cursor: "pointer",
          color: "#94a3b8",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
});

PasswordInput.displayName = "PasswordInput";
export default PasswordInput;
