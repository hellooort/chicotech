import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "s-maxage=10, stale-while-revalidate=30",
};

// 공개 API: 주문번호로 진행현황 조회 (아임웹에서 호출)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  const { orderNumber } = await params;

  try {
    // 주문과 단계를 동시에 조회 (병렬 처리)
    const [order, steps] = await Promise.all([
      prisma.order.findUnique({ where: { orderNumber } }),
      prisma.step.findMany({ orderBy: { order: "asc" } }),
    ]);

    if (!order) {
      return NextResponse.json(
        { success: false, error: "주문을 찾을 수 없습니다.", orderNumber },
        { status: 404, headers: corsHeaders }
      );
    }

    const currentStepInfo = steps.find(s => s.order === order.currentStep);

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
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Public order lookup error:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json(
      { success: false, error: "조회 중 오류가 발생했습니다." },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}
