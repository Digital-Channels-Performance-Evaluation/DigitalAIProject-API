"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, KeyRound, Eye, EyeOff, Pencil } from "lucide-react";
import Header from "@/components/layout/Header";
import api from "@/lib/api";
import { formatRoleName } from "@/lib/utils";
import { useAuthStore } from "@/lib/auth-store";
import { toast } from "sonner";

interface User {
  id: number;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  avatar_url: string | null;
  last_login: string | null;
  created_at: string;
}

const ROLES = [
  "super_admin", "executive_management", "product_manager",
  "data_engineer", "ml_engineer", "risk_team", "compliance_team",
];

export default function UsersPage() {
  const { user: currentUser } = useAuthStore();
  const [users,   setUsers]   = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Create user modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ full_name: "", email: "", password: "", role: "product_manager" });
  const [showCreatePw, setShowCreatePw] = useState(false);
  const [creating, setCreating] = useState(false);

  // Reset password modal
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [resetPw,     setResetPw]     = useState("");
  const [showResetPw, setShowResetPw] = useState(false);
  const [resetting,   setResetting]   = useState(false);

  // Edit user modal
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [editForm,   setEditForm]   = useState({ full_name: "", role: "", is_active: true });
  const [saving,     setSaving]     = useState(false);

  const load = useCallback(() => {
    api.get("/users")
      .then(r => setUsers(r.data))
      .catch(() => toast.error("Failed to load users"))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post("/users", createForm);
      toast.success("User created successfully");
      setShowCreate(false);
      setCreateForm({ full_name: "", email: "", password: "", role: "product_manager" });
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
    } catch { toast.error("Failed to update user"); }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    if (resetPw.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setResetting(true);
    try {
      await api.post(`/users/${resetTarget.id}/reset-password`, { new_password: resetPw });
      toast.success(`Password reset for ${resetTarget.full_name}`);
      setResetTarget(null);
      setResetPw("");
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to reset password");
    } finally {
      setResetting(false);
    }
  };

  const openEdit = (u: User) => {
    setEditTarget(u);
    setEditForm({ full_name: u.full_name, role: u.role, is_active: u.is_active });
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setSaving(true);
    try {
      await api.put(`/users/${editTarget.id}`, {
        full_name: editForm.full_name,
        role:      editForm.role,
        is_active: editForm.is_active,
      });
      toast.success("User updated");
      setEditTarget(null);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  const isSuperAdmin = currentUser?.role === "super_admin";

  return (
    <div>
      <Header title="User Management" subtitle="Manage platform users and roles" />
      <div className="p-6">
        <div className="flex justify-between items-center mb-5">
          <span className="text-xs text-gray-400">{users.length} users</span>
          {isSuperAdmin && (
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 text-xs bg-[#7A0E28] hover:bg-[#9B1535]
                         text-white px-4 py-2 rounded-lg transition">
              <Plus size={13} /> Add User
            </button>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-[#FBF0F3]">
                {["Photo", "Name", "Email", "Role", "Status", "Last Login", "Created", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3.5 text-left text-[10px] font-semibold
                                         text-[#7A0E28] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array(4).fill(0).map((_, i) => (
                  <tr key={i}>{Array(8).fill(0).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-3 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}</tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-400">
                    No users found.
                  </td>
                </tr>
              ) : users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  {/* Avatar */}
                  <td className="px-4 py-3">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt={u.full_name}
                           className="w-8 h-8 rounded-full object-cover border border-gray-200" />
                    ) : (
                      <div className="w-8 h-8 rounded-full text-white text-[11px] font-bold
                                      flex items-center justify-center"
                           style={{ background: "linear-gradient(135deg,#7A0E28,#9B1535)" }}>
                        {u.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{u.full_name}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-medium px-2 py-0.5 bg-[#FBF0F3]
                                     text-[#9B1535] rounded-full">
                      {formatRoleName(u.role)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full
                      ${u.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {u.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {u.last_login?.slice(0, 10) || "Never"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{u.created_at?.slice(0, 10)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {isSuperAdmin && (
                        <>
                          <button
                            onClick={() => openEdit(u)}
                            className="text-[10px] text-blue-600 hover:text-blue-800 font-medium
                                       border border-blue-300 px-2 py-1 rounded
                                       hover:bg-blue-50 transition flex items-center gap-1"
                            title="Edit user"
                          >
                            <Pencil size={11} /> Edit
                          </button>
                          <button onClick={() => toggleActive(u.id, u.is_active)}
                            className="text-[10px] text-[#9B1535] hover:text-[#7A0E28] font-medium
                                       border border-[#BE1B3C] px-2 py-1 rounded
                                       hover:bg-[#FBF0F3] transition">
                            {u.is_active ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            onClick={() => { setResetTarget(u); setResetPw(""); setShowResetPw(false); }}
                            className="text-[10px] text-gray-500 hover:text-gray-700 font-medium
                                       border border-gray-300 px-2 py-1 rounded
                                       hover:bg-gray-50 transition flex items-center gap-1"
                            title="Reset password"
                          >
                            <KeyRound size={11} /> Reset PW
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Create User Modal ─────────────────────────────────────────────── */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Add New User</h2>
              <form onSubmit={createUser} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
                  <input value={createForm.full_name}
                    onChange={e => setCreateForm({ ...createForm, full_name: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none
                               focus:ring-1 focus:ring-[#9B1535]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={createForm.email}
                    onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none
                               focus:ring-1 focus:ring-[#9B1535]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
                  <div className="relative">
                    <input type={showCreatePw ? "text" : "password"}
                      value={createForm.password}
                      onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
                      required minLength={8}
                      placeholder="Min 8 characters"
                      className="w-full px-3 py-2 pr-10 text-sm border rounded-lg focus:outline-none
                                 focus:ring-1 focus:ring-[#9B1535]" />
                    <button type="button" onClick={() => setShowCreatePw(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showCreatePw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
                  <select value={createForm.role}
                    onChange={e => setCreateForm({ ...createForm, role: e.target.value })}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none
                               focus:ring-1 focus:ring-[#9B1535]">
                    {ROLES.map(r => <option key={r} value={r}>{formatRoleName(r)}</option>)}
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowCreate(false)}
                    className="flex-1 py-2 border border-gray-200 rounded-lg text-sm
                               text-gray-600 hover:bg-gray-50 transition">
                    Cancel
                  </button>
                  <button type="submit" disabled={creating}
                    className="flex-1 py-2 bg-[#7A0E28] text-white rounded-lg text-sm
                               hover:bg-[#9B1535] transition disabled:opacity-60">
                    {creating ? "Creating..." : "Create User"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Reset Password Modal ──────────────────────────────────────────── */}
        {resetTarget && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                     style={{ background: "linear-gradient(135deg,#7A0E28,#9B1535)" }}>
                  <KeyRound size={18} className="text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900">Reset Password</h2>
                  <p className="text-[10px] text-gray-400">For {resetTarget.full_name}</p>
                </div>
              </div>
              <form onSubmit={resetPassword} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1
                                     uppercase tracking-wide">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showResetPw ? "text" : "password"}
                      value={resetPw}
                      onChange={e => setResetPw(e.target.value)}
                      required minLength={8}
                      placeholder="Min 8 characters"
                      className="w-full px-3 py-2.5 pr-10 text-sm border border-gray-200
                                 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#9B1535]"
                    />
                    <button type="button" onClick={() => setShowResetPw(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showResetPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="button"
                    onClick={() => { setResetTarget(null); setResetPw(""); }}
                    className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm
                               text-gray-600 hover:bg-gray-50 transition">
                    Cancel
                  </button>
                  <button type="submit" disabled={resetting}
                    className="flex-1 py-2.5 text-white rounded-lg text-sm font-semibold
                               transition disabled:opacity-60"
                    style={{ background: "#9B1535" }}>
                    {resetting ? "Resetting..." : "Reset Password"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* ── Edit User Modal ───────────────────────────────────────────────── */}
        {editTarget && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                     style={{ background: "linear-gradient(135deg,#7A0E28,#9B1535)" }}>
                  <Pencil size={16} className="text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900">Edit User</h2>
                  <p className="text-[10px] text-gray-400">{editTarget.email}</p>
                </div>
              </div>

              <form onSubmit={saveEdit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                    Full Name
                  </label>
                  <input
                    value={editForm.full_name}
                    onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
                    required
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg
                               focus:outline-none focus:ring-1 focus:ring-[#9B1535]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                    Role
                  </label>
                  <select
                    value={editForm.role}
                    onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg
                               focus:outline-none focus:ring-1 focus:ring-[#9B1535]"
                  >
                    {ROLES.map(r => <option key={r} value={r}>{formatRoleName(r)}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                    Status
                  </label>
                  <div className="flex gap-3">
                    {[true, false].map(val => (
                      <button
                        key={String(val)}
                        type="button"
                        onClick={() => setEditForm({ ...editForm, is_active: val })}
                        className={`flex-1 py-2 text-sm rounded-lg border transition font-medium ${
                          editForm.is_active === val
                            ? val
                              ? "bg-green-50 border-green-400 text-green-700"
                              : "bg-red-50 border-red-400 text-red-700"
                            : "border-gray-200 text-gray-400 hover:bg-gray-50"
                        }`}
                      >
                        {val ? "Active" : "Inactive"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditTarget(null)}
                    className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm
                               text-gray-600 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-2.5 text-white rounded-lg text-sm font-semibold
                               transition disabled:opacity-60"
                    style={{ background: "#9B1535" }}
                  >
                    {saving ? "Saving..." : "Save Changes"}
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
