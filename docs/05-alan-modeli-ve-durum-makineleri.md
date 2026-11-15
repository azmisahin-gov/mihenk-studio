# Alan modeli, ilişkiler ve durum makineleri

**Belge durumu:** Taslak — proje sahibi gözden geçirmesi bekleniyor
**Bağlı iş kaydı:** #1
**İlgili belgeler:** `docs/04-gereksinim-izlenebilirlik-matrisi.md`, `docs/06-mimari-karar-kayitlari.md`

> Bu belgedeki adlar tasarım tanımlayıcılarıdır. Kesin şema uygulama sırasında Mimari Karar Kaydı ile netleştirilir. Kimlikler kaynak kodla birebir eşleştiği için çevrilmez.

## 1. Tasarım ilkeleri

1. **Görev kapsamı zorunlu:** Her alt kayıt `taskId` taşır. `Task` dışında hiçbir varlık görevler arası paylaşılmaz.
2. **Orijinali koru, türetilmişi bağla:** Kaynak dosya ve ses değişmez; her dönüşüm `DerivedArtifact` üretir ve kaynağına bağlanır.
3. **Değişmez geçmiş:** `TranscriptVersion`, `ReportRevision` ve `AuditEvent` yalnızca eklenir; güncellenmez.
4. **Tek kanonik rapor:** Bir görevin tek `ReportDocument` kaydı olur; tüm görünüm ve çıktılar bu kaynaktan üretilir.
5. **İnsan onayı ayrı olay:** Uzman onayı `ApprovalEvent` olarak, kullanıcı ve zaman bilgisiyle kaydedilir; otomatik kontrolden ayrıdır.

## 2. Varlık ilişkileri

### 2.1 İlişki listesi

| Kaynak | İlişki | Hedef | Kardinalite | Not |
|---|---|---|---|---|
| `Task` | 1 — n | `AssignmentDocument` | Bir göreve birden çok görevlendirme belgesi bağlanabilir (ek/tamlayıcı yazı). | |
| `Task` | 1 — n | `ExpectedMaterial` | Beklenen materyal listesi. | |
| `Task` | 1 — n | `Material` | Teslim alınan materyal. | |
| `Task` | 1 — n | `AudioRecord` | Ses kaydı. | |
| `Task` | 1 — n | `Question` | Soru. | |
| `Task` | 1 — n | `Finding` | Bulgu. | |
| `Task` | 1 — 1 | `ReportDocument` | Tek kanonik rapor. | |
| `Task` | 1 — n | `ProcessingJob` | Arka plan işi. | |
| `Task` | 1 — n | `AuditEvent` | Denetim olayı. | |
| `AssignmentDocument` | 1 — n | `ExtractedField` | OCR/çıkarım alanı. | |
| `AssignmentDocument` | 1 — 1 | `Material` | Belge aynı zamanda bir materyaldir. | |
| `Material` | 1 — n | `DerivedArtifact` | Dönüştürülmüş kopya. | |
| `AudioRecord` | 1 — 1 | `Material` | Ses kaydı bir materyal dosyasına dayanır. | |
| `AudioRecord` | 1 — n | `TranscriptVersion` | Ham ve düzeltilmiş sürümler. | |
| `AudioRecord` | 1 — n | `DerivedArtifact` | İşlenmiş ses kopyası. | |
| `TranscriptVersion` | 1 — n | `TranscriptSegment` | Segmentler sürüme bağlıdır. | |
| `Question` | 1 — n | `Answer` | Yanıt sürümleri. | |
| `Answer` | 1 — n | `EvidenceRef` | Yanıt dayanakları. | |
| `Finding` | n — n | `EvidenceRef` | `FindingEvidence` üzerinden. | |
| `EvidenceRef` | n — 1 | `Material` \| `TranscriptSegment` | Hedef türlerinden biri zorunludur. | |
| `ReportDocument` | 1 — n | `ReportRevision` | Değişmez revizyon geçmişi. | |
| `ReportRevision` | 1 — n | `QualityCheck` | Sürüm bazlı kalite kontrol sonucu. | |
| `ReportRevision` | 1 — n | `ReportAppendix` | Rapor ekleri. | |
| `ReportDocument` | 1 — n | `ApprovalEvent` | İnsan onayı olayları. | |
| `ProcessingJob` | n — 1 | `Task` | Her iş bir göreve bağlıdır. | |
| `ProcessingJob` | 1 — n | `DerivedArtifact` | İş çıktısı. | |
| `ExpertProfile` | 1 — n | `Module` | Uzmanlık modülü ataması (yapılandırma katmanı). | |
| `EngineProfile` | n — 1 | `Module` | Motor/model yapılandırması modüle bağlıdır. | |

