/**
 * Statik / kısmi ekranlar.
 *
 * Kabul edilmiş v0.5 ekran hiyerarşisi korunur; ancak gerçek işlevi olmayan
 * kontroller etkin düğme gibi gösterilmez ve gerekçesi ekranda yazılır
 * (bkz. ADR-011, ADR-012, MIH-REQ-DOC-004).
 */
import type { ScreenMeta, TaskSummary } from "../api.ts";
import { Badge, Callout, DisabledItem, PageTitle, Panel } from "../components/ui.tsx";
import { formatDateTime, taskStatusLabel, taskStatusTone } from "../format.ts";

export function StaticScreen({
  screen,
  title,
  tasks,
  onOpenTask,
}: {
  screen: ScreenMeta | null;
  title: string;
  tasks: TaskSummary[];
  onOpenTask: (taskId: string) => void;
}) {
  if (!screen) {
    return (
      <Panel title={title}>
        <Callout tone="warn" title="Ekran tanımı bulunamadı">
          Bu ekran için meta bilgi alınamadı.
        </Callout>
      </Panel>
    );
  }

  const availabilityLabel =
    screen.availability === "işlevli"
      ? "Bu dilimde işlevli"
      : screen.availability === "kısmi"
        ? "Kısmen işlevli"
        : "Sonraki aşama";

  const availabilityTone = screen.availability === "işlevli" ? "green" : screen.availability === "kısmi" ? "amber" : "gray";

  return (
    <>
      <PageTitle
        eyebrow={screen.group}
        title={screen.label}
        description={
          screen.availability === "sonraki-aşama"
            ? "Bu ekran kabul edilmiş görsel hiyerarşi korunarak sunulur. İlk dikey dilimde rapor odaklı akış önceliklidir; bu ekrandaki işlevler sonraki aşamada tamamlanır."
            : "Bu ekranda sunulan kontroller gerçekten çalışır veya çalışmadığı açıkça belirtilir."
        }
        action={<Badge tone={availabilityTone}>{availabilityLabel}</Badge>}
      />

      <div className="st-grid-2">
        <Panel title="Bu ekranda çalışan özellikler" description="Gerçek işlev taşıyan kontroller">
          {screen.workingFeatures.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
              {screen.workingFeatures.map((feature) => (
                <li key={feature} style={{ marginBottom: 6 }}>
                  {feature}
                </li>
              ))}
            </ul>
          ) : (
            <Callout tone="warn" title="Bu dilimde çalışan özellik yok">
              Bu ekranın işlevleri sonraki aşamada uygulanacaktır; hiçbir kontrol çalışıyormuş gibi gösterilmez.
            </Callout>
          )}
        </Panel>

        <Panel title="Sonraki aşamaya bırakılan özellikler" description="Neden şimdi etkin olmadıkları açıkça yazılır">
          {screen.disabledFeatures.length > 0 ? (
            <div className="st-stack">
              {screen.disabledFeatures.map((feature) => (
                <DisabledItem key={feature.label} label={feature.label} reason={feature.reason} />
              ))}
            </div>
          ) : (
            <div style={{ color: "var(--st-muted)", fontSize: 12.5 }}>
              Bu ekranda sonraki aşamaya bırakılan özellik yok.
            </div>
          )}
        </Panel>
      </div>

      {screen.id === "test-history" ? (
        <div style={{ marginTop: 16 }}>
          <Panel title="Kalite katmanı A — uzman görev/rapor kontrolü" description="Gerçek görev verisinden özet">
            <div className="st-table-wrap">
              <table className="st-table">
                <caption style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}>
                  Görev bazlı kalite özeti
                </caption>
                <thead>
                  <tr>
                    <th scope="col">GÖREV</th>
                    <th scope="col">DURUM</th>
                    <th scope="col">TEYİT BEKLEYEN</th>
                    <th scope="col">KONTROL BEKLEYEN SEGMENT</th>
                    <th scope="col">UZMAN ONAYI</th>
                    <th scope="col">SON GÜNCELLEME</th>
                    <th scope="col" />
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr key={task.taskId}>
                      <td>
                        <strong style={{ display: "block", fontSize: 13 }}>{task.title}</strong>
                        <small className="st-muted-cell">{task.caseNumber}</small>
                      </td>
                      <td>
                        <Badge tone={taskStatusTone(task.status)}>{taskStatusLabel(task.status)}</Badge>
                      </td>
                      <td>{task.counts.pendingConfirmation}</td>
                      <td>{task.counts.unreviewedSegments}</td>
                      <td>{task.approved ? "Kaydedildi" : "Bekliyor"}</td>
                      <td className="st-muted-cell">{formatDateTime(task.updatedAt)}</td>
                      <td>
                        <button type="button" className="st-text-button" onClick={() => onOpenTask(task.taskId)}>
                          Görevi aç
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      ) : null}

      <div style={{ marginTop: 16 }}>
        <Callout tone="info" title="Kapsam sınırı">
          Bu dilimde üretim OCR motoru, üretim ASR modeli, gelişmiş ses iyileştirme, UYAP otomatik işlemi, bağımsız
          denetçi portalı, şifreli kasa ve pilot sertifikasyonu yoktur. Bu alanlar sonraki aşamaların mimari sınırı
          olarak belgelenmiştir; arayüzde çalışan özellik gibi sunulmaz.
        </Callout>
      </div>
    </>
  );
}
