/** @format */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag,
  ArrowRight,
  Zap,
  CheckCircle2,
  BarChart3,
  Shield,
  Store,
  Layers,
  Printer,
  ScanLine,
  Smartphone,
  ChevronDown,
  Copy,
  Check,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Repeat,
  Sparkles,
  Users,
  Clock,
  ExternalLink,
  Package,
  Receipt,
  FileSpreadsheet,
  Cpu,
  AlertCircle,
  Menu,
  X,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';
import { getRedirectPath } from '@/lib/auth';
import MobileNavDrawer from '@/components/MobileNavDrawer';
import { FooterCookieLink } from '@/components/consent/FooterCookieLink';

// Sample products for the live interactive POS checkout simulator
interface DemoProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  sku: string;
  stock: number;
  tag: string;
}

const DEMO_PRODUCTS: DemoProduct[] = [
  {
    id: 'p1',
    name: 'Cotton Casual Shirt',
    category: 'Apparel',
    price: 2450,
    sku: 'SH-COT-01',
    stock: 18,
    tag: 'Size: L • Blue',
  },
  {
    id: 'p2',
    name: 'Air Mesh Running Shoes',
    category: 'Footwear',
    price: 4200,
    sku: 'SH-AIR-09',
    stock: 12,
    tag: 'Size: 42 • Black',
  },
  {
    id: 'p3',
    name: 'Espresso Beans 500g',
    category: 'Grocery',
    price: 1650,
    sku: 'COF-ESP-50',
    stock: 35,
    tag: 'Fresh Roast',
  },
  {
    id: 'p4',
    name: 'Denim Slim Fit Jeans',
    category: 'Apparel',
    price: 2950,
    sku: 'JN-SLM-22',
    stock: 24,
    tag: 'Size: 32 • Indigo',
  },
  {
    id: 'p5',
    name: 'Laser Barcode Scanner',
    category: 'Hardware',
    price: 3800,
    sku: 'HW-SCN-04',
    stock: 8,
    tag: 'USB 2D Scanner',
  },
  {
    id: 'p6',
    name: 'Leather Bifold Wallet',
    category: 'Accessories',
    price: 1200,
    sku: 'AC-WLT-08',
    stock: 15,
    tag: 'Genuine Tan',
  },
];

interface CartItem {
  product: DemoProduct;
  quantity: number;
}

