import { useState } from "react";
import { useAuthedFetch } from "../../hooks/useAuthedFetch";
import { useToast } from "../../components/ui/Toast";
import { api, ApiError } from "../../lib/api";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import Modal from "../../components/ui/Modal";
import EmptyState from "../../components/ui/EmptyState";
import { Field, Select, TextInput } from "../../components/ui/Field";
import type { ManagedUser } from "../../lib/types";

type FormState = {
  first_name: string;
  last_name: string;
  student_number: string;
  email: string;
  phone_number: string;
  role: "User" | "Officer";
  status: "Active" | "Suspended" | "Inactive";
  password: string;
};

const EMPTY: FormState = {
  first_name: "",
  last_name: "",
  student_number: "",
  email: "",
  phone_number: "",
  role: "User",
  status: "Active",
  password: "",
};

export default function Users() {
  const { show } = useToast();
  const users = useAuthedFetch<ManagedUser[]>("/admin/users");
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [busy, setBusy] = useState(false);
  const list = users.data ?? [];

  function openCreate() {
    setForm(EMPTY);
    setCreating(true);
  }

  function openEdit(user: ManagedUser) {
    setForm({
      first_name: user.first_name,
      last_name: user.last_name,
      student_number: user.student_number ?? "",
      email: user.email,
      phone_number: user.phone_number ?? "",
      role: user.role === "Officer" ? "Officer" : "User",
      status: user.status,
      password: "",
    });
    setEditing(user);
  }

  function closeForm() {
    setCreating(false);
    setEditing(null);
  }

  async function save() {
    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim()) {
      show("First name, last name, and email are required", "error");
      return;
    }
    setBusy(true);
    try {
      const body = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        student_number: form.student_number || null,
        email: form.email.trim(),
        phone_number: form.phone_number || null,
        role: form.role,
        status: form.status,
        ...(creating && form.password ? { password: form.password } : {}),
      };
      if (editing) {
        await api.put(`/admin/users/${editing.id}`, body);
        show(`Account for ${body.first_name} ${body.last_name} updated.`);
      } else {
        await api.post("/admin/users", body);
        show(`Account for ${body.first_name} ${body.last_name} created. Credentials were emailed.`);
      }
      closeForm();
      users.reload();
    } catch (error) {
      show(error instanceof ApiError ? error.message : "Could not save account", "error");
    } finally {
      setBusy(false);
    }
  }

  async function deactivate(user: ManagedUser) {
    if (!window.confirm(`Deactivate ${user.first_name} ${user.last_name}'s account?`)) return;
    try {
      await api.delete(`/admin/users/${user.id}`);
      show(`${user.first_name} ${user.last_name} is now inactive.`);
      users.reload();
    } catch (error) {
      show(error instanceof ApiError ? error.message : "Could not deactivate account", "error");
    }
  }

  const field = (key: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[30px] font-bold leading-tight text-ink">Manage Users</h1>
          <p className="mt-1.5 text-sm text-muted">Create and maintain User and Officer accounts.</p>
        </div>
        <Button variant="primary" onClick={openCreate}>
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          Add account
        </Button>
      </div>

      <Card title="Accounts" meta={`${list.length} managed account${list.length === 1 ? "" : "s"}`} noPadding>
        {users.errorStatus !== null ? (
          <EmptyState message={users.error ?? "Could not load accounts."} hint="Check that the backend is running and you are signed in as an Administrator." />
        ) : list.length === 0 ? (
          <EmptyState message="No User or Officer accounts yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-soft text-[10px] uppercase tracking-[0.06em] text-muted">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-xs">
                {list.map((user) => (
                  <tr key={user.id} className="transition-colors hover:bg-[#fafdfb]">
                    <td className="px-4 py-3.5 font-semibold text-ink">{user.first_name} {user.last_name}</td>
                    <td className="px-4 py-3.5 text-muted">{user.email}</td>
                    <td className="px-4 py-3.5 text-ink">{user.role}</td>
                    <td className="px-4 py-3.5"><StatusBadge status={user.status} /></td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button onClick={() => openEdit(user)}>Edit</Button>
                        {user.status !== "Inactive" && <Button variant="danger" onClick={() => deactivate(user)}>Deactivate</Button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={creating || editing !== null} title={editing ? `Edit account #${editing.id}` : "Add account"} onClose={closeForm} footer={
        <><Button onClick={closeForm}>Cancel</Button><Button variant="primary" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save account"}</Button></>
      }>
        <form onSubmit={(event) => { event.preventDefault(); save(); }} className="grid gap-4 sm:grid-cols-2">
          <Field label="First name"><TextInput value={form.first_name} onChange={field("first_name")} required /></Field>
          <Field label="Last name"><TextInput value={form.last_name} onChange={field("last_name")} required /></Field>
          <Field label="Email"><TextInput type="email" value={form.email} onChange={field("email")} required /></Field>
          <Field label="Student / employee number"><TextInput value={form.student_number} onChange={field("student_number")} /></Field>
          <Field label="Phone number"><TextInput value={form.phone_number} onChange={field("phone_number")} /></Field>
          <Field label="Role"><Select value={form.role} onChange={field("role")}><option value="User">User</option><option value="Officer">Officer</option></Select></Field>
          {editing ? <Field label="Status"><Select value={form.status} onChange={field("status")}><option value="Active">Active</option><option value="Suspended">Suspended</option><option value="Inactive">Inactive</option></Select></Field> : <div />}
          {creating && <Field label="Password (optional demo field)"><TextInput type="password" value={form.password} onChange={field("password")} minLength={8} placeholder="Leave blank to generate" /></Field>}
        </form>
      </Modal>
    </div>
  );
}