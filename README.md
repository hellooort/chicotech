# 주문 진행현황 관리 시스템

아임웹과 연동하여 주문 진행현황을 관리하고 조회하는 시스템입니다.

## 기능

- 📋 **주문 관리**: 주문 등록, 수정, 삭제, 검색
- 📊 **대시보드**: 주문 현황 통계 한눈에 보기
- ⚙️ **단계 설정**: 진행 단계 커스터마이징
- 🔗 **공개 API**: 아임웹에서 주문번호로 진행현황 조회

## 기술 스택

- **프레임워크**: Next.js 16 (App Router)
- **데이터베이스**: SQLite + Prisma ORM
- **스타일링**: Tailwind CSS
- **인증**: JWT (HTTP-only Cookie)

## 로컬 개발

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env` 파일을 생성하고 다음 내용을 추가:

```env
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="your-secret-key-change-in-production"
```

### 3. 데이터베이스 초기화

```bash
npx prisma migrate dev
```

### 4. 개발 서버 실행

```bash
npm run dev
```

http://localhost:3000 에서 확인

### 기본 관리자 계정

- 이메일: admin@example.com
- 비밀번호: admin123

## API 엔드포인트

### 공개 API (아임웹 연동용)

**주문 진행현황 조회**

```
GET /api/public/order/{주문번호}
```

응답 예시:
```json
{
  "success": true,
  "data": {
    "orderNumber": "ORD-2026-001",
    "customerName": "홍길동",
    "currentStep": 3,
    "currentStepName": "제작중",
    "expectedDate": "2026-02-05",
    "progress": [
      { "order": 1, "name": "주문접수", "status": "completed" },
      { "order": 2, "name": "결제확인", "status": "completed" },
      { "order": 3, "name": "제작중", "status": "current" },
      { "order": 4, "name": "제작완료", "status": "pending" },
      ...
    ]
  }
}
```

### 관리자 API (인증 필요)

- `POST /api/auth/login` - 로그인
- `POST /api/auth/logout` - 로그아웃
- `GET /api/auth/me` - 현재 사용자 정보
- `GET /api/orders` - 주문 목록
- `POST /api/orders` - 주문 생성
- `GET /api/orders/{id}` - 주문 상세
- `PUT /api/orders/{id}` - 주문 수정
- `DELETE /api/orders/{id}` - 주문 삭제
- `GET /api/steps` - 진행 단계 목록
- `PUT /api/steps` - 진행 단계 수정

## Vercel 배포

⚠️ **중요**: Vercel은 서버리스 환경이므로 SQLite 파일 시스템을 사용할 수 없습니다.

### 권장 데이터베이스 옵션

1. **Vercel Postgres** (추천)
   - Vercel 대시보드에서 바로 생성 가능
   - 무료 티어 제공

2. **PlanetScale** (MySQL 호환)
   - 무료 티어 제공
   - 브랜칭 기능 지원

3. **Supabase** (PostgreSQL)
   - 무료 티어 제공
   - 실시간 기능 포함

### 배포 단계

1. 데이터베이스 생성 (위 옵션 중 선택)

2. Prisma 스키마 수정 (`prisma/schema.prisma`):
   ```prisma
   datasource db {
     provider = "postgresql"  // 또는 "mysql"
     url      = env("DATABASE_URL")
   }
   ```

3. Vercel 환경 변수 설정:
   - `DATABASE_URL`: 데이터베이스 연결 문자열
   - `JWT_SECRET`: JWT 시크릿 키

4. 배포:
   ```bash
   vercel
   ```

## 아임웹 연동

아임웹 페이지에 다음 코드를 삽입하여 진행현황을 표시할 수 있습니다:

```html
<div id="order-status"></div>

<script>
(async function() {
  // 페이지에서 주문번호 추출 (아임웹 구조에 맞게 수정 필요)
  const orderNumber = document.querySelector('.order-number')?.textContent;
  
  if (!orderNumber) return;
  
  try {
    const res = await fetch(`https://your-domain.vercel.app/api/public/order/${orderNumber}`);
    const data = await res.json();
    
    if (data.success) {
      const container = document.getElementById('order-status');
      container.innerHTML = `
        <div style="padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h3>주문 진행현황</h3>
          <p>현재 단계: ${data.data.currentStepName}</p>
          <p>예상 완료일: ${data.data.expectedDate || '미정'}</p>
          <div style="display: flex; gap: 10px; margin-top: 15px;">
            ${data.data.progress.map(step => `
              <div style="
                padding: 8px 12px;
                border-radius: 20px;
                font-size: 12px;
                background: ${step.status === 'completed' ? '#dcfce7' : step.status === 'current' ? '#dbeafe' : '#f3f4f6'};
                color: ${step.status === 'completed' ? '#166534' : step.status === 'current' ? '#1d4ed8' : '#6b7280'};
              ">
                ${step.name}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
  } catch (error) {
    console.error('진행현황 조회 실패:', error);
  }
})();
</script>
```

## 라이선스

MIT
