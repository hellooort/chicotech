"use client";

import { useState } from "react";

interface ProgressStep {
  order: number;
  name: string;
  status: "completed" | "current" | "pending";
}

interface OrderData {
  orderNumber: string;
  currentStep: number;
  currentStepName: string;
  expectedDate: string | null;
  memo: string | null;
  progress: ProgressStep[];
  totalSteps: number;
  updatedAt: string;
}

export default function TrackPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orderNumber.trim()) {
      setError("주문번호를 입력해주세요.");
      return;
    }

    setLoading(true);
    setError("");
    setOrderData(null);
    setSearched(true);

    try {
      const res = await fetch(`/api/public/order/${encodeURIComponent(orderNumber.trim())}`);
      const data = await res.json();

      if (!data.success) {
        setError(data.error || "주문을 찾을 수 없습니다.");
        return;
      }

      setOrderData(data.data);
    } catch {
      setError("조회 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const getStepIcon = (status: string) => {
    if (status === "completed") {
      return (
        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-200">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      );
    }
    if (status === "current") {
      return (
        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-lg shadow-blue-200 animate-pulse">
          <div className="w-3 h-3 bg-white rounded-full" />
        </div>
      );
    }
    return (
      <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
        <div className="w-3 h-3 bg-slate-400 rounded-full" />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-800">주문 진행현황 조회</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Search Form */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-6 mb-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label htmlFor="orderNumber" className="block text-sm font-medium text-slate-700 mb-2">
                주문번호 입력
              </label>
              <div className="flex gap-3">
                <input
                  id="orderNumber"
                  type="text"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="예: ORD-2026-001"
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none text-lg"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200"
                >
                  {loading ? (
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    "조회"
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-blue-800">현재 관리자가 고객님의 소중한 파일을 확인중입니다</p>
                <p className="text-sm text-blue-600">잠시만 기다려주세요.</p>
              </div>
            </div>
          </div>
        )}

        {/* Order Result */}
        {orderData && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Order Info Card */}
            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-sm text-slate-500">주문번호</p>
                  <p className="text-2xl font-bold text-slate-800">{orderData.orderNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500">현재 상태</p>
                  <p className="text-lg font-semibold text-blue-600">{orderData.currentStepName}</p>
                </div>
              </div>

              {/* Progress Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl">
                <div>
                  <p className="text-sm text-slate-500">진행률</p>
                  <p className="text-xl font-bold text-slate-800">
                    {Math.round((orderData.currentStep / orderData.totalSteps) * 100)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">예상 완료일</p>
                  <p className="text-xl font-bold text-slate-800">
                    {orderData.expectedDate 
                      ? new Date(orderData.expectedDate).toLocaleDateString("ko-KR", { month: "long", day: "numeric" })
                      : "미정"
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Progress Timeline */}
            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-6">진행 단계</h2>
              
              <div className="relative">
                {orderData.progress.map((step, index) => (
                  <div key={step.order} className="flex gap-4 pb-8 last:pb-0">
                    {/* Line connector */}
                    {index < orderData.progress.length - 1 && (
                      <div 
                        className={`absolute left-5 w-0.5 h-8 -translate-x-1/2 ${
                          step.status === "completed" ? "bg-green-500" : "bg-slate-200"
                        }`}
                        style={{ top: `${index * 72 + 40}px` }}
                      />
                    )}
                    
                    {/* Step icon */}
                    <div className="relative z-10">
                      {getStepIcon(step.status)}
                    </div>
                    
                    {/* Step content */}
                    <div className="flex-1 pt-2">
                      <p className={`font-medium ${
                        step.status === "completed" 
                          ? "text-green-700" 
                          : step.status === "current" 
                            ? "text-blue-700" 
                            : "text-slate-400"
                      }`}>
                        {step.name}
                      </p>
                      <p className="text-sm text-slate-500">
                        {step.status === "completed" && "완료"}
                        {step.status === "current" && "진행 중"}
                        {step.status === "pending" && "대기 중"}
                      </p>
                    </div>

                    {/* Step number */}
                    <div className={`text-sm font-medium ${
                      step.status === "pending" ? "text-slate-300" : "text-slate-500"
                    }`}>
                      {step.order}/{orderData.totalSteps}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Last Updated */}
            <p className="text-center text-sm text-slate-400">
              마지막 업데이트: {new Date(orderData.updatedAt).toLocaleString("ko-KR")}
            </p>
          </div>
        )}

        {/* Empty State */}
        {searched && !orderData && !error && !loading && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-slate-500">주문번호를 입력하고 조회 버튼을 눌러주세요.</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-white/50 mt-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 text-center text-sm text-slate-400">
          주문 진행현황 조회 시스템
        </div>
      </footer>
    </div>
  );
}
