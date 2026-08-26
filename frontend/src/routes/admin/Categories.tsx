import { useState } from "react";
import { useAuthedFetch } from "../../hooks/useAuthedFetch";
import { useToast } from "../../components/ui/Toast";
import { api, ApiError } from "../../lib/api";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import Modal from "../../components/ui/Modal";
import EmptyState from "../../components/ui/EmptyState";
import { Field, TextInput } from "../../components/ui/Field";
import type { Category } from "../../lib/types";

/** Manage categories — the only Admin view with full CRUD backing this pass
 *  (GET/POST/PATCH/DELETE /categories). */
export default function Categories() {
  const { show } = useToast();
  const categories = useAuthedFetch<Category[]>("/categories?include_archived=true");

  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ category_name: "", description: "", icon: "", display_order: "" });
  const [busy, setBusy] = useState(false);

  const list = categories.data ?? [];

  function openCreate() {
    setForm({ category_name: "", description: "", icon: "", display_order: "" });
    setCreating(true);
  }

  function openEdit(c: Category) {
    setForm({
      category_name: c.category_name,
      description: c.description ?? "",
      icon: c.icon ?? "",
      display_order: c.display_order?.toString() ?? "",
    });
    setEditing(c);
  }

  async function save() {
    if (!form.category_name.trim()) {
      show("Category name is required", "error");
      return;
    }
    setBusy(true);
    try {
      const body = {
        category_name: form.category_name.trim(),
        description: form.description || null,
        icon: form.icon || null,
        display_order: form.display_order ? Number(form.display_order) : null,
      };
      if (editing) {
        await api.patch(`/categories/${editing.id}`, body);
        show(`Category "${body.category_name}" updated.`);
      } else {
        await api.post("/categories", body);
        show(`Category "${body.category_name}" created.`);
      }
      setCreating(false);
      setEditing(null);
      categories.reload();
    } catch (err) {
      show(err instanceof ApiError ? err.message : "Save failed", "error");
    } finally {
      setBusy(false);
    }
  }

  async function archive(c: Category) {
    if (!window.confirm(`Archive category "${c.category_name}"? It is hidden from report forms.`)) return;
    try {
      await api.delete(`/categories/${c.id}`);
      show(`Category "${c.category_name}" archived.`);
      categories.reload();
    } catch (err) {
      show(err instanceof ApiError ? err.message : "Archive failed", "error");
    }
  }

  async function restore(c: Category) {
    try {
      await api.patch(`/categories/${c.id}`, { status: "Active" });
      show(`Category "${c.category_name}" restored.`);
      categories.reload();
    } catch (err) {
      show(err instanceof ApiError ? err.message : "Restore failed", "error");
    }
  }

  const formModal = (
    <Field label="Category name">
      <TextInput value={form.category_name} onChange={(e) => setForm((f) => ({ ...f, category_name: e.target.value }))} required placeholder="e.g. Electronics" />
    </Field>
  );

  const formBody = (
    <div className="space-y-4">
      {formModal}
      <Field label="Description">
        <TextInput value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Short description" />
      </Field>
      <Field label="Icon key">
        <TextInput value={form.icon} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))} placeholder="e.g. electronics" />
      </Field>
      <Field label="Display order">
        <TextInput type="number" value={form.display_order} onChange={(e) => setForm((f) => ({ ...f, display_order: e.target.value }))} placeholder="e.g. 5" />
      </Field>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[30px] font-bold leading-tight text-ink">Manage Categories</h1>
          <p className="mt-1.5 text-sm text-muted">Organize and structure items for efficient claim matching.</p>
        </div>
        <Button variant="primary" onClick={openCreate}>
          <span className="material-symbols-outlined text-[18px]">add</span>
          Add Category
        </Button>
      </div>

      <Card title="Categories" meta={`${list.length} total (archived included)`} noPadding>
        {list.length === 0 ? (
          <EmptyState message="No categories yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-soft text-[10px] uppercase tracking-[0.06em] text-muted">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Icon</th>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-xs">
                {list.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-[#fafdfb]">
                    <td className="px-4 py-3.5 font-semibold text-ink">{c.category_name}</td>
                    <td className="max-w-[260px] truncate px-4 py-3.5 text-muted">{c.description ?? "—"}</td>
                    <td className="px-4 py-3.5 text-muted">{c.icon ?? "—"}</td>
                    <td className="px-4 py-3.5 text-muted">{c.display_order ?? "—"}</td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button variant="outline" onClick={() => openEdit(c)}>
                          Edit
                        </Button>
                        {c.status === "Archived" ? (
                          <Button onClick={() => restore(c)}>Restore</Button>
                        ) : (
                          <Button variant="danger" onClick={() => archive(c)}>
                            Archive
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create / edit modal */}
      <Modal
        open={creating || editing !== null}
        title={editing ? `Edit category #${editing.id}` : "Add category"}
        onClose={() => { setCreating(false); setEditing(null); }}
        footer={
          <>
            <Button onClick={() => { setCreating(false); setEditing(null); }}>Cancel</Button>
            <Button variant="primary" disabled={busy} onClick={save}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        <form onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-4">
          {formBody}
        </form>
      </Modal>
    </div>
  );
}
