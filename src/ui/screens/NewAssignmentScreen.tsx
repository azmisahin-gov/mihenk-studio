/**
 * Yeni Görevlendirme ekranı.
 *
 * Belge alımı gerçek bir görev taslağı üretir. Alanlar kaynağa bağlıdır;
 * okunamayan alanlar tahmin edilmez ve teyit kuyruğuna alınır
 * (bkz. MIH-REQ-DOC-003). Üretim OCR motoru kurulu değildir ve bu durum
 * ekranda açıkça yazılır (bkz. ADR-011).
 */
import { useState } from "react";
import type { ApiClient } from "../api.ts";
import { Badge, Button, Callout, PageTitle, Panel } from "../components/ui.tsx";

interface DraftField {
  key: string;
  value: string;
  sourcePage: number;
  sourceRegion: string;
  confidence: number;
  uncertain: boolean;
}

export function NewAssignmentScreen({
  api,
  onCreated,
  onOpenTask,
  onError,
  onBack,
}: {
  api: ApiClient;
  onCreated: (taskId: string) => void;
  onOpenTask: (taskId: string) => void;
  onError: (message: string) => void;
  onBack: () => void;
}) {
  const [title, setTitle] = useState("Yeni sentetik ses incelemesi");
  const [caseNumber, setCaseNumber] = useState("2026/1234 S. (SENTETİK)");
  const [authority, setAuthority] = useState("Örnek Merci (SENTETİK)");
  const [dueDate, setDueDate] = useState("01 Aralık 2026");
  const [documentName, setDocumentName] = useState("Sentetik_Gorevlendirme.pdf");
  const [busy, setBusy] = useState(false);
  const [createdTaskId, setCreatedTaskId] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  const [fields, setFields] = useState<DraftField[]>([
    {
      key: "Görevlendiren merci",
      value: "Örnek Merci (SENTETİK)",
      sourcePage: 1,
      sourceRegion: "üst başlık",
      confidence: 0.94,
      uncertain: false,
    },
    {
      key: "Dosya numarası",
      value: "2026/1234 S. (SENTETİK)",
      sourcePage: 1,
      sourceRegion: "dosya bilgisi",
      confidence: 0.91,
      uncertain: false,
    },
    {
      // Okunamayan alan: teyit kuyruğuna gider.
      key: "İnceleme kapsamı",
      value: "",
      sourcePage: 1,
      sourceRegion: "görevlendirme konusu",
      confidence: 0.38,
      uncertain: true,
    },
  ]);

  const [expected, setExpected] = useState([
    { label: "Sentetik kayıt A", kind: "ses", sourceNote: "Belgeden çıkarıldı (sentetik)" },
    { label: "Sentetik kayıt B", kind: "ses", sourceNote: "Belgeden çıkarıldı (sentetik)" },
  ]);

  async function create() {
    setBusy(true);
    try {
      const result = await api.createTask({
        title,
        caseNumber,
        authority,
        dueDate,
        kind: "Sentetik görev",
        documentName,
        documentText: `SENTETİK ÖRNEK — RESMÎ BELGE DEĞİLDİR\n${authority}\nDosya: ${caseNumber}\nKonu: ${title}`,
        pageCount: 2,
        fields,
        expectedMaterials: expected,
      });
      setCreatedTaskId(result.taskId);
      setPendingCount(result.pendingConfirmation);
      onCreated(result.taskId);
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : "Görev oluşturulamadı.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <Button kind="ghost" size="small" onClick={onBack}>
          ← Görevlerime dön
        </Button>
      </div>

      <PageTitle
        eyebrow="YENİ GÖREVLENDİRME"
        title="Yeni çalışma alanı oluşturun"
        description="Görevlendirme belgesini ekleyin. MİHENK bir taslak oluşturur; belgedeki alanları ve beklenen materyalleri incelemeniz için hazırlar."
      />

      <Callout tone="info" title="Bu aşamada otomatik OCR çalışmaz">
        Üretim OCR motoru bu aşamada kurulu değildir. Alanlar aşağıda elle girilir ve kaynağına bağlı olarak
        kaydedilir; okunamayan alanlar tahmin edilmez, teyit kuyruğuna alınır.
      </Callout>

      <div className="st-grid-2" style={{ marginTop: 16 }}>
        <Panel title="1. Görevlendirme belgesi" description="Kaynak belge değiştirilmeden saklanır." action={<Badge tone="blue">SENTETİK</Badge>}>
          <div className="st-stack">
            <label style={{ display: "grid", gap: 5 }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Belge adı</span>
              <input
                className="st-input"
                style={{ padding: "8px 10px", border: "1px solid var(--st-line-strong)", borderRadius: 9 }}
                value={documentName}
                onChange={(event) => setDocumentName(event.target.value)}
              />
            </label>
            <label style={{ display: "grid", gap: 5 }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Görev başlığı</span>
              <input
                style={{ padding: "8px 10px", border: "1px solid var(--st-line-strong)", borderRadius: 9 }}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <label style={{ display: "grid", gap: 5 }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Dosya numarası</span>
              <input
                style={{ padding: "8px 10px", border: "1px solid var(--st-line-strong)", borderRadius: 9 }}
                value={caseNumber}
                onChange={(event) => setCaseNumber(event.target.value)}
              />
            </label>
            <label style={{ display: "grid", gap: 5 }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Görevlendiren merci</span>
              <input
                style={{ padding: "8px 10px", border: "1px solid var(--st-line-strong)", borderRadius: 9 }}
                value={authority}
                onChange={(event) => setAuthority(event.target.value)}
              />
            </label>
            <label style={{ display: "grid", gap: 5 }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Rapor teslim tarihi</span>
              <input
                style={{ padding: "8px 10px", border: "1px solid var(--st-line-strong)", borderRadius: 9 }}
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </label>
          </div>
        </Panel>

        <Panel
          title="2. Belgeden çıkarılan alanlar"
          description="Alanlar kaynağa bağlıdır; emin olunmayan veri tahminle tamamlanmaz."
          action={
            <Badge tone={fields.some((field) => field.uncertain) ? "amber" : "green"}>
              {fields.filter((field) => field.uncertain).length} teyit gerekli
            </Badge>
          }
        >
          <div className="st-stack">
            {fields.map((field, index) => (
              <div
                key={`${field.key}-${index}`}
                style={{
                  padding: 11,
                  border: `1px solid ${field.uncertain ? "var(--st-amber)" : "var(--st-line)"}`,
                  borderRadius: 10,
                  background: field.uncertain ? "var(--st-amber-soft)" : "var(--st-white)",
                }}
              >
                <div style={{ fontSize: 12, color: "var(--st-muted)" }}>{field.key}</div>
                <input
                  aria-label={`${field.key} alanının değeri`}
                  style={{
                    width: "100%",
                    margin: "5px 0",
                    padding: "7px 9px",
                    border: "1px solid var(--st-line-strong)",
                    borderRadius: 8,
                  }}
                  value={field.value}
                  placeholder={field.uncertain ? "Belge görüntüsünden teyit edilmeli" : ""}
                  onChange={(event) =>
                    setFields((items) =>
                      items.map((item, i) =>
                        i === index ? { ...item, value: event.target.value, uncertain: false } : item,
                      ),
                    )
                  }
                />
                <small style={{ color: "var(--st-muted)", fontSize: 11 }}>
                  Sayfa {field.sourcePage} · {field.sourceRegion} · güven %{Math.round(field.confidence * 100)}
                  {field.uncertain ? " · TEYİT BEKLİYOR" : ""}
                </small>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="3. Beklenen materyaller" description="Belgede tarif edilen materyaller; teslim alınanlarla karıştırılmaz.">
          <div className="st-stack">
            {expected.map((item, index) => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span aria-hidden="true">🎧</span>
                <div style={{ flex: 1 }}>
                  <strong style={{ display: "block", fontSize: 13 }}>{item.label}</strong>
                  <small style={{ color: "var(--st-muted)" }}>{item.sourceNote}</small>
                </div>
                <Badge tone="amber">Bekleniyor</Badge>
                <Button
                  size="small"
                  kind="ghost"
                  onClick={() => setExpected((items) => items.filter((_, i) => i !== index))}
                  title={`${item.label} beklentisini kaldır`}
                >
                  Kaldır
                </Button>
              </div>
            ))}
            <Button
              size="small"
              onClick={() =>
                setExpected((items) => [
                  ...items,
                  { label: `Sentetik ek materyal ${items.length + 1}`, kind: "ses", sourceNote: "Elle eklendi (sentetik)" },
                ])
              }
            >
              Beklenen materyal ekle
            </Button>
            <Callout tone="info">Eksik materyaller görevi açmayı engellemez. Görev alanından daha sonra eklenebilir.</Callout>
          </div>
        </Panel>

        <Panel title="4. Taslağı oluştur">
          {createdTaskId ? (
            <div className="st-stack">
              <div className="st-callout">
                <div>
                  <strong>Görev taslağı oluşturuldu</strong>
                  <span>
                    Görev kimliği: {createdTaskId} · {pendingCount} alan teyit bekliyor.
                  </span>
                </div>
              </div>
              <div>
                <Button kind="primary" onClick={() => onOpenTask(createdTaskId)}>
                  Taslağı görev alanında aç
                </Button>
              </div>
            </div>
          ) : (
            <div className="st-stack">
              <p style={{ margin: 0, color: "var(--st-body)", fontSize: 13 }}>
                Belgeye ait taslak görev, çıkarılan alanlar ve beklenen materyal listesiyle birlikte açılır.
              </p>
              <div>
                <Button kind="primary" onClick={create} disabled={busy}>
                  {busy ? "Oluşturuluyor…" : "Taslağı oluştur"}
                </Button>
              </div>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
