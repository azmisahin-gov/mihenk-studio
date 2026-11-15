/**
 * Görevlerim ekranı.
 *
 * Durum filtresi ve arama gerçek görev verisi üzerinde çalışır.
 */
import { useMemo, useState } from "react";
import type { TaskSummary } from "../api.ts";
import { Badge, Button, Callout, EmptyState, PageTitle, Panel } from "../components/ui.tsx";
import { formatDateTime, taskStatusLabel, taskStatusTone } from "../format.ts";

type Filter = "Tümü" | "Taslak" | "Devam eden" | "Uzman onayı bekleyen";

export function TasksScreen({
  tasks,
  totalCount,
  onOpenTask,
  onNewAssignment,
}: {
  tasks: TaskSummary[];
  totalCount: number;
  onOpenTask: (taskId: string) => void;
  onNewAssignment: () => void;
}) {
  const [filter, setFilter] = useState<Filter>("Tümü");

  const filtered = useMemo(() => {
    switch (filter) {
      case "Taslak":
        return tasks.filter((task) => task.status === "taslak");
      case "Devam eden":
        return tasks.filter((task) => ["incelemede", "beklemede", "rapor-hazırlanıyor"].includes(task.status));
      case "Uzman onayı bekleyen":
        return tasks.filter((task) => task.status === "uzman-onayı-bekliyor");
      default:
        return tasks;
    }
  }, [tasks, filter]);

  const counts = {
    Tümü: tasks.length,
    Taslak: tasks.filter((task) => task.status === "taslak").length,
    "Devam eden": tasks.filter((task) => ["incelemede", "beklemede", "rapor-hazırlanıyor"].includes(task.status)).length,
    "Uzman onayı bekleyen": tasks.filter((task) => task.status === "uzman-onayı-bekliyor").length,
  } as const;

  return (
    <>
      <PageTitle
        eyebrow="ÇALIŞMA ALANI"
        title="Görevlerim"
        description="Açık görevlendirmelerinizi, taslaklarınızı ve rapor durumlarını yönetin."
        action={
          <Button kind="primary" onClick={onNewAssignment}>
            Yeni görevlendirme
          </Button>
        }
      />

      <Panel>
        <div role="group" aria-label="Durum filtresi" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          {(Object.keys(counts) as Filter[]).map((item) => (
            <button
              key={item}
              type="button"
              className="st-tab"
              aria-pressed={filter === item}
              onClick={() => setFilter(item)}
            >
              {item} <span className="st-nav-badge" style={{ background: "#eef1ef", color: "var(--st-muted)" }}>{counts[item]}</span>
            </button>
          ))}
        </div>

        {filtered.length > 0 ? (
          <div className="st-table-wrap">
            <table className="st-table">
              <caption style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}>
                Görev listesi: {filtered.length} görev
              </caption>
              <thead>
                <tr>
                  <th scope="col">GÖREV / MERCİ</th>
                  <th scope="col">TESLİM</th>
                  <th scope="col">MATERYAL</th>
                  <th scope="col">İŞ DURUMU</th>
                  <th scope="col">EKSİK</th>
                  <th scope="col">SON GÜNCELLEME</th>
                  <th scope="col" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((task) => (
                  <tr key={task.taskId}>
                    <td>
                      <button type="button" className="st-table-link" onClick={() => onOpenTask(task.taskId)}>
                        <strong>{task.title}</strong>
                        <small>
                          {task.authority} · {task.caseNumber}
                        </small>
                      </button>
                    </td>
                    <td>
                      <strong>{task.dueDate}</strong>
                      <small className="st-muted-cell" style={{ display: "block" }}>
                        {task.kind}
                      </small>
                    </td>
                    <td>
                      {task.counts.audios} kayıt
                      <small className="st-muted-cell" style={{ display: "block" }}>
                        {task.counts.materials} materyal
                      </small>
                    </td>
                    <td>
                      <Badge tone={taskStatusTone(task.status)}>{taskStatusLabel(task.status)}</Badge>
                    </td>
                    <td>
                      {task.counts.pendingConfirmation > 0 || task.counts.unreviewedSegments > 0 ? (
                        <span style={{ color: "var(--st-amber)", fontSize: 12, fontWeight: 600 }}>
                          {task.counts.pendingConfirmation} teyit · {task.counts.unreviewedSegments} segment
                        </span>
                      ) : (
                        <span className="st-muted-cell">Eksik yok</span>
                      )}
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
          <EmptyState
            title="Bu filtreyle eşleşen görev yok"
            description="Farklı bir durum filtresi seçebilir veya arama ifadesini değiştirebilirsiniz."
          />
        )}

        <div style={{ marginTop: 12, color: "var(--st-muted)", fontSize: 12 }}>
          {totalCount} görevden {filtered.length} tanesi gösteriliyor · Sentetik örnek veri
        </div>
      </Panel>

      <div style={{ marginTop: 16 }}>
        <Callout tone="info" title="Taslak görevlendirme akışı">
          İlk görevlendirme belgesi eklendiğinde taslak görev oluşur. Materyallerin tamamını ilk ekranda
          yüklemeniz gerekmez; görev içinde daha sonra ekleyebilirsiniz. Eksik materyal görev oluşturmayı engellemez.
        </Callout>
      </div>
    </>
  );
}