### 2.2 Katman ayrımı (korunacak tasarım kararı)

Kabul edilmiş v0.5 kararı gereği üç katman birbirinden ayrıdır ve karıştırılmaz:

1. **`ExpertProfile`** — kişisel meslekî bilgi (uzmanın kendi beyanı).
2. **`Module`** — MİHENK yazılımının sunduğu iş akışı modülü.
3. **`EngineProfile`** — doğrulanmış motor/model yapılandırması.

Bir uzmanlık alanı (`ExpertProfile` içindeki beyan), bir `Module`'ün kurulu veya kabul edilmiş olduğu anlamına gelmez.

### 2.3 Şema (kavramsal)

```
Task(taskId, title, caseNumber, authority, dueDate, status, kind, synthetic, createdAt, updatedAt)

AssignmentDocument(assignmentId, taskId, materialId, documentType, pageCount,
                   receivedAt, extractionStatus)

ExtractedField(fieldId, assignmentId, taskId, key, value, sourcePage, sourceRegion,
               confidence, confirmation)          -- confirmation ∈ {auto, needs-confirm, confirmed, rejected}

ExpectedMaterial(expectedId, taskId, label, kind, sourceNote, status)
                                                 -- status ∈ {bekleniyor, alındı, sorunlu, yinelenen}

Material(materialId, taskId, originalName, storedName, mimeType, sizeBytes,
         sha256, receivedAt, kind, status, duplicateOfId, supersedesId)
                                                 -- kind ∈ {assignment-document, audio, image, other}
                                                 -- status ∈ {bekleniyor, alındı, doğrulandı, sorunlu, yinelenen}

DerivedArtifact(artifactId, taskId, sourceMaterialId, jobId, kind, paramsJson,
                sha256, createdAt, reversible)   -- reversible: geri alınabilir mi

AudioRecord(audioId, taskId, materialId, durationMs, sampleRateHz, channels,
            codec, originNote, sha256)

ProcessingJob(jobId, taskId, kind, status, idempotencyKey, attempt, maxAttempts,
              progress, errorCode, errorMessage, createdAt, startedAt, finishedAt,
              cancelRequested)                   -- kind ∈ {ocr, asr, audio-process, report-export}

TranscriptVersion(versionId, taskId, audioId, kind, source, createdBy, createdAt,
                  immutable)                     -- kind ∈ {raw-asr, human-correction}
                                                 -- source ∈ {asr-engine, human-expert}

TranscriptSegment(segmentId, taskId, versionId, audioId, index, startMs, endMs,
                  speakerLabel, text, uncertain, reviewState, priorityReason, note)
                                                 -- reviewState ∈ {bekliyor, incelendi, düzeltildi}
                                                 -- uncertain: duyulamayan içerik işareti

Question(questionId, taskId, index, text, sourceFieldId, sourceNote)
Answer(answerId, taskId, questionId, text, status, version, answeredBy, updatedAt)
                                                 -- status ∈ {boş, taslak, tamamlandı}

EvidenceRef(evidenceId, taskId, kind, materialId, page, region, audioId,
            segmentId, startMs, endMs, note)
                                                 -- kind ∈ {document, audio-segment}

Finding(findingId, taskId, code, title, description, severity, status, createdAt)
                                                 -- severity ∈ {düşük, orta, yüksek}
                                                 -- status ∈ {taslak, doğrulandı, geri çekildi}

FindingEvidence(findingId, evidenceId, taskId)

ReportDocument(reportId, taskId, status, currentRevisionId, synthetic, createdAt, updatedAt)
                                                 -- status ∈ {taslak, eksik, incelemede,
                                                 --          uzman-onayı-bekliyor, onaylandı, arşivlendi}

ReportRevision(revisionId, taskId, reportId, revisionNo, reason, createdBy, createdAt,
               sourceVersionsJson)               -- hangi soru/yanıt/dayanak/transkript/materyal sürümleri

ReportAppendix(appendixId, taskId, reportId, revisionId, title, order, contentJson, sourceRefsJson)

QualityCheck(checkId, taskId, reportId, revisionId, code, label, status, detail,
             computedAt, computedFrom)           -- status ∈ {geçti, uyarı, engel, bekliyor}
                                                 -- computedFrom: hangi verilerden türedi

ApprovalEvent(approvalId, taskId, reportId, kind, actorName, actorRole, occurredAt, note)
                                                 -- kind ∈ {rapor-onayı, alan-teyidi, bulgu-doğrulaması}

AuditEvent(eventId, taskId, at, actor, action, entityType, entityId, detailJson)

ExpertProfile(profileId, displayName, profession, registryNo, workingLanguage, status)
Module(moduleId, code, name, description, status)
EngineProfile(engineId, moduleId, name, version, status, networkRequired, paramsJson)
                                                 -- status ∈ {doğrulanmamış, test-bekliyor, doğrulanmış, devre-dışı}
```

