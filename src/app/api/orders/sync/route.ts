import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { fetchImwebOrders, ImwebOrder } from "@/lib/imweb";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  try {
    const now = new Date();
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const formatDate = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    const imwebOrders = await fetchImwebOrders(formatDate(threeMonthsAgo), formatDate(now));

    if (imwebOrders.length === 0) {
      return NextResponse.json({ synced: 0, skipped: 0, total: 0, message: "아임웹에서 가져올 주문이 없습니다." });
    }

    const orderMap = new Map<string, ImwebOrder>();
    for (const o of imwebOrders) {
      const no = o.orderNo.trim();
      if (no.length > 0) orderMap.set(no, o);
    }
    const orderNumbers = [...orderMap.keys()];

    const existingOrders = await prisma.order.findMany({
      where: { orderNumber: { in: orderNumbers } },
      select: { orderNumber: true, customerName: true, productName: true, productOption: true },
    });
    const existingSet = new Set(existingOrders.map((o) => o.orderNumber));

    // 기존 주문 중 빈 필드 업데이트
    let updated = 0;
    for (const o of existingOrders) {
      const imweb = orderMap.get(o.orderNumber);
      if (!imweb) continue;
      const updates: Record<string, string> = {};
      if (!o.customerName && imweb.customerName) updates.customerName = imweb.customerName;
      if (!o.productName && imweb.productName) updates.productName = imweb.productName;
      const needOptionUpdate = !o.productOption || o.productOption.trim() === ":" || o.productOption.trim() === "";
      if (imweb.productOption && needOptionUpdate) updates.productOption = imweb.productOption;
      if (Object.keys(updates).length > 0) {
        await prisma.order.update({ where: { orderNumber: o.orderNumber }, data: updates });
        updated++;
      }
    }

    const newOrderNumbers = orderNumbers.filter((n) => !existingSet.has(n));

    if (newOrderNumbers.length === 0) {
      return NextResponse.json({
        synced: 0, skipped: orderNumbers.length, updated, total: orderNumbers.length,
        message: updated > 0
          ? `새 주문은 없지만, ${updated}건의 정보를 업데이트했습니다.`
          : "새로운 주문이 없습니다. 모두 이미 등록되어 있어요.",
      });
    }

    for (const orderNumber of newOrderNumbers) {
      const imweb = orderMap.get(orderNumber)!;
      await prisma.order.create({
        data: {
          orderNumber,
          customerName: imweb.customerName || null,
          productName: imweb.productName || null,
          productOption: imweb.productOption || null,
          currentStep: 1,
        },
      });
    }

    return NextResponse.json({
      synced: newOrderNumbers.length,
      skipped: orderNumbers.length - newOrderNumbers.length,
      updated, total: orderNumbers.length,
      message: `${newOrderNumbers.length}건의 새 주문을 등록했습니다.`,
    });
  } catch (error) {
    console.error("Sync error:", error instanceof Error ? error.message : "unknown");
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: `싱크 실패: ${message}` }, { status: 500 });
  }
}
