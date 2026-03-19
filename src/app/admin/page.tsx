"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Order {
  id: string;
  orderNumber: string;
  currentStep: number;
  expectedDate: string | null;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Step {
  id: string;
  order: number;
  name: string;
}

interface Stats {
  total: number;
  inProgress: number;
  completed: number;
  today: number;
}

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, inProgress: 0, completed: 0, today: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/orders?limit=5");
        const data = await res.json();
        setOrders(data.orders);
        setSteps(data.steps);
        
        // 통계 계산
        const allOrdersRes = await fetch("/api/orders?limit=1000");
        const allData = await allOrdersRes.json();
        const allOrders = allData.orders as Order[];
        
        const maxStep = data.steps.length;
        const today = new Date().toISOString().split("T")[0];
        
        setStats({
          total: allOrders.length,
          inProgress: allOrders.filter(o => o.currentStep > 0 && o.currentStep < maxStep).length,
          completed: allOrders.filter(o => o.currentStep >= maxStep).length,
          today: allOrders.filter(o => o.createdAt.split("T")[0] === today).length,
        });
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getStepName = (stepOrder: number) => {
    return steps.find(s => s.order === stepOrder)?.name || `단계 ${stepOrder}`;
  };

  const getStepColor = (stepOrder: number) => {
    const maxStep = steps.length;
    if (stepOrder >= maxStep) return "bg-green-100 text-green-700";
    if (stepOrder >= maxStep / 2) return "bg-blue-100 text-blue-700";
    return "bg-amber-100 text-amber-700";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <svg className="animate-spin h-6 w-6 text-blue-600" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-slate-600">로딩 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">대시보드</h1>
        <p className="text-slate-500 mt-1">주문 현황을 한눈에 확인하세요</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-500">전체 주문</p>
              <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-500">진행 중</p>
              <p className="text-2xl font-bold text-slate-800">{stats.inProgress}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-500">완료</p>
              <p className="text-2xl font-bold text-slate-800">{stats.completed}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-500">오늘 등록</p>
              <p className="text-2xl font-bold text-slate-800">{stats.today}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent orders */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">최근 주문</h2>
          <Link 
            href="/admin/orders"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            전체 보기 →
          </Link>
        </div>
        
        {orders.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-500">
            등록된 주문이 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">주문번호</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">진행 단계</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">예상 완료일</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">등록일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-800">{order.orderNumber}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStepColor(order.currentStep)}`}>
                        {getStepName(order.currentStep)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {order.expectedDate ? new Date(order.expectedDate).toLocaleDateString("ko-KR") : "-"}
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-sm">
                      {new Date(order.createdAt).toLocaleDateString("ko-KR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/admin/orders?action=new"
          className="flex items-center gap-4 p-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl text-white hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg shadow-blue-200"
        >
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div>
            <p className="font-semibold">새 주문 등록</p>
            <p className="text-sm text-blue-100">새로운 주문을 등록합니다</p>
          </div>
        </Link>

        <Link
          href="/admin/steps"
          className="flex items-center gap-4 p-6 bg-white rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-md transition-all"
        >
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-slate-800">진행 단계 설정</p>
            <p className="text-sm text-slate-500">진행 단계를 커스터마이징합니다</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
