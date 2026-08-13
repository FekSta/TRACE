import { useRef, useState, type FormEvent } from "react";
import { useAuthedFetch } from "../../hooks/useAuthedFetch";
import { useToast } from "../../components/ui/Toast";
import { api, ApiError } from "../../lib/api";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { Field, Select, TextArea, TextInput } from "../../components/ui/Field";
import type { Category, LostItem, FoundItem } from "../../lib/types";

interface Props {
  kind: "lost" | "found";
  onDone: () => void;
}

/** Report a lost or found item — translated from demo/user's report pages,
 *  backed by POST /items/lost|found + POST /items/{kind}/{id}/attachments
 *  (photo upload per the Items module's Attachment endpoint). */
export default function ReportItem({ kind, onDone }: Props) {
  const { show } = useToast();
  const categories = useAuthedFetch<Category[]>("/categories");
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<Record<string, string>>({});
  const [photo, setPhoto] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const categoryId = Number(form.category_id);
    if (!categoryId) {
      setError("Please choose a category.");
      return;
    }
    if (!form.title?.trim()) {
      setError("Title is required.");
      return;
    }

    const payload = {
      category_id: categoryId,
      title: form.title.trim(),
      description: form.description || null,
      brand: form.brand || null,
      colour: form.colour || null,
      ...(kind === "lost"
        ? { date_lost: form.date_lost || null, location_lost: form.location_lost || null }
        : { date_found: form.date_found || null, storage_location: form.storage_location || null }),
    };

    setSubmitting(true);
    try {
      const item = await api.post<LostItem | FoundItem>(`/items/${kind}`, payload);
      if (photo) {
        const fd = new FormData();
        fd.append("file", photo);
        await api.postForm(`/items/${kind}/${item.id}/attachments`, fd);
      }
      show(`${kind === "lost" ? "Lost" : "Found"} item #${item.id} reported — matching is running.`);
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not submit the report.");
    } finally {
      setSubmitting(false);
    }
  }

  const isLost = kind === "lost";

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="font-display text-[30px] font-bold leading-tight text-ink">
          Report {isLost ? "Lost" : "Found"} Item
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          {isLost
            ? "Submit details for an item you've misplaced."
            : "Log an item you've discovered to help return it."}
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
          <div className="sm:col-span-2">
            <Field label="Category">
              <Select value={form.category_id ?? ""} onChange={(e) => set("category_id", e.target.value)} required>
                <option value="">Select a category…</option>
                {(categories.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.category_name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field label="Title">
              <TextInput placeholder={isLost ? "e.g. Black Nike backpack" : "e.g. Silver smartwatch found"} value={form.title ?? ""} onChange={(e) => set("title", e.target.value)} required />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field label="Description">
              <TextArea placeholder="Colour, size, markings, anything that helps identify it…" value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} />
            </Field>
          </div>

          <Field label="Brand">
            <TextInput value={form.brand ?? ""} onChange={(e) => set("brand", e.target.value)} />
          </Field>
          <Field label="Colour">
            <TextInput value={form.colour ?? ""} onChange={(e) => set("colour", e.target.value)} />
          </Field>

          <Field label={isLost ? "Date Lost" : "Date Found"}>
            <TextInput type="date" value={form.date_lost ?? form.date_found ?? ""} onChange={(e) => set(isLost ? "date_lost" : "date_found", e.target.value)} />
          </Field>
          <Field label={isLost ? "Location Lost" : "Storage Location"}>
            <TextInput placeholder={isLost ? "e.g. Library, 3rd floor" : "e.g. Front desk safe"} value={form.location_lost ?? form.storage_location ?? ""} onChange={(e) => set(isLost ? "location_lost" : "storage_location", e.target.value)} />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Photo (optional)">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                className="block w-full text-xs text-muted file:mr-3 file:cursor-pointer file:rounded-lg file:border file:border-line file:bg-soft file:px-3 file:py-2 file:text-xs file:font-semibold file:text-ink hover:file:bg-brand-light"
              />
              {photo && <p className="mt-1.5 text-xs text-brand">{photo.name} will be attached to the report.</p>}
            </Field>
          </div>

          {error && (
            <div className="sm:col-span-2 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-[0.9rem] text-danger">
              {error}
            </div>
          )}

          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? "Submitting…" : `Submit ${isLost ? "Lost" : "Found"} Report`}
            </Button>
            <Button type="button" onClick={onDone}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
