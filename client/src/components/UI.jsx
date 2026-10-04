import AppLoader from "./AppLoader";
import { useEffect, useState } from "react";
import {
  Inbox,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { api, message } from "../services/api";
import toast from "react-hot-toast";
import crest from "../assets/logo.jpeg";
export const pretty = (value) =>
  String(value || "—")
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
export const time = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
export function Brand() {
  return (
    <div className="brand">
      <img
        className="brand-crest"
        src={crest}
        alt="Shree Ram Public School crest"
      />
      <div>
        <strong>SHREE RAM</strong>
        <small>PUBLIC SCHOOL</small>
      </div>
    </div>
  );
}
export function Badge({ value }) {
  return <span className={`badge badge-${value}`}>{pretty(value)}</span>;
}
export function Avatar({ name = "", photo, large = false }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let active = true,
      url;
    setSrc("");
    if (photo)
      api
        .get(photo.replace("/api", ""), { responseType: "blob" })
        .then((r) => {
          if (!active) return;
          url = URL.createObjectURL(r.data);
          setSrc(url);
        })
        .catch(() => {});
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [photo]);
  return src ? (
    <img className={`avatar ${large ? "large" : ""}`} src={src} alt={name} />
  ) : (
    <span className={`avatar ${large ? "large" : ""}`}>
      {name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("") || "S"}
    </span>
  );
}
export function PageTitle({
  eyebrow = "CAMPUS OPERATIONS",
  title,
  description,
  children,
}) {
  return (
    <div className="page-title">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      <div className="title-actions">{children}</div>
    </div>
  );
}
export function Empty({
  title = "No records yet",
  description = "New records will appear here as your school starts using the system.",
}) {
  return (
    <div className="empty">
      <Inbox size={32} />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
export function Loading(props) {
  return <AppLoader {...props}/>;
}
export function ErrorState({ error, reload }) {
  return (
    <div className="error-box" role="alert">
      {error} {reload && <button onClick={reload}>Try again</button>}
    </div>
  );
}
export function DataState({ query, children }) {
  if (query.loading) return <Loading />;
  if (query.error)
    return <ErrorState error={query.error} reload={query.reload} />;
  return children;
}
export function Modal({ title, onClose, children }) {
  useEffect(() => {
    const handle = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="section-head">
          <h2>{title}</h2>
          <button className="icon-button" aria-label="Close" onClick={onClose}>
            <X />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
export function Field({ label, error, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {error && <small className="field-error">{error.message || error}</small>}
    </label>
  );
}
export function Pager({ page, total, limit = 30, onChange }) {
  return (
    <div className="pager">
      <span>
        {total || 0} records · Page {page}
      </span>
      <div>
        <button
          className="icon-button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          className="icon-button"
          disabled={page * limit >= total}
          onClick={() => onChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
export function Table({ headers, children }) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
export async function act(fn, success = "Saved successfully") {
  try {
    const result = await fn();
    if (result?.status === "DEVELOPMENT_ONLY")
      toast.success(
        "Development OTP generated. Check the backend terminal for the code.",
      );
    else if (
      result?.status === "FAILED" ||
      result?.status === "UNCONFIGURED" ||
      ["FAILED", "UNCONFIGURED"].includes(result?.delivery?.status)
    )
      toast.error(
        "Saved, but WhatsApp delivery is unavailable. Check notifications and provider configuration.",
      );
    else toast.success(success);
    return result;
  } catch (e) {
    toast.error(message(e));
    throw e;
  }
}
export function PhotoUpload({ value, onChange }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="photo-upload">
      <Avatar name="Photo" photo={value} />
      <label className="button secondary">
        {busy ? <><AppLoader inline label="Uploading photo"/> Uploading…</> : "Upload photo"}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
          disabled={busy}
          onChange={async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            setBusy(true);
            const data = new FormData();
            data.append("file", file);
            try {
              const r = await api.post("/uploads", data);
              onChange(r.data.data.url);
            } catch (e) {
              toast.error(message(e));
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
    </div>
  );
}
