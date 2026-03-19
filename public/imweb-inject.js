/**
 * 아임웹 마이페이지 주문 진행현황 삽입 스크립트
 * 
 * 사용법: 아임웹 관리자 → 페이지 → 마이페이지 → 커스텀 코드(HTML)에 삽입
 * <script src="https://your-domain.vercel.app/imweb-inject.js"></script>
 */
(function () {
  // ===== 설정 =====
  var API_BASE = "https://chicotech.vercel.app";

  // ===== 스타일 삽입 =====
  var style = document.createElement("style");
  style.textContent = "\n\
    .order-progress-wrap {\n\
      margin: 12px 0;\n\
      padding: 16px;\n\
      background: #f8fafc;\n\
      border-radius: 12px;\n\
      border: 1px solid #e2e8f0;\n\
    }\n\
    .order-progress-title {\n\
      font-size: 13px;\n\
      font-weight: 600;\n\
      color: #334155;\n\
      margin-bottom: 12px;\n\
    }\n\
    .order-progress-bar {\n\
      display: flex;\n\
      align-items: center;\n\
      gap: 4px;\n\
      flex-wrap: wrap;\n\
    }\n\
    .order-progress-step {\n\
      display: flex;\n\
      align-items: center;\n\
      gap: 4px;\n\
    }\n\
    .order-step-dot {\n\
      width: 8px;\n\
      height: 8px;\n\
      border-radius: 50%;\n\
      flex-shrink: 0;\n\
    }\n\
    .order-step-dot.completed { background: #22c55e; }\n\
    .order-step-dot.current { background: #3b82f6; animation: pulse-dot 1.5s infinite; }\n\
    .order-step-dot.pending { background: #cbd5e1; }\n\
    .order-step-name {\n\
      font-size: 12px;\n\
      white-space: nowrap;\n\
    }\n\
    .order-step-name.completed { color: #16a34a; }\n\
    .order-step-name.current { color: #2563eb; font-weight: 600; }\n\
    .order-step-name.pending { color: #94a3b8; }\n\
    .order-progress-arrow {\n\
      color: #cbd5e1;\n\
      font-size: 10px;\n\
      margin: 0 2px;\n\
    }\n\
    .order-progress-info {\n\
      margin-top: 8px;\n\
      font-size: 12px;\n\
      color: #64748b;\n\
    }\n\
    .order-progress-loading {\n\
      font-size: 12px;\n\
      color: #94a3b8;\n\
      padding: 8px 0;\n\
    }\n\
    .order-progress-error {\n\
      font-size: 12px;\n\
      color: #ef4444;\n\
      padding: 8px 0;\n\
    }\n\
    @keyframes pulse-dot {\n\
      0%, 100% { opacity: 1; }\n\
      50% { opacity: 0.4; }\n\
    }\n\
    @media (max-width: 767px) {\n\
      .order-progress-wrap {\n\
        margin: 8px 12px 12px;\n\
        padding: 12px;\n\
      }\n\
      .order-progress-bar {\n\
        gap: 2px;\n\
      }\n\
      .order-step-name {\n\
        font-size: 11px;\n\
      }\n\
    }\n\
  ";
  document.head.appendChild(style);

  // ===== 주문번호 추출 =====
  function extractOrderNumbers() {
    var links = document.querySelectorAll('a[href*="order_no="]');
    var orders = {};

    links.forEach(function (link) {
      var url = link.getAttribute("href");
      var match = url.match(/order_no=([^&]+)/);
      if (match) {
        var orderNo = match[1];
        if (!orders[orderNo]) {
          orders[orderNo] = link;
        }
      }
    });

    return orders;
  }

  // ===== 진행현황 HTML 생성 =====
  function createProgressHTML(data) {
    var stepsHTML = data.progress
      .map(function (step, i) {
        var dot = '<span class="order-step-dot ' + step.status + '"></span>';
        var name = '<span class="order-step-name ' + step.status + '">' + step.name + "</span>";
        var arrow = i < data.progress.length - 1 ? '<span class="order-progress-arrow">›</span>' : "";
        return '<span class="order-progress-step">' + dot + name + "</span>" + arrow;
      })
      .join("");

    var info = "";
    if (data.expectedDate) {
      var date = new Date(data.expectedDate);
      var formatted = (date.getMonth() + 1) + "월 " + date.getDate() + "일";
      info = '<div class="order-progress-info">예상 완료: ' + formatted + "</div>";
    }

    return (
      '<div class="order-progress-wrap">' +
      '<div class="order-progress-title">진행현황: ' + data.currentStepName + "</div>" +
      '<div class="order-progress-bar">' + stepsHTML + "</div>" +
      info +
      "</div>"
    );
  }

  // ===== API 호출 및 표시 =====
  function fetchAndDisplay(orderNumber, targetElement) {
    // 로딩 표시
    var container = document.createElement("div");
    container.innerHTML = '<div class="order-progress-loading">진행현황 조회 중...</div>';

    // thead 다음(tbody 앞)에 삽입
    var thead = targetElement.closest("thead");
    if (thead) {
      var tbody = thead.nextElementSibling;
      if (tbody) {
        var row = document.createElement("tr");
        var cell = document.createElement("td");
        cell.setAttribute("colspan", "2");
        cell.appendChild(container);
        row.appendChild(cell);
        tbody.insertBefore(row, tbody.firstChild);
      }
    }

    fetch(API_BASE + "/api/public/order/" + encodeURIComponent(orderNumber))
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.success) {
          container.innerHTML = createProgressHTML(data.data);
        } else {
          container.innerHTML = "";
        }
      })
      .catch(function () {
        container.innerHTML = "";
      });
  }

  // ===== 실행 =====
  function init() {
    var orders = extractOrderNumbers();
    var orderNumbers = Object.keys(orders);

    if (orderNumbers.length === 0) return;

    orderNumbers.forEach(function (orderNo) {
      fetchAndDisplay(orderNo, orders[orderNo]);
    });
  }

  // DOM 로드 후 실행 (아임웹은 동적 로딩이므로 약간의 딜레이 필요)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(init, 1000);
    });
  } else {
    setTimeout(init, 1000);
  }

  // 주문 목록이 동적으로 추가될 수 있으므로 MutationObserver로 감시
  var observer = new MutationObserver(function (mutations) {
    var hasNewOrders = mutations.some(function (m) {
      return m.addedNodes.length > 0;
    });
    if (hasNewOrders) {
      var existing = document.querySelectorAll(".order-progress-wrap");
      if (existing.length === 0) {
        setTimeout(init, 500);
      }
    }
  });

  var orderList = document.getElementById("shop_mypage_orderlist");
  if (orderList) {
    observer.observe(orderList, { childList: true, subtree: true });
  }
})();
