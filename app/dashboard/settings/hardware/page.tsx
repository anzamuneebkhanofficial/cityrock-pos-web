"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Printer, ScanLine, Settings, Save, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { useBarcodeScanner } from "@/lib/hardware/BarcodeScannerAdapter";
import { getConfiguredPrinter, ReceiptData, BrowserPrinterAdapter, LocalBridgePrinterAdapter } from "@/lib/hardware/ReceiptPrinterAdapter";
import toast from "react-hot-toast";
import CustomSelect from "@/components/ui/CustomSelect";

export default function HardwareSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  
  const [printerType, setPrinterType] = useState("browser");
  const [bridgeUrl, setBridgeUrl] = useState("ws://localhost:8182");
  
  // Scanner test state
  const [lastScan, setLastScan] = useState<{ barcode: string; timestamp: Date } | null>(null);
  
  useEffect(() => {
    const storedUser = localStorage.getItem("cityrock_user");
    if (!storedUser) { router.replace("/login"); return; }
    setUser(JSON.parse(storedUser));
    
    // Load config
    const config = localStorage.getItem("cityrock_hardware_config");
    if (config) {
      const parsed = JSON.parse(config);
      setPrinterType(parsed.printerType || "browser");
      if (parsed.bridgeUrl) setBridgeUrl(parsed.bridgeUrl);
    }
  }, [router]);

  const saveConfig = () => {
    localStorage.setItem("cityrock_hardware_config", JSON.stringify({
      printerType, bridgeUrl
    }));
    toast.success("Hardware configuration saved");
  };

  const testPrinter = async () => {
    const testData: ReceiptData = {
      businessName: "Hardware Test Store",
      storeName: "Test Branch",
      invoiceNumber: "TEST-" + Math.floor(Math.random() * 10000),
      date: new Date().toLocaleString(),
      cashier: user?.name || "Admin",
      items: [
        { productName: "Test Product A", quantity: 1, unitPrice: 1500, lineTotal: 1500 }
      ],
      subtotal: 1500, discount: 0, tax: 0, total: 1500, amountPaid: 1500, changeGiven: 0, paymentMethod: "cash",
      footerNote: "Hardware integration test successful"
    };

    let printer;
    if (printerType === "local_bridge") {
      printer = new LocalBridgePrinterAdapter(bridgeUrl);
    } else {
      printer = new BrowserPrinterAdapter();
    }

    const success = await printer.print(testData);
    if (success) {
      toast.success("Test print dispatched successfully");
    } else {
      toast.error("Test print failed. Check connections.");
    }
  };

  // Listen for barcode scans
  useBarcodeScanner({
    onScan: (barcode) => {
      setLastScan({ barcode, timestamp: new Date() });
      toast.success(`Scanned: ${barcode}`);
    }
  });

  if (!user) {
    return (
      <main className="main-content" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        Loading...
      </main>
    );
  }

  return (
    <main className="main-content">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h1 className="page-title">Hardware Settings</h1>
              <p className="page-subtitle">Configure scanners and receipt printers for this register</p>
            </div>
            <button onClick={saveConfig} className="btn btn-primary" style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <Save size={16} /> Save Configuration
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {/* PRINTER SETTINGS */}
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid var(--border-subtle)", paddingBottom: 12 }}>
                <Printer size={24} color="var(--accent-primary)" />
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>Receipt Printer</h2>
              </div>
              
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--text-secondary)" }}>Printer Interface</label>
                <CustomSelect 
                  className="input" 
                  value={printerType} 
                  onChange={(val) => setPrinterType(val)}
                  options={[
                    { value: "browser", label: "Browser Print Dialog (Universal / USB / Network)" },
                    { value: "local_bridge", label: "Local Agent / Bridge (QZ Tray / ESC-POS)" }
                  ]}
                />
              </div>

              {printerType === "local_bridge" && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--text-secondary)" }}>Bridge WebSocket URL</label>
                  <input 
                    type="text" 
                    className="input" 
                    value={bridgeUrl}
                    onChange={(e) => setBridgeUrl(e.target.value)}
                    style={{ width: "100%", padding: 10 }}
                  />
                  <p style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Example: ws://localhost:8182 for QZ Tray</p>
                </motion.div>
              )}

              <div style={{ background: "rgba(255,255,255,0.03)", padding: 16, borderRadius: 10, border: "1px solid var(--border-subtle)", marginTop: "auto" }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 8px 0", color: "var(--text-primary)" }}>Printer Test</h3>
                <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 12px 0" }}>Ensure your printer is connected and turned on.</p>
                <button onClick={testPrinter} className="btn btn-secondary" style={{ width: "100%", justifyContent: "center" }}>
                  Print Test Receipt
                </button>
              </div>
            </div>

            {/* SCANNER SETTINGS */}
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid var(--border-subtle)", paddingBottom: 12 }}>
                <ScanLine size={24} color="var(--accent-primary)" />
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>Barcode Scanner</h2>
              </div>
              
              <div style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: 10, padding: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 8px 0", color: "var(--accent-primary)", display: "flex", alignItems: "center", gap: 6 }}>
                  <AlertCircle size={16} /> USB HID Scanner Detected
                </h3>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
                  The system automatically detects generic USB/Bluetooth barcode scanners operating in keyboard-emulation mode. No special drivers are required.
                </p>
              </div>

              <div style={{ flex: 1, border: "2px dashed var(--border-subtle)", borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.02)", minHeight: 200, padding: 20 }}>
                {lastScan ? (
                  <div style={{ textAlign: "center" }}>
                    <CheckCircle2 size={48} color="#10b981" style={{ margin: "0 auto 12px" }} />
                    <div style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 4 }}>Last scanned:</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", fontFamily: "monospace" }}>{lastScan.barcode}</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 8 }}>{lastScan.timestamp.toLocaleTimeString()}</div>
                  </div>
                ) : (
                  <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
                    <ScanLine size={48} style={{ margin: "0 auto 12px", opacity: 0.5, color: "var(--accent-primary)" }} />
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>Ready to scan</p>
                    <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#64748b" }}>Scan any barcode with your handheld reader</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </main>
  );
}

