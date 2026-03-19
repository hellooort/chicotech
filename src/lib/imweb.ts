const IMWEB_API_BASE = "https://api.imweb.me/v2";

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const key = process.env.IMWEB_API_KEY;
  const secret = process.env.IMWEB_API_SECRET;

  if (!key || !secret) {
    throw new Error("IMWEB_API_KEY 또는 IMWEB_API_SECRET이 설정되지 않았습니다.");
  }

  const res = await fetch(
    `${IMWEB_API_BASE}/auth?key=${encodeURIComponent(key)}&secret=${encodeURIComponent(secret)}`
  );

  if (!res.ok) {
    throw new Error(`아임웹 인증 실패: ${res.status}`);
  }

  const data = await res.json();

  if (data.code !== 200 || !data.access_token) {
    throw new Error(`아임웹 인증 실패: ${data.msg || "unknown error"}`);
  }

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + 55 * 60 * 1000, // 55분 (만료 전 여유)
  };

  return cachedToken.token;
}

export interface ImwebOrder {
  orderNo: string;
  customerName: string;
  orderStatus: string;
  orderedAt?: string;
}

export async function fetchImwebOrders(startDate?: string, endDate?: string): Promise<ImwebOrder[]> {
  const token = await getAccessToken();

  const params = new URLSearchParams();
  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);

  const url = `${IMWEB_API_BASE}/shop/orders${params.toString() ? `?${params}` : ""}`;

  const res = await fetch(url, {
    headers: {
      "access-token": token,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`아임웹 주문 조회 실패: ${res.status}`);
  }

  const data = await res.json();

  if (data.code !== 200) {
    throw new Error(`아임웹 주문 조회 실패: ${data.msg || "unknown error"}`);
  }

  const orders: ImwebOrder[] = (data.data?.list || []).map((o: Record<string, unknown>) => {
    const orderer = o.orderer as Record<string, unknown> | undefined;
    return {
      orderNo: String(o.order_no || o.orderNo || ""),
      customerName: String(orderer?.name || ""),
      orderStatus: String(o.order_status || o.orderStatus || ""),
      orderedAt: String(o.ordered_at || o.orderedAt || o.order_time || ""),
    };
  });

  return orders;
}
