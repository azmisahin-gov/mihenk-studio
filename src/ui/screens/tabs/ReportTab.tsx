/**
 * Tek Rapor sekmesi.
 *
 * A4 önizleme, kalite kontrolü ve DOCX çıktısı aynı kanonik `ReportDocument`
 * sürümünden üretilir (bkz. MIH-REQ-RPT-002, MIH-REQ-RPT-003). Uzman onayı
 * ayrı bir eylemdir; otomatik kontrol onay yerine geçmez (bkz. MIH-REQ-QLT-004).
 */
import { useCallback, useEffect, useState } from "react";
import type { ApiClient, ReportView, TaskBundleView, TaskSummary } from "../../api.ts";
import { Badge, Button, Callout, EmptyState, Panel } from "../../components/ui.tsx";
import { formatDateTime } from "../../format.ts";

type ExportState =
  | { kind: "boş" }
  | { kind: "bekliyor" }
  | { kind: "başarılı"; fileName: string; pageCount: number; byteLength: number }
  | { kind: "hata"; message: string }
  | { kind: "iptal" };

export function ReportTab({
  api,
  bundle,
  summary,
  onNotify,
  onReload,
}: {
  api: ApiClient;
  bundle: TaskBundleView;
  summary: TaskSummary;
  onNotify: (message: string, tone?: "ok" | "error") => void;
  onReload: () => void;
}) {
  const taskId = bundle.task.taskId;
  const [report, setReport] = useState<ReportView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [exportState, setExportState] = useState<ExportState>({ kind: "boş" });
  const [busy, setBusy] = useState(false);
  const [approvalNote, setApprovalNote] = useState("");

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getReport(taskId)
      .then((result) => {
        if (cancelled) return;
        setReport(result);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Rapor yüklenemedi.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api, taskId]);

  useEffect(() => load(), [load]);

  async function rebuild() {
    setBusy(true);
    try {
      await api.buildReport(taskId, "Uzman raporu yeniden derledi");
      onNotify("Rapor yeniden derlendi; yeni revizyon oluşturuldu.");
      load();
      onReload();
    } catch (cause) {
      onNotify(cause instanceof Error ? cause.message : "Rapor derlenemedi.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function approve() {
    setBusy(true);
    try {
      await api.approveReport(taskId, approvalNote);
      onNotify("Uzman onayı kaydedildi.");
      load();
      onReload();
    } catch (cause) {
      onNotify(cause instanceof Error ? cause.message : "Onay kaydedilemedi.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function exportDocx() {
    setExportState({ kind: "bekliyor" });
    try {
      const result = await api.exportDocx(taskId);
      setExportState({
        kind: "başarılı",
        fileName: result.fileName,
        pageCount: result.pageCount,
        byteLength: result.bytes.byteLength,
      });
      const blob = new Blob([result.bytes as unknown as BlobPart], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.fileName;
      anchor.click();
      URL.revokeObjectURL(url);
      onNotify(`DOCX üretildi: ${result.fileName}`);
    } catch (cause) {
      setExportState({
        kind: "hata",
        message: cause instanceof Error ? cause.message : "Dışa aktarma başarısız.",
      });
      onNotify(cause instanceof Error ? cause.message : "Dışa aktarma başarısız.", "error");
    }
  }

  if (loading) {
    return (
      <Panel title="Rapor yükleniyor">
        <div className="st-stack">
          <div className="st-skeleton" style={{ width: "55%" }} />
          <div className="st-skeleton" style={{ width: "80%" }} />
        </div>
      </Panel>
    );
  }

  if (error || !report) {
    // Rapor henüz derlenmemişse bu bir hata değil, bekleyen bir adımdır.
    const notBuilt = error?.includes("henüz derlenmedi") ?? false;
    return (
      <Panel title={notBuilt ? "Rapor henüz derlenmedi" : "Rapor yüklenemedi"}>
        <Callout tone={notBuilt ? "info" : "error"} title={notBuilt ? "İlk rapor revizyonu" : "Hata"}>
          {notBuilt
            ? "Bu görev için henüz kanonik rapor oluşturulmadı. Raporu derlediğinizde A4 önizleme ve DOCX çıktısı aynı sürümden üretilir."
            : (error ?? "Rapor verisi yok.")}
        </Callout>
        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          {notBuilt ? (
            <Button kind="primary" onClick={rebuild} disabled={busy}>
              {busy ? "Derleniyor…" : "Raporu derle"}
            </Button>
          ) : null}
          <Button onClick={load}>Yeniden dene</Button>
        </div>
      </Panel>
    );
  }

  const vm = report.viewModel;
  const hasBlocking = report.summary.blocking > 0;
  const totalPages = vm.sections.length + vm.appendices.length + 1;
  const currentPage = Math.min(page, totalPages - 1);

  return (
    <div className="st-stack">
      <div className="st-grid-2">
        <Panel title="Rapor bölümleri" description="Tek ana rapor + ilgili ekler">
          <div className="st-stack">
            {vm.sections.map((section, index) => (
              <button
                key={section.id}
                type="button"
                className="st-tab"
                aria-pressed={currentPage === index}
                style={{ textAlign: "left" }}
                onClick={() => setPage(index)}
              >
                {String(index + 1).padStart(2, "0")} · {section.heading}
              </button>
            ))}
            {vm.appendices.map((appendix, index) => (
              <button
                key={appendix.title}
                type="button"
                className="st-tab"
                aria-pressed={currentPage === vm.sections.length + index}
                style={{ textAlign: "left" }}
                onClick={() => setPage(vm.sections.length + index)}
              >
                {appendix.title}
              </button>
            ))}
            <div className="st-template-note" style={{ fontSize: 11.5, color: "var(--st-muted)" }}>
              ŞABLON REFERANSI · Merci türüne göre örnek iskelet. Tek ve evrensel zorunlu şablon iddiası yoktur.
            </div>
          </div>
        </Panel>

        <Panel title="Rapor kontrolü" description="Otomatik kontroller gerçek veriden hesaplanır.">
          <div className="st-stack">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Badge tone={report.summary.blocking > 0 ? "red" : "green"}>{report.summary.blocking} engel</Badge>
              <Badge tone={report.summary.warnings > 0 ? "amber" : "gray"}>{report.summary.warnings} uyarı</Badge>
              <Badge tone={report.summary.pending > 0 ? "amber" : "gray"}>{report.summary.pending} bekliyor</Badge>
              <Badge tone="green">{report.summary.passed} geçti</Badge>
            </div>
            <div className="st-check-list">
              {report.checks.map((check) => (
                <div key={check.checkId} className="st-check-row">
                  <i className={check.status} aria-hidden="true">
                    {check.status === "geçti" ? "✓" : check.status === "engel" ? "!" : check.status === "uyarı" ? "?" : "…"}
                  </i>
                  <span>
                    <strong>{check.label}</strong>
                    <small>{check.detail}</small>
                  </span>
                </div>
              ))}
            </div>
            <Callout tone={report.summary.blocking > 0 ? "warn" : "info"} title="Nihai insan onayı">
              {summary.approved
                ? "Uzman onayı kaydedildi. İmza ve resmî teslim işlemi bu uygulamada yapılmaz."
                : "Otomatik kontrolün geçmesi uzman onayı anlamına gelmez. İmza, resmî teslim ve UYAP işlemi yapılmaz."}
            </Callout>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Button size="small" onClick={rebuild} disabled={busy}>
                Raporu yeniden derle (yeni revizyon)
              </Button>
              <Button
                size="small"
                kind="primary"
                onClick={approve}
                disabled={busy || hasBlocking || summary.approved}
                title={
                  hasBlocking
                    ? "Engelleyici kontrol varken rapor onaylanamaz."
                    : summary.approved
                      ? "Rapor zaten onaylanmış."
                      : "Uzman onayını kaydet"
                }
              >
                {summary.approved ? "Onaylandı" : "Uzman onayını kaydet"}
              </Button>
            </div>
            {!summary.approved ? (
              <label style={{ display: "grid", gap: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>Onay notu (isteğe bağlı)</span>
                <input
                  value={approvalNote}
                  onChange={(event) => setApprovalNote(event.target.value)}
                  placeholder="Onay gerekçesi"
                  style={{ padding: "7px 9px", border: "1px solid var(--st-line-strong)", borderRadius: 8 }}
                />
              </label>
            ) : null}
          </div>
        </Panel>
      </div>

      <Panel
        title="A4 önizleme"
        description={`Aynı ReportDocument sürümünden üretilir · Revizyon ${vm.header.revisionNo}`}
        action={<Badge tone={summary.approved ? "green" : "amber"}>{summary.approved ? "ONAYLANDI" : "TASLAK"}</Badge>}
      >
        <div className="st-stack">
          <article className="st-paper" aria-label="A4 rapor önizlemesi">
            <div className="st-paper-notice">{vm.notice}</div>
            <header className="st-paper-header">
              <span>{vm.header.line1}</span>
              <strong>{vm.header.authority.toLocaleUpperCase("tr-TR")}</strong>
              <b>{vm.header.title}</b>
              <small>Dosya No: {vm.header.caseNumber}</small>
            </header>
            {renderPage(vm, currentPage)}
            <div className="st-page-foot">
              <span>
                {vm.header.caseNumber} · SENTETİK ÖRNEK · Revizyon {vm.header.revisionNo}
              </span>
              <span>
                Sayfa {currentPage + 1} / {totalPages}
              </span>
            </div>
          </article>

          <div className="st-paper-pagination">
            <Button size="small" onClick={() => setPage(Math.max(0, currentPage - 1))} disabled={currentPage === 0}>
              ← Önceki
            </Button>
            <span>
              Sayfa {currentPage + 1} / {totalPages}
            </span>
            <Button
              size="small"
              onClick={() => setPage(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage >= totalPages - 1}
            >
              Sonraki →
            </Button>
          </div>
        </div>
      </Panel>

      <Panel title="DOCX dışa aktarma" description="Açılabilir DOCX dosyası aynı rapordan üretilir.">
        <div className="st-stack">
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <Button
              kind="primary"
              onClick={exportDocx}
              disabled={exportState.kind === "bekliyor"}
              title={hasBlocking ? "Engel olsa da taslak çıktı üretilebilir; rapor onaylanmış sayılmaz." : undefined}
            >
              {exportState.kind === "bekliyor" ? "Üretiliyor…" : "DOCX dışa aktar"}
            </Button>
            {exportState.kind === "bekliyor" ? <Badge tone="amber">İşlem sürüyor</Badge> : null}
            {hasBlocking ? <Badge tone="red">Rapor onaylanmamış (engel var)</Badge> : null}
          </div>

          {exportState.kind === "başarılı" ? (
            <Callout tone="info" title="DOCX üretildi">
              {exportState.fileName} · {exportState.byteLength} bayt · LibreOffice ile doğrulandığında yaklaşık{" "}
              {exportState.pageCount} sayfa. Dosya her sayfada "SENTETİK ÖRNEK — RESMÎ BELGE DEĞİLDİR" uyarısını taşır.
            </Callout>
          ) : null}

          {exportState.kind === "hata" ? (
            <Callout tone="error" title="Dışa aktarma hatası">
              {exportState.message} · Önceki başarılı çıktılar ve kaynak dosyalar silinmedi. Yeniden deneyebilirsiniz.
            </Callout>
          ) : null}

          {exportState.kind === "iptal" ? (
            <Callout tone="warn" title="Dışa aktarma iptal edildi">
              Kaynak dosyalar ve önceki çıktılar korundu.
            </Callout>
          ) : null}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button
              size="small"
              kind="danger"
              onClick={() => setExportState({ kind: "iptal" })}
              disabled={exportState.kind !== "bekliyor"}
            >
              İşlemi iptal et
            </Button>
            <Button
              size="small"
              onClick={() => {
                setExportState({ kind: "boş" });
                onNotify("Yeniden deneme için hazır.");
              }}
            >
              Durumu sıfırla
            </Button>
          </div>

          <div style={{ fontSize: 11.5, color: "var(--st-muted)" }}>
            Rapor revizyonu {vm.header.revisionNo} · Oluşturma {formatDateTime(vm.header.generatedAt)} · Kaynak sürüm
            sayısı: {vm.sections.reduce((total, section) => total + section.sourceRefs.length, 0)}
          </div>
        </div>
      </Panel>

      <Panel title="Revizyon geçmişi" description="Hangi veri sürümlerinin kullanıldığı kayıtlıdır.">
        {report.approvals.length > 0 ? (
          <div className="st-stack">
            {report.approvals.map((approval) => (
              <div key={approval.approvalId} style={{ fontSize: 12.5 }}>
                <strong>{approval.kind}</strong> · {approval.actorName} · {formatDateTime(approval.occurredAt)}
                {approval.note ? <div style={{ color: "var(--st-muted)" }}>{approval.note}</div> : null}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Henüz onay yok" description="Nihai onay kaydedilmedi; rapor taslak durumundadır." />
        )}
      </Panel>
    </div>
  );
}

function renderPage(vm: ReportView["viewModel"], pageIndex: number): JSX.Element {
  const section = vm.sections[pageIndex];
  if (section) {
    return (
      <>
        <h4>{section.heading}</h4>
        {section.paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
        {section.bullets.length > 0 ? (
          <ul>
            {section.bullets.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        ) : null}
        {section.qa.map((item, index) => (
          <div key={index}>
            <p>
              <b>{item.question}</b>
            </p>
            <p>{item.answer}</p>
            {item.evidence.map((evidence, evidenceIndex) => (
              <p key={evidenceIndex} className="st-evidence">
                → {evidence}
              </p>
            ))}
          </div>
        ))}
        {section.findings.map((finding) => (
          <div key={finding.code}>
            <p>
              <b>
                {finding.code} · {finding.title} (önem: {finding.severity})
              </b>
            </p>
            <p>{finding.description}</p>
            {finding.evidence.map((evidence, index) => (
              <p key={index} className="st-evidence">
                → {evidence}
              </p>
            ))}
          </div>
        ))}
      </>
    );
  }
  const appendix = vm.appendices[pageIndex - vm.sections.length];
  if (appendix) {
    return (
      <>
        <h4>{appendix.title}</h4>
        {appendix.blocks.map((block) => (
          <div key={block.heading}>
            <p>
              <b>{block.heading}</b>
            </p>
            {block.lines.map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </div>
        ))}
      </>
    );
  }
  return (
    <>
      <h4>İMZA VE TESLİM</h4>
      <p>
        Nihai meslekî değerlendirme, imza ve resmî teslim kararı bilirkişinin kontrolündedir. Bu belge bir
        taslaktır ve resmî işlem için kullanılamaz.
      </p>
      <p style={{ marginTop: 30, textAlign: "right" }}>
        <b>Bilirkişi</b>
        <br />
        Ad Soyad · Sicil No
      </p>
      <p style={{ textAlign: "right", color: "var(--st-muted)", fontSize: 11 }}>
        İMZA ALANI · TASLAK (elektronik imza uygulanmamıştır)
      </p>
    </>
  );
}
