import { randomUUID } from "node:crypto";
import { getEnv } from "@/lib/env";

export type StudentPaymentMethod = "TRANSFER_BANK" | "VIRTUAL_ACCOUNT" | "QRIS" | "E_WALLET";

export type ProviderRequest = {
  invoiceNo: string;
  amount: number;
  studentName: string;
  studentEmail: string;
  method: StudentPaymentMethod;
  evidenceKey?: string;
};

export type ProviderResult = {
  providerRef: string;
  instructions?: string;
  redirectUrl?: string;
  evidenceKey?: string;
};

export interface PaymentProvider {
  createPayment(request: ProviderRequest): Promise<ProviderResult>;
}

export class ManualTransferProvider implements PaymentProvider {
  async createPayment(request: ProviderRequest): Promise<ProviderResult> {
    if (!request.evidenceKey) throw new Error("Unggah bukti transfer untuk melanjutkan.");
    return {
      providerRef: randomUUID(),
      evidenceKey: request.evidenceKey,
      instructions: "Bukti transfer diterima dan menunggu pemeriksaan panitia.",
    };
  }
}

export class MidtransProvider implements PaymentProvider {
  async createPayment(request: ProviderRequest): Promise<ProviderResult> {
    const { MIDTRANS_SERVER_KEY } = getEnv();
    if (!MIDTRANS_SERVER_KEY) throw new Error("Pembayaran elektronik belum dikonfigurasi.");
    const orderId = `${request.invoiceNo.replaceAll("/", "-")}-${randomUUID().slice(0, 8)}`;
    const response = await fetch("https://app.sandbox.midtrans.com/snap/v1/transactions", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${MIDTRANS_SERVER_KEY}:`).toString("base64")}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        transaction_details: { order_id: orderId, gross_amount: Math.round(request.amount) },
        customer_details: { first_name: request.studentName, email: request.studentEmail },
        enabled_payments: [request.method === "VIRTUAL_ACCOUNT" ? "bank_transfer" : request.method === "QRIS" ? "qris" : "gopay"],
      }),
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Penyedia pembayaran belum dapat memproses permintaan ini.");
    const result = await response.json() as { token?: string; redirect_url?: string };
    if (!result.redirect_url) throw new Error("Penyedia pembayaran tidak mengirimkan tautan pembayaran.");
    return { providerRef: orderId, redirectUrl: result.redirect_url };
  }

  async checkStatus(providerRef: string): Promise<"BERHASIL" | "MENUNGGU" | "GAGAL"> {
    const { MIDTRANS_SERVER_KEY } = getEnv();
    if (!MIDTRANS_SERVER_KEY) throw new Error("Pembayaran elektronik belum dikonfigurasi.");
    const response = await fetch(`https://api.sandbox.midtrans.com/v2/${encodeURIComponent(providerRef)}/status`, {
      headers: { Authorization: `Basic ${Buffer.from(`${MIDTRANS_SERVER_KEY}:`).toString("base64")}` },
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Status pembayaran belum dapat diperiksa.");
    const result = await response.json() as { transaction_status?: string; fraud_status?: string };
    if (result.transaction_status === "settlement" || (result.transaction_status === "capture" && result.fraud_status !== "challenge")) return "BERHASIL";
    if (result.transaction_status === "pending") return "MENUNGGU";
    if (result.transaction_status === "expire" || result.transaction_status === "cancel" || result.transaction_status === "deny") return "GAGAL";
    return "MENUNGGU";
  }
}

export const manualTransferProvider = new ManualTransferProvider();
export const midtransProvider = new MidtransProvider();
