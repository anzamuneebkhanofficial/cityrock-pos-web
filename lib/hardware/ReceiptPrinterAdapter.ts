export interface ReceiptData {
  businessName: string;
  storeName: string;
  address?: string;
  phone?: string;
  invoiceNumber: string;
  date: string;
  cashier: string;
  customer?: { name: string; phone?: string };
  items: {
    productName: string;
    variantLabel?: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  amountPaid: number;
  changeGiven: number;
  paymentMethod: string;
  footerNote?: string;
}

export interface IReceiptPrinter {
  type: string;
  print(receipt: ReceiptData): Promise<boolean>;
  test(): Promise<boolean>;
}

/**
 * 1. BROWSER PRINTER
 * Uses an invisible iframe to render HTML and invokes the native browser print dialog.
 * Highly compatible, works everywhere, zero setup, but requires user interaction (hitting "Print").
 */
export class BrowserPrinterAdapter implements IReceiptPrinter {
  type = "browser";

  async print(receipt: ReceiptData): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const html = this.generateHtml(receipt);
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.top = '-9999px';
        iframe.style.width = '0px';
        iframe.style.height = '0px';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow?.document;
        if (!doc) throw new Error("Iframe not accessible");

        doc.open();
        doc.write(html);
        doc.close();

        // Wait for styles/fonts to load
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          
          // Cleanup
          setTimeout(() => {
            document.body.removeChild(iframe);
            resolve(true);
          }, 1000);
        }, 200);

      } catch (err) {
        console.error("Browser print failed:", err);
        resolve(false);
      }
    });
  }

  async test(): Promise<boolean> {
    const testData: ReceiptData = {
      businessName: "Hardware Test Store",
      storeName: "Test Branch",
      invoiceNumber: "TEST-0001",
      date: new Date().toLocaleString(),
      cashier: "Admin",
      items: [
        { productName: "Test Product A", quantity: 1, unitPrice: 1500, lineTotal: 1500 }
      ],
      subtotal: 1500, discount: 0, tax: 0, total: 1500, amountPaid: 1500, changeGiven: 0, paymentMethod: "cash",
      footerNote: "Test print successful"
    };
    return this.print(testData);
  }

  private generateHtml(r: ReceiptData): string {
    return `
      <html>
        <head>
          <style>
            body { font-family: monospace; width: 300px; margin: 0 auto; color: #000; }
            .center { text-align: center; }
            .flex { display: flex; justify-content: space-between; }
            hr { border-top: 1px dashed #000; border-bottom: none; }
            .bold { font-weight: bold; }
          </style>
        </head>
        <body>
          <h2 class="center" style="margin-bottom: 4px;">${r.businessName}</h2>
          <div class="center">${r.storeName}</div>
          ${r.address ? `<div class="center">${r.address}</div>` : ""}
          ${r.phone ? `<div class="center">${r.phone}</div>` : ""}
          <hr />
          <div class="flex"><span>Invoice:</span> <span>${r.invoiceNumber}</span></div>
          <div class="flex"><span>Date:</span> <span>${r.date}</span></div>
          <div class="flex"><span>Cashier:</span> <span>${r.cashier}</span></div>
          ${r.customer ? `<div class="flex"><span>Customer:</span> <span>${r.customer.name}</span></div>` : ""}
          <hr />
          ${r.items.map(i => `
            <div>
              <div class="bold">${i.productName}</div>
              ${i.variantLabel ? `<div><small>${i.variantLabel}</small></div>` : ""}
              <div class="flex">
                <span>${i.quantity} x ${i.unitPrice}</span>
                <span>${i.lineTotal}</span>
              </div>
            </div>
          `).join('')}
          <hr />
          <div class="flex"><span>Subtotal:</span> <span>${r.subtotal}</span></div>
          ${r.discount > 0 ? `<div class="flex"><span>Discount:</span> <span>-${r.discount}</span></div>` : ""}
          <div class="flex bold" style="font-size: 1.2em; margin-top: 5px;"><span>Total:</span> <span>${r.total}</span></div>
          <hr />
          <div class="flex"><span>Paid (${r.paymentMethod}):</span> <span>${r.amountPaid}</span></div>
          <div class="flex"><span>Change:</span> <span>${r.changeGiven}</span></div>
          <hr />
          <div class="center" style="margin-top: 10px;">${r.footerNote || "Thank you!"}</div>
        </body>
      </html>
    `;
  }
}

/**
 * 2. LOCAL BRIDGE PRINTER (e.g., QZ Tray or local Node agent)
 * Sends raw ESC/POS commands over WebSockets to a local proxy app.
 * This is a STUB demonstrating the architectural boundary.
 */
export class LocalBridgePrinterAdapter implements IReceiptPrinter {
  type = "local_bridge";
  private bridgeUrl: string;

  constructor(bridgeUrl = "ws://localhost:8182") {
    this.bridgeUrl = bridgeUrl;
  }

  async print(receipt: ReceiptData): Promise<boolean> {
    console.log("[BridgePrinter] Preparing ESC/POS commands for:", receipt.invoiceNumber);
    // In a real implementation, we would construct the ESC/POS hex array
    // and send it over WebSocket to QZ Tray or our custom agent.
    
    return new Promise((resolve) => {
      console.log(`[BridgePrinter] Attempting connection to ${this.bridgeUrl}...`);
      setTimeout(() => {
        // Simulating failure since we don't have a real bridge running
        console.warn(`[BridgePrinter] Connection to ${this.bridgeUrl} failed. Local bridge not detected.`);
        resolve(false); 
      }, 500);
    });
  }

  async test(): Promise<boolean> {
    return this.print({ invoiceNumber: "TEST" } as ReceiptData);
  }
}

/**
 * Factory to get the configured printer adapter.
 */
export function getConfiguredPrinter(): IReceiptPrinter {
  // We can read this from localStorage that was set by the Hardware Settings page
  if (typeof window !== "undefined") {
    const config = localStorage.getItem("cityrock_hardware_config");
    if (config) {
      const parsed = JSON.parse(config);
      if (parsed.printerType === "local_bridge") {
        return new LocalBridgePrinterAdapter(parsed.bridgeUrl);
      }
    }
  }
  return new BrowserPrinterAdapter();
}
