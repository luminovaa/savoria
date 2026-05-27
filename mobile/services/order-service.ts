import { request } from "./api-client";

export type SubmitOrderResult = {
  order_id: string;
  invoice_number: string;
  total_amount: number;
  changes: number;
  status: string;
};

export function submitOrder(payload: {
  client_order_id: string;
  customer?: string;
  items: { menu_id: number; quantity: number }[];
  payment_type: "cash" | "qris";
  paid: number | null;
}) {
  return request<SubmitOrderResult>("/v1/orders/checkout", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
