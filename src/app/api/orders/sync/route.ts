import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { fetchImwebOrders } from "@/lib/imweb";

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

    const orderMap = new Map(
      imwebOrders
        .filter((o) => o.orderNo.trim().length > 0)
        .map((o) => [o.orderNo.trim(), o.customerName.trim()])
    );
    const orderNumbers = [...orderMap.keys()];

    const existingOrders = await prisma.order.findMany({
      where: { orderNumber: { in: orderNumbers } },
      select: { orderNumber: true, customerName: true },
    });
    const existingSet = new Set(existingOrders.map((o) => o.orderNumber));

    // 기존 주문 중 주문자명이 비어있는 것은 업데이트
    const toUpdate = existingOrders.filter((o) => !o.customerName && orderMap.get(o.orderNumber));
    for (const o of toUpdate) {
      await prisma.order.update({
        where: { orderNumber: o.orderNumber },
        data: { customerName: orderMap.get(o.orderNumber) },
      });
    }

    const newOrderNumbers = orderNumbers.filter((n) => !existingSet.has(n));

    if (newOrderNumbers.length === 0) {
      const updated = toUpdate.length;
      return NextResponse.json({
        synced: 0,
        skipped: orderNumbers.length,
        updated,
        total: orderNumbers.length,
        message: updated > 0
          ? `새 주문은 없지만, ${updated}건의 주문자명을 업데이트했습니다.`
          : "새로운 주문이 없습니다. 모두 이미 등록되어 있어요.",
      });
    }

    await prisma.order.createMany({
      data: newOrderNumbers.map((orderNumber) => ({
        orderNumber,
        customerName: orderMap.get(orderNumber) || null,
        currentStep: 1,
      })),
      skipDuplicates: true,
    });

    return NextResponse.json({
      synced: newOrderNumbers.length,
      skipped: orderNumbers.length - newOrderNumbers.length,
      total: orderNumbers.length,
      message: `${newOrderNumbers.length}건의 새 주문을 등록했습니다.`,
    });
  } catch (error) {
    console.error("Sync error:", error);
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: `싱크 실패: ${message}` }, { status: 500 });
  }
}
