import { useEffect, useState, type ChangeEvent } from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { Field, TextInput } from "../ui/Field";
import { useToast } from "../ui/Toast";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";
import type { CurrentUser } from "../../lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface FormState {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
}

interface PasswordState {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

const EMPTY: FormState = { first_name: "", last_name: "", email: "", phone_number: "" };
const EMPTY_PASSWORD: PasswordState = { current_password: "", new_password: "", confirm_password: "" };

/**
 * ProfileModal — the signed-in user's own profile (First name, Last name,
 * Email, Phone number) plus a self-service password change. Personal details
 * are pre-filled from `GET /auth/me` and saved with `PATCH /auth/me`; the
 * password is rotated with `POST /auth/me/password` (see Notes.md §8.9).
 *
 * It deliberately has **no Role field**: role is Administrator-managed
 * (`/admin/users`), and the endpoints reject a `role` payload outright, so a
 * user can never change their own role from this flow.
 */
export default function ProfileModal({ open, onClose }: Props) {
  const { session } = useAuth();
  const { show } = useToast();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [password, setPassword] = useState<PasswordState>(EMPTY_PASSWORD);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);

  // Re-read the live profile each time the modal opens so it always shows the
  // current values (the JWT only carries name/role, not email or phone).
  useEffect(() => {
    if (!open || !session?.token) return;
    let cancelled = false;
    setLoading(true);
    setPassword(EMPTY_PASSWORD);
    (async () => {
      try {
        const me = await api.get<CurrentUser>("/auth/me", session.token);
        if (!cancelled) {
          setForm({
            first_name: me.first_name,
            last_name: me.last_name,
            email: me.email,
            phone_number: me.phone_number ?? "",
          });
        }
      } catch (error) {
        if (!cancelled) show(error instanceof ApiError ? error.message : "Could not load your profile", "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, session?.token, show]);

  const field = (key: keyof FormState) => (event: ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const passwordField = (key: keyof PasswordState) => (event: ChangeEvent<HTMLInputElement>) =>
    setPassword((current) => ({ ...current, [key]: event.target.value }));

  async function save() {
    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim()) {
      show("First name, last name, and email are required", "error");
      return;
    }
    setBusy(true);
    try {
      // Note: no `role` (or `status`) is ever sent — the endpoint forbids them.
      await api.patch<CurrentUser>(
        "/auth/me",
        {
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim(),
          phone_number: form.phone_number.trim() || null,
        },
        session?.token,
      );
      show("Profile updated.");
      onClose();
    } catch (error) {
      show(error instanceof ApiError ? error.message : "Could not save your profile", "error");
    } finally {
      setBusy(false);
    }
  }

  async function changePassword() {
    if (!password.current_password || !password.new_password) {
      show("Enter your current and new password", "error");
      return;
    }
    if (password.new_password.length < 8) {
      show("New password must be at least 8 characters", "error");
      return;
    }
    if (password.new_password !== password.confirm_password) {
      show("New passwords do not match", "error");
      return;
    }
    setPasswordBusy(true);
    try {
      await api.post(
        "/auth/me/password",
        { current_password: password.current_password, new_password: password.new_password },
        session?.token,
      );
      show("Password updated.");
      setPassword(EMPTY_PASSWORD);
    } catch (error) {
      show(error instanceof ApiError ? error.message : "Could not update your password", "error");
    } finally {
      setPasswordBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      title="My profile"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={busy || loading} onClick={save}>
            {busy ? "Saving…" : "Save profile"}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
        className="grid gap-4 sm:grid-cols-2"
      >
        <Field label="First name">
          <TextInput value={form.first_name} onChange={field("first_name")} required />
        </Field>
        <Field label="Last name">
          <TextInput value={form.last_name} onChange={field("last_name")} required />
        </Field>
        <Field label="Email">
          <TextInput type="email" value={form.email} onChange={field("email")} required />
        </Field>
        <Field label="Phone number">
          <TextInput value={form.phone_number} onChange={field("phone_number")} />
        </Field>
      </form>

      <div className="mt-5 border-t border-line pt-4">
        <h4 className="text-body font-semibold text-ink">Change password</h4>
        <p className="mt-1 text-small text-muted">Use at least 8 characters.</p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            changePassword();
          }}
          className="mt-3 grid gap-4 sm:grid-cols-2"
        >
          <Field label="Current password">
            <TextInput
              type="password"
              aria-label="Current password"
              autoComplete="current-password"
              value={password.current_password}
              onChange={passwordField("current_password")}
            />
          </Field>
          <div />
          <Field label="New password">
            <TextInput
              type="password"
              aria-label="New password"
              autoComplete="new-password"
              value={password.new_password}
              onChange={passwordField("new_password")}
            />
          </Field>
          <Field label="Confirm new password">
            <TextInput
              type="password"
              aria-label="Confirm new password"
              autoComplete="new-password"
              value={password.confirm_password}
              onChange={passwordField("confirm_password")}
            />
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={passwordBusy}>
              {passwordBusy ? "Updating…" : "Update password"}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
