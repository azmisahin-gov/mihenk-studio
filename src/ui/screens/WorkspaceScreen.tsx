/**
 * Görev çalışma alanı ve altı sekmesi.
 *
 * Sekmeler erişilebilirlik ilişkilerine sahiptir (role=tablist/tab/tabpanel) ve
 * ok tuşlarıyla gezinir (bkz. MIH-REQ-A11Y-002). Görev değiştiğinde tüm panel
 * durumu sıfırlanır; önceki görevin seçimi taşınmaz (bkz. MIH-REQ-TSK-003).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiClient, TaskBundleView, TaskSummary } from "../api.ts";
import { Badge, Button, EmptyState, Panel } from "../components/ui.tsx";
import { formatDateTime, formatDuration, formatTime, taskStatusLabel, taskStatusTone } from "../format.ts";
import { MaterialsTab } from "./tabs/MaterialsTab.tsx";
import { AudioTab } from "./tabs/AudioTab.tsx";
import { QuestionsTab } from "./tabs/QuestionsTab.tsx";
import { ReportTab } from "./tabs/ReportTab.tsx";
import { AssignmentTab } from "./tabs/AssignmentTab.tsx";

type TabId = "ozet" | "gorevlendirme" | "materyal" | "ses" | "sorular" | "rapor";

const TABS: { id: TabId; label: string }[] = [
  { id: "ozet", label: "Görev Özeti" },
  { id: "gorevlendirme", label: "Görevlendirme" },
  { id: "materyal", label: "Materyaller" },
  { id: "ses", label: "Ses ve Transkript" },
  { id: "sorular", label: "Sorular ve Bulgular" },
  { id: "rapor", label: "Tek Rapor" },
];

export function WorkspaceScreen({
  api,
  task,
  refreshToken,
  onNotify,
  onReload,
  onBackToTasks,
}: {
  api: ApiClient;
  task: TaskSummary;
  refreshToken: number;
  onNotify: (message: string, tone?: "ok" | "error") => void;
  onReload: () => void;
  onBackToTasks: () => void;
}) {
  const [tab, setTab] = useState<TabId>("ozet");
  const [bundle, setBundle] = useState<TaskBundleView | null>(null);
  const [summary, setSummary] = useState<TaskSummary>(task);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Görev değişince sekme ve tüm panel durumu sıfırlanır.
  useEffect(() => {
    setTab("ozet");
    setBundle(null);
    setError(null);
  }, [task.taskId]);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getTask(task.taskId)
      .then((result) => {
        if (cancelled) return;
        setBundle(result.bundle);
        setSummary(result.summary);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Görev verisi yüklenemedi.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api, task.taskId]);

  useEffect(() => load(), [load, refreshToken]);

  function onTabKeyDown(event: React.KeyboardEvent, index: number) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft" && event.key !== "Home" && event.key !== "End") {
      return;
    }
    event.preventDefault();
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % TABS.length;
    if (event.key === "ArrowLeft") next = (index - 1 + TABS.length) % TABS.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = TABS.length - 1;
    const target = TABS[next];
    if (!target) return;
    setTab(target.id);
    tabRefs.current[next]?.focus();
  }

  const refresh = () => {
    load();
    onReload();
  };

  return (
    <>
      <div className="st-workspace-head">
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <Badge tone={taskStatusTone(summary.status)}>{taskStatusLabel(summary.status)}</Badge>
            <Badge tone="gray">SENTETİK GÖREV</Badge>
          </div>
          <h1>{summary.title}</h1>
          <p>
            {summary.caseNumber} · {summary.authority} · Teslim: {summary.dueDate}
          </p>
        </div>
        <Button kind="ghost" size="small" onClick={onBackToTasks}>
          ← Görev listesi
        </Button>
      </div>

      <div className="st-tabs" role="tablist" aria-label="Görev çalışma alanı sekmeleri">
        {TABS.map((item, index) => (
          <button
            key={item.id}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            id={`sekme-${item.id}`}
            type="button"
            role="tab"
            className="st-tab"
            aria-selected={tab === item.id}
            aria-controls={`panel-${item.id}`}
            tabIndex={tab === item.id ? 0 : -1}
            onKeyDown={(event) => onTabKeyDown(event, index)}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="st-tabpanel">
          <Panel title="Görev verisi yüklenemedi">
            <div className="st-callout error">
              <div>
                <strong>Hata</strong>
                <span>{error}</span>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <Button kind="primary" onClick={refresh}>
                Yeniden dene
              </Button>
            </div>
          </Panel>
        </div>
      ) : null}

      {loading && !error ? (
        <div className="st-tabpanel">
          <Panel title="Görev verisi yükleniyor">
            <div className="st-stack">
              <div className="st-skeleton" style={{ width: "45%" }} />
              <div className="st-skeleton" style={{ width: "72%" }} />
              <div className="st-skeleton" style={{ width: "58%" }} />
            </div>
          </Panel>
        </div>
      ) : null}

      {!loading && !error && bundle ? (
        <div
          className="st-tabpanel"
          id={`panel-${tab}`}
          role="tabpanel"
          aria-labelledby={`sekme-${tab}`}
          tabIndex={0}
        >
          {tab === "ozet" ? <SummaryTab summary={summary} bundle={bundle} onGoTo={(next) => setTab(next)} /> : null}
          {tab === "gorevlendirme" ? (
            <AssignmentTab api={api} bundle={bundle} onNotify={onNotify} onReload={refresh} />
          ) : null}
          {tab === "materyal" ? <MaterialsTab bundle={bundle} /> : null}
          {tab === "ses" ? <AudioTab api={api} bundle={bundle} onNotify={onNotify} onReload={refresh} /> : null}
          {tab === "sorular" ? <QuestionsTab api={api} bundle={bundle} onNotify={onNotify} onReload={refresh} /> : null}
          {tab === "rapor" ? (
            <ReportTab api={api} bundle={bundle} summary={summary} onNotify={onNotify} onReload={refresh} />
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function SummaryTab({
  summary,
  bundle,
  onGoTo,
}: {
  summary: TaskSummary;
  bundle: TaskBundleView;
  onGoTo: (tab: TabId) => void;
}) {
  const pendingFields = bundle.fields.filter((field) => field.confirmation === "teyit-bekliyor");
  const unreviewed = bundle.latestSegments.filter((segment) => segment.reviewState === "bekliyor");
  const unanswered = bundle.questions.filter((question) => {
    const answer = bundle.answers.find((item) => item.questionId === question.questionId);
    return !answer || answer.status === "boş";
  });

  const actions: { priority: boolean; badge: string; title: string; detail: string; tab: TabId }[] = [];
  if (unreviewed.length > 0) {
    actions.push({
      priority: true,
      badge: "ÖNCELİKLİ",
      title: `${unreviewed.length} transkript segmenti uzman kontrolü bekliyor`,
      detail: `${bundle.audios.length} kayıt içinde işaretlendi. Tüm kayıtlar her zaman erişilebilir.`,
      tab: "ses",
    });
  }
  if (pendingFields.length > 0) {
    actions.push({
      priority: false,
      badge: "GÖREVLENDİRME",
      title: `${pendingFields.length} görevlendirme alanı teyit bekliyor`,
      detail: "Okunamayan alanlar tahmin edilmedi; kaynak belgeye bağlı olarak teyit edilmeli.",
      tab: "gorevlendirme",
    });
  }
  if (unanswered.length > 0) {
    actions.push({
      priority: false,
      badge: "SORULAR",
      title: `${unanswered.length} soru yanıt bekliyor`,
      detail: "Yanıt ve dayanak ilişkileri Sorular ve Bulgular sekmesinde kurulur.",
      tab: "sorular",
    });
  }

  return (
    <div className="st-grid-2">
      <Panel title="Önünüzdeki işler" description="İş akışındaki en yararlı sonraki adımlar">
        {actions.length > 0 ? (
          <div className="st-stack">
            {actions.map((action) => (
              <div
                key={action.title}
                style={{
                  padding: 13,
                  border: `1px solid ${action.priority ? "var(--st-amber)" : "var(--st-line)"}`,
                  borderRadius: 11,
                  background: action.priority ? "var(--st-amber-soft)" : "var(--st-white)",
                }}
              >
                <Badge tone={action.priority ? "amber" : "blue"}>{action.badge}</Badge>
                <h3 style={{ margin: "7px 0 3px", fontSize: 14 }}>{action.title}</h3>
                <p style={{ margin: "0 0 8px", color: "var(--st-body)", fontSize: 12.5 }}>{action.detail}</p>
                <Button size="small" onClick={() => onGoTo(action.tab)}>
                  İlgili sekmeye git
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Bekleyen iş yok" description="Bu görevde uzman eylemi bekleyen öğe bulunmuyor." />
        )}
      </Panel>

      <Panel title="Görev veri özeti" description="Gerçek veriden türetilmiştir">
        <div className="st-table-wrap">
          <table className="st-table">
            <tbody>
              <tr>
                <th scope="row">Materyal</th>
                <td>{bundle.materials.length} kayıt</td>
              </tr>
              <tr>
                <th scope="row">Ses kaydı</th>
                <td>{bundle.audios.length} kayıt</td>
              </tr>
              <tr>
                <th scope="row">Transkript sürümü</th>
                <td>{bundle.transcriptVersions.length} sürüm</td>
              </tr>
              <tr>
                <th scope="row">Segment</th>
                <td>
                  {bundle.latestSegments.length} segment · {unreviewed.length} bekliyor
                </td>
              </tr>
              <tr>
                <th scope="row">Soru / yanıt</th>
                <td>
                  {bundle.questions.length} soru · {summary.counts.answers} yanıt
                </td>
              </tr>
              <tr>
                <th scope="row">Dayanak</th>
                <td>{bundle.evidence.length} dayanak</td>
              </tr>
              <tr>
                <th scope="row">Bulgu</th>
                <td>{bundle.findings.length} bulgu</td>
              </tr>
              <tr>
                <th scope="row">Uzman onayı</th>
                <td>{bundle.approved ? "Onaylandı" : "Bekliyor"}</td>
              </tr>
              <tr>
                <th scope="row">Son güncelleme</th>
                <td>{formatDateTime(summary.updatedAt)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 12, fontSize: 12, color: "var(--st-muted)" }}>
          Toplam kayıt süresi:{" "}
          {formatDuration(bundle.audios.reduce((total, audio) => total + audio.durationMs, 0))} · Son segment:{" "}
          {bundle.latestSegments.length > 0
            ? formatTime(Math.max(...bundle.latestSegments.map((segment) => segment.endMs)))
            : "—"}
        </div>
      </Panel>
    </div>
  );
}
