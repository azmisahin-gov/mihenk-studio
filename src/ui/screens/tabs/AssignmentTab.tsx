/**
 * Görevlendirme sekmesi.
 *
 * Alanlar kaynağına bağlıdır; okunamayan alanlar tahmin edilmez ve insan
 * tarafından teyit edilir (bkz. MIH-REQ-DOC-002, MIH-REQ-DOC-003).
 */
import { useState } from "react";
import type { ApiClient, TaskBundleView } from "../../api.ts";
import { Badge, Button, Callout, Panel } from "../../components/ui.tsx";
import { formatBytes, formatDateTime } from "../../format.ts";

export function AssignmentTab({
  api,
  bundle,
  onNotify,
  onReload,
}: {
  api: ApiClient;
  bundle: TaskBundleView;
  onNotify: (message: string, tone?: "ok" | "error") => void;
  onReload: () => void;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const taskId = bundle.task.taskId;

  async function confirm(fieldId: string) {
    const value = (drafts[fieldId] ?? "").trim();
    if (value.length === 0) {
      onNotify("Teyit için alan değeri girin; boş değer kaydedilemez.", "error");
      return;
    }
    setBusy(fieldId);
    try {
      await api.confirmField(taskId, fieldId, value);
      onNotify("Alan teyit edildi.");
      onReload();
    } catch (cause) {
      onNotify(cause instanceof Error ? cause.message : "Alan teyit edilemedi.", "error");
    } finally {
      setBusy(null);
    }
  }

  const documentMaterial = bundle.materials.find((material) => material.kind === "görevlendirme-belgesi");

  return (
    <div className="st-grid-2">
      <Panel title="Görevlendirme belgesi" description="Kaynak belge değiştirilmeden saklanır.">
        {bundle.assignments.length > 0 ? (
          <div className="st-stack">
            {bundle.assignments.map((assignment) => (
              <div key={assignment.assignmentId} className="st-panel" style={{ padding: 12 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span aria-hidden="true" style={{ fontSize: 22 }}>
                    📄
                  </span>
                  <div style={{ flex: 1 }}>
                    <strong style={{ display: "block", fontSize: 13 }}>
                      {documentMaterial?.originalName ?? "Görevlendirme belgesi"}
                    </strong>
                    <small style={{ color: "var(--st-muted)" }}>
                      {assignment.documentType} · {assignment.pageCount} sayfa ·{" "}
                      {documentMaterial ? formatBytes(documentMaterial.sizeBytes) : "—"}
                    </small>
                  </div>
                  <Badge tone="gray">SENTETİK</Badge>
                </div>
                {documentMaterial ? (
                  <small style={{ display: "block", marginTop: 8, color: "var(--st-muted)", fontSize: 11 }}>
                    Özet (sha256): {documentMaterial.sha256.slice(0, 24)}… · Alınma:{" "}
                    {formatDateTime(documentMaterial.receivedAt)}
                  </small>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <Callout tone="warn" title="Belge kaydı yok">
            Bu göreve bağlı görevlendirme belgesi bulunmuyor.
          </Callout>
        )}
      </Panel>

      <Panel
        title="Belgeden çıkarılan alanlar"
        description="Alanlar kaynağa bağlıdır; emin olunmayan veri tahminle tamamlanmaz."
        action={
          <Badge tone={bundle.fields.some((field) => field.confirmation === "teyit-bekliyor") ? "amber" : "green"}>
            {bundle.fields.filter((field) => field.confirmation === "teyit-bekliyor").length} teyit gerekli
          </Badge>
        }
      >
        <div className="st-stack">
          {bundle.fields.map((field) => {
            const pending = field.confirmation === "teyit-bekliyor";
            return (
              <div
                key={field.fieldId}
                style={{
                  padding: 11,
                  border: `1px solid ${pending ? "var(--st-amber)" : "var(--st-line)"}`,
                  borderRadius: 10,
                  background: pending ? "var(--st-amber-soft)" : "var(--st-white)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontSize: 12, color: "var(--st-muted)" }}>{field.key}</span>
                  <Badge tone={pending ? "amber" : "green"}>{pending ? "Teyit bekliyor" : "Kaynağa bağlı"}</Badge>
                </div>
                {pending ? (
                  <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                    <input
                      aria-label={`${field.key} alanının teyit değeri`}
                      style={{
                        flex: 1,
                        padding: "7px 9px",
                        border: "1px solid var(--st-line-strong)",
                        borderRadius: 8,
                      }}
                      value={drafts[field.fieldId] ?? ""}
                      onChange={(event) =>
                        setDrafts((items) => ({ ...items, [field.fieldId]: event.target.value }))
                      }
                      placeholder="Belge görüntüsünden teyit edin"
                    />
                    <Button
                      kind="primary"
                      size="small"
                      onClick={() => confirm(field.fieldId)}
                      disabled={busy === field.fieldId}
                    >
                      {busy === field.fieldId ? "Kaydediliyor…" : "Teyit et"}
                    </Button>
                  </div>
                ) : (
                  <strong style={{ display: "block", marginTop: 5, fontSize: 13 }}>{field.value}</strong>
                )}
                <small style={{ display: "block", marginTop: 5, color: "var(--st-muted)", fontSize: 11 }}>
                  Kaynak: sayfa {field.sourcePage} · {field.sourceRegion} · güven %{Math.round(field.confidence * 100)}
                </small>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
