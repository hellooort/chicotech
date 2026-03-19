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
  const limit = parseInt(searchParams.get("limit") || "10");
  const search = searchParams.get("search") || "";

  const skip = (page - 1) * limit;

  const where = search
    ? {
        orderNumber: { contains: search },
      }
    : {};

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.count({ where }),
  ]);

  const steps = await prisma.step.findMany({
    orderBy: { order: "asc" },
  });

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
    const { orderNumber, currentStep, expectedDate, memo } = body;

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
    console.error("Create order error:", error);
    return NextResponse.json(
      { error: "주문 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
