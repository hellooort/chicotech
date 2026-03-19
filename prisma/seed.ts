import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // 기본 진행 단계 생성
  const steps = [
    { order: 1, name: "주문접수" },
    { order: 2, name: "제작중" },
    { order: 3, name: "제작완료" },
    { order: 4, name: "배송준비" },
    { order: 5, name: "배송중" },
    { order: 6, name: "배송완료" },
  ];

  for (const step of steps) {
    await prisma.step.upsert({
      where: { order: step.order },
      update: { name: step.name },
      create: step,
    });
  }

  console.log("✅ 기본 진행 단계가 생성되었습니다.");

  // 관리자 계정 생성/업데이트
  const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  const adminName = process.env.ADMIN_NAME || "관리자";

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  // 기존 기본 계정이 다른 이메일이면 삭제
  if (adminEmail !== "admin@example.com") {
    await prisma.admin.deleteMany({ where: { email: "admin@example.com" } });
  }
  
  await prisma.admin.upsert({
    where: { email: adminEmail },
    update: { password: hashedPassword, name: adminName },
    create: {
      email: adminEmail,
      password: hashedPassword,
      name: adminName,
    },
  });

  console.log("✅ 관리자 계정이 준비되었습니다.");

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