## 3. Durum makineleri

### 3.1 Görev (`Task.status`)

Sözleşme bölüm 7'deki sıra korunur.

| Durum | Anlam |
|---|---|
| `taslak` | İlk belge alındı, taslak kayıt açıldı; inceleme başlamadı. |
| `incelemede` | Kullanıcı görevi açtı ve çalışıyor. |
| `beklemede` | Dış girdi bekleniyor (eksik materyal, teyit). |
| `rapor-hazırlanıyor` | Rapor üretimi başladı. |
| `uzman-onayı-bekliyor` | Rapor hazır; insan onayı bekleniyor. |
| `tamamlandı` | Uzman onayı verildi. |
| `arşivlendi` | Görev kapatıldı. |

Geçişler:

```
taslak            → incelemede | arşivlendi
incelemede        → beklemede | rapor-hazırlanıyor | arşivlendi
beklemede         → incelemede | arşivlendi
rapor-hazırlanıyor→ uzman-onayı-bekliyor | incelemede
uzman-onayı-bekliyor → tamamlandı | rapor-hazırlanıyor
tamamlandı        → arşivlendi
arşivlendi        → (uç durum; yeniden açma yeni görev değil, açık bir geri alma olayı gerektirir)
```

Kural: `tamamlandı` durumuna geçiş yalnızca bir `ApprovalEvent(kind=rapor-onayı)` kaydıyla mümkündür. Bu, "uzman tarafından verilmemiş kararı tamamlanmış gösterme" yasağının teknik karşılığıdır.

### 3.2 Materyal (`Material.status`)

```
bekleniyor → alındı → doğrulandı
                  ↘ sorunlu → alındı (yeniden teslim)
                  ↘ yinelenen (duplicateOfId dolu)
```

Kural: `doğrulandı` yalnızca özet (sha256) hesaplandıktan ve dosya okunabilirliği doğrulandıktan sonra atanır. `yinelenen` durumu `duplicateOfId` veya `supersedesId` alanlarından en az birini zorunlu kılar.

### 3.3 İş (`ProcessingJob.status`)

```
bekliyor → çalışıyor → tamamlandı
                    → uyarı (uyarıyla tamamlandı)
                    → başarısız → yeniden-denetim-bekliyor → çalışıyor (attempt < maxAttempts)
                    → iptal-edildi
```

Kural: `iptal-edildi` ve `başarısız` hiçbir koşulda kaynak materyali veya önceki başarılı çıktıyı silmez. Aynı `idempotencyKey` ile ikinci kez tetiklenen iş yeni kayıt açmaz; mevcut kaydın durumunu döndürür.

