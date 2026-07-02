'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Shield, Users, Lock, CheckCircle, Clock, AlertTriangle,
  ChevronDown, ChevronUp, Plus, Pencil, Trash2, Eye, EyeOff, X, Copy,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { canAccessAccessControl, getRoleLabel, getRoleBadgeColor, DELETE_WINDOW_HOURS } from '../lib/permissions';
import { apiClient } from '../lib/api';

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

const ROLES = ['super-admin', 'admin', 'manager', 'user'] as const;

const ROLE_PERMISSIONS: Record<string, { label: string; permissions: string[] }> = {
  'super-admin': {
    label: 'Super Admin',
    permissions: [
      'View all data across the system',
      'Add, edit, and delete records in all sections',
      'Delete records of any age without approval',
      'Manage user accounts (create, edit, delete, change roles)',
      'Access Control management',
      'View sensitive files and audit logs',
      'Approve or reject delete requests from admins',
    ],
  },
  admin: {
    label: 'Admin',
    permissions: [
      'View all data',
      'Add records in all sections',
      'Edit records in all sections',
      `Delete records created within ${DELETE_WINDOW_HOURS} hours (no approval needed)`,
      `Delete records older than ${DELETE_WINDOW_HOURS} hours (requires Super Admin approval)`,
      'View audit logs',
    ],
  },
  manager: {
    label: 'Manager',
    permissions: [
      'View all data',
      'Add records in all sections',
      'Edit records in all sections',
    ],
  },
  user: {
    label: 'User',
    permissions: [
      'View all data',
      'Comment on records',
    ],
  },
};

// ─────────────────────────── Modal helpers ───────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800 text-lg">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-300 focus:outline-none bg-white text-gray-900';

function getErrorMessage(e: unknown, fallback: string): string {
  if (e && typeof e === 'object') {
    const obj = e as { error?: unknown; message?: unknown };
    if (typeof obj.error === 'string') return obj.error;
    if (typeof obj.message === 'string') return obj.message;
  }
  return fallback;
}

// ─────────────────────────── Main component ──────────────────────────────────