export default function LandingPage() {
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [dashboardPath, setDashboardPath] = useState('/dashboard');

  // Integration tab selector
  const [activeIntegrationTab, setActiveIntegrationTab] = useState<
    'printers' | 'scanners' | 'ecommerce' | 'api'
  >('printers');
  const [codeCopied, setCodeCopied] = useState(false);
  const [testedHardware, setTestedHardware] = useState(false);

  // Live POS Simulator State
  const [cart, setCart] = useState<CartItem[]>([
    { product: DEMO_PRODUCTS[0], quantity: 1 },
    { product: DEMO_PRODUCTS[2], quantity: 2 },
  ]);
  const [paymentMethod, setPaymentMethod] = useState<
    'cash' | 'card' | 'transfer'
  >('cash');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [saleCompleted, setSaleCompleted] = useState(false);

  // FAQ Accordion State
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  useEffect(() => {
    const token = localStorage.getItem('cityrock_token');
    const stored = localStorage.getItem('cityrock_user');
    if (token && stored) {
      try {
        const u = JSON.parse(stored);
        setUser(u);
        setDashboardPath(getRedirectPath(u.role));
      } catch {
        setUser(null);
      }
    }
  }, []);

  // Cart operations
  const addToCart = (product: DemoProduct) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setSaleCompleted(false);
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart(
      (prev) =>
        prev
          .map((item) => {
            if (item.product.id === productId) {
              const newQty = item.quantity + delta;
              return newQty > 0 ? { ...item, quantity: newQty } : null;
            }
            return item;
          })
          .filter(Boolean) as CartItem[],
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );
  const tax = Math.round(subtotal * 0.05); // 5% GST
  const total = subtotal + tax;

  const handleSimulateCheckout = () => {
    if (cart.length === 0) return;
    setIsCheckingOut(true);
    setTimeout(() => {
      setIsCheckingOut(false);
      setSaleCompleted(true);
    }, 600);
  };

  const resetCart = () => {
    setCart([
      { product: DEMO_PRODUCTS[0], quantity: 1 },
      { product: DEMO_PRODUCTS[2], quantity: 2 },
    ]);
    setSaleCompleted(false);
  };

  const copySnippet = (text: string) => {
    navigator.clipboard.writeText(text);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const testConnection = () => {
    setTestedHardware(true);
    setTimeout(() => setTestedHardware(false), 2500);
  };

  // Integration snippets
  const snippets = {
    printers: `// CityRock ESC/POS Receipt Printer Driver Hook
const printer = new CityRockThermalPrinter({
  interface: "USB" | "BLUETOOTH" | "NETWORK",
  ipAddress: "192.168.1.120",
  port: 9100,
  paperWidth: "80mm",
  autoCut: true,
  openCashDrawer: true
});

// Auto-prints instant receipt on sale completion (<300ms)
await printer.printReceipt({
  receiptNumber: "INV-2026-8841",
  cashier: "Muhammad Usman",
  items: cart.items,
  subtotal: 5750,
  tax: 288,
  total: 6038,
  paymentMethod: "CASH"
});`,
    scanners: `// Handheld 1D/2D Barcode & Digital Scale Listener
const scannerHook = useBarcodeListener({
  prefix: "", // Instant keyboard wedge capture
  minChars: 6,
  onScan: async (barcode) => {
    const product = await cityrockCatalog.findByBarcode(barcode);
    if (product) {
      register.addToCart(product);
      audio.playBeep("success");
    }
  }
});

// Integrated digital scale weight stream
scale.on("weightChange", (grams) => register.setTareWeight(grams));`,
    ecommerce: `// Bi-Directional Shopify & WooCommerce Stock Sync
POST /api/v1/integrations/sync
Headers: { "X-CityRock-Secret": "cr_live_sec_9941af" }
Payload: {
  "event": "inventory.updated",
  "storeId": "store_lahore_gulberg_01",
  "sku": "SH-COT-01",
  "newStockQuantity": 42,
  "syncTo": ["shopify_store", "woocommerce_online"]
}

// 200 OK — Inventory balanced in 14ms across web & physical stores`,
    api: `// Enterprise Retail Webhook & REST API Payload
curl -X POST https://api.cityrockpos.com/v1/sales \\
  -H "Authorization: Bearer cr_token_live_7x89b" \\
  -H "Content-Type: application/json" \\
  -d '{
    "storeBranchId": "store_gulberg_01",
    "cashierId": "usr_9918",
    "customer": { "phone": "03001234567", "name": "Ali Raza" },
    "payment": { "mode": "SPLIT", "cash": 3000, "card": 3038 },
    "items": [{ "sku": "SH-COT-01", "qty": 1, "unitPrice": 2450 }]
  }'`,
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#FFFFFF] overflow-x-hidden selection:bg-[#F7931A]/30 font-sans">
      {/* ── JSON-LD Structured Data Schema for AI & Traditional SEO ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "SoftwareApplication",
                "name": "CityRock POS",
                "applicationCategory": "BusinessApplication",
                "operatingSystem": "Web, Windows, macOS, Android, iOS (Chrome/Edge/Safari)",
                "offers": {
                  "@type": "AggregateOffer",
                  "priceCurrency": "PKR",
                  "lowPrice": "5000",
                  "highPrice": "12000",
                  "offerCount": "2",
                },
                "featureList": [
                  "Offline Cashier POS terminal",
                  "USB and Bluetooth Barcode Scanner Integration",
                  "58mm and 80mm ESC/POS Thermal Receipt Printing",
                  "Multi-branch Central Inventory Synchronization",
                  "Real-time Analytics and Excel/PDF Export",
                  "Staff Role-Based Access Control",
                ],
                "description":
                  "High-performance cloud retail POS and multi-store inventory management platform.",
              },
              {
                "@type": "Organization",
                "name": "CityRock Technologies",
                "url": "https://cityrock.pk",
                "contactPoint": {
                  "@type": "ContactPoint",
                  "email": "support@cityrock.pk",
                  "contactType": "customer service",
                },
              },
              {
                "@type": "FAQPage",
                "mainEntity": [
                  {
                    "@type": "Question",
                    "name": "Does CityRock POS work offline during internet outages?",
                    "acceptedAnswer": {
                      "@type": "Answer",
                      "text":
                        "Yes, CityRock POS has a resilient offline queue that lets cashiers continue scanning barcodes and completing orders even when offline. Queued sales sync automatically once internet connectivity returns.",
                    },
                  },
                  {
                    "@type": "Question",
                    "name": "Which thermal receipt printers and barcode scanners are supported?",
                    "acceptedAnswer": {
                      "@type": "Answer",
                      "text":
                        "CityRock POS works natively with all standard USB HID barcode scanners and 58mm/80mm ESC/POS thermal receipt printers.",
                    },
                  },
                  {
                    "@type": "Question",
                    "name": "Can I operate multiple retail stores from a single account?",
                    "acceptedAnswer": {
                      "@type": "Answer",
                      "text":
                        "Yes, CityRock POS provides central management for multiple store branches, allowing independent branch stock tracking and aggregated sales reporting.",
                    },
                  },
                ],
              },
            ],
          }),
        }}
      />
      {/* ── Sticky Header Navigation ─────────────────────────────────────────────── */}
      <nav className="fixed top-0 w-full z-40 bg-[#0A0A0A]/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <Link
            href="/"
            className="flex items-center gap-3 text-decoration-none group"
          >
            <div className="w-10 h-10 rounded-full bg-[#1A1A1C]  flex items-center justify-center  transition-transform group-hover:scale-105 flex-shrink-0">
              <ShoppingBag size={20} className="text-white" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold tracking-tight text-white whitespace-nowrap">
                CityRock POS
              </span>
              <span className="hidden sm:inline-block text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#F7931A]/10 text-[#F7931A] border border-[#F7931A]/25 whitespace-nowrap">
                CLOUD ERP
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links (Visible on desktop/laptop, strictly hidden on mobile/tablet) */}
          <div className="desktop-nav-group hidden lg:flex items-center gap-4 lg:gap-5 xl:gap-8 text-xs lg:text-sm font-medium text-[#9CA3AF]">
            <Link
              href="#features"
              className="hover:text-white transition-colors"
            >
              Features
            </Link>
            <Link
              href="#integrations"
              className="hover:text-white transition-colors"
            >
              Hardware & APIs
            </Link>
            <Link href="#demo" className="hover:text-white transition-colors">
              Live Register
            </Link>
            <Link
              href="#architecture"
              className="hover:text-white transition-colors"
            >
              Architecture
            </Link>
            <Link
              href="#solutions"
              className="hover:text-white transition-colors"
            >
              Store Types
            </Link>
            <Link href="#faq" className="hover:text-white transition-colors">
              FAQ
            </Link>
          </div>

          {/* Desktop Right Action (Visible on desktop/laptop, strictly hidden on mobile/tablet) */}
          <div className="desktop-nav-group hidden lg:flex items-center gap-3">
            {user ? (
              <Link
                href={dashboardPath}
                className="btn btn-primary text-sm  flex items-center gap-2"
              >
                <span>Go to Dashboard</span>
                <ArrowRight size={16} />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-semibold text-[#9CA3AF] hover:text-white transition-colors px-3 py-2"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="btn btn-primary text-sm  flex items-center gap-1.5"
                >
                  <span>Start Free Trial</span>
                  <ArrowRight size={14} />
                </Link>
              </>
            )}
          </div>

          {/* Mobile Right Controls: High-Performance Morphing Menu Button & Drawer */}
          <MobileNavDrawer user={user} dashboardPath={dashboardPath} />
        </div>
      </nav>

      {/* ── Hero Section ───────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-16 lg:pt-48 lg:pb-28 px-4 sm:px-6 overflow-hidden">
        <div className="max-w-5xl mx-auto text-center relative z-10">
          {/* Top Pill */}
          <div className="inline-flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-full bg-[#1A1A1C] border border-[#2A2A2E] text-[#F7931A] text-xs font-semibold mb-6 sm:mb-8 shadow-sm max-w-full text-center">
            <span className="flex h-2 w-2 rounded-full bg-[#F7931A] animate-pulse flex-shrink-0" />
            <span className="truncate sm:whitespace-normal">
              Next-Gen Cloud Retail Management & POS — Zero Setup Fees
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight text-white mb-6 leading-[1.12] sm:leading-[1.08] break-words">
            Run Retail Checkouts <br className="hidden sm:inline" />
            <span className="text-[#F7931A]">Smarter.</span> No Lag. No
            Downtime. Ever.
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-lg lg:text-xl text-[#9CA3AF] mb-8 sm:mb-10 max-w-3xl mx-auto leading-relaxed">
            The all-in-one cloud POS and multi-store ERP engine engineered for
            high-velocity retail. Real-time inventory synchronization, instant
            offline-ready barcode checkout, and multi-branch telemetry built
            into a unified dark workspace.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            {user ? (
              <Link
                href={dashboardPath}
                className="btn btn-primary btn-lg w-full sm:w-auto  flex items-center justify-center gap-2"
              >
                <span>Launch Your Dashboard</span>
                <ArrowRight size={18} />
              </Link>
            ) : (
              <Link
                href="/signup"
                className="btn btn-primary btn-lg w-full sm:w-auto  flex items-center justify-center gap-2"
              >
                <span>Start 14-Day Free Trial</span>
                <ArrowRight size={18} />
              </Link>
            )}
            <Link
              href="#demo"
              className="btn btn-secondary btn-lg w-full sm:w-auto flex items-center justify-center gap-2 text-white"
            >
              <Sparkles size={16} className="text-[#F7931A]" />
              <span>Explore Live Register Flow</span>
            </Link>
          </div>

          {/* Trust points */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs text-[#6B6B70]">
            <span className="flex items-center gap-1.5">
              <Check size={14} className="text-[#34C759]" /> No credit card
              required
            </span>
            <span className="flex items-center gap-1.5">
              <Check size={14} className="text-[#34C759]" /> Instant setup in 2
              minutes
            </span>
            <span className="flex items-center gap-1.5">
              <Check size={14} className="text-[#34C759]" /> Unlimited registers
              & cashiers
            </span>
          </div>
        </div>
      </section>

      {/* ── Metrics Strip (4 Stat Cards) ──────────────────────────────────────── */}
      <section className="py-10 sm:py-12 bg-[#121212]/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
            <div className="text-center p-3 sm:p-4">
              <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#F7931A] tracking-tight mb-1">
                0.3s
              </div>
              <div className="text-[11px] sm:text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">
                Lightning Checkout
              </div>
              <p className="text-xs text-[#6B6B70] mt-1 hidden sm:block">
                Barcode to printed thermal receipt
              </p>
            </div>
            <div className="text-center p-3 sm:p-4">
              <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#34C759] tracking-tight mb-1">
                99.99%
              </div>
              <div className="text-[11px] sm:text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">
                Offline Resilience
              </div>
              <p className="text-xs text-[#6B6B70] mt-1 hidden sm:block">
                Zero cashier downtime on internet drops
              </p>
            </div>
            <div className="text-center p-3 sm:p-4">
              <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-1">
                100%
              </div>
              <div className="text-[11px] sm:text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">
                Multi-Store Accuracy
              </div>
              <p className="text-xs text-[#6B6B70] mt-1 hidden sm:block">
                Centralized live stock synchronization
              </p>
            </div>
            <div className="text-center p-3 sm:p-4">
              <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#FFA733] tracking-tight mb-1">
                500+
              </div>
              <div className="text-[11px] sm:text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">
                Outlets Powered
              </div>
              <p className="text-xs text-[#6B6B70] mt-1 hidden sm:block">
                Across apparel, marts & wholesalers
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 1: Interactive Integration Hub ────────────────────────────── */}
      <section
        id="integrations"
        className="py-20 sm:py-24 relative px-4 sm:px-6"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1A1A1C] border border-[#2A2A2E] text-[#F7931A] text-xs font-semibold mb-4">
              <Cpu size={14} />
              SEAMLESS HARDWARE & API CONNECTIVITY
            </div>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-4">
              Integrate with Any Platform in Minutes
            </h2>
            <p className="text-[#9CA3AF] max-w-2xl mx-auto text-xs sm:text-base">
              Connect existing counter hardware or link your online shop with
              high-velocity bi-directional sync.
            </p>
          </div>

          <div className="grid lg:grid-cols-12 gap-6 sm:gap-8 items-stretch min-w-0">
            {/* Left Selection Cards */}
            <div className="lg:col-span-5 flex flex-col gap-3 min-w-0">
              {[
                {
                  id: 'printers',
                  title: 'Thermal Receipt Printers',
                  sub: 'ESC/POS, USB, Bluetooth & Network print queues',
                  icon: <Printer size={20} />,
                },
                {
                  id: 'scanners',
                  title: 'Barcode Scanners & Scales',
                  sub: '1D/2D laser continuous scanning & digital tare scales',
                  icon: <ScanLine size={20} />,
                },
                {
                  id: 'ecommerce',
                  title: 'Shopify & WooCommerce',
                  sub: 'Bi-directional stock balance & online order intake',
                  icon: <Store size={20} />,
                },
                {
                  id: 'api',
                  title: 'Custom REST APIs & Webhooks',
                  sub: 'Enterprise webhooks for SAP, Oracle & custom ERPs',
                  icon: <Layers size={20} />,
                },
              ].map((tab) => {
                const isActive = activeIntegrationTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveIntegrationTab(tab.id as any)}
                    className={`text-left p-4 sm:p-5 rounded-2xl border transition-all flex items-start gap-3.5 sm:gap-4 cursor-pointer min-w-0 ${
                      isActive
                        ? 'bg-[#1A1A1C] border-[#F7931A] '
                        : 'bg-[#1A1A1C]/50 border-[#2A2A2E] hover:border-[#404046] hover:bg-[#1A1A1C]'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                        isActive
                          ? 'bg-[#F7931A] text-white'
                          : 'bg-[#232326] text-[#9CA3AF]'
                      }`}
                    >
                      {tab.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className={`font-bold text-sm sm:text-base truncate ${isActive ? 'text-white' : 'text-[#9CA3AF]'}`}
                      >
                        {tab.title}
                      </div>
                      <div className="text-xs text-[#6B6B70] mt-1 leading-relaxed line-clamp-2 sm:line-clamp-none">
                        {tab.sub}
                      </div>
                    </div>
                    {isActive && (
                      <div className="w-2 h-2 rounded-full bg-[#F7931A] mt-2 self-center flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Right Terminal Card */}
            <div className="lg:col-span-7 bg-[#1A1A1C] border border-[#2A2A2E] rounded-2xl p-4 sm:p-6 flex flex-col justify-between shadow-lg relative min-w-0 max-w-full">
              <div className="min-w-0">
                {/* Terminal Header */}
                <div className="flex items-center justify-between pb-4 border-b border-[#2A2A2E] mb-4 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-3 h-3 rounded-full bg-[#FF5A5F]/80 flex-shrink-0" />
                    <div className="w-3 h-3 rounded-full bg-[#FFA733]/80 flex-shrink-0" />
                    <div className="w-3 h-3 rounded-full bg-[#34C759]/80 flex-shrink-0" />
                    <span className="ml-2 text-xs font-mono text-[#6B6B70] truncate">
                      cityrock-driver://{activeIntegrationTab}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() =>
                        copySnippet(snippets[activeIntegrationTab])
                      }
                      className="px-3 py-1 text-xs font-semibold rounded-lg bg-[#232326] hover:bg-[#2d2d31] text-[#9CA3AF] hover:text-white border border-[#2A2A2E] flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {codeCopied ? (
                        <Check size={12} className="text-[#34C759]" />
                      ) : (
                        <Copy size={12} />
                      )}
                      <span>{codeCopied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* Code Content */}
                <pre className="text-xs sm:text-[13px] font-mono leading-relaxed text-[#9CA3AF] overflow-x-auto p-3 sm:p-4 bg-[#0A0A0A] rounded-xl border border-[#2A2A2E]/70 max-w-full">
                  <code className="break-normal">
                    {snippets[activeIntegrationTab]}
                  </code>
                </pre>
              </div>

              {/* Bottom Test status */}
              <div className="mt-6 pt-4 border-t border-[#2A2A2E] flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 min-w-0">
                <div className="flex items-center gap-2 text-xs text-[#9CA3AF] min-w-0">
                  <span className="w-2 h-2 rounded-full bg-[#34C759] animate-pulse flex-shrink-0" />
                  <span className="truncate sm:whitespace-normal">
                    Verified plug & play driver with zero SDK lock-in.
                  </span>
                </div>
                <button
                  onClick={testConnection}
                  disabled={testedHardware}
                  className="btn btn-primary text-xs py-2 px-4 flex items-center gap-2 cursor-pointer w-full sm:w-auto justify-center flex-shrink-0"
                >
                  <Zap size={14} />
                  <span>
                    {testedHardware
                      ? '✓ Connection Ping: 12ms'
                      : 'Simulate Live Test'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 2: Live Interactive POS Register Demo ──────────────────────── */}
      <section
        id="demo"
        className="py-20 sm:py-24 bg-[#121212]/50 px-4 sm:px-6"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1A1A1C] border border-[#2A2A2E] text-[#F7931A] text-xs font-semibold mb-4">
              <Sparkles size={14} />
              LIVE INTERACTIVE PREVIEW
            </div>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-4">
              Experience the Checkout Flow
            </h2>
            <p className="text-[#9CA3AF] max-w-2xl mx-auto text-xs sm:text-base">
              Try the cashier interface directly below. Add items to the cart,
              select payment methods, and test checkout speed.
            </p>
          </div>

          {/* Interactive POS Workspace Card */}
          <div className="bg-[#1A1A1C] border border-[#2A2A2E] rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-lg min-w-0 max-w-full">
            <div className="grid lg:grid-cols-12 gap-6 sm:gap-8 min-w-0">
              {/* Product Catalog Grid (Left 7 cols) */}
              <div className="lg:col-span-7 flex flex-col min-w-0">
                <div className="flex items-center justify-between mb-4 min-w-0">
                  <div className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 truncate">
                    <Package
                      size={16}
                      className="text-[#F7931A] flex-shrink-0"
                    />
                    <span className="truncate">
                      Store Catalog (Click to Add)
                    </span>
                  </div>
                  <span className="text-[11px] text-[#6B6B70] flex-shrink-0">
                    Barcode simulated
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 gap-2.5 sm:gap-3 flex-1 min-w-0">
                  {DEMO_PRODUCTS.map((prod) => {
                    return (
                      <button
                        key={prod.id}
                        onClick={() => addToCart(prod)}
                        className="text-left p-3.5 sm:p-4 rounded-xl bg-[#232326] border border-[#2A2A2E] hover:border-[#F7931A] transition-all flex flex-col justify-between group cursor-pointer min-w-0"
                      >
                        <div className="min-w-0 w-full">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-semibold text-[#F7931A]">
                              {prod.category}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0A0A0A] text-[#9CA3AF] font-mono">
                              {prod.sku}
                            </span>
                          </div>
                          <div className="font-bold text-white text-sm group-hover:text-[#FFA733] transition-colors truncate">
                            {prod.name}
                          </div>
                          <div className="text-xs text-[#6B6B70] mt-0.5 truncate">
                            {prod.tag}
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#2A2A2E]/60 w-full">
                          <span className="font-extrabold text-white text-sm sm:text-base">
                            PKR {prod.price.toLocaleString()}
                          </span>
                          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-[#F7931A]/10 text-[#F7931A] group-hover:bg-[#F7931A] group-hover:text-white transition-colors flex items-center gap-1 flex-shrink-0">
                            <Plus size={12} /> Add
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cart / Register Panel (Right 5 cols) */}
              <div className="lg:col-span-5 bg-[#0A0A0A] border border-[#2A2A2E] rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-inner relative min-w-0">
                <div className="min-w-0">
                  <div className="flex items-center justify-between pb-3 border-b border-[#2A2A2E] mb-4 min-w-0">
                    <div className="flex items-center gap-2 truncate">
                      <Receipt
                        size={18}
                        className="text-[#F7931A] flex-shrink-0"
                      />
                      <span className="font-bold text-white text-sm truncate">
                        Active Bill #8841
                      </span>
                    </div>
                    <button
                      onClick={resetCart}
                      className="text-xs text-[#6B6B70] hover:text-[#FF5A5F] transition-colors cursor-pointer flex-shrink-0"
                    >
                      Clear Bill
                    </button>
                  </div>

                  {/* Cart Items List */}
                  <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 min-w-0">
                    {cart.length === 0 ? (
                      <div className="py-10 text-center text-xs text-[#6B6B70]">
                        Cart is empty. Click any product to add.
                      </div>
                    ) : (
                      cart.map((item) => (
                        <div
                          key={item.product.id}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-[#1A1A1C] border border-[#2A2A2E] min-w-0"
                        >
                          <div className="flex-1 pr-2 min-w-0">
                            <div className="text-xs font-bold text-white truncate">
                              {item.product.name}
                            </div>
                            <div className="text-[11px] text-[#9CA3AF]">
                              PKR {item.product.price.toLocaleString()} each
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => updateCartQty(item.product.id, -1)}
                              className="w-6 h-6 rounded bg-[#232326] flex items-center justify-center text-[#9CA3AF] hover:text-white cursor-pointer"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="text-xs font-bold text-white w-4 text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateCartQty(item.product.id, 1)}
                              className="w-6 h-6 rounded bg-[#232326] flex items-center justify-center text-[#9CA3AF] hover:text-white cursor-pointer"
                            >
                              <Plus size={12} />
                            </button>
                            <button
                              onClick={() => removeFromCart(item.product.id)}
                              className="ml-1 text-[#6B6B70] hover:text-[#FF5A5F] cursor-pointer p-0.5"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Totals & Checkout */}
                <div className="pt-4 border-t border-[#2A2A2E] mt-4 min-w-0">
                  {/* Payment Methods */}
                  <div className="mb-4 min-w-0">
                    <div className="text-[11px] font-semibold text-[#9CA3AF] mb-2 uppercase tracking-wider">
                      Tender Mode
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                      {[
                        {
                          id: 'cash',
                          label: 'Cash',
                          icon: <Banknote size={13} />,
                        },
                        {
                          id: 'card',
                          label: 'Card',
                          icon: <CreditCard size={13} />,
                        },
                        {
                          id: 'transfer',
                          label: 'Raast/Bank',
                          icon: <Repeat size={13} />,
                        },
                      ].map((m) => {
                        const isSel = paymentMethod === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setPaymentMethod(m.id as any)}
                            className={`py-2 px-1 sm:px-2 rounded-xl text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 border transition-all cursor-pointer truncate ${
                              isSel
                                ? 'bg-[#F7931A]/15 border-[#F7931A] text-[#FFA733]'
                                : 'bg-[#1A1A1C] border-[#2A2A2E] text-[#9CA3AF] hover:text-white'
                            }`}
                          >
                            {m.icon}
                            <span className="truncate">{m.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Calculations */}
                  <div className="space-y-1.5 text-xs text-[#9CA3AF] mb-4">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="font-semibold text-white">
                        PKR {subtotal.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>GST Tax (5%)</span>
                      <span className="font-semibold text-white">
                        PKR {tax.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm sm:text-base font-extrabold text-white pt-2 border-t border-[#2A2A2E]">
                      <span>Total Amount</span>
                      <span className="text-[#F7931A]">
                        PKR {total.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Checkout Button */}
                  <button
                    onClick={handleSimulateCheckout}
                    disabled={cart.length === 0 || isCheckingOut}
                    className="btn btn-primary w-full py-2.5 sm:py-3 text-xs sm:text-sm font-bold justify-center cursor-pointer  truncate"
                  >
                    {isCheckingOut ? (
                      <span className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Printing & Syncing...
                      </span>
                    ) : (
                      <span>Complete Sale (PKR {total.toLocaleString()})</span>
                    )}
                  </button>

                  {/* Sale Success Overlay */}
                  <AnimatePresence>
                    {saleCompleted && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-[#121214] border border-[#27272A] rounded-2xl p-4 sm:p-6 flex flex-col items-center justify-center text-center z-20"
                      >
                        <div className="w-12 h-12 rounded-full bg-[#34C759]/15 border border-[#34C759]/30 flex items-center justify-center text-[#34C759] mb-3">
                          <Check size={24} />
                        </div>
                        <h4 className="font-bold text-white text-sm sm:text-base">
                          Receipt #8841 Printed
                        </h4>
                        <p className="text-xs text-[#9CA3AF] mt-1 max-w-[220px]">
                          PKR {total.toLocaleString()} recorded. Stock
                          decremented in cloud.
                        </p>
                        <button
                          onClick={resetCart}
                          className="mt-3 px-4 py-1.5 rounded-full bg-[#F7931A] text-white text-xs font-semibold hover:bg-[#FFA733] transition-colors cursor-pointer"
                        >
                          New Transaction
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 3: Architecture & Comparison ───────────────────────────────── */}
      <section
        id="architecture"
        className="py-20 sm:py-24 relative px-4 sm:px-6"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1A1A1C] border border-[#2A2A2E] text-[#F7931A] text-xs font-semibold mb-4">
              <Shield size={14} />
              MODERN CLOUD VS TRADITIONAL ARCHITECTURE
            </div>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-4">
              How Architecture Protects Your Revenue
            </h2>
            <p className="text-[#9CA3AF] max-w-2xl mx-auto text-xs sm:text-base">
              Why top retailers are ditching traditional desktop software with
              fragile local databases for CityRock&apos;s resilient cloud
              backbone.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 sm:gap-8 items-stretch mb-8 sm:mb-12 min-w-0">
            {/* Card 1: Traditional Legacy Desktop POS */}
            <div className="bg-[#1A1A1C] border border-[#FF5A5F]/30 rounded-2xl sm:rounded-3xl p-5 sm:p-8 relative flex flex-col justify-between min-w-0">
              <div>
                <div className="flex items-center justify-between mb-5 sm:mb-6">
                  <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider px-2.5 sm:px-3 py-1 rounded-full bg-[#FF5A5F]/15 text-[#FF5A5F] border border-[#FF5A5F]/30">
                    Legacy Desktop Software
                  </span>
                  <AlertCircle
                    size={20}
                    className="text-[#FF5A5F] flex-shrink-0"
                  />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
                  Disconnected Local POS
                </h3>
                <p className="text-xs text-[#9CA3AF] mb-5 sm:mb-6">
                  Prone to local machine crashes, manual exports, and
                  overselling.
                </p>

                <ul className="space-y-3 text-xs sm:text-sm text-[#9CA3AF]">
                  <li className="flex items-start gap-2.5">
                    <span className="text-[#FF5A5F] font-bold text-sm flex-shrink-0">
                      ✕
                    </span>
                    <span>
                      Local hard-drive failure causes catastrophic loss of
                      accounts & sales data.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-[#FF5A5F] font-bold text-sm flex-shrink-0">
                      ✕
                    </span>
                    <span>
                      Branches operate blindly without synchronized multi-store
                      inventory.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-[#FF5A5F] font-bold text-sm flex-shrink-0">
                      ✕
                    </span>
                    <span>
                      Software freezes during holiday & weekend rush, driving
                      away customers.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-[#FF5A5F] font-bold text-sm flex-shrink-0">
                      ✕
                    </span>
                    <span>
                      No mobile access — owners must visit stores physically to
                      check daily drawer cash.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-[#FF5A5F] font-bold text-sm flex-shrink-0">
                      ✕
                    </span>
                    <span>
                      Expensive upfront licenses and paid visits every time an
                      update is needed.
                    </span>
                  </li>
                </ul>
              </div>
              <div className="mt-6 sm:mt-8 pt-4 border-t border-[#2A2A2E] text-xs text-[#6B6B70]">
                Requires tedious manual USB backups and localized maintenance.
              </div>
            </div>

            {/* Card 2: CityRock Cloud POS Architecture */}
            <div className="bg-[#1A1A1C] border border-[#F7931A]/40 rounded-2xl sm:rounded-3xl p-5 sm:p-8 relative flex flex-col justify-between  min-w-0">
              {/* Subtle warm wash */}
              <div className="absolute inset-0 bg-transparent from-[#F7931A]/[0.06] to-transparent rounded-2xl sm:rounded-3xl pointer-events-none" />

              <div>
                <div className="flex items-center justify-between mb-5 sm:mb-6">
                  <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider px-2.5 sm:px-3 py-1 rounded-full bg-[#F7931A]/15 text-[#FFA733] border border-[#F7931A]/40">
                    CityRock Cloud Enterprise
                  </span>
                  <CheckCircle2
                    size={20}
                    className="text-[#34C759] flex-shrink-0"
                  />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
                  Unified Multi-Store Cloud ERP
                </h3>
                <p className="text-xs text-[#9CA3AF] mb-5 sm:mb-6">
                  Resilient, automated, and accessible from any device anywhere.
                </p>

                <ul className="space-y-3 text-xs sm:text-sm text-white">
                  <li className="flex items-start gap-2.5">
                    <span className="text-[#34C759] font-bold text-sm flex-shrink-0">
                      ✓
                    </span>
                    <span>
                      Real-time multi-branch cloud sync with automated snapshots
                      and failover.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-[#34C759] font-bold text-sm flex-shrink-0">
                      ✓
                    </span>
                    <span>
                      High-speed offline cashier engine keeps ringing sales
                      during internet dips.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-[#34C759] font-bold text-sm flex-shrink-0">
                      ✓
                    </span>
                    <span>
                      Centralized SKU catalog with dynamic thermal barcode
                      generation and batch alerts.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-[#34C759] font-bold text-sm flex-shrink-0">
                      ✓
                    </span>
                    <span>
                      Live phone dashboard telemetry for revenue, gross profits,
                      and cashier cash floats.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-[#34C759] font-bold text-sm flex-shrink-0">
                      ✓
                    </span>
                    <span>
                      Zero install hassle — runs on any existing Windows PC,
                      MacBook, iPad, or Android tablet.
                    </span>
                  </li>
                </ul>
              </div>
              <div className="mt-6 sm:mt-8 pt-4 border-t border-[#2A2A2E] text-xs text-[#F7931A] font-medium">
                Automatic feature releases & security updates pushed
                continuously with zero downtime.
              </div>
            </div>
          </div>

          {/* 3 Architectural Pillars */}
          <div className="grid md:grid-cols-3 gap-4 sm:gap-6 min-w-0">
            <div className="p-5 sm:p-6 rounded-2xl bg-[#1A1A1C] border border-[#2A2A2E] min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#F7931A]/10 text-[#F7931A] flex items-center justify-center mb-4 flex-shrink-0">
                <Users size={20} />
              </div>
              <h4 className="font-bold text-white text-base mb-2">
                Granular Role Permissions
              </h4>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                Prevent internal shrinkage. Cashiers cannot modify prices or
                delete line items without manager passcode authorization.
              </p>
            </div>
            <div className="p-5 sm:p-6 rounded-2xl bg-[#1A1A1C] border border-[#2A2A2E] min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#F7931A]/10 text-[#F7931A] flex items-center justify-center mb-4 flex-shrink-0">
                <Package size={20} />
              </div>
              <h4 className="font-bold text-white text-base mb-2">
                Automated Low-Stock Alerts
              </h4>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                Smart reorder triggers inform store managers before top-selling
                items hit zero stock, maintaining steady revenue.
              </p>
            </div>
            <div className="p-5 sm:p-6 rounded-2xl bg-[#1A1A1C] border border-[#2A2A2E] min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#F7931A]/10 text-[#F7931A] flex items-center justify-center mb-4 flex-shrink-0">
                <BarChart3 size={20} />
              </div>
              <h4 className="font-bold text-white text-base mb-2">
                Gross Profit Telemetry
              </h4>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                Track your actual bottom-line net profit per sale after
                factoring in cost of goods (COGS), discounts, and tax
                deductions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 4: Simple as 1 - 2 - 3 ─────────────────────────────────────── */}
      <section className="py-20 sm:py-24 bg-[#121212]/50 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1A1A1C] border border-[#2A2A2E] text-[#F7931A] text-xs font-semibold mb-4">
              <Zap size={14} />
              GET STARTED FAST
            </div>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-4">
              Simple as 1 – 2 – 3
            </h2>
            <p className="text-[#9CA3AF] max-w-2xl mx-auto text-xs sm:text-base">
              Go from signing up to ringing up your first sale in under 5
              minutes.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 sm:gap-8 min-w-0">
            {/* Step 1 */}
            <div className="p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-[#1A1A1C] border border-[#2A2A2E] relative group hover:border-[#F7931A]/40 transition-all flex flex-col justify-between min-w-0">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#F7931A]/10 text-[#F7931A] flex items-center justify-center mb-6">
                  <Store size={22} />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
                  Create Store Profile
                </h3>
                <p className="text-xs sm:text-sm text-[#9CA3AF] leading-relaxed">
                  Sign up for free, select your store category (fashion,
                  supermarket, electronics, pharmacy), set currency and sales
                  tax rules.
                </p>
              </div>
              <div className="mt-6 sm:mt-8 text-5xl sm:text-6xl font-black text-white/[0.05] group-hover:text-[#F7931A]/20 transition-colors text-right select-none">
                01
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-[#1A1A1C] border border-[#2A2A2E] relative group hover:border-[#F7931A]/40 transition-all flex flex-col justify-between min-w-0">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#F7931A]/10 text-[#F7931A] flex items-center justify-center mb-6">
                  <FileSpreadsheet size={22} />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
                  Import SKUs & Barcodes
                </h3>
                <p className="text-xs sm:text-sm text-[#9CA3AF] leading-relaxed">
                  Bulk upload product catalog using Excel/CSV, or scan product
                  barcodes directly into the catalog using your handheld
                  scanner.
                </p>
              </div>
              <div className="mt-6 sm:mt-8 text-5xl sm:text-6xl font-black text-white/[0.05] group-hover:text-[#F7931A]/20 transition-colors text-right select-none">
                02
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-[#1A1A1C] border border-[#2A2A2E] relative group hover:border-[#F7931A]/40 transition-all flex flex-col justify-between min-w-0">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#34C759]/10 text-[#34C759] flex items-center justify-center mb-6">
                  <Receipt size={22} />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
                  Ring Up Sales Anywhere
                </h3>
                <p className="text-xs sm:text-sm text-[#9CA3AF] leading-relaxed">
                  Launch the fast POS terminal on any counter PC, laptop, or
                  tablet. Connect thermal receipt printers, take payments, and
                  track reports.
                </p>
              </div>
              <div className="mt-6 sm:mt-8 text-5xl sm:text-6xl font-black text-white/[0.05] group-hover:text-[#34C759]/20 transition-colors text-right select-none">
                03
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 5: Hardware Ecosystem Strip ────────────────────────────────── */}
      <section className="py-12 sm:py-16 bg-[#0A0A0A] px-4 sm:px-6">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-xs font-bold text-[#6B6B70] uppercase tracking-widest mb-6 sm:mb-8">
            Equipping Your Counter With Complete Flexibility
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs font-semibold text-[#9CA3AF]">
            {[
              'Epson Thermal Printers',
              'Star Micronics',
              'Xprinter ESC/POS',
              'Honeywell 2D Scanners',
              'Zebra Barcode Printers',
              'Sunmi Android POS',
              'PAX Terminals',
              'Visa & Mastercard',
              '1Link / Raast Instant',
              'Cash Drawers & Scales',
            ].map((brand, i) => (
              <span
                key={i}
                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#1A1A1C] border border-[#2A2A2E] text-[#9CA3AF] hover:text-white hover:border-[#404046] transition-colors text-[11px] sm:text-xs"
              >
                {brand}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 6: Feature Grid (3x3) ──────────────────────────────────────── */}
      <section id="features" className="py-20 sm:py-24 relative px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1A1A1C] border border-[#2A2A2E] text-[#F7931A] text-xs font-semibold mb-4">
              <Layers size={14} />
              ENTERPRISE-GRADE CAPABILITIES
            </div>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-4">
              Everything You Need to Run Your Retail Chain
            </h2>
            <p className="text-[#9CA3AF] max-w-2xl mx-auto text-xs sm:text-base">
              A comprehensive platform covering counter checkouts, warehouse
              transfers, customer accounts, and vendor payments.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 min-w-0">
            {[
              {
                icon: <Package size={22} className="text-[#F7931A]" />,
                title: 'Real-time Multi-Store Inventory',
                desc: 'Variant matrix (size, color, brand), batch numbers, expiry tracking, and instant alerts when items dip below reorder threshold.',
              },
              {
                icon: <Zap size={22} className="text-[#FFA733]" />,
                title: 'Lightning POS Terminal',
                desc: 'Speed-tuned cashier screen. Barcode scanner ready, keyboard hotkeys, parked carts, and instant split tender (cash + card + bank).',
              },
              {
                icon: <Store size={22} className="text-[#34C759]" />,
                title: 'Inter-Store Stock Transfers',
                desc: 'Transfer stock between branches with dispatch manifests, receiving verification, and in-transit tracking to prevent inventory leakage.',
              },
              {
                icon: <Clock size={22} className="text-[#3B82F6]" />,
                title: 'Cashier Shift & Drawer Audits',
                desc: 'Enforce shift opening floats, track cash-in/cash-out drawer pay-ins, and automate daily closing reconciliation reports.',
              },
              {
                icon: <Users size={22} className="text-[#FF6FA5]" />,
                title: 'Customer Khata & Store Credit',
                desc: 'Maintain customer ledgers (Udhar / Khata), customer purchase histories, loyalty discount tiers, and WhatsApp receipt dispatch.',
              },
              {
                icon: <Receipt size={22} className="text-[#FFD24C]" />,
                title: 'Supplier & Purchase Orders',
                desc: 'Generate purchase orders for vendors, record incoming inventory, track vendor payables, and reconcile unit landed costs.',
              },
              {
                icon: <ScanLine size={22} className="text-[#F7931A]" />,
                title: 'Thermal Barcode Generator',
                desc: 'Design and print custom barcode stickers and shelf price tags directly to thermal label rolls with single or multi-column layouts.',
              },
              {
                icon: <BarChart3 size={22} className="text-[#34C759]" />,
                title: 'Gross Profit & Sales Telemetry',
                desc: 'In-depth gross profit margins, top-selling SKUs, dead stock reports, hourly sales traffic, and cashier performance rankings.',
              },
              {
                icon: <Shield size={22} className="text-[#FFA733]" />,
                title: 'Cloud Backup & Offline Guard',
                desc: '99.99% cloud uptime SLA. Cashiers continue billing even if the internet drops, with background queue sync when connection resumes.',
              },
            ].map((feat, idx) => (
              <div
                key={idx}
                className="p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-[#1A1A1C] border border-[#2A2A2E] hover:border-[#F7931A]/30 transition-all group min-w-0"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#232326] flex items-center justify-center mb-5 sm:mb-6 group-hover:scale-110 transition-transform flex-shrink-0">
                  {feat.icon}
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white mb-2">
                  {feat.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#9CA3AF] leading-relaxed">
                  {feat.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 7: Store Category Personas ─────────────────────────────────── */}
      <section
        id="solutions"
        className="py-20 sm:py-24 bg-[#121212]/50 px-4 sm:px-6"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1A1A1C] border border-[#2A2A2E] text-[#F7931A] text-xs font-semibold mb-4">
              <Store size={14} />
              TAILORED FOR YOUR INDUSTRY
            </div>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-4">
              Built for Every High-Volume Retailer
            </h2>
            <p className="text-[#9CA3AF] max-w-2xl mx-auto text-xs sm:text-base">
              CityRock adapts to the exact workflows of your store category.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 sm:gap-8 min-w-0">
            {/* Persona 1: Fashion */}
            <div className="p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-[#1A1A1C] border border-[#2A2A2E] flex flex-col justify-between hover:border-[#F7931A]/40 transition-colors min-w-0">
              <div>
                <div className="text-3xl mb-4">👕</div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
                  Fashion & Apparel Outlets
                </h3>
                <p className="text-xs text-[#9CA3AF] mb-5 sm:mb-6">
                  Designed for clothing boutiques, shoe stores, and accessories
                  chains.
                </p>

                <ul className="space-y-3 text-xs text-[#9CA3AF]">
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-[#34C759] flex-shrink-0" />{' '}
                    <span>Size & color variant matrix grids</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-[#34C759] flex-shrink-0" />{' '}
                    <span>Barcode label printing for apparel tags</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-[#34C759] flex-shrink-0" />{' '}
                    <span>Seasonal discounts & clearance sales</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-[#34C759] flex-shrink-0" />{' '}
                    <span>Customer return & exchange handling</span>
                  </li>
                </ul>
              </div>
              <div className="mt-6 sm:mt-8 pt-4 border-t border-[#2A2A2E] text-xs font-semibold text-[#F7931A]">
                Average checkout time: 1.8 seconds
              </div>
            </div>

            {/* Persona 2: Supermarkets */}
            <div className="p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-[#1A1A1C] border border-[#F7931A]/40 flex flex-col justify-between relative  min-w-0">
              <div className="absolute top-4 right-4 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F7931A] text-white">
                POPULAR
              </div>
              <div>
                <div className="text-3xl mb-4">🛒</div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
                  Supermarkets & Mini-Marts
                </h3>
                <p className="text-xs text-[#9CA3AF] mb-5 sm:mb-6">
                  Engineered for fast-paced checkout lanes and large SKU
                  volumes.
                </p>

                <ul className="space-y-3 text-xs text-white">
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-[#34C759] flex-shrink-0" />{' '}
                    <span>High-speed continuous barcode scanning</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-[#34C759] flex-shrink-0" />{' '}
                    <span>Digital weigh scale integration for produce</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-[#34C759] flex-shrink-0" />{' '}
                    <span>Wholesale vs retail price tier toggling</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-[#34C759] flex-shrink-0" />{' '}
                    <span>Multi-counter network receipt printing</span>
                  </li>
                </ul>
              </div>
              <div className="mt-6 sm:mt-8 pt-4 border-t border-[#2A2A2E] text-xs font-semibold text-[#FFA733]">
                Proven under 10,000+ daily SKU checkouts
              </div>
            </div>

            {/* Persona 3: Electronics */}
            <div className="p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-[#1A1A1C] border border-[#2A2A2E] flex flex-col justify-between hover:border-[#F7931A]/40 transition-colors min-w-0">
              <div>
                <div className="text-3xl mb-4">📱</div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
                  Electronics & General Retail
                </h3>
                <p className="text-xs text-[#9CA3AF] mb-5 sm:mb-6">
                  Ideal for mobile shops, hardware stores, and home appliances.
                </p>

                <ul className="space-y-3 text-xs text-[#9CA3AF]">
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-[#34C759] flex-shrink-0" />{' '}
                    <span>Serial number & warranty claim tracking</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-[#34C759] flex-shrink-0" />{' '}
                    <span>Customer credit ledger (Khata balance)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-[#34C759] flex-shrink-0" />{' '}
                    <span>Quotation to sales invoice conversion</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-[#34C759] flex-shrink-0" />{' '}
                    <span>Supplier purchase orders & bills</span>
                  </li>
                </ul>
              </div>
              <div className="mt-6 sm:mt-8 pt-4 border-t border-[#2A2A2E] text-xs font-semibold text-[#F7931A]">
                Full warranty tracking included
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 8: Up and Running in 2 Minutes ──────────────────────────────── */}
      <section className="py-20 sm:py-24 relative px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1A1A1C] border border-[#2A2A2E] text-[#F7931A] text-xs font-semibold mb-4">
              <Clock size={14} />
              RAPID ONBOARDING
            </div>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-4">
              Up and Running in 2 Minutes
            </h2>
            <p className="text-[#9CA3AF] max-w-2xl mx-auto text-xs sm:text-base">
              No server installation, no technician visits. Accessible
              immediately in any modern browser.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto mb-10 sm:mb-12 min-w-0">
            <div className="p-5 sm:p-6 rounded-2xl bg-[#1A1A1C] border border-[#2A2A2E] flex items-start gap-4 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#F7931A]/10 text-[#F7931A] flex items-center justify-center flex-shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-white text-sm mb-1">
                  Zero Hardware Lock-In
                </h4>
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  Runs smoothly on your existing Windows PC, laptop, MacBook,
                  iPad, or Android tablet.
                </p>
              </div>
            </div>
            <div className="p-5 sm:p-6 rounded-2xl bg-[#1A1A1C] border border-[#2A2A2E] flex items-start gap-4 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#F7931A]/10 text-[#F7931A] flex items-center justify-center flex-shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-white text-sm mb-1">
                  1-Click Excel SKU Migration
                </h4>
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  Import your existing product prices, barcodes, and opening
                  stock counts with our ready Excel template.
                </p>
              </div>
            </div>
            <div className="p-5 sm:p-6 rounded-2xl bg-[#1A1A1C] border border-[#2A2A2E] flex items-start gap-4 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#F7931A]/10 text-[#F7931A] flex items-center justify-center flex-shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-white text-sm mb-1">
                  Thermal Printer Auto-Detection
                </h4>
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  Plug in any standard 80mm or 58mm thermal receipt printer via
                  USB, Bluetooth, or LAN.
                </p>
              </div>
            </div>
            <div className="p-5 sm:p-6 rounded-2xl bg-[#1A1A1C] border border-[#2A2A2E] flex items-start gap-4 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#F7931A]/10 text-[#F7931A] flex items-center justify-center flex-shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-white text-sm mb-1">
                  Instant Cashier Invitations
                </h4>
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  Add staff and cashier accounts with restricted permissions in
                  just 2 clicks.
                </p>
              </div>
            </div>
          </div>

          <div className="text-center">
            <Link
              href="/signup"
              className="btn btn-primary btn-lg  inline-flex items-center gap-2"
            >
              <span>Start Your Free Trial Now</span>
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Section 9: Value Prop Card Banner ─────────────────────────────────── */}
      <section className="py-10 sm:py-12 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="relative rounded-2xl sm:rounded-3xl bg-[#1A1A1C] border border-[#F7931A]/30 p-6 sm:p-14 text-center overflow-hidden shadow-lg min-w-0">
            {/* Ambient warm gradient top wash */}
            <div className="absolute inset-0 bg-transparent from-[#F7931A]/10 to-transparent pointer-events-none" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0A0A0A] border border-[#2A2A2E] text-[#F7931A] text-xs font-semibold mb-6">
                14 DAYS UNRESTRICTED ACCESS
              </div>
              <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight mb-4">
                Enterprise Power. <br className="hidden sm:inline" />
                <span className="text-[#F7931A]">No Strings Attached.</span>
              </h2>
              <p className="text-[#9CA3AF] max-w-xl mx-auto text-xs sm:text-base mb-8">
                Test CityRock POS in your live retail environment. Unlimited
                registers, barcode printing, multi-store inventory, and WhatsApp
                receipts included.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                <Link
                  href="/signup"
                  className="btn btn-primary btn-lg w-full sm:w-auto "
                >
                  Create Free Store Account
                </Link>
                <Link
                  href="/login"
                  className="btn btn-secondary btn-lg w-full sm:w-auto text-white"
                >
                  Sign In to Existing Account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 10: FAQ Accordion ─────────────────────────────────────────── */}
      <section id="faq" className="py-20 sm:py-24 bg-[#121212]/50 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1A1A1C] border border-[#2A2A2E] text-[#F7931A] text-xs font-semibold mb-4">
              FREQUENTLY ASKED QUESTIONS
            </div>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-4">
              Common Questions
            </h2>
            <p className="text-[#9CA3AF] text-xs sm:text-base">
              Everything you need to know about setting up and running CityRock
              POS.
            </p>
          </div>

          <div className="space-y-3 min-w-0">
            {[
              {
                q: 'What hardware do I need to run CityRock POS?',
                a: 'You can use any standard computer, laptop, MacBook, iPad, or Android tablet. CityRock POS connects seamlessly to standard USB, Bluetooth, or LAN thermal receipt printers (80mm and 58mm) as well as handheld 1D and 2D barcode scanners.',
              },
              {
                q: 'Can I use CityRock POS if my internet goes down?',
                a: "Yes! CityRock's POS register incorporates an offline-first cashier engine. Your cashiers can continue scanning barcodes, ringing up items, and printing receipts. When internet connection returns, all cached transactions sync back to the cloud automatically.",
              },
              {
                q: 'Does CityRock support multiple store branches and warehouses?',
                a: 'Absolutely. You can manage multiple store branches and central warehouses from a single unified account. You can track inventory levels across all locations and initiate inter-store stock transfers with formal dispatch verification.',
              },
              {
                q: 'Can I import my existing product catalog from Excel?',
                a: 'Yes. CityRock provides an intuitive CSV/Excel import tool. You can download our sample spreadsheet, paste in your product names, categories, barcodes, cost prices, and retail prices, and import thousands of SKUs in seconds.',
              },
              {
                q: 'How does cashier shift closing and cash reconciliation work?',
                a: 'At the start of each cashier shift, the cashier enters the opening cash float. Throughout the shift, all cash, card, and digital transactions are logged. At closing, the cashier performs a blind count, and CityRock produces an audit report showing exact over/short discrepancies.',
              },
              {
                q: 'Can I print custom barcode stickers and shelf price tags?',
                a: 'Yes. CityRock has an integrated thermal barcode label generator. You can generate standard barcodes (EAN-13, Code 128) and print them directly to your thermal barcode sticker printer in single or multi-column formats.',
              },
              {
                q: "Is my store's financial data secure and backed up?",
                a: 'All data is encrypted in transit and at rest using bank-grade SSL encryption. We perform automated daily cloud database backups with redundancy across enterprise cloud data centers to guarantee your financial records are never lost.',
              },
              {
                q: 'How does the 14-day free trial work?',
                a: 'When you sign up, your 14-day free trial activates instantly. All features are fully unlocked without restrictions. No credit card is required. You can upgrade to a monthly or annual plan at any time.',
              },
            ].map((item, idx) => {
              const isOpen = expandedFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-[#1A1A1C] border border-[#2A2A2E] overflow-hidden transition-colors min-w-0"
                >
                  <button
                    onClick={() => setExpandedFaq(isOpen ? null : idx)}
                    className="w-full text-left p-4 sm:p-6 flex items-center justify-between gap-3 sm:gap-4 cursor-pointer"
                  >
                    <span className="font-bold text-white text-sm sm:text-base">
                      {item.q}
                    </span>
                    <ChevronDown
                      size={18}
                      className={`text-[#F7931A] flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="px-4 pb-4 sm:px-6 sm:pb-6 text-xs sm:text-sm text-[#9CA3AF] leading-relaxed border-t border-[#2A2A2E]/60 pt-4">
                          {item.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Section 11: Final Call to Action ───────────────────────────────────── */}
      <section className="py-16 sm:py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-2xl sm:rounded-3xl bg-[#1A1A1C] border border-[#2A2A2E] p-6 sm:p-14 text-center relative overflow-hidden shadow-lg min-w-0">
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 max-w-full h-96   pointer-events-none" />

            <div className="relative z-10">
              <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight mb-4">
                Welcome back. <br />
                <span className="text-[#F7931A]">Your dashboard awaits.</span>
              </h2>
              <p className="text-[#9CA3AF] max-w-lg mx-auto text-xs sm:text-base mb-8 leading-relaxed">
                Join high-growth retail stores and chains using CityRock POS to
                accelerate counter sales and manage stock.
              </p>

              <div className="flex justify-center">
                {user ? (
                  <Link
                    href={dashboardPath}
                    className="btn btn-primary btn-lg  flex items-center gap-2"
                  >
                    <span>Go to Dashboard</span>
                    <ArrowRight size={18} />
                  </Link>
                ) : (
                  <Link
                    href="/signup"
                    className="btn btn-primary btn-lg  flex items-center gap-2"
                  >
                    <span>Start Free Trial</span>
                    <ArrowRight size={18} />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────────── */}
      <footer className="py-12 sm:py-14 bg-[#0A0A0A] text-[#9CA3AF] text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-8 mb-12 min-w-0">
            {/* Column 1: Brand info */}
            <div className="sm:col-span-2 min-w-0">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-[#1A1A1C]  flex items-center justify-center flex-shrink-0">
                  <ShoppingBag size={16} className="text-white" />
                </div>
                <span className="font-extrabold text-white text-base">
                  CityRock POS
                </span>
              </div>
              <p className="text-xs text-[#6B6B70] leading-relaxed max-w-sm mb-4">
                Cloud-native retail POS and inventory management platform
                designed for speed, offline resilience, and multi-store scale.
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1A1A1C] border border-[#2A2A2E] text-[11px] text-[#34C759]">
                <span className="w-2 h-2 rounded-full bg-[#34C759] animate-pulse flex-shrink-0" />
                <span>All Systems Operational (99.99% SLA)</span>
              </div>
            </div>

            {/* Column 2: Product */}
            <div className="min-w-0">
              <div className="font-bold text-white text-xs uppercase tracking-wider mb-4">
                Product
              </div>
              <ul className="space-y-2.5">
                <li>
                  <Link
                    href="#demo"
                    className="hover:text-white transition-colors"
                  >
                    POS Terminal
                  </Link>
                </li>
                <li>
                  <Link
                    href="#features"
                    className="hover:text-white transition-colors"
                  >
                    Multi-Store Inventory
                  </Link>
                </li>
                <li>
                  <Link
                    href="#features"
                    className="hover:text-white transition-colors"
                  >
                    Barcode Generator
                  </Link>
                </li>
                <li>
                  <Link
                    href="#features"
                    className="hover:text-white transition-colors"
                  >
                    Gross Profit Reports
                  </Link>
                </li>
                <li>
                  <Link
                    href="#integrations"
                    className="hover:text-white transition-colors"
                  >
                    Hardware Drivers
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Hardware */}
            <div className="min-w-0">
              <div className="font-bold text-white text-xs uppercase tracking-wider mb-4">
                Hardware
              </div>
              <ul className="space-y-2.5">
                <li>
                  <span className="hover:text-white transition-colors">
                    Thermal Receipt Printers
                  </span>
                </li>
                <li>
                  <span className="hover:text-white transition-colors">
                    1D/2D Barcode Scanners
                  </span>
                </li>
                <li>
                  <span className="hover:text-white transition-colors">
                    Electronic Cash Drawers
                  </span>
                </li>
                <li>
                  <span className="hover:text-white transition-colors">
                    Digital Weigh Scales
                  </span>
                </li>
                <li>
                  <span className="hover:text-white transition-colors">
                    Android Smart Terminals
                  </span>
                </li>
              </ul>
            </div>

            {/* Column 4: Account & Legal */}
            <div className="min-w-0">
              <div className="font-bold text-white text-xs uppercase tracking-wider mb-4">
                Access & Legal
              </div>
              <ul className="space-y-2.5">
                <li>
                  <Link
                    href="/login"
                    className="hover:text-white transition-colors"
                  >
                    Sign In
                  </Link>
                </li>
                <li>
                  <Link
                    href="/signup"
                    className="hover:text-white transition-colors"
                  >
                    Start Free Trial
                  </Link>
                </li>
                <li>
                  <Link
                    href="/forgot-password"
                    className="hover:text-white transition-colors"
                  >
                    Forgot Password
                  </Link>
                </li>
                <li>
                  <Link
                    href="#faq"
                    className="hover:text-white transition-colors"
                  >
                    Support FAQ
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy-policy"
                    className="hover:text-white transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/cookie-policy"
                    className="hover:text-white transition-colors"
                  >
                    Cookie Policy
                  </Link>
                </li>
                <li>
                  <FooterCookieLink />
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-[#2A2A2E] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6B6B70]">
            <p>
              © {new Date().getFullYear()} CityRock POS. All rights reserved.
            </p>
            <p className="flex items-center gap-1">
              Built with precision for modern high-velocity retail.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
