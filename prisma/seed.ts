import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // 기본 진행 단계 생성
  const steps = [
    { order: 1, name: "주문접수" },
    { order: 2, name: "결제확인" },
    { order: 3, name: "제작중" },
    { order: 4, name: "제작완료" },
    { order: 5, name: "배송준비" },
    { order: 6, name: "배송중" },
    { order: 7, name: "배송완료" },
  ];

  for (const step of steps) {
    await prisma.step.upsert({
      where: { order: step.order },
      update: { name: step.name },
      create: step,
    });
  }

  console.log("✅ 기본 진행 단계가 생성되었습니다.");

  // 기본 관리자 계정 생성
  const hashedPassword = await bcrypt.hash("admin123", 10);
  
  await prisma.admin.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      password: hashedPassword,
      name: "관리자",
    },
  });

  console.log("✅ 기본 관리자 계정이 생성되었습니다.");
  console.log("   이메일: admin@example.com");
  console.log("   비밀번호: admin123");

  // 테스트 주문 데이터 생성
  const testOrders = [
    {
      orderNumber: "ORD-2026-001",
      currentStep: 3,
      expectedDate: new Date("2026-02-05"),
      memo: "빨간색으로 요청",
    },
    {
      orderNumber: "ORD-2026-002",
      currentStep: 5,
      expectedDate: new Date("2026-02-03"),
      memo: null,
    },
    {
      orderNumber: "ORD-2026-003",
      currentStep: 1,
      expectedDate: new Date("2026-02-10"),
      memo: "선물 포장 요청",
    },
  ];

  for (const order of testOrders) {
    await prisma.order.upsert({
      where: { orderNumber: order.orderNumber },
      update: order,
      create: order,
    });
  }

  console.log("✅ 테스트 주문 데이터가 생성되었습니다.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