export default function AccessControl() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', email: '', password: '', role: 'user' });
  const [createPwdVisible, setCreatePwdVisible] = useState(false);
  const [creating, setCreating] = useState(false);

  // Edit modal
  const [editUser, setEditUser] = useState<UserRecord | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', role: '', password: '', confirmPassword: '' });
  const [editPwdVisible, setEditPwdVisible] = useState(false);
  const [editConfirmPwdVisible, setEditConfirmPwdVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const flash = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3500); };

  const isPlaceholderEmail = (email: string) =>
    email.startsWith('emp_') && email.endsWith('@noaccess.pravaa.internal');

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.get<UserRecord[]>('/api/auth/users');
      setUsers(data.filter(u => !isPlaceholderEmail(u.email)));
    } catch {
      setError('Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canAccessAccessControl(user)) Promise.resolve().then(() => fetchUsers());
  }, [user, fetchUsers]);

  // ── CREATE ──
  const handleCreate = async () => {
    if (!createForm.name.trim() || !createForm.email.trim() || !createForm.password) return;
    setCreating(true);
    try {
      const created = await apiClient.post<UserRecord>('/api/auth/users', createForm);
      setUsers(prev => [...prev, created]);
      setShowCreate(false);
      setCreateForm({ name: '', email: '', password: '', role: 'user' });
      flash('User created successfully.');
    } catch (e: unknown) {
      setError(getErrorMessage(e, 'Failed to create user.'));
    } finally {
      setCreating(false);
    }
  };

  // ── EDIT ──
  const openEdit = (u: UserRecord) => {
    setEditUser(u);
    setEditForm({ name: u.name, email: u.email, role: u.role, password: '', confirmPassword: '' });
    setEditPwdVisible(false);
    setEditConfirmPwdVisible(false);
  };

  const handleSave = async () => {
    if (!editUser) return;
    if (editForm.password && editForm.password !== editForm.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, string> = { name: editForm.name, email: editForm.email, role: editForm.role };
      if (editForm.password) payload.password = editForm.password;
      const updated = await apiClient.put<UserRecord>(`/api/auth/users/${editUser.id}`, payload);
      setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
      setEditUser(null);
      flash('User updated successfully.');
    } catch (e: unknown) {
      setError(getErrorMessage(e, 'Failed to update user.'));
    } finally {
      setSaving(false);
    }
  };

  // ── DELETE ──
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/api/auth/users/${deleteTarget.id}`);
      setUsers(prev => prev.filter(u => u.id !== deleteTarget.id));
      setDeleteTarget(null);
      flash('User deleted.');
    } catch (e: unknown) {
      setError(getErrorMessage(e, 'Failed to delete user.'));
    } finally {
      setDeleting(false);
    }
  };

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id).then(() => flash('User ID copied.'));
  };

  const deleteButtonLabel = (() => {
    if (deleting) return 'Deleting…';
    if (deleteTarget?.id === user?.id) return 'Yes, Delete My Account';
    return 'Delete User';
  })();

  if (!canAccessAccessControl(user)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Lock className="text-gray-300 mb-4" size={64} />
        <h2 className="text-2xl font-bold text-gray-700 mb-2">Access Restricted</h2>
        <p className="text-gray-500">Only Super Admins can manage access control.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-100 rounded-xl">
            <Shield className="text-purple-600" size={28} />
          </div>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 38, fontStyle: 'italic', fontWeight: 400, margin: '0 0 2px', color: 'var(--color-ink)', lineHeight: 1 }}>Access Control</h2>
            <p className="text-gray-500 text-sm">Manage user roles and permissions · data from Supabase</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          <Plus size={16} /> Add User
        </button>
      </div>

      {/* Success / Error banners */}
      {successMsg && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm">
          <CheckCircle size={16} /> {successMsg}
        </div>
      )}
      {error && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <span className="flex items-center gap-2"><AlertTriangle size={16} /> {error}</span>
          <button onClick={() => setError(null)}><X size={14} /></button>
        </div>
      )}

      {/* Role Permissions */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Lock size={18} className="text-gray-500" />
          <h3 className="font-semibold text-gray-800">Role Permissions</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {Object.entries(ROLE_PERMISSIONS).map(([role, info]) => (
            <div key={role}>
              <button
                onClick={() => setExpandedRole(expandedRole === role ? null : role)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(role)}`}>
                    {getRoleLabel(role)}
                  </span>
                  <span className="text-sm text-gray-500">{info.permissions.length} permissions</span>
                </div>
                {expandedRole === role ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </button>
              {expandedRole === role && (
                <ul className="px-6 pb-4 space-y-2">
                  {info.permissions.map((perm) => (
                    <li key={perm} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle size={15} className="text-green-500 mt-0.5 flex-shrink-0" />
                      {perm}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Delete Policy */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex gap-3">
        <Clock className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
        <div>
          <p className="font-semibold text-amber-800">Admin Delete Policy</p>
          <p className="text-sm text-amber-700 mt-1">
            Admins can delete records freely within <strong>{DELETE_WINDOW_HOURS} hours</strong> of creation.
            After {DELETE_WINDOW_HOURS} hours, a delete request is sent to Super Admin for approval.
            Super Admins can delete any record at any time.
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-gray-500" />
            <h3 className="font-semibold text-gray-800">Users</h3>
            {!loading && <span className="text-xs text-gray-400 ml-1">({users.length})</span>}
          </div>
          <button onClick={fetchUsers} className="text-xs text-purple-600 hover:underline">Refresh</button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['ID', 'Name', 'Email', 'Role', 'Joined', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => copyId(u.id)}
                        title="Click to copy"
                        className="flex items-center gap-1.5 font-mono text-xs text-gray-400 hover:text-purple-600 transition-colors"
                      >
                        <span>{u.id.slice(0, 8)}…</span>
                        <Copy size={11} />
                      </button>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-gray-800">{u.name}</td>
                    <td className="px-5 py-3.5 text-gray-500">{u.email}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(u.role)}`}>
                        {getRoleLabel(u.role)}
                        {u.id === user?.id && ' (you)'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-400 text-xs">
                      {new Date(u.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEdit(u)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        {/* Super-admins cannot delete other super-admins; anyone can delete themselves */}
                        {(u.id === user?.id || u.role !== 'super-admin') && (
                          <button
                            onClick={() => setDeleteTarget(u)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title={u.id === user?.id ? 'Delete my account' : 'Delete'}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-gray-400 py-10">No users found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create Modal ── */}
      {showCreate && (
        <Modal title="Add New User" onClose={() => setShowCreate(false)}>
          <div className="space-y-4">
            <FieldRow label="Full Name">
              <input className={inputCls} placeholder="Soham Sharma" value={createForm.name}
                onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} />
            </FieldRow>
            <FieldRow label="Email">
              <input className={inputCls} type="email" placeholder="soham@pravaa.in" value={createForm.email}
                onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} />
            </FieldRow>
            <FieldRow label="Password">
              <div className="relative">
                <input className={inputCls + ' pr-10'} type={createPwdVisible ? 'text' : 'password'}
                  placeholder="Min. 6 characters" value={createForm.password}
                  onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))} />
                <button type="button" onClick={() => setCreatePwdVisible(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {createPwdVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </FieldRow>
            <FieldRow label="Role">
              <select className={inputCls} value={createForm.role}
                onChange={e => setCreateForm(f => ({ ...f, role: e.target.value }))}>
                {ROLES.map(r => <option key={r} value={r}>{getRoleLabel(r)}</option>)}
              </select>
            </FieldRow>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreate(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleCreate} disabled={creating}
                className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60">
                {creating ? 'Creating…' : 'Create User'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Edit Modal ── */}
      {editUser && (
        <Modal title="Edit User" onClose={() => setEditUser(null)}>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl px-4 py-3 text-xs text-gray-500 font-mono break-all">
              ID: {editUser.id}
            </div>
            <FieldRow label="Full Name">
              <input className={inputCls} value={editForm.name}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
            </FieldRow>
            <FieldRow label="Email">
              <input className={inputCls} type="email" value={editForm.email}
                onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
            </FieldRow>
            <FieldRow label="Role">
              <select className={inputCls} value={editForm.role}
                disabled={editUser.id === user?.id}
                onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
                {ROLES.map(r => <option key={r} value={r}>{getRoleLabel(r)}</option>)}
              </select>
              {editUser.id === user?.id && (
                <p className="text-xs text-gray-400 mt-1">You cannot change your own role.</p>
              )}
            </FieldRow>
            {/* Password change — only allowed when editing your own account */}
            {editUser.id === user?.id && (
              <div className="border-t border-gray-100 pt-4 space-y-4">
                <p className="text-xs text-gray-400">Leave password fields blank to keep your existing password.</p>
                <FieldRow label="New Password">
                  <div className="relative">
                    <input className={inputCls + ' pr-10'} type={editPwdVisible ? 'text' : 'password'}
                      placeholder="Min. 6 characters" value={editForm.password}
                      onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))} />
                    <button type="button" onClick={() => setEditPwdVisible(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {editPwdVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </FieldRow>
                <FieldRow label="Confirm New Password">
                  <div className="relative">
                    <input className={inputCls + ' pr-10'} type={editConfirmPwdVisible ? 'text' : 'password'}
                      placeholder="Re-enter new password" value={editForm.confirmPassword}
                      onChange={e => setEditForm(f => ({ ...f, confirmPassword: e.target.value }))} />
                    <button type="button" onClick={() => setEditConfirmPwdVisible(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {editConfirmPwdVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {editForm.password && editForm.confirmPassword && editForm.password !== editForm.confirmPassword && (
                    <p className="text-xs text-red-500 mt-1">Passwords do not match.</p>
                  )}
                </FieldRow>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditUser(null)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Delete Confirm ── */}
      {deleteTarget && (
        <Modal
          title={deleteTarget.id === user?.id ? 'Delete Your Account' : 'Delete User'}
          onClose={() => setDeleteTarget(null)}
        >
          <div className="space-y-4">
            {deleteTarget.id === user?.id ? (
              /* Self-delete — strong warning */
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="font-semibold text-red-800">Are you sure you want to delete your own account?</p>
                  <p className="text-sm text-red-700 mt-1">
                    This will permanently remove your account <strong>({deleteTarget.email})</strong> from the system.
                    You will be immediately logged out and lose all access. This action cannot be undone.
                  </p>
                </div>
              </div>
            ) : (
              /* Delete another user */
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="font-semibold text-red-800">This action is irreversible.</p>
                  <p className="text-sm text-red-700 mt-1">
                    You are about to permanently delete <strong>{deleteTarget.name}</strong> ({deleteTarget.email}).
                    Their data will be removed from Supabase.
                  </p>
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                <Trash2 size={15} />
                {deleteButtonLabel}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
