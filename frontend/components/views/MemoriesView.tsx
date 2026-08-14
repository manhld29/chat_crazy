"use client";

import { useEffect, useState } from "react";
import { Memory, MemoryCategory, api } from "@/lib/api";

type MemoriesViewProps = {
  token: string;
};

const memoryCategories: { value: MemoryCategory; label: string }[] = [
  { value: "user_requested", label: "Người dùng yêu cầu" },
  { value: "addressing", label: "Cách xưng hô" },
  { value: "communication_style", label: "Phong cách giao tiếp" },
  { value: "interest", label: "Chủ đề yêu thích" },
  { value: "inside_joke", label: "Inside joke" },
  { value: "other", label: "Khác" },
];

export function MemoriesView({ token }: MemoriesViewProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [category, setCategory] = useState<MemoryCategory>("user_requested");

  const loadMemories = async () => {
    try {
      const res = await api.memories(token);
      setMemories(res.items);
    } catch {
      setMemories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    api
      .memories(token)
      .then((res) => {
        if (active) setMemories(res.items);
      })
      .catch(() => {
        if (active) setMemories([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newValue.trim()) return;
    await api.createMemory(token, {
      memory_key: newKey.trim(),
      memory_value: newValue.trim(),
      category,
    });
    setNewKey("");
    setNewValue("");
    await loadMemories();
  };

  const handleDelete = async (id: string) => {
    await api.deleteMemory(token, id);
    setMemories((prev) => prev.filter((m) => m.id !== id));
  };

  const handleDeleteAll = async () => {
    if (confirm("Bạn có chắc chắn muốn xóa toàn bộ bộ nhớ?")) {
      await api.deleteAllMemories(token);
      setMemories([]);
    }
  };

  return (
    <div className="flex-1 bg-slate-950 p-6 md:p-8 overflow-y-auto text-slate-200 custom-scrollbar">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Quản lý Bộ Nhớ (Memories)</h1>
            <p className="text-xs text-slate-400 mt-1">
              Những thông tin trợ lý AI tự động ghi nhớ hoặc do bạn thiết lập để giúp các cuộc hội thoại tự nhiên hơn.
            </p>
          </div>

          {memories.length > 0 && (
            <button
              onClick={handleDeleteAll}
              className="text-xs bg-rose-500/10 text-rose-400 border border-rose-500/30 px-3 py-1.5 rounded-xl hover:bg-rose-500/20 transition-colors"
            >
              Xóa toàn bộ
            </button>
          )}
        </div>

        {/* Add Memory Form */}
        <form
          onSubmit={handleAddMemory}
          className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row gap-3 items-end"
        >
          <div className="flex-1 flex flex-col gap-1 w-full">
            <label className="text-[11px] text-slate-400">Khóa (Key)</label>
            <input
              type="text"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="VD: biet_danh"
              className="bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex-1 flex flex-col gap-1 w-full">
            <label className="text-[11px] text-slate-400">Giá trị (Value)</label>
            <input
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="VD: Anh Sếp"
              className="bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex-1 flex flex-col gap-1 w-full">
            <label className="text-[11px] text-slate-400">Phân loại</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as MemoryCategory)}
              className="bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
            >
              {memoryCategories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={!newKey.trim() || !newValue.trim()}
            className="bg-emerald-500 text-slate-950 font-semibold px-4 py-2 rounded-xl text-xs hover:bg-emerald-400 transition-colors disabled:opacity-40 shrink-0 w-full md:w-auto"
          >
            + Thêm ghi nhớ
          </button>
        </form>

        {/* Memory List Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">Đang tải bộ nhớ...</div>
          ) : memories.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">Chưa có thông tin ghi nhớ nào</div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-medium">
                <tr>
                  <th className="p-3">Khóa (Key)</th>
                  <th className="p-3">Giá trị (Value)</th>
                  <th className="p-3">Danh mục</th>
                  <th className="p-3 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {memories.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-800/30">
                    <td className="p-3 font-mono text-emerald-400">{m.memory_key}</td>
                    <td className="p-3 text-slate-200">{m.memory_value}</td>
                    <td className="p-3 text-slate-400">
                      <span className="bg-slate-800 px-2 py-0.5 rounded-full text-[10px]">
                        {memoryCategories.find((c) => c.value === m.category)?.label || m.category}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="text-rose-400 hover:text-rose-300 px-2 py-1 rounded"
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
