/**
 * Sorular ve Bulgular sekmesi.
 *
 * Soru → Yanıt → EvidenceRef ilişkisi gerçek veri modeliyle kurulur
 * (bkz. MIH-REQ-QST-002 … 007). Kanıtsız bulgu oluşturulamaz.
 */
import { useState } from "react";
import type { ApiClient, TaskBundleView } from "../../api.ts";
import { Badge, Button, Callout, EmptyState, Panel } from "../../components/ui.tsx";

export function QuestionsTab({
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
  const taskId = bundle.task.taskId;
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [selectedEvidence, setSelectedEvidence] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const [findingCode, setFindingCode] = useState(`B-${String(bundle.findings.length + 1).padStart(2, "0")}`);
  const [findingTitle, setFindingTitle] = useState("");
  const [findingDescription, setFindingDescription] = useState("");
  const [findingSeverity, setFindingSeverity] = useState<"düşük" | "orta" | "yüksek">("orta");
  const [findingEvidence, setFindingEvidence] = useState<string[]>([]);

  function evidenceLabel(evidenceId: string): string {
    return bundle.evidence.find((item) => item.evidenceId === evidenceId)?.label ?? evidenceId;
  }

  async function saveAnswer(questionId: string, complete: boolean) {
    const text = drafts[questionId] ?? "";
    setBusy(questionId);
    try {
      await api.saveAnswer(taskId, questionId, text, complete);
      onNotify(complete ? "Yanıt kaydedildi." : "Yanıt taslak olarak kaydedildi.");
      onReload();
    } catch (cause) {
      onNotify(cause instanceof Error ? cause.message : "Yanıt kaydedilemedi.", "error");
    } finally {
      setBusy(null);
    }
  }

  async function linkEvidence(questionId: string) {
    const answer = bundle.answers.find((item) => item.questionId === questionId);
    const evidenceId = selectedEvidence[questionId];
    if (!answer) {
      onNotify("Önce yanıtı kaydedin; ardından dayanak bağlanabilir.", "error");
      return;
    }
    if (!evidenceId) {
      onNotify("Bağlanacak dayanak seçin.", "error");
      return;
    }
    try {
      await api.linkAnswerEvidence(taskId, answer.answerId, evidenceId);
      onNotify("Dayanak yanıta bağlandı.");
      onReload();
    } catch (cause) {
      onNotify(cause instanceof Error ? cause.message : "Dayanak bağlanamadı.", "error");
    }
  }

  async function createFinding() {
    if (findingEvidence.length === 0) {
      onNotify("Kanıtsız bulgu oluşturulamaz; en az bir dayanak seçin.", "error");
      return;
    }
    if (findingTitle.trim().length === 0 || findingDescription.trim().length === 0) {
      onNotify("Bulgu başlığı ve açıklaması zorunludur.", "error");
      return;
    }
    try {
      await api.createFinding(taskId, {
        code: findingCode,
        title: findingTitle,
        description: findingDescription,
        severity: findingSeverity,
        evidenceIds: findingEvidence,
      });
      onNotify("Bulgu oluşturuldu.");
      setFindingTitle("");
      setFindingDescription("");
      setFindingEvidence([]);
      onReload();
    } catch (cause) {
      onNotify(cause instanceof Error ? cause.message : "Bulgu oluşturulamadı.", "error");
    }
  }

  return (
    <div className="st-stack">
      <Panel
        title="Görevlendirme soruları"
        description="Her yanıt sürümlüdür ve dayanak taşır. Dayanak gerçek bir belge veya ses segmentine bağlanır."
      >
        <div className="st-stack">
          {bundle.questions.length > 0 ? (
            bundle.questions
              .slice()
              .sort((a, b) => a.index - b.index)
              .map((question) => {
                const answer = bundle.answers.find((item) => item.questionId === question.questionId);
                const links = answer
                  ? bundle.answerEvidence.filter((link) => link.answerId === answer.answerId)
                  : [];
                return (
                  <div key={question.questionId} className="st-panel" style={{ padding: 13 }}>
                    <div style={{ display: "flex", gap: 10 }}>
                      <strong style={{ minWidth: 22 }}>{question.index}.</strong>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 13.5 }}>{question.text}</p>
                        <small style={{ color: "var(--st-muted)" }}>{question.sourceNote}</small>
                      </div>
                      <Badge tone={answer?.status === "tamamlandı" ? "green" : "amber"}>
                        {answer?.status === "tamamlandı" ? `Yanıtlandı (v${answer.version})` : "Yanıt bekliyor"}
                      </Badge>
                    </div>

                    <textarea
                      aria-label={`${question.index}. sorunun yanıtı`}
                      value={drafts[question.questionId] ?? answer?.text ?? ""}
                      onChange={(event) =>
                        setDrafts((items) => ({ ...items, [question.questionId]: event.target.value }))
                      }
                      rows={3}
                      style={{
                        width: "100%",
                        marginTop: 9,
                        padding: "9px 10px",
                        border: "1px solid var(--st-line-strong)",
                        borderRadius: 9,
                        fontFamily: "inherit",
                        fontSize: 13,
                      }}
                    />

                    <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                      <Button
                        size="small"
                        kind="primary"
                        onClick={() => saveAnswer(question.questionId, true)}
                        disabled={busy === question.questionId}
                      >
                        {busy === question.questionId ? "Kaydediliyor…" : "Yanıtı kaydet"}
                      </Button>
                      <Button size="small" onClick={() => saveAnswer(question.questionId, false)}>
                        Taslak olarak kaydet
                      </Button>
                    </div>

                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--st-line)" }}>
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Dayanaklar</div>
                      {links.length > 0 ? (
                        <ul style={{ margin: "0 0 8px", paddingLeft: 18, fontSize: 12.5 }}>
                          {links.map((link) => (
                            <li key={link.evidenceId}>{evidenceLabel(link.evidenceId)}</li>
                          ))}
                        </ul>
                      ) : (
                        <div style={{ color: "var(--st-muted)", fontSize: 12, marginBottom: 8 }}>
                          Bu yanıta bağlı dayanak yok.
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 8 }}>
                        <label style={{ flex: 1 }}>
                          <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}>
                            Dayanak seçimi
                          </span>
                          <select
                            aria-label={`${question.index}. soruya bağlanacak dayanak`}
                            value={selectedEvidence[question.questionId] ?? ""}
                            onChange={(event) =>
                              setSelectedEvidence((items) => ({
                                ...items,
                                [question.questionId]: event.target.value,
                              }))
                            }
                            style={{
                              width: "100%",
                              padding: "7px 9px",
                              border: "1px solid var(--st-line-strong)",
                              borderRadius: 8,
                            }}
                          >
                            <option value="">Dayanak seçin…</option>
                            {bundle.evidence.map((item) => (
                              <option key={item.evidenceId} value={item.evidenceId}>
                                {item.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <Button size="small" onClick={() => linkEvidence(question.questionId)}>
                          Dayanağı bağla
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
          ) : (
            <EmptyState title="Soru bulunmuyor" description="Bu görevde tanımlı görevlendirme sorusu yok." />
          )}
        </div>
      </Panel>

      <Panel
        title="Bulgular"
        description="Her bulgu en az bir dayanağa bağlıdır; kanıtsız bulgu oluşturulamaz."
        action={<Badge tone={bundle.findings.length > 0 ? "green" : "amber"}>{bundle.findings.length} bulgu</Badge>}
      >
        <div className="st-stack">
          {bundle.findings.map((finding) => {
            const links = bundle.findingEvidence.filter((link) => link.findingId === finding.findingId);
            return (
              <div key={finding.findingId} className="st-panel" style={{ padding: 12 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Badge tone="blue">{finding.code}</Badge>
                  <strong style={{ flex: 1, fontSize: 13.5 }}>{finding.title}</strong>
                  <Badge tone={finding.severity === "yüksek" ? "red" : finding.severity === "orta" ? "amber" : "gray"}>
                    {finding.severity}
                  </Badge>
                  <Badge tone={finding.status === "doğrulandı" ? "green" : "gray"}>{finding.status}</Badge>
                </div>
                <p style={{ margin: "8px 0", fontSize: 12.5, color: "var(--st-body)" }}>{finding.description}</p>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
                  {links.map((link) => (
                    <li key={link.evidenceId}>{evidenceLabel(link.evidenceId)}</li>
                  ))}
                </ul>
              </div>
            );
          })}

          <div className="st-panel" style={{ padding: 13 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 9 }}>Yeni bulgu ekle</div>
            <div className="st-stack">
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  aria-label="Bulgu kodu"
                  value={findingCode}
                  onChange={(event) => setFindingCode(event.target.value)}
                  style={{ width: 90, padding: "7px 9px", border: "1px solid var(--st-line-strong)", borderRadius: 8 }}
                />
                <input
                  aria-label="Bulgu başlığı"
                  value={findingTitle}
                  onChange={(event) => setFindingTitle(event.target.value)}
                  placeholder="Bulgu başlığı"
                  style={{ flex: 1, padding: "7px 9px", border: "1px solid var(--st-line-strong)", borderRadius: 8 }}
                />
                <select
                  aria-label="Bulgu önemi"
                  value={findingSeverity}
                  onChange={(event) => setFindingSeverity(event.target.value as "düşük" | "orta" | "yüksek")}
                  style={{ padding: "7px 9px", border: "1px solid var(--st-line-strong)", borderRadius: 8 }}
                >
                  <option value="düşük">düşük</option>
                  <option value="orta">orta</option>
                  <option value="yüksek">yüksek</option>
                </select>
              </div>
              <textarea
                aria-label="Bulgu açıklaması"
                value={findingDescription}
                onChange={(event) => setFindingDescription(event.target.value)}
                rows={2}
                placeholder="Bulgu açıklaması"
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  border: "1px solid var(--st-line-strong)",
                  borderRadius: 9,
                  fontFamily: "inherit",
                  fontSize: 13,
                }}
              />
              <fieldset style={{ border: "1px solid var(--st-line)", borderRadius: 9, padding: 10 }}>
                <legend style={{ fontSize: 12, fontWeight: 600 }}>Dayanaklar (en az bir zorunlu)</legend>
                <div style={{ display: "grid", gap: 6 }}>
                  {bundle.evidence.map((evidence) => (
                    <label key={evidence.evidenceId} style={{ display: "flex", gap: 8, fontSize: 12.5 }}>
                      <input
                        type="checkbox"
                        checked={findingEvidence.includes(evidence.evidenceId)}
                        onChange={(event) =>
                          setFindingEvidence((items) =>
                            event.target.checked
                              ? [...items, evidence.evidenceId]
                              : items.filter((id) => id !== evidence.evidenceId),
                          )
                        }
                      />
                      {evidence.label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div>
                <Button kind="primary" size="small" onClick={createFinding}>
                  Bulguyu oluştur
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Panel>

      <Callout tone="info" title="Kaynak izi">
        Her yanıt ve bulgu dayanağına geri izlenebilir. Dayanak değiştiğinde rapor revizyonu tetiklenir; Tek Rapor
        sekmesinden yeni revizyon üretilebilir.
      </Callout>
    </div>
  );
}