### 3.4 Transkript sürümü (`TranscriptVersion.kind`)

Transkript sürümleri bir durum makinesi değil, **eklemeli (append-only) geçmiş**tir:

```
raw-asr (immutable) ──▶ human-correction #1 (immutable) ──▶ human-correction #2 (immutable) ──▶ …
```

Kural: `raw-asr` sürümü hiçbir kullanıcı işlemiyle güncellenemez veya silinemez. Yeni düzeltme her zaman yeni bir sürüm üretir. Segment düzeyinde `reviewState` ve `uncertain` alanları güncellenebilir; ancak metin değişikliği yeni sürüm gerektirir.

### 3.5 Rapor (`ReportDocument.status` ve `ReportRevision`)

```
taslak → eksik → incelemede → uzman-onayı-bekliyor → onaylandı → arşivlendi
```

- `eksik`: en az bir `QualityCheck` sonucu `engel` durumundadır.
- `incelemede`: engel yok, `uyarı` olabilir.
- `uzman-onayı-bekliyor`: tüm engeller kalktı, `ApprovalEvent` bekleniyor.
- `onaylandı`: yalnızca `ApprovalEvent(kind=rapor-onayı)` ile ulaşılır.
- Her durum değişikliği ve her içerik değişikliği yeni bir `ReportRevision` üretir; revizyon `sourceVersionsJson` ile dayandığı sürümleri kaydeder.

### 3.6 Kalite kontrolü (`QualityCheck.status`)

```
bekliyor → geçti | uyarı | engel
```

Kural: Bir kontrol yalnızca `computedFrom` alanı doldurulduğunda (`geçti` dâhil) sonuç üretebilir. Veri eksikken kontrol `bekliyor` olur ve `geçti` sayılamaz.

## 4. Görev yalıtımı kuralları

1. Her veri erişimi `taskId` parametresiyle kapsamlanır. Kapsamsız sorgu derleme/işletim düzeyinde reddedilir.
2. Görevler arası referans yalnızca açık bir yetki kuralıyla (ör. ortak belge paylaşımı) ve kayıt altında mümkündür. İlk dilimde bu yol yoktur.
3. Arayüz oturumu tek bir `activeTaskId` taşır. Görev değiştiğinde tüm panel durumu sıfırlanır; önceki görevin seçili kaydı, segmenti, taslağı taşınmaz.
4. Negatif test zorunludur: görev A'da oluşturulan her alt kayıt, görev B sorgusunda görünmemelidir.

## 5. Değişmezlik ve denetim kuralları

| Kural | Uygulama |
|---|---|
| Orijinal dosya değişmez | `Material.sha256` dışa aktarma öncesi ve sonrası doğrulanır. |
| Orijinal ses değişmez | `AudioRecord.sha256` işlem öncesi ve sonrası doğrulanır. |
| Ham ASR silinmez | `TranscriptVersion(kind=raw-asr)` silme işlemi reddedilir. |
| Rapor revizyonu eklemeli | `ReportRevision` güncelleme işlemi reddedilir; yeni revizyon eklenir. |
| İnsan onayı ayrı | `ApprovalEvent` olmadan `tamamlandı`/`onaylandı` durumuna geçilemez. |
| Denetim izi | Önemli kullanıcı/iş/çıktı olayları `AuditEvent` olarak kaydedilir. |

## 6. Açık kalan alan modeli kararları

Aşağıdakiler proje sahibi/teknik sorumlu onayıyla kesinleşir (bkz. `docs/07-acik-kararlar-ve-riskler.md`):

- `EvidenceRef` için ayrık sütun mu yoksa hedef türü + hedef kimliği (polimorfik) mi kullanılacağı.
- `ReportDocument` içeriğinin yapısal bölüm modeli mi yoksa düzenlenebilir zengin metin mi olacağı.
- `AudioRecord.sha256` hesabının büyük dosyalarda akış (streaming) ile mi yapılacağı.
- `TranscriptSegment.text` düzeltme geçmişinin segment düzeyinde ayrı bir tablo gerektirip gerektirmediği.
