"use client";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Header from "@/components/layout/Header";
import api from "@/lib/api";
import { formatRoleName } from "@/lib/utils";
import { toast } from "sonner";

interface User {
  id: number;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

const ROLES = [
  "super_admin", "executive_management", "product_manager",
  "data_engineer", "ml_engineer", "risk_team", "compliance_team",
];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", password: "", role: "product_manager" });
  const [creating, setCreating] = useState(false);

  const load = () => {
    api.get("/users").then((r) => setUsers(r.data)).catch(() => toast.error("Failed to load users")).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post("/users", form);
      toast.success("User created successfully");
      setShowModal(false);
      setForm({ full_name: "", email: "", password: "", role: "product_manager" });
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (id: number, active: boolean) => {
    try {
      await api.put(`/users/${id}`, { is_active: !active });
      toast.success(active ? "User deactivated" : "User activated");
      load();
    } catch {
      toast.error("Failed to update user");
    }
  };

  return (
    <div>
      <Header title="User Management" subtitle="Manage platform users and roles" />
      <div className="p-6">
        <div className="flex justify-between items-center mb-5">
          <span className="text-xs text-gray-400">{users.length} users</span>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 text-xs bg-[#7A0E28] hover:bg-[#9B1535] text-white px-4 py-2 rounded-lg transition">
            <Plus size={13} /> Add User
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-[#FBF0F3]">
                {["Name", "Email", "Role", "Status", "Last Login", "Created", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3.5 text-left text-[10px] font-semibold text-[#7A0E28] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array(4).fill(0).map((_, i) => (
                  <tr key={i}>{Array(7).fill(0).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-3 bg-gray-100 rounded animate-pulse" /></td>
                  ))}</tr>
                ))
              ) : users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{u.full_name}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-medium px-2 py-0.5 bg-[#FBF0F3] text-[#9B1535] rounded-full">
                      {formatRoleName(u.role)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${u.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {u.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{u.last_login?.slice(0, 10) || "Never"}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{u.created_at?.slice(0, 10)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(u.id, u.is_active)}
                      className="text-[10px] text-[#9B1535] hover:text-[#7A0E28] font-medium border border-[#BE1B3C] px-2 py-1 rounded hover:bg-[#FBF0F3] transition">
                      {u.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Create User Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Add New User</h2>
              <form onSubmit={createUser} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
                  <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    required className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#9B1535]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#9B1535]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
                  <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required minLength={8} className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#9B1535]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#9B1535]">
                    {ROLES.map((r) => <option key={r} value={r}>{formatRoleName(r)}</option>)}
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)}
                    className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">
                    Cancel
                  </button>
                  <button type="submit" disabled={creating}
                    className="flex-1 py-2 bg-[#7A0E28] text-white rounded-lg text-sm hover:bg-[#9B1535] transition disabled:opacity-60">
                    {creating ? "Creating..." : "Create User"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
