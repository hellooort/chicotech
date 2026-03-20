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
  productName: string;
  productOption: string;
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

  const orderList = data.data?.list || [];
  const orders: ImwebOrder[] = [];

  for (const o of orderList) {
    const orderer = (o as Record<string, unknown>).orderer as Record<string, unknown> | undefined;
    const orderNo = String((o as Record<string, unknown>).order_no || "");

    let productName = "";
    let productOption = "";

    // 상품 상세 정보 가져오기 (rate limit 주의: 1초 간격)
    try {
      const prodRes = await fetch(`${IMWEB_API_BASE}/shop/orders/${orderNo}/prod-orders`, {
        headers: { "access-token": token },
      });
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        if (prodData.code === 200 && prodData.data?.length > 0) {
          const items = prodData.data.flatMap((po: Record<string, unknown>) =>
            ((po.items as Record<string, unknown>[]) || [])
          );
          productName = items.map((i: Record<string, unknown>) => String(i.prod_name || "")).filter(Boolean).join(", ");
          const options = items.flatMap((i: Record<string, unknown>) => {
            const opts = i.options as Record<string, unknown>[] | undefined;
            if (!opts) return [];
            return opts.map((opt) => `${opt.name || ""}: ${opt.value || ""}`);
          });
          if (options.length > 0) productOption = options.join(", ");
        }
      }
    } catch {
      // 상품 정보 실패해도 주문 자체는 계속 처리
    }

    orders.push({
      orderNo,
      customerName: String(orderer?.name || ""),
      productName,
      productOption,
      orderStatus: String((o as Record<string, unknown>).order_status || ""),
      orderedAt: String((o as Record<string, unknown>).order_time || ""),
    });
  }

  return orders;
}
