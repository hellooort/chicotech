/**
 * 아임웹 마이페이지 주문 진행현황 삽입 스크립트
 * 
 * 사용법: 아임웹 관리자 → 페이지 → 마이페이지 → 커스텀 코드(HTML)에 삽입
 * <script src="https://chicotech.vercel.app/imweb-inject.js"></script>
 */
(function () {
  if (window.__orderProgressLoaded) return;
  window.__orderProgressLoaded = true;

  // ===== 설정 =====
  var API_BASE = "https://chicotech.vercel.app";
  var processedOrders = {};

  // ===== 스타일 삽입 =====
  var style = document.createElement("style");
  style.textContent = "\n\
    .order-progress-wrap {\n\
      margin: 14px 0;\n\
      padding: 20px;\n\
      background: #f8fafc;\n\
      border-radius: 12px;\n\
      border: 1px solid #e2e8f0;\n\
    }\n\
    .order-progress-title {\n\
      font-size: 16px;\n\
      font-weight: 700;\n\
      color: #1e293b;\n\
      margin-bottom: 14px;\n\
    }\n\
    .order-progress-bar {\n\
      display: flex;\n\
      align-items: center;\n\
      gap: 6px;\n\
      flex-wrap: wrap;\n\
    }\n\
    .order-progress-step {\n\
      display: flex;\n\
      align-items: center;\n\
      gap: 6px;\n\
    }\n\
    .order-step-dot {\n\
      width: 12px;\n\
      height: 12px;\n\
      border-radius: 50%;\n\
      flex-shrink: 0;\n\
    }\n\
    .order-step-dot.completed { background: #22c55e; }\n\
    .order-step-dot.current { background: #3b82f6; animation: pulse-dot 1.5s infinite; }\n\
    .order-step-dot.pending { background: #cbd5e1; }\n\
    .order-step-name {\n\
      font-size: 15px;\n\
      white-space: nowrap;\n\
    }\n\
    .order-step-name.completed { color: #16a34a; }\n\
    .order-step-name.current { color: #2563eb; font-weight: 700; }\n\
    .order-step-name.pending { color: #94a3b8; }\n\
    .order-progress-arrow {\n\
      color: #cbd5e1;\n\
      font-size: 14px;\n\
      margin: 0 2px;\n\
    }\n\
    .order-progress-info {\n\
      margin-top: 10px;\n\
      font-size: 14px;\n\
      color: #475569;\n\
    }\n\
    .order-progress-loading {\n\
      text-align: center;\n\
      padding: 16px;\n\
      font-size: 15px;\n\
      color: #3b82f6;\n\
      font-weight: 500;\n\
    }\n\
    .order-progress-loading .spinner {\n\
      display: inline-block;\n\
      width: 16px;\n\
      height: 16px;\n\
      border: 2px solid #bfdbfe;\n\
      border-top-color: #3b82f6;\n\
      border-radius: 50%;\n\
      animation: spin 0.8s linear infinite;\n\
      vertical-align: middle;\n\
      margin-right: 8px;\n\
    }\n\
    .order-progress-notice {\n\
      text-align: center;\n\
      font-size: 15px;\n\
      font-weight: 500;\n\
      color: #475569;\n\
      margin-bottom: 0;\n\
    }\n\
    @keyframes pulse-dot {\n\
      0%, 100% { opacity: 1; }\n\
      50% { opacity: 0.4; }\n\
    }\n\
    @keyframes spin {\n\
      to { transform: rotate(360deg); }\n\
    }\n\
    @media (max-width: 767px) {\n\
      .order-progress-wrap {\n\
        margin: 10px 12px 14px;\n\
        padding: 16px;\n\
      }\n\
      .order-progress-title {\n\
        font-size: 15px;\n\
      }\n\
      .order-progress-bar {\n\
        gap: 4px;\n\
      }\n\
      .order-step-name {\n\
        font-size: 13px;\n\
      }\n\
      .order-step-dot {\n\
        width: 10px;\n\
        height: 10px;\n\
      }\n\
      .order-progress-info {\n\
        font-size: 13px;\n\
      }\n\
    }\n\
  ";
  document.head.appendChild(style);

  // ===== 진행현황 HTML 생성 =====
  function createProgressHTML(data) {
    var stepsHTML = data.progress
      .map(function (step, i) {
        var dot = '<span class="order-step-dot ' + step.status + '"></span>';
        var name = '<span class="order-step-name ' + step.status + '">' + step.name + "</span>";
        var arrow = i < data.progress.length - 1 ? '<span class="order-progress-arrow">\u203A</span>' : "";
        return '<span class="order-progress-step">' + dot + name + "</span>" + arrow;
      })
      .join("");

    var info = "";
    if (data.expectedDate) {
      var date = new Date(data.expectedDate);
      var formatted = (date.getMonth() + 1) + "\uC6D4 " + date.getDate() + "\uC77C";
      info = '<div class="order-progress-info">\uC608\uC0C1 \uC644\uB8CC: ' + formatted + "</div>";
    }

    return (
      '<div class="order-progress-wrap">' +
      '<div class="order-progress-title">\uC9C4\uD589\uD604\uD669: ' + data.currentStepName + "</div>" +
      '<div class="order-progress-bar">' + stepsHTML + "</div>" +
      info +
      "</div>"
    );
  }

  // ===== API 호출 및 표시 =====
  function fetchAndDisplay(orderNumber, targetElement) {
    var thead = targetElement.closest("thead");
    if (!thead) return;

    var tbody = thead.nextElementSibling;
    if (!tbody) return;

    var container = document.createElement("div");
    container.setAttribute("data-order-progress", orderNumber);
    container.innerHTML = '<div class="order-progress-wrap">' +
      '<div class="order-progress-loading"><span class="spinner"></span>\uACE0\uAC1D\uB2D8\uC758 \uC8FC\uBB38\uC744 \uC870\uD68C\uD558\uB294 \uC911\uC785\uB2C8\uB2E4</div>' +
      '</div>';

    var row = document.createElement("tr");
    var cell = document.createElement("td");
    cell.setAttribute("colspan", "2");
    cell.appendChild(container);
    row.appendChild(cell);
    tbody.insertBefore(row, tbody.firstChild);

    fetch(API_BASE + "/api/public/order/" + encodeURIComponent(orderNumber))
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.success) {
          container.innerHTML = createProgressHTML(data.data);
        } else {
          container.innerHTML = '<div class="order-progress-wrap">' +
            '<div class="order-progress-notice">\uD604\uC7AC \uAD00\uB9AC\uC790\uAC00 \uACE0\uAC1D\uB2D8\uC758 \uC18C\uC911\uD55C \uD30C\uC77C\uC744 \uD655\uC778\uC911\uC785\uB2C8\uB2E4</div>' +
            '</div>';
        }
      })
      .catch(function () {
        container.innerHTML = '<div class="order-progress-wrap">' +
          '<div class="order-progress-notice">\uD604\uC7AC \uAD00\uB9AC\uC790\uAC00 \uACE0\uAC1D\uB2D8\uC758 \uC18C\uC911\uD55C \uD30C\uC77C\uC744 \uD655\uC778\uC911\uC785\uB2C8\uB2E4</div>' +
          '</div>';
      });
  }

  // ===== 실행 =====
  function init() {
    var links = document.querySelectorAll('a[href*="order_no="]');
    var orders = {};

    links.forEach(function (link) {
      var url = link.getAttribute("href");
      var match = url.match(/order_no=([^&]+)/);
      if (match) {
        var orderNo = match[1];
        if (!orders[orderNo] && !processedOrders[orderNo]) {
          orders[orderNo] = link;
        }
      }
    });

    var orderNumbers = Object.keys(orders);
    if (orderNumbers.length === 0) return;

    orderNumbers.forEach(function (orderNo) {
      processedOrders[orderNo] = true;
      fetchAndDisplay(orderNo, orders[orderNo]);
    });
  }

  // DOM 로드 후 1회 실행
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(init, 1000);
    });
  } else {
    setTimeout(init, 1000);
  }

  // 주문 목록이 동적으로 추가될 때 새 주문만 처리
  var observerTimer = null;
  var orderList = document.getElementById("shop_mypage_orderlist");
  if (orderList) {
    var observer = new MutationObserver(function () {
      if (observerTimer) clearTimeout(observerTimer);
      observerTimer = setTimeout(init, 500);
    });
    observer.observe(orderList, { childList: true, subtree: true });
  }
})();
