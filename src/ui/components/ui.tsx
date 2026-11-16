/**
 * Paylaşılan arayüz bileşenleri.
 */
import type { ReactNode } from "react";

export type Tone = "green" | "amber" | "blue" | "red" | "gray";

export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`st-badge ${tone}`}>{children}</span>;
}

export function Button({
  children,
  onClick,
  kind = "secondary",
  size,
  disabled,
  title,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  kind?: "primary" | "secondary" | "ghost" | "danger";
  size?: "small";
  disabled?: boolean;
  title?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      className={`st-button ${kind}${size === "small" ? " small" : ""}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  );
}

export function TextButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button type="button" className="st-text-button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function PageTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="st-page-title">
      <div>
        <div className="st-eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action ? <div className="st-title-action">{action}</div> : null}
    </header>
  );
}

export function Panel({
  title,
  description,
  action,
  children,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="st-panel">
      {title ? (
        <div className="st-panel-heading">
          <div>
            <h2>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          {action ? <div className="st-heading-action">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="st-stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

export function Callout({
  tone = "warn",
  title,
  children,
}: {
  tone?: "warn" | "info" | "error";
  title?: string;
  children: ReactNode;
}) {
  const className = tone === "info" ? "st-callout info" : tone === "error" ? "st-callout error" : "st-callout";
  return (
    <div className={className}>
      <div>
        {title ? <strong>{title}</strong> : null}
        <span>{children}</span>
      </div>
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="st-empty-state" role="status">
      <strong>{title}</strong>
      <span>{description}</span>
    </div>
  );
}

export function DisabledItem({ label, reason }: { label: string; reason: string }) {
  return (
    <div className="st-disabled-item">
      <span aria-hidden="true">⏳</span>
      <div>
        <strong>{label}</strong>
        <div>{reason}</div>
      </div>
      <Badge tone="gray">Sonraki aşama</Badge>
    </div>
  );
}

export function Toast({ message, tone }: { message: string; tone: "ok" | "error" }) {
  return (
    <div className={`st-toast${tone === "error" ? " error" : ""}`} role="status" aria-live="polite">
      {message}
    </div>
  );
}

export function Skeleton({ width = "100%" }: { width?: string }) {
  return <div className="st-skeleton" style={{ width }} />;
}
