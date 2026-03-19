import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// 진행 단계 목록 조회
export async function GET() {
  const steps = await prisma.step.findMany({
    orderBy: { order: "asc" },
  });

  return NextResponse.json({ steps });
}

// 진행 단계 수정 (관리자용)
export async function PUT(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { error: "인증이 필요합니다." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { steps } = body;

    if (!Array.isArray(steps)) {
      return NextResponse.json(
        { error: "올바른 형식이 아닙니다." },
        { status: 400 }
      );
    }

    // 기존 단계 삭제 후 새로 생성
    await prisma.step.deleteMany();

    const createdSteps = await Promise.all(
      steps.map((step: { order: number; name: string }) =>
        prisma.step.create({
          data: {
            order: step.order,
            name: step.name,
          },
        })
      )
    );

    return NextResponse.json({ steps: createdSteps });
  } catch (error) {
    console.error("Update steps error:", error);
    return NextResponse.json(
      { error: "단계 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
