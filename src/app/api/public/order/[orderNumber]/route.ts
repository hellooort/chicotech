import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 공개 API: 주문번호로 진행현황 조회 (아임웹에서 호출)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  const { orderNumber } = await params;

  // CORS 헤더 설정
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  try {
    const order = await prisma.order.findUnique({
      where: { orderNumber },
    });

    if (!order) {
      return NextResponse.json(
        { 
          success: false, 
          error: "주문을 찾을 수 없습니다.",
          orderNumber 
        },
        { status: 404, headers }
      );
    }

    const steps = await prisma.step.findMany({
      orderBy: { order: "asc" },
    });

    // 현재 단계 정보
    const currentStepInfo = steps.find(s => s.order === order.currentStep);

    // 진행 상태 계산
    const progress = steps.map(step => ({
      order: step.order,
      name: step.name,
      status: step.order < order.currentStep 
        ? "completed" 
        : step.order === order.currentStep 
          ? "current" 
          : "pending",
    }));

    return NextResponse.json(
      {
        success: true,
        data: {
          orderNumber: order.orderNumber,
          currentStep: order.currentStep,
          currentStepName: currentStepInfo?.name || "",
          expectedDate: order.expectedDate?.toISOString().split("T")[0] || null,
          memo: order.memo,
          progress,
          totalSteps: steps.length,
          updatedAt: order.updatedAt.toISOString(),
        },
      },
      { headers }
    );
  } catch (error) {
    console.error("Public order lookup error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "조회 중 오류가 발생했습니다." 
      },
      { status: 500, headers }
    );
  }
}

// CORS preflight 요청 처리
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
