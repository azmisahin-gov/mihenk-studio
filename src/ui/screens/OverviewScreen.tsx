/**
 * Genel Bakış ekranı.
 *
 * Tüm sayılar gerçek görev verisinden türetilir; sabit örnek değer kullanılmaz
 * (bkz. denetim raporu P1 bulgusu ve MIH-REQ-TSK-003).
 */
import type { TaskSummary } from "../api.ts";
import { Badge, Panel, PageTitle, Button, StatCard, EmptyState } from "../components/ui.tsx";
import { formatDateTime, taskStatusLabel, taskStatusTone } from "../format.ts";

export function OverviewScreen({
  tasks,
  onOpenTask,
  onNewAssignment,
}: {
  tasks: TaskSummary[];
  onOpenTask: (taskId: string) => void;
  onNewAssignment: () => void;
}) {
  const pendingReview = tasks.reduce((total, task) => total + task.counts.unreviewedSegments, 0);
  const unanswered = tasks.reduce(
    (total, task) => total + Math.max(0, task.counts.questions - task.counts.answers),
    0,
  );
  const pendingConfirmation = tasks.reduce((total, task) => total + task.counts.pendingConfirmation, 0);

  const sortedByDue = [...tasks].sort((a, b) => a.dueDate.localeCompare(b.dueDate, "tr-TR"));
  const nextDue = sortedByDue[0];

  // Öncelikli çalışma: gerçek eksiklikten türetilir.
  const priority = tasks.find((task) => task.counts.unreviewedSegments > 0) ?? tasks[0];

  return (
    <>
      <PageTitle
        eyebrow="ÇALIŞMA ALANI"
        title="Çalışma alanınıza hoş geldiniz"
        description="Görevlerinizin durumunu, öncelikli incelemeleri ve yaklaşan teslimleri tek yerden takip edin. Tüm sayılar seçili görevlerinizin gerçek verisinden türetilir."
        action={
          <Button kind="primary" onClick={onNewAssignment}>
            Yeni görevlendirme
          </Button>
        }
      />

      <div className="st-stat-grid">
        <StatCard label="Açık görev" value={String(tasks.length)} detail={`${tasks.filter((task) => task.status !== "taslak").length} görev incelemede`} />
        <StatCard
          label="Kontrol bekleyen segment"
          value={String(pendingReview)}
          detail={pendingReview > 0 ? "Uzman incelemesi bekliyor" : "Bekleyen segment yok"}
        />
        <StatCard
          label="Yanıt bekleyen soru"
          value={String(unanswered)}
          detail={pendingConfirmation > 0 ? `${pendingConfirmation} alan teyidi bekliyor` : "Teyit bekleyen alan yok"}
        />
        <StatCard
          label="Yaklaşan teslim"
          value={nextDue ? nextDue.dueDate : "—"}
          detail={nextDue ? `${nextDue.caseNumber} · ${nextDue.authority}` : "Kayıtlı görev yok"}
        />
      </div>

      <div className="st-grid-2">
        <Panel
          title="Öncelikli çalışma"
          description="Gerçek eksiklikten türetilen en yararlı sonraki adım"
          action={<Badge tone="amber">ÖNCELİKLİ</Badge>}
        >
          {priority ? (
            <div className="st-stack">
              <div>
                <div className="st-eyebrow" style={{ color: "var(--st-muted)", fontSize: 11, fontWeight: 700 }}>
                  {priority.caseNumber} · {priority.authority}
                </div>
                <h3 style={{ margin: "6px 0 4px", fontSize: 16 }}>
                  {priority.counts.unreviewedSegments > 0
                    ? `${priority.counts.unreviewedSegments} transkript segmenti uzman kontrolü bekliyor`
                    : "Görev incelemesine devam edin"}
                </h3>
                <p style={{ margin: 0, color: "var(--st-body)", fontSize: 13 }}>
                  {priority.counts.audios} kayıt, {priority.counts.segments} segment, {priority.counts.evidence} dayanak ve{" "}
                  {priority.counts.findings} bulgu kayıtlıdır.
                </p>
              </div>
              <div>
                <Button kind="primary" onClick={() => onOpenTask(priority.taskId)}>
                  Görev çalışma alanını aç
                </Button>
              </div>
            </div>
          ) : (
            <EmptyState title="Kayıtlı görev yok" description="Yeni görevlendirme ile bir taslak oluşturabilirsiniz." />
          )}
        </Panel>

        <Panel title="Yaklaşan teslimler" description="Tarih sırasına göre">
          {sortedByDue.length > 0 ? (
            <div className="st-stack">
              {sortedByDue.map((task) => (
                <button
                  key={task.taskId}
                  type="button"
                  className="st-table-link"
                  onClick={() => onOpenTask(task.taskId)}
                  style={{ display: "flex", gap: 10, alignItems: "center", width: "100%" }}
                >
                  <strong style={{ minWidth: 96 }}>{task.dueDate}</strong>
                  <span style={{ flex: 1, textAlign: "left" }}>
                    <strong style={{ display: "block" }}>{task.caseNumber}</strong>
                    <small style={{ color: "var(--st-muted)" }}>{task.authority}</small>
                  </span>
                  <Badge tone={taskStatusTone(task.status)}>{taskStatusLabel(task.status)}</Badge>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState title="Yaklaşan teslim yok" description="Görev oluşturduğunuzda burada listelenir." />
          )}
        </Panel>
      </div>

      <div style={{ marginTop: 16 }}>
        <Panel title="Son çalışılan görevler" description="En son güncellenen çalışma alanları">
          {tasks.length > 0 ? (
            <div className="st-table-wrap">
              <table className="st-table">
                <caption className="sr-only" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}>
                  Görev listesi
                </caption>
                <thead>
                  <tr>
                    <th scope="col">GÖREV</th>
                    <th scope="col">DURUM</th>
                    <th scope="col">KAYIT / SORU</th>
                    <th scope="col">SON GÜNCELLEME</th>
                    <th scope="col" />
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr key={task.taskId}>
                      <td>
                        <button type="button" className="st-table-link" onClick={() => onOpenTask(task.taskId)}>
                          <strong>{task.title}</strong>
                          <small>
                            {task.caseNumber} · {task.authority}
                          </small>
                        </button>
                      </td>
                      <td>
                        <Badge tone={taskStatusTone(task.status)}>{taskStatusLabel(task.status)}</Badge>
                      </td>
                      <td>
                        {task.counts.audios} kayıt · {task.counts.answers}/{task.counts.questions} yanıt
                      </td>
                      <td className="st-muted-cell">{formatDateTime(task.updatedAt)}</td>
                      <td>
                        <Button size="small" onClick={() => onOpenTask(task.taskId)}>
                          Aç
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="Kayıtlı görev yok" description="İlk görevlendirmeyi oluşturun." />
          )}
        </Panel>
      </div>
    </>
  );
}
