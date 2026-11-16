/**
 * Ses ve Transkript sekmesi.
 *
 * Oynatma imleci, dalga biçimi ve segment seçimi aynı zaman eksenini kullanır
 * (bkz. MIH-REQ-AUD-003). Ham ASR ile insan düzeltmesi ayrı sürümlerdir
 * (bkz. MIH-REQ-TRN-001, MIH-REQ-TRN-002). Duyulamayan içerik uydurulmaz;
 * açıkça işaretlenir (bkz. MIH-REQ-TRN-005).
 *
 * Not: İlk dilimde gerçek ses oynatma motoru yoktur; imleç, zaman ekseni ve
 * segment seçimi gerçek veriyle çalışır, ses çalma işlevi devre dışıdır.
 */
import { useMemo, useState } from "react";
import type { ApiClient, SegmentView, TaskBundleView } from "../../api.ts";
import { Badge, Button, Callout, EmptyState, Panel } from "../../components/ui.tsx";
import { formatDuration, formatTime, reviewStateLabel } from "../../format.ts";

export function AudioTab({
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
  const [audioId, setAudioId] = useState(bundle.audios[0]?.audioId ?? "");
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [versionView, setVersionView] = useState<"incelenen" | "ham">("incelenen");
  const [cursorMs, setCursorMs] = useState(0);
  const [draft, setDraft] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const [busy, setBusy] = useState(false);

  const audio = bundle.audios.find((item) => item.audioId === audioId) ?? bundle.audios[0];

  const segments = useMemo(() => {
    const source = versionView === "ham" ? bundle.rawSegments : bundle.latestSegments;
    return source
      .filter((segment) => segment.audioId === audioId)
      .slice()
      .sort((a, b) => a.startMs - b.startMs);
  }, [bundle.latestSegments, bundle.rawSegments, audioId, versionView]);

  const selected = segments.find((segment) => segment.segmentId === selectedSegmentId) ?? null;

  if (!audio) {
    return (
      <Panel title="Ses kaydı yok">
        <EmptyState title="Bu göreve bağlı ses kaydı bulunmuyor" description="Materyaller sekmesinden kayıt eklenebilir." />
      </Panel>
    );
  }

  function selectSegment(segment: SegmentView) {
    setSelectedSegmentId(segment.segmentId);
    setCursorMs(segment.startMs);
    setDraft(segment.text);
    setUncertain(segment.uncertain);
  }

  async function saveCorrection() {
    if (!selected) return;
    if (draft.trim().length === 0 && !uncertain) {
      onNotify("Boş metin yalnızca 'duyulamayan' işaretiyle kaydedilebilir.", "error");
      return;
    }
    setBusy(true);
    try {
      await api.saveCorrection(bundle.task.taskId, audioId, "Uzman kontrolü ve düzeltmesi", [
        { segmentId: selected.segmentId, text: draft, uncertain },
      ]);
      onNotify("Düzeltme yeni sürüm olarak kaydedildi; ham ASR korundu.");
      onReload();
    } catch (cause) {
      onNotify(cause instanceof Error ? cause.message : "Düzeltme kaydedilemedi.", "error");
    } finally {
      setBusy(false);
    }
  }

  const durationMs = audio.durationMs;
  const waveform = buildWaveform(segments, durationMs);
  const rawVersion = bundle.transcriptVersions.find(
    (version) => version.audioId === audioId && version.kind === "ham-asr",
  );
  const correctionVersions = bundle.transcriptVersions.filter(
    (version) => version.audioId === audioId && version.kind === "insan-düzeltmesi",
  );

  return (
    <div className="st-stack">
      <Panel
        title="Ses kaydı"
        description="Orijinal ses değiştirilmez; işlemler türetilmiş kopyada yürütülür."
        action={
          <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12 }}>
            <span>Kayıt:</span>
            <select
              aria-label="Ses kaydı seçimi"
              value={audioId}
              onChange={(event) => {
                setAudioId(event.target.value);
                setSelectedSegmentId(null);
                setCursorMs(0);
                setDraft("");
              }}
              style={{ padding: "6px 8px", border: "1px solid var(--st-line-strong)", borderRadius: 8 }}
            >
              {bundle.audios.map((item) => (
                <option key={item.audioId} value={item.audioId}>
                  {item.fileName}
                </option>
              ))}
            </select>
          </label>
        }
      >
        <div className="st-stack">
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, color: "var(--st-muted)" }}>
            <span>Süre: {formatDuration(durationMs)}</span>
            <span>{audio.codec}</span>
            <span>{audio.sampleRateHz} Hz</span>
            <span>{audio.channels} kanal</span>
            <span>özet: {audio.sha256.slice(0, 16)}…</span>
          </div>

          <svg
            className="st-waveform"
            viewBox="0 0 800 96"
            role="img"
            aria-label={`${audio.fileName} dalga biçimi. Seçili konum ${formatTime(cursorMs)}.`}
            preserveAspectRatio="none"
          >
            <line x1="0" y1="48" x2="800" y2="48" stroke="#e4eae5" strokeWidth="1" />
            {waveform.map((bar, index) => (
              <rect
                key={index}
                x={index * 4}
                y={48 - bar / 2}
                width="2.4"
                height={bar}
                fill="#4c7a5c"
                opacity={index * 4 >= (cursorMs / durationMs) * 800 - 4 && index * 4 <= (cursorMs / durationMs) * 800 + 4 ? 1 : 0.55}
              />
            ))}
            <line
              x1={(cursorMs / durationMs) * 800}
              y1="4"
              x2={(cursorMs / durationMs) * 800}
              y2="92"
              stroke="#9a4a42"
              strokeWidth="2"
            />
          </svg>
          <div className="st-timeline-scale">
            <span>00:00.000</span>
            <span>İmleç: {formatTime(cursorMs)}</span>
            <span>{formatTime(durationMs)}</span>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button
              size="small"
              disabled
              title="İlk dilimde gerçek ses oynatma motoru yoktur; yalnızca zaman ekseni ve segment seçimi çalışır."
            >
              ▶ Oynat (sonraki aşama)
            </Button>
            <Button
              size="small"
              onClick={() => setCursorMs(Math.max(0, cursorMs - 1000))}
              title="İmleci bir saniye geri al"
            >
              −1 sn
            </Button>
            <Button
              size="small"
              onClick={() => setCursorMs(Math.min(durationMs, cursorMs + 1000))}
              title="İmleci bir saniye ileri al"
            >
              +1 sn
            </Button>
            <span style={{ alignSelf: "center", color: "var(--st-muted)", fontSize: 11 }}>
              Zaman ekseni milisaniyedir; imleç ve segment seçimi aynı ekseni kullanır.
            </span>
          </div>
        </div>
      </Panel>

      <div className="st-grid-2">
        <Panel
          title="Transkript"
          description="Ham ASR ve insan düzeltmesi ayrı sürümlerdir."
          action={
            <div role="group" aria-label="Sürüm görünümü" style={{ display: "flex", gap: 4 }}>
              <button
                type="button"
                className="st-tab"
                aria-pressed={versionView === "incelenen"}
                onClick={() => setVersionView("incelenen")}
              >
                İncelenen sürüm
              </button>
              <button
                type="button"
                className="st-tab"
                aria-pressed={versionView === "ham"}
                onClick={() => setVersionView("ham")}
              >
                Ham ASR
              </button>
            </div>
          }
        >
          <div className="st-segment-list">
            {segments.length > 0 ? (
              segments.map((segment) => (
                <button
                  key={segment.segmentId}
                  type="button"
                  className="st-segment"
                  aria-pressed={selectedSegmentId === segment.segmentId}
                  onClick={() => selectSegment(segment)}
                >
                  <span className="st-segment-top">
                    <strong>{formatTime(segment.startMs)}</strong>
                    <span>– {formatTime(segment.endMs)}</span>
                    <span>· {segment.speakerLabel}</span>
                    {segment.uncertain ? <Badge tone="amber">DUYULAMAYAN</Badge> : null}
                    {segment.reviewState === "bekliyor" ? <Badge tone="gray">Kontrol bekliyor</Badge> : null}
                  </span>
                  <span className="st-segment-text">{segment.text || "(metin yok)"}</span>
                </button>
              ))
            ) : (
              <EmptyState title="Segment yok" description="Bu sürümde kayıtlı segment bulunmuyor." />
            )}
          </div>
        </Panel>

        <Panel
          title="Segment düzeltme"
          description="Düzeltme yeni bir sürüm oluşturur; ham ASR silinmez."
        >
          {selected ? (
            <div className="st-stack">
              <div style={{ fontSize: 12, color: "var(--st-muted)" }}>
                {formatTime(selected.startMs)}–{formatTime(selected.endMs)} · {selected.speakerLabel} ·{" "}
                {reviewStateLabel(selected.reviewState)}
              </div>
              <textarea
                aria-label="Segment metni düzeltmesi"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                rows={4}
                style={{
                  width: "100%",
                  padding: "9px 10px",
                  border: "1px solid var(--st-line-strong)",
                  borderRadius: 9,
                  fontFamily: "inherit",
                  fontSize: 13,
                }}
              />
              <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12.5 }}>
                <input
                  type="checkbox"
                  checked={uncertain}
                  onChange={(event) => setUncertain(event.target.checked)}
                />
                Duyulamayan / belirsiz bölüm olarak işaretle (metin uydurulmaz)
              </label>
              {selected.priorityReason ? (
                <div style={{ fontSize: 11.5, color: "var(--st-muted)" }}>
                  İnceleme önceliği nedeni: {selected.priorityReason}
                </div>
              ) : null}
              <div style={{ display: "flex", gap: 8 }}>
                <Button kind="primary" size="small" onClick={saveCorrection} disabled={busy}>
                  {busy ? "Kaydediliyor…" : "Düzeltmeyi yeni sürüm olarak kaydet"}
                </Button>
                <Button
                  size="small"
                  kind="ghost"
                  onClick={() => {
                    setDraft(selected.text);
                    setUncertain(selected.uncertain);
                  }}
                >
                  Geri al
                </Button>
              </div>
            </div>
          ) : (
            <EmptyState title="Segment seçilmedi" description="Soldaki listeden bir segment seçin." />
          )}
        </Panel>
      </div>

      <Panel title="Sürüm geçmişi" description="Her sürüm değiştirilemez; ham ASR silinemez.">
        <div className="st-table-wrap">
          <table className="st-table">
            <caption style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}>
              Transkript sürümleri
            </caption>
            <thead>
              <tr>
                <th scope="col">SÜRÜM</th>
                <th scope="col">TÜR</th>
                <th scope="col">KAYNAK</th>
                <th scope="col">OLUŞTURAN</th>
                <th scope="col">TARİH</th>
              </tr>
            </thead>
            <tbody>
              {rawVersion ? (
                <tr>
                  <td>{rawVersion.versionId}</td>
                  <td>
                    <Badge tone="gray">Ham ASR (değiştirilemez)</Badge>
                  </td>
                  <td>{rawVersion.source}</td>
                  <td>{rawVersion.createdBy}</td>
                  <td className="st-muted-cell">{rawVersion.createdAt}</td>
                </tr>
              ) : null}
              {correctionVersions.map((version) => (
                <tr key={version.versionId}>
                  <td>{version.versionId}</td>
                  <td>
                    <Badge tone="green">İnsan düzeltmesi</Badge>
                  </td>
                  <td>{version.source}</td>
                  <td>{version.createdBy}</td>
                  <td className="st-muted-cell">{version.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Callout tone="info" title="Konuşmacı etiketleri hakkında">
        Konuşmacı A/B etiketleri yalnızca o kayıt içindeki anonim gruplardır. Kimlik tespiti veya kayıtlar arası
        biyometrik eşleştirme yapılmaz. Serbest büyük dil modeli transkripsiyon kelimesinin kaynağı değildir.
      </Callout>
    </div>
  );
}

/** Segment yoğunluğundan görsel dalga biçimi üretir; gerçek ses verisi değildir. */
function buildWaveform(segments: SegmentView[], durationMs: number): number[] {
  const bars = 200;
  const result = new Array<number>(bars).fill(6);
  for (const segment of segments) {
    const start = Math.floor((segment.startMs / durationMs) * bars);
    const end = Math.ceil((segment.endMs / durationMs) * bars);
    for (let index = start; index < end && index < bars; index += 1) {
      const phase = Math.abs(Math.sin(index * 0.37));
      result[index] = 18 + phase * 54;
    }
  }
  return result;
}
