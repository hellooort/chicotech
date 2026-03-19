import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// 단일 주문 조회 (관리자용)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { error: "인증이 필요합니다." },
      { status: 401 }
    );
  }

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
  });

  if (!order) {
    return NextResponse.json(
      { error: "주문을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const steps = await prisma.step.findMany({
    orderBy: { order: "asc" },
  });

  return NextResponse.json({ order, steps });
}

// 주문 수정 (관리자용)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { error: "인증이 필요합니다." },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { orderNumber, currentStep, expectedDate, memo } = body;

    // 주문번호 중복 확인 (자기 자신 제외)
    if (orderNumber) {
      const existing = await prisma.order.findFirst({
        where: {
          orderNumber,
          NOT: { id },
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: "이미 존재하는 주문번호입니다." },
          { status: 400 }
        );
      }
    }

    const order = await prisma.order.update({
      where: { id },
      data: {
        ...(orderNumber && { orderNumber }),
        ...(currentStep !== undefined && { currentStep }),
        ...(expectedDate !== undefined && { 
          expectedDate: expectedDate ? new Date(expectedDate) : null 
        }),
        ...(memo !== undefined && { memo: memo || null }),
      },
    });

    return NextResponse.json({ order });
  } catch (error) {
    console.error("Update order error:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json(
      { error: "주문 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 주문 삭제 (관리자용)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { error: "인증이 필요합니다." },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    await prisma.order.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete order error:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json(
      { error: "주문 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
