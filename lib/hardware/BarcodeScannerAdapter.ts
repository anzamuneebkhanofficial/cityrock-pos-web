import { useEffect, useCallback, useRef } from "react";

interface UseBarcodeScannerProps {
  onScan: (barcode: string) => void;
  // Threshold in ms. HID scanners type very quickly (usually < 20ms per character).
  // Human typing is usually > 50ms.
  timeThreshold?: number; 
  // Minimum length of a barcode to be considered valid
  minLength?: number;
  disabled?: boolean;
}

/**
 * A React hook that abstracts a generic USB HID Barcode Scanner.
 * It listens for global keydown events, detecting rapid input ending in Enter.
 */
export function useBarcodeScanner({
  onScan,
  timeThreshold = 40,
  minLength = 3,
  disabled = false,
}: UseBarcodeScannerProps) {
  const buffer = useRef<string>("");
  const lastKeyTime = useRef<number>(0);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (disabled) return;

      // Ignore modifiers and non-character keys (except Enter)
      if (e.key.length > 1 && e.key !== "Enter") {
        return;
      }

      const now = Date.now();
      const elapsed = now - lastKeyTime.current;

      if (e.key === "Enter") {
        // If it's a fast sequence and meets the minimum length, it's a barcode
        if (buffer.current.length >= minLength && elapsed <= timeThreshold) {
          // Fire the scan event
          onScan(buffer.current);
          
          // Optionally prevent default to stop forms from submitting
          e.preventDefault(); 
        }
        buffer.current = ""; // Reset buffer
        return;
      }

      // If the elapsed time is too long, we assume it's human typing and reset the buffer.
      // But we still append the current character to start a new potential sequence.
      if (elapsed > timeThreshold) {
        buffer.current = e.key;
      } else {
        buffer.current += e.key;
      }

      lastKeyTime.current = now;
    },
    [onScan, timeThreshold, minLength, disabled]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);
}

// In a non-React context, we could export a raw class:
export class BarcodeScannerAdapter {
  private buffer = "";
  private lastKeyTime = 0;
  private timeThreshold = 40;
  private minLength = 3;
  private disabled = false;
  private onScanCallback: ((barcode: string) => void) | null = null;
  private boundHandler: (e: KeyboardEvent) => void;

  constructor() {
    this.boundHandler = this.handleKeyDown.bind(this);
  }

  public listen(callback: (barcode: string) => void) {
    this.onScanCallback = callback;
    window.addEventListener("keydown", this.boundHandler);
  }

  public stop() {
    window.removeEventListener("keydown", this.boundHandler);
  }

  public setDisabled(disabled: boolean) {
    this.disabled = disabled;
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (this.disabled) return;
    if (e.key.length > 1 && e.key !== "Enter") return;

    const now = Date.now();
    const elapsed = now - this.lastKeyTime;

    if (e.key === "Enter") {
      if (this.buffer.length >= this.minLength && elapsed <= this.timeThreshold) {
        if (this.onScanCallback) this.onScanCallback(this.buffer);
        e.preventDefault();
      }
      this.buffer = "";
      return;
    }

    if (elapsed > this.timeThreshold) {
      this.buffer = e.key;
    } else {
      this.buffer += e.key;
    }
    this.lastKeyTime = now;
  }
}
