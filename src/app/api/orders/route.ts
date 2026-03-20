import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// 주문 목록 조회 (관리자용)
export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { error: "인증이 필요합니다." },
      { status: 401 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const search = searchParams.get("search") || "";
  const tab = searchParams.get("tab") || "active";

  const skip = (page - 1) * limit;

  const steps = await prisma.step.findMany({ orderBy: { order: "asc" } });
  const maxStep = steps.length;

  const searchFilter = search
    ? {
        OR: [
          { orderNumber: { contains: search, mode: "insensitive" as const } },
          { customerName: { contains: search, mode: "insensitive" as const } },
          { productOption: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};
  const tabFilter = tab === "completed"
    ? { currentStep: { gte: maxStep } }
    : { currentStep: { lt: maxStep } };

  const where = { ...searchFilter, ...tabFilter };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.count({ where }),
  ]);

  return NextResponse.json({
    orders,
    steps,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

// 새 주문 생성 (관리자용)
export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { error: "인증이 필요합니다." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { currentStep, expectedDate, memo } = body;
    const orderNumber = body.orderNumber?.trim();

    if (!orderNumber) {
      return NextResponse.json(
        { error: "주문번호는 필수입니다." },
        { status: 400 }
      );
    }

    // 주문번호 중복 확인
    const existing = await prisma.order.findUnique({
      where: { orderNumber },
    });

    if (existing) {
      return NextResponse.json(
        { error: "이미 존재하는 주문번호입니다." },
        { status: 400 }
      );
    }

    const order = await prisma.order.create({
      data: {
        orderNumber,
        currentStep: currentStep || 1,
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        memo: memo || null,
      },
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    console.error("Create order error:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json(
      { error: "주문 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
