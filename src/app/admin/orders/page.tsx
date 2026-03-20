"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";

interface Order {
  id: string;
  orderNumber: string;
  customerName: string | null;
  productName: string | null;
  productOption: string | null;
  currentStep: number;
  expectedDate: string | null;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Step { id: string; order: number; name: string; }
interface Pagination { page: number; limit: number; total: number; totalPages: number; }

export default function OrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");
  const [orders, setOrders] = useState<Order[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [completedPagination, setCompletedPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [completedLoading, setCompletedLoading] = useState(false);
  const [completedLoaded, setCompletedLoaded] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ orderNumber: "", currentStep: 1, expectedDate: "", memo: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [savingField, setSavingField] = useState<string | null>(null);
  const dateInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [editingMemo, setEditingMemo] = useState<string | null>(null);
  const [memoValue, setMemoValue] = useState("");

  // checkbox & bulk
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStep, setBulkStep] = useState<number | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);

  const currentOrders = activeTab === "active" ? orders : completedOrders;

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === currentOrders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(currentOrders.map(o => o.id)));
    }
  };

  const handleBulkStepChange = async () => {
    if (bulkStep === null || selectedIds.size === 0) return;
    setBulkSaving(true);
    try {
      await Promise.all(
        [...selectedIds].map(id =>
          fetch(`/api/orders/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ currentStep: bulkStep }),
          })
        )
      );
      setSelectedIds(new Set());
      setBulkStep(null);
      fetchOrders(pagination.page, search);
      setCompletedLoaded(false);
    } catch (err) {
      console.error("Bulk update failed:", err);
    } finally {
      setBulkSaving(false);
    }
  };

  const fetchOrders = useCallback(async (page = 1, searchQuery = "") => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: "20", tab: "active", ...(searchQuery && { search: searchQuery }) });
      const res = await fetch(`/api/orders?${params}`);
      if (res.status === 401) { router.push("/"); return; }
      const data = await res.json();
      setOrders(data.orders || []);
      setSteps(data.steps || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
    } catch (err) { console.error("Failed to fetch orders:", err); }
    finally { setLoading(false); }
  }, [router]);

  const fetchCompletedOrders = useCallback(async (page = 1) => {
    setCompletedLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: "20", tab: "completed" });
      const res = await fetch(`/api/orders?${params}`);
      if (res.status === 401) { router.push("/"); return; }
      const data = await res.json();
      setCompletedOrders(data.orders || []);
      if (!steps.length) setSteps(data.steps || []);
      setCompletedPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
      setCompletedLoaded(true);
    } catch (err) { console.error("Failed to fetch completed orders:", err); }
    finally { setCompletedLoading(false); }
  }, [steps.length, router]);

  useEffect(() => {
    fetchOrders();
    if (searchParams.get("action") === "new") { setShowModal(true); router.replace("/admin/orders"); }
  }, [fetchOrders, searchParams, router]);

  useEffect(() => { setSelectedIds(new Set()); }, [activeTab]);

  const handleTabChange = (tab: "active" | "completed") => {
    setActiveTab(tab);
    if (tab === "completed" && !completedLoaded) fetchCompletedOrders();
  };

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); fetchOrders(1, search); };

  const handleStepChange = async (order: Order, newStep: number) => {
    setSavingField(`step-${order.id}`);
    try {
      await fetch(`/api/orders/${order.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentStep: newStep }) });
      const maxStep = steps.length;
      if (newStep >= maxStep && activeTab === "active") {
        setOrders(prev => prev.filter(o => o.id !== order.id));
        setPagination(prev => ({ ...prev, total: prev.total - 1 }));
        setCompletedLoaded(false);
      } else if (newStep < maxStep && activeTab === "completed") {
        setCompletedOrders(prev => prev.filter(o => o.id !== order.id));
        setCompletedPagination(prev => ({ ...prev, total: prev.total - 1 }));
        fetchOrders(pagination.page, search);
      } else {
        const updateFn = (prev: Order[]) => prev.map(o => o.id === order.id ? { ...o, currentStep: newStep } : o);
        if (activeTab === "active") setOrders(updateFn); else setCompletedOrders(updateFn);
      }
    } catch (err) { console.error("Failed to update step:", err); }
    finally { setSavingField(null); }
  };

  const handleDateChange = async (order: Order, newDate: string) => {
    setSavingField(`date-${order.id}`);
    try {
      await fetch(`/api/orders/${order.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expectedDate: newDate || null }) });
      const updateFn = (prev: Order[]) => prev.map(o => o.id === order.id ? { ...o, expectedDate: newDate || null } : o);
      if (activeTab === "active") setOrders(updateFn); else setCompletedOrders(updateFn);
    } catch (err) { console.error("Failed to update date:", err); }
    finally { setSavingField(null); }
  };

  const handleMemoSave = async (order: Order) => {
    const newMemo = memoValue.trim();
    if (newMemo === (order.memo || "")) { setEditingMemo(null); return; }
    setSavingField(`memo-${order.id}`);
    setEditingMemo(null);
    try {
      await fetch(`/api/orders/${order.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memo: newMemo || null }) });
      const updateFn = (prev: Order[]) => prev.map(o => o.id === order.id ? { ...o, memo: newMemo || null } : o);
      if (activeTab === "active") setOrders(updateFn); else setCompletedOrders(updateFn);
    } catch (err) { console.error("Failed to update memo:", err); }
    finally { setSavingField(null); }
  };

  const handleDelete = async (order: Order) => {
    if (!confirm(`"${order.orderNumber}" 주문을 삭제하시겠습니까?`)) return;
    try {
      const res = await fetch(`/api/orders/${order.id}`, { method: "DELETE" });
      if (res.ok) { if (activeTab === "active") fetchOrders(pagination.page, search); else fetchCompletedOrders(completedPagination.page); }
    } catch (err) { console.error("Failed to delete order:", err); }
  };

  const handleSync = async () => {
    setSyncing(true); setSyncResult(null);
    try {
      const res = await fetch("/api/orders/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setSyncResult({ type: "error", message: data.error || "싱크 실패" }); return; }
      setSyncResult({ type: "success", message: data.message });
      if (data.synced > 0 || data.updated > 0) { fetchOrders(1, search); setCompletedLoaded(false); }
    } catch { setSyncResult({ type: "error", message: "서버 연결에 실패했습니다." }); }
    finally { setSyncing(false); setTimeout(() => setSyncResult(null), 5000); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setSubmitting(true);
    try {
      const res = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...formData, expectedDate: formData.expectedDate || null, memo: formData.memo || null }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "오류가 발생했습니다."); return; }
      setShowModal(false); fetchOrders(1, search);
    } catch { setError("서버 연결에 실패했습니다."); }
    finally { setSubmitting(false); }
  };

  const getStepColor = (s: number) => {
    const max = steps.length;
    if (s >= max) return "bg-green-100 text-green-700 border-green-200";
    if (s === 2) return "bg-blue-100 text-blue-700 border-blue-200";
    return "bg-amber-100 text-amber-700 border-amber-200";
  };

  const formatDate = (d: string | null) => {
    if (!d) return "";
    const date = new Date(d);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  const formatDateDisplay = (d: string | null) => {
    if (!d) return "-";
    const date = new Date(d);
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  const renderTable = (data: Order[], pag: Pagination, isLoading: boolean, onPageChange: (p: number) => void) => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-48">
          <div className="flex items-center gap-3">
            <svg className="animate-spin h-6 w-6 text-blue-600" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
            <span className="text-slate-600">로딩 중...</span>
          </div>
        </div>
      );
    }

    if (data.length === 0) {
      return <div className="px-6 py-12 text-center text-slate-500">{activeTab === "active" ? "진행 중인 주문이 없습니다." : "작업완료된 주문이 없습니다."}</div>;
    }

    return (
      <>
        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <colgroup>
              <col className="w-[40px]" />
              <col className="w-[150px]" />
              <col className="w-[80px]" />
              <col style={{ width: "27%" }} />
              <col />
              <col className="w-[110px]" />
              <col style={{ width: "9%" }} />
              <col style={{ width: "20%" }} />
              <col className="w-[40px]" />
            </colgroup>
            <thead>
              <tr className="bg-slate-50">
                <th className="px-3 py-3">
                  <input type="checkbox" checked={selectedIds.size === data.length && data.length > 0} onChange={toggleSelectAll} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">주문번호</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">주문자명</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">상품명</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">옵션</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">진행 단계</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">완료일</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">메모</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((order) => (
                <tr key={order.id} className={`hover:bg-slate-50/70 transition-colors ${selectedIds.has(order.id) ? "bg-blue-50/50" : ""}`}>
                  <td className="px-3 py-3">
                    <input type="checkbox" checked={selectedIds.has(order.id)} onChange={() => toggleSelect(order.id)} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-slate-800 text-sm">{order.orderNumber}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{order.customerName || "-"}</td>
                  <td className="px-4 py-3 text-sm text-slate-600 truncate" title={order.productName || ""}>{order.productName || "-"}</td>
                  <td className="px-4 py-3 text-sm text-slate-500 truncate" title={order.productOption || ""}>{order.productOption || "-"}</td>
                  <td className="px-4 py-3">
                    <select
                      value={order.currentStep}
                      onChange={(e) => handleStepChange(order, parseInt(e.target.value))}
                      disabled={savingField === `step-${order.id}`}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border cursor-pointer outline-none transition-all ${getStepColor(order.currentStep)} ${savingField === `step-${order.id}` ? "opacity-50" : ""}`}
                    >
                      {steps.map((step) => (<option key={step.id} value={step.order}>{step.name}</option>))}
                    </select>
                  </td>
                  <td className="px-4 py-3 relative">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setTimeout(() => dateInputRefs.current[order.id]?.showPicker?.(), 50); }}
                        className={`text-xs px-2 py-1 rounded-lg border transition-all hover:border-blue-300 hover:bg-blue-50 ${order.expectedDate ? "text-slate-700 border-slate-200 bg-white" : "text-slate-400 border-dashed border-slate-300"} ${savingField === `date-${order.id}` ? "opacity-50" : ""}`}
                      >
                        {savingField === `date-${order.id}` ? "..." : formatDateDisplay(order.expectedDate)}
                      </button>
                      <input ref={(el) => { dateInputRefs.current[order.id] = el; }} type="date" value={formatDate(order.expectedDate)} onChange={(e) => handleDateChange(order, e.target.value)} className="absolute opacity-0 w-0 h-0 pointer-events-none" tabIndex={-1} />
                      {order.expectedDate && (
                        <button onClick={() => handleDateChange(order, "")} className="text-slate-400 hover:text-red-500 transition-colors">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {editingMemo === order.id ? (
                      <input type="text" value={memoValue} onChange={(e) => setMemoValue(e.target.value)} onBlur={() => handleMemoSave(order)} onKeyDown={(e) => { if (e.key === "Enter") handleMemoSave(order); if (e.key === "Escape") setEditingMemo(null); }} autoFocus className="w-full text-sm px-2 py-1 rounded-lg border border-blue-300 ring-2 ring-blue-100 outline-none bg-white" placeholder="메모 입력..." />
                    ) : (
                      <button onClick={() => { setEditingMemo(order.id); setMemoValue(order.memo || ""); }} className={`w-full text-left text-sm px-2 py-1 rounded-lg border border-transparent hover:border-slate-200 hover:bg-slate-50 transition-all truncate ${savingField === `memo-${order.id}` ? "opacity-50" : ""} ${order.memo ? "text-slate-600" : "text-slate-400"}`}>
                        {savingField === `memo-${order.id}` ? "저장 중..." : order.memo || "메모 추가..."}
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <button onClick={() => handleDelete(order)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="삭제">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pag.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
            <p className="text-sm text-slate-500">{(pag.page - 1) * pag.limit + 1}-{Math.min(pag.page * pag.limit, pag.total)} / {pag.total}건</p>
            <div className="flex items-center gap-1">
              <button onClick={() => onPageChange(pag.page - 1)} disabled={pag.page === 1} className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">이전</button>
              {Array.from({ length: Math.min(pag.totalPages, 5) }, (_, i) => {
                const start = Math.max(1, Math.min(pag.page - 2, pag.totalPages - 4));
                const pageNum = start + i;
                if (pageNum > pag.totalPages) return null;
                return (<button key={pageNum} onClick={() => onPageChange(pageNum)} className={`w-9 h-9 text-sm font-medium rounded-lg transition-colors ${pageNum === pag.page ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>{pageNum}</button>);
              })}
              <button onClick={() => onPageChange(pag.page + 1)} disabled={pag.page === pag.totalPages} className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">다음</button>
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="space-y-5">
      {syncResult && (
        <div className={`fixed top-4 right-4 z-[100] px-5 py-3 rounded-xl shadow-lg border text-sm font-medium ${syncResult.type === "success" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
          {syncResult.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">주문 관리</h1>
        <div className="flex items-center gap-2">
          <button onClick={handleSync} disabled={syncing} className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 disabled:opacity-60 disabled:cursor-not-allowed">
            {syncing ? <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
            {syncing ? "불러오는 중..." : "아임웹 주문 불러오기"}
          </button>
          <button onClick={() => { setFormData({ orderNumber: "", currentStep: 1, expectedDate: "", memo: "" }); setError(""); setShowModal(true); }} className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            새 주문 등록
          </button>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1 max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="주문번호 검색..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none" />
        </div>
        <button type="submit" className="px-4 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors">검색</button>
      </form>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
          <span className="text-sm font-medium text-blue-700">{selectedIds.size}건 선택됨</span>
          <select value={bulkStep ?? ""} onChange={(e) => setBulkStep(e.target.value ? parseInt(e.target.value) : null)} className="px-3 py-1.5 text-sm rounded-lg border border-blue-200 bg-white outline-none focus:border-blue-400">
            <option value="">단계 선택...</option>
            {steps.map((step) => (<option key={step.id} value={step.order}>{step.name}</option>))}
          </select>
          <button onClick={handleBulkStepChange} disabled={bulkStep === null || bulkSaving} className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {bulkSaving ? "변경 중..." : "일괄 변경"}
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-sm text-slate-500 hover:text-slate-700">선택 해제</button>
        </div>
      )}

      {/* Tabs + Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex border-b border-slate-100">
          <button onClick={() => handleTabChange("active")} className={`flex-1 sm:flex-none px-6 py-3.5 text-sm font-semibold transition-colors relative ${activeTab === "active" ? "text-blue-600" : "text-slate-500 hover:text-slate-700"}`}>
            진행 중 {!loading && activeTab === "active" && <span className="ml-1 text-xs font-normal text-slate-400">({pagination.total})</span>}
            {activeTab === "active" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />}
          </button>
          <button onClick={() => handleTabChange("completed")} className={`flex-1 sm:flex-none px-6 py-3.5 text-sm font-semibold transition-colors relative ${activeTab === "completed" ? "text-blue-600" : "text-slate-500 hover:text-slate-700"}`}>
            작업완료 {completedLoaded && activeTab === "completed" && <span className="ml-1 text-xs font-normal text-slate-400">({completedPagination.total})</span>}
            {activeTab === "completed" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />}
          </button>
        </div>
        {activeTab === "active" ? renderTable(orders, pagination, loading, (p) => fetchOrders(p, search)) : renderTable(completedOrders, completedPagination, completedLoading, fetchCompletedOrders)}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">새 주문 등록</h2>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm border border-red-100">{error}</div>}
              <div><label className="block text-sm font-medium text-slate-700 mb-2">주문번호 <span className="text-red-500">*</span></label><input type="text" value={formData.orderNumber} onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none" required /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-2">진행 단계</label><select value={formData.currentStep} onChange={(e) => setFormData({ ...formData, currentStep: parseInt(e.target.value) })} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none">{steps.map((step) => (<option key={step.id} value={step.order}>{step.order}. {step.name}</option>))}</select></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-2">예상 완료일</label><input type="date" value={formData.expectedDate} onChange={(e) => setFormData({ ...formData, expectedDate: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-2">메모</label><textarea value={formData.memo} onChange={(e) => setFormData({ ...formData, memo: e.target.value })} rows={3} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none resize-none" placeholder="특이사항이나 메모를 입력하세요" /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 text-slate-700 font-medium bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">취소</button>
                <button type="submit" disabled={submitting} className="flex-1 px-4 py-2.5 text-white font-medium bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">{submitting ? "등록 중..." : "등록"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
