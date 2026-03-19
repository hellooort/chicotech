"use client";

import { useEffect, useState } from "react";

interface Step {
  id: string;
  order: number;
  name: string;
}

export default function StepsPage() {
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    fetchSteps();
  }, []);

  const fetchSteps = async () => {
    try {
      const res = await fetch("/api/steps");
      const data = await res.json();
      setSteps(data.steps);
    } catch (error) {
      console.error("Failed to fetch steps:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNameChange = (index: number, name: string) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], name };
    setSteps(newSteps);
  };

  const handleAddStep = () => {
    const newOrder = steps.length > 0 ? Math.max(...steps.map(s => s.order)) + 1 : 1;
    setSteps([...steps, { id: `temp-${Date.now()}`, order: newOrder, name: "" }]);
  };

  const handleRemoveStep = (index: number) => {
    if (steps.length <= 1) {
      setMessage({ type: "error", text: "최소 1개의 단계가 필요합니다." });
      return;
    }
    
    const newSteps = steps.filter((_, i) => i !== index).map((step, i) => ({
      ...step,
      order: i + 1,
    }));
    setSteps(newSteps);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newSteps = [...steps];
    [newSteps[index - 1], newSteps[index]] = [newSteps[index], newSteps[index - 1]];
    setSteps(newSteps.map((step, i) => ({ ...step, order: i + 1 })));
  };

  const handleMoveDown = (index: number) => {
    if (index === steps.length - 1) return;
    const newSteps = [...steps];
    [newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]];
    setSteps(newSteps.map((step, i) => ({ ...step, order: i + 1 })));
  };

  const handleSave = async () => {
    // 빈 이름 확인
    const emptyStep = steps.find(s => !s.name.trim());
    if (emptyStep) {
      setMessage({ type: "error", text: "모든 단계에 이름을 입력해주세요." });
      return;
    }

    setSaving(true);
    setMessage({ type: "", text: "" });

    try {
      const res = await fetch("/api/steps", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          steps: steps.map((s, i) => ({ order: i + 1, name: s.name })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "저장에 실패했습니다." });
        return;
      }

      const data = await res.json();
      setSteps(data.steps);
      setMessage({ type: "success", text: "단계가 저장되었습니다." });
    } catch {
      setMessage({ type: "error", text: "서버 연결에 실패했습니다." });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!confirm("기본 단계로 초기화하시겠습니까?")) return;
    
    const defaultSteps = [
      { id: "1", order: 1, name: "주문접수" },
      { id: "2", order: 2, name: "결제확인" },
      { id: "3", order: 3, name: "제작중" },
      { id: "4", order: 4, name: "제작완료" },
      { id: "5", order: 5, name: "배송준비" },
      { id: "6", order: 6, name: "배송중" },
      { id: "7", order: 7, name: "배송완료" },
    ];
    setSteps(defaultSteps);
    setMessage({ type: "", text: "" });
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
        <h1 className="text-2xl font-bold text-slate-800">진행 단계 설정</h1>
        <p className="text-slate-500 mt-1">주문 진행 단계를 커스터마이징하세요</p>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`px-4 py-3 rounded-lg text-sm border ${
          message.type === "success" 
            ? "bg-green-50 text-green-600 border-green-100" 
            : "bg-red-50 text-red-600 border-red-100"
        }`}>
          {message.text}
        </div>
      )}

      {/* Steps list */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">단계 목록</h2>
          <p className="text-sm text-slate-500 mt-1">드래그하거나 화살표로 순서를 변경할 수 있습니다</p>
        </div>

        <div className="divide-y divide-slate-100">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors">
              {/* Order number */}
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-semibold text-sm">
                {index + 1}
              </div>

              {/* Name input */}
              <input
                type="text"
                value={step.name}
                onChange={(e) => handleNameChange(index, e.target.value)}
                className="flex-1 px-4 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                placeholder="단계 이름 입력"
              />

              {/* Actions */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title="위로 이동"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => handleMoveDown(index)}
                  disabled={index === steps.length - 1}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title="아래로 이동"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => handleRemoveStep(index)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="삭제"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add step button */}
        <div className="px-6 py-4 border-t border-slate-100">
          <button
            onClick={handleAddStep}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            단계 추가
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="font-semibold text-slate-800 mb-4">미리보기</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                index === 0 
                  ? "bg-amber-100 text-amber-700" 
                  : index === steps.length - 1 
                    ? "bg-green-100 text-green-700" 
                    : "bg-blue-100 text-blue-700"
              }`}>
                {step.name || `단계 ${index + 1}`}
              </div>
              {index < steps.length - 1 && (
                <svg className="w-4 h-4 text-slate-300 mx-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleReset}
          className="px-4 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
        >
          기본값으로 초기화
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200"
        >
          {saving ? "저장 중..." : "변경사항 저장"}
        </button>
      </div>
    </div>
  );
}
