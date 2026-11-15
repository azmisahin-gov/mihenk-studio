# Gereksinim → ekran/akış → alan modeli → test → kabul kanıtı izlenebilirlik matrisi

**Belge durumu:** Taslak — proje sahibi gözden geçirmesi bekleniyor
**Bağlı iş kaydı:** #1 — v0.6 ürün sözleşmesini sonlandır ve uygulama iş listesini oluştur
**Kaynak belgeler:** `README.md`, `DIL-ILKESI.md`, `docs/01-arayuz-ve-urun-denetim-raporu.md`, `docs/02-urun-ve-uygulama-sozlesmesi-v0.6-taslak.md`, `docs/03-bagimsiz-uygulayici-ajan-talimatlari.md`

> Bu belge, v0.6 sözleşmesinin onaylandığı anlamına gelmez. Sözleşme hâlâ taslaktır; buradaki gereksinim kimlikleri proje sahibinin onayına sunulmak üzere hazırlanmıştır.

## 1. Amaç ve kullanım

Bu matris, v0.6 ürün sözleşmesindeki her davranış kuralını benzersiz bir kimliğe bağlar. Her gereksinim şu zincire izlenebilir olmalıdır:

**gereksinim → ekran/akış → alan modeli varlığı → test → kabul kanıtı**

Matris üç soruyu yanıtlar:

1. Bir gereksinim hangi ekranda veya akışta görünür?
2. Bu gereksinim hangi alan modeli varlıklarını ve alanları zorunlu kılar?
3. Bu gereksinimin çalıştığı hangi test ve hangi kanıtla gösterilir?

Bir gereksinim ancak kodu, testi ve kanıtı birlikte tamamlandığında "karşılandı" sayılır. Sürekli bütünleştirme (CI) yeşil olması tek başına kabul değildir.

## 2. Kimlik şeması

Kimlik biçimi: `MIH-REQ-<ALAN>-<SIRA>`

| Alan kodu | Kapsam |
|---|---|
| `PLT` | Platform, dağıtım, yerel çalışma, çevrimdışı dayanıklılık |
| `TSK` | Görev oluşturma, görev durumu, görev yalıtımı |
| `DOC` | Görevlendirme belgesi alımı, OCR alanı, teyit kuyruğu |
| `MAT` | Beklenen materyal, teslim alınan materyal, bütünlük |
| `AUD` | Ses kaydı, zaman ekseni, orijinali koruma |
| `TRN` | Transkript sürümü, segment, düzeltme, konuşmacı etiketi |
| `QST` | Soru, yanıt, `EvidenceRef`, bulgu |
| `RPT` | Tek kanonik `ReportDocument`, A4 önizleme, DOCX çıktısı |
| `QLT` | Kalite kontrolü, insan onayı, üç katmanlı denetim |
| `JOB` | Arka plan işi, durum, iptal, yeniden deneme, kurtarma |
| `SEC` | Kasa, sır saklama, denetim izi, mahremiyet |
| `A11Y` | Erişilebilirlik, klavye, odak, kontrast, okunabilirlik |
| `SNT` | Sentetik veri işaretleme ve gerçek veri yasağı |
| `DIL` | Türkçe dil ilkesi ve belge/arayüz metinleri |

Öncelik ölçeği: **P0** ilk rapor odaklı dikey dilimin zorunlu çekirdeği; **P1** ilk teslimatın ürün kabulü için gerekli, dilim içinde karşılanması gereken; **P2** sonraki aşamaya taşınabilen, ancak arayüzde yanlış izlenim vermemesi için sınırı belgelenen.

## 3. İzlenebilirlik matrisi

### 3.1 Platform ve yerel çalışma

| Kimlik | Gereksinim | Öncelik | Ekran / akış | Alan modeli | Test | Kabul kanıtı |
|---|---|---|---|---|---|---|
| MIH-REQ-PLT-001 | Uygulama tek masaüstü uygulaması olarak çalışır; arayüz, uygulama kullanım senaryoları, alan modeli ve altyapı adaptörleri ayrı katmanlardır | P1 | Tüm ekranlar | Katman sınırları (bkz. ADR-002) | Mimari bağımlılık testi (içe aktarma yönü denetimi) | Bağımlılık denetimi test çıktısı, katman şeması |
| MIH-REQ-PLT-002 | Dosyalar varsayılan olarak kullanıcının cihazında işlenir; kapalı ağda temel görevler çalışır | P1 | Tüm akışlar | `Material`, `AudioRecord`, `ProcessingJob` | Ağ erişimi engellenmiş ortamda uçtan uca test | Çevrimdışı çalıştırma test kaydı |
| MIH-REQ-PLT-003 | Ağ gerektiren özellik varsa açıkça belirtilir ve kullanıcı bilgisi/izni gerektirir | P1 | Ayarlar, Materyaller | `EngineProfile.networkRequired` | Birim testi: ağ gerektiren motor profili işaretlenmemişse uyarı | Birim test çıktısı |
| MIH-REQ-PLT-004 | Uygulama kapanıp açıldığında sürmekte olan işin durumu kaybolmaz | P0 | Tüm uzun işlemler | `ProcessingJob`, kalıcı kuyruk | Kurtarma entegrasyon testi (yeniden başlatma benzetimi) | Kurtarma test çıktısı, ekran görüntüsü |
| MIH-REQ-PLT-005 | Teknoloji seçimi ADR ile gerekçelendirilir; mikro hizmet mimarisi ilk teslimat varsayılanı değildir | P1 | — | — | Belge denetimi | ADR-001 … ADR-00n |

### 3.2 Görev oluşturma ve görev yalıtımı

| Kimlik | Gereksinim | Öncelik | Ekran / akış | Alan modeli | Test | Kabul kanıtı |
|---|---|---|---|---|---|---|
| MIH-REQ-TSK-001 | Her materyal, kayıt, transkript, soru, yanıt, dayanak, bulgu ve rapor bir göreve aittir | P0 | Tüm görev sekmeleri | Tüm alt kayıtlarda `taskId` | Şema testi: `taskId` zorunluluğu | Şema/doğrulama test çıktısı |
| MIH-REQ-TSK-002 | Sorgu, rapor, dışa aktarma ve arayüz yalnızca seçili görevin verisini kullanır | P0 | Tüm görev sekmeleri | Görev kapsamlı depolar (repository) | **Negatif test:** iki görev arası çapraz veri sızıntısı | Yalıtım negatif test çıktısı |
| MIH-REQ-TSK-003 | Görev değiştirildiğinde tüm alt paneller yeni görevin verisini yükler; önceki görevin verisi görünmez ve işlem bağlamında taşınmaz | P0 | Görev çalışma alanı, görev seçici | Oturum bağlamı (`ActiveTaskContext`) | Uçtan uca test: görev A → görev B geçişi | Ekran görüntüsü, uçtan uca test çıktısı |
| MIH-REQ-TSK-004 | İlk görevlendirme belgesi alımında benzersiz görev taslağı oluşturulur | P0 | Yeni Görevlendirme | `Task`, `AssignmentDocument` | Entegrasyon testi: taslak kimliği benzersiz | Entegrasyon test çıktısı |
| MIH-REQ-TSK-005 | Eksik materyal görev oluşturmayı veya mevcut materyalin incelenmesini engellemez | P0 | Yeni Görevlendirme, Materyaller | `ExpectedMaterial.status` | Entegrasyon testi: eksik materyalle görev açma | Entegrasyon test çıktısı |
| MIH-REQ-TSK-006 | Kullanıcı görevi açıkça başlatana kadar taslak durumunda kalabilir | P1 | Görev Özeti | `Task.status` durum makinesi | Durum geçişi birim testi | Durum makinesi test çıktısı |
| MIH-REQ-TSK-007 | Görevler arası veri sorgusu açık yetki ve referans kuralı olmadan mümkün olmaz | P1 | — | Görev kapsamlı depolar | Negatif test: kapsamsız sorgu reddi | Negatif test çıktısı |

### 3.3 Görevlendirme belgesi ve OCR alanı

| Kimlik | Gereksinim | Öncelik | Ekran / akış | Alan modeli | Test | Kabul kanıtı |
|---|---|---|---|---|---|---|
| MIH-REQ-DOC-001 | Belge alımında dosya adı, tür, boyut, özet ve alım zamanı kaydedilir | P0 | Yeni Görevlendirme | `AssignmentDocument`, `Material` | Entegrasyon testi | Entegrasyon test çıktısı |
| MIH-REQ-DOC-002 | OCR alanı kaynak belge/sayfa/alan konumuyla ilişkilendirilir | P1 | Yeni Görevlendirme | `ExtractedField` | Birim testi: konum alanları zorunlu | Birim test çıktısı |
| MIH-REQ-DOC-003 | Okunamayan veya çelişkili alan tahmin edilmez; teyit kuyruğuna alınır | P0 | Yeni Görevlendirme | `ExtractedField.confirmation` | Birim + entegrasyon testi | Test çıktısı, ekran görüntüsü (teyit kuyruğu) |
| MIH-REQ-DOC-004 | İlk teslimatta üretim OCR motoru kurulmaz; mevcut çıkarım sentetik ve sınırlı olarak açıkça işaretlenir | P0 | Yeni Görevlendirme, Ayarlar | `EngineProfile` (durum: doğrulanmamış) | Arayüz denetim testi: doğrulanmamış motor "çalışıyor" gösterilmez | Ekran görüntüsü, sınırlama belgesi |

### 3.4 Materyal ve kaynak bütünlüğü

| Kimlik | Gereksinim | Öncelik | Ekran / akış | Alan modeli | Test | Kabul kanıtı |
|---|---|---|---|---|---|---|
| MIH-REQ-MAT-001 | Her materyal görev, kaynak türü, özgün dosya özeti, MIME türü, boyut, alınma zamanı ve doğrulama durumu taşır | P0 | Materyaller | `Material` | Şema + birim testi | Test çıktısı |
| MIH-REQ-MAT-002 | Özgün dosya üzerine yazılmaz; yeniden adlandırma/dönüştürme özgün kaynağı kaybetmez | P0 | Materyaller | `Material`, `DerivedArtifact` | Entegrasyon testi: özet değişmezliği | Özet karşılaştırma çıktısı |
| MIH-REQ-MAT-003 | Aynı dosyanın tekrar eklenmesi yinelenen kayıt veya açık yeni sürüm ilişkisi olarak belirlenir | P1 | Materyaller | `Material.duplicateOf` / `supersedes` | Birim testi | Birim test çıktısı |
| MIH-REQ-MAT-004 | Beklenen materyal ve teslim alınan materyal ayrı envanterlerdir | P0 | Yeni Görevlendirme, Materyaller | `ExpectedMaterial`, `Material` | Entegrasyon testi | Test çıktısı, ekran görüntüsü |
| MIH-REQ-MAT-005 | Materyal durumları: bekleniyor, alındı, doğrulandı, sorunlu, yinelenen | P0 | Materyaller | `Material.status` | Durum makinesi testi | Test çıktısı |
| MIH-REQ-MAT-006 | Kaynak belgenin hangi rapor/kanıt kayıtlarınca kullanıldığı izlenebilir | P1 | Materyaller, Tek Rapor | `EvidenceRef.materialId` | İzlenebilirlik entegrasyon testi | Test çıktısı |

### 3.5 Ses kaydı ve zaman ekseni

| Kimlik | Gereksinim | Öncelik | Ekran / akış | Alan modeli | Test | Kabul kanıtı |
|---|---|---|---|---|---|---|
| MIH-REQ-AUD-001 | Orijinal ses hiçbir araç tarafından değiştirilmez | P0 | Ses ve Transkript | `AudioRecord`, `DerivedArtifact` | Özet değişmezliği testi | Özet karşılaştırma çıktısı |
| MIH-REQ-AUD-002 | Segment zamanları gerçek kaydın zaman ekseniyle uyumludur; ortak birim (ms) kullanılır | P0 | Ses ve Transkript | `TranscriptSegment.startMs/endMs`, `AudioRecord.durationMs` | Birim testi: zaman sınırı doğrulaması | Test çıktısı |
| MIH-REQ-AUD-003 | Oynatma, imleç, dalga biçimi ve segment seçimi aynı zaman eksenini kullanır | P0 | Ses ve Transkript | `AudioRecord`, `TranscriptSegment` | Entegrasyon/uçtan uca testi | Ekran görüntüsü, uçtan uca test çıktısı |
| MIH-REQ-AUD-004 | Konuşmacı A/B etiketleri yalnızca kayıt içi anonim gruplardır; kimlik tespiti değildir | P0 | Ses ve Transkript | `TranscriptSegment.speakerLabel` | Arayüz metni denetimi + birim testi | Ekran görüntüsü, test çıktısı |
| MIH-REQ-AUD-005 | Gürültü azaltma/kanal ayrımı geri alınabilir türetilmiş kopyada çalışır; parametre ve işlem izi saklanır | P2 | Ses Araçları | `DerivedArtifact`, `ProcessingJob` | Entegrasyon testi (sonraki aşama) | Sınırlama belgesi; dilim dışı işaretleme |
| MIH-REQ-AUD-006 | Doğrulanmamış ses aracı devre dışı veya açıkça "test bekliyor" gösterilir | P0 | Ses Araçları | `EngineProfile.status` | Arayüz denetim testi | Ekran görüntüsü |

### 3.6 Transkript sürümleri ve düzeltme

| Kimlik | Gereksinim | Öncelik | Ekran / akış | Alan modeli | Test | Kabul kanıtı |
|---|---|---|---|---|---|---|
| MIH-REQ-TRN-001 | ASR çıktısı ham ve salt okunur bir sürüm olarak saklanır | P0 | Ses ve Transkript | `TranscriptVersion` (kind: `raw-asr`) | Birim testi: ham sürüm değiştirilemez | Test çıktısı |
| MIH-REQ-TRN-002 | Uzmanın metin düzeltmesi yeni bir revizyon oluşturur; ham ASR silinmez | P0 | Ses ve Transkript | `TranscriptVersion` (kind: `human-correction`) | Entegrasyon testi: iki sürüm ayrı | Test çıktısı, ekran görüntüsü |
| MIH-REQ-TRN-003 | Transkript sürümleri değiştirilemez geçmiş olarak tutulur | P0 | Ses ve Transkript | `TranscriptVersion` (immutable) | Birim testi: geçmiş sürüm güncellenemez | Test çıktısı |
| MIH-REQ-TRN-004 | Segmentler başlangıç/bitiş zamanı ve kaynak kayıt kimliğiyle bağlıdır | P0 | Ses ve Transkript | `TranscriptSegment.audioRecordId` | Şema testi | Test çıktısı |
| MIH-REQ-TRN-005 | Belirsiz duyulan kelime uydurulmaz; anlaşılmayan konuşma açıkça işaretlenir | P0 | Ses ve Transkript | `TranscriptSegment.uncertain` | Birim testi + arayüz denetimi | Test çıktısı, ekran görüntüsü |
| MIH-REQ-TRN-006 | Serbest LLM transkripsiyon kelimesinin kaynağı değildir | P0 | Ses ve Transkript, Ayarlar | `TranscriptVersion.source` | Arayüz metni + birim testi | Test çıktısı |
| MIH-REQ-TRN-007 | İnceleme durumu, belirsizlik ve öncelik nedeni ayrı alanlardır; filtreler bağımsız çalışır | P1 | Ses ve Transkript | `reviewState`, `uncertainty`, `priorityReason` | Birim testi: filtre bağımsızlığı | Test çıktısı |

### 3.7 Sorular, yanıtlar, dayanaklar ve bulgular

| Kimlik | Gereksinim | Öncelik | Ekran / akış | Alan modeli | Test | Kabul kanıtı |
|---|---|---|---|---|---|---|
| MIH-REQ-QST-001 | Her soru bir göreve bağlıdır ve sırası vardır | P0 | Sorular ve Bulgular | `Question` | Şema testi | Test çıktısı |
| MIH-REQ-QST-002 | Her yanıt yanıtlayan uzmanı, durumunu, sürümünü ve dayanaklarını taşır | P0 | Sorular ve Bulgular | `Answer` | Şema + birim testi | Test çıktısı |
| MIH-REQ-QST-003 | Dayanak yalnızca işaret değildir; belirli materyal, belge sayfası/alanı veya ses kaydı/segment/zaman aralığına referans verir | P0 | Sorular ve Bulgular | `EvidenceRef` | Birim testi: hedefsiz dayanak reddi | Test çıktısı |
| MIH-REQ-QST-004 | İki farklı kayıttan somut dayanak referansı bağlanabilir | P0 | Sorular ve Bulgular | `EvidenceRef.audioRecordId` | Entegrasyon testi (altın senaryo) | Test çıktısı, ekran görüntüsü |
| MIH-REQ-QST-005 | Bulgu; açıklama, önem/durum, kaynak dayanakları ve ilgili sorularla bağ kurar | P0 | Sorular ve Bulgular | `Finding`, `FindingEvidence` | Şema + entegrasyon testi | Test çıktısı |
| MIH-REQ-QST-006 | Kanıtsız bulgu üretimi kabul edilmez | P0 | Sorular ve Bulgular, Tek Rapor | `Finding` doğrulaması | Negatif test: dayanaksız bulgu reddi | Negatif test çıktısı |
| MIH-REQ-QST-007 | Değiştirilen yanıt veya dayanak rapora yansıyan sürümü belirgin biçimde günceller | P0 | Sorular ve Bulgular, Tek Rapor | `ReportRevision` | Entegrasyon testi: yanıt değişikliği rapor revizyonu üretir | Test çıktısı |

### 3.8 Tek kanonik rapor ve çıktılar

| Kimlik | Gereksinim | Öncelik | Ekran / akış | Alan modeli | Test | Kabul kanıtı |
|---|---|---|---|---|---|---|
| MIH-REQ-RPT-001 | Her görev için tek kanonik `ReportDocument` bulunur | P0 | Tek Rapor | `ReportDocument` | Birim testi: görev başına tek rapor | Test çıktısı |
| MIH-REQ-RPT-002 | A4 önizleme, DOCX/ODT/PDF çıktısı ve kalite kontrolü aynı sürümlü modelden üretilir | P0 | Tek Rapor | `ReportDocument`, `ReportRevision` | Entegrasyon testi: önizleme ve DOCX aynı veriden | Test çıktısı |
| MIH-REQ-RPT-003 | Önizlemede görünen veriyle dışa aktarılan dosya tutarlı olmalıdır | P0 | Tek Rapor | `ReportDocument` | Entegrasyon testi: içerik karşılaştırması | Karşılaştırma çıktısı |
| MIH-REQ-RPT-004 | Rapor bölümleri: görevlendirme/kapsam, materyal envanteri ve yöntem, kayıt bazında transkript ekleri, sorular ve yanıtlar, bulgular ve dayanaklar, sonuç, sürüm/oluşturma/ek listesi | P0 | Tek Rapor | `ReportDocument` bölümleri | Entegrasyon testi: tüm bölümler dolu | DOCX içerik testi |
| MIH-REQ-RPT-005 | Uzman eksik alanları tamamlamadan uygulama raporu tamamlanmış gibi işaretleyemez | P0 | Tek Rapor | `ReportDocument.status` | Negatif test: eksik rapor tamamlanamaz | Negatif test çıktısı |
| MIH-REQ-RPT-006 | İlk teslimatta gerçek ve açılabilir DOCX üretimi zorunludur | P0 | Tek Rapor | DOCX adaptörü | DOCX açma + içerik testi | Açılabilir DOCX dosyası |
| MIH-REQ-RPT-007 | DOCX Microsoft Word veya uyumlu görüntüleyicide açılır; sayfa düzeni ve Türkçe karakterler doğrulanır | P0 | Tek Rapor | DOCX adaptörü | LibreOffice/Word açma + PDF dönüştürme testi | DOCX sayfa görüntüsü / doğrulama kaydı |
| MIH-REQ-RPT-008 | Rapor sürümü hangi soru/yanıt/dayanak/transkript/materyal sürümlerini kullandığını gösterir | P0 | Tek Rapor, Revizyon geçmişi | `ReportRevision.sourceVersions` | Entegrasyon testi | Test çıktısı |
| MIH-REQ-RPT-009 | Ekler aynı rapor paketine bağlıdır; kaynak ve zaman bağı korunur | P1 | Tek Rapor | `ReportAppendix` | Entegrasyon testi | Test çıktısı |
| MIH-REQ-RPT-010 | ODT/PDF biçimleri mimaride düşünülür; ilk dikey dilimin zorunlu teslimatı DOCX'tir | P2 | Tek Rapor | Çıktı adaptör arayüzü | Mimari denetim | ADR + sınırlama belgesi |

### 3.9 Kalite ve denetim

| Kimlik | Gereksinim | Öncelik | Ekran / akış | Alan modeli | Test | Kabul kanıtı |
|---|---|---|---|---|---|---|
| MIH-REQ-QLT-001 | Otomatik kontroller görev, materyal, transkript, dayanak, yanıt ve çıktı verisinden hesaplanır | P0 | Tek Rapor | `QualityCheck` | Birim testi: kontrol gerçek veriden türer | Test çıktısı |
| MIH-REQ-QLT-002 | Kanıtlanmayan kontrol otomatik geçti sayılmaz | P0 | Tek Rapor | `QualityCheck.status` | Negatif test | Negatif test çıktısı |
| MIH-REQ-QLT-003 | İnsan onayı ayrı olay ve kullanıcı bilgisiyle kaydedilir | P0 | Tek Rapor | `ApprovalEvent`, `AuditEvent` | Entegrasyon testi | Test çıktısı |
| MIH-REQ-QLT-004 | Otomatik testin geçmesi uzman onayı anlamına gelmez | P0 | Tek Rapor | `ApprovalEvent` | Arayüz denetimi + test | Ekran görüntüsü, test çıktısı |
| MIH-REQ-QLT-005 | Kalite modeli üç katmanda ele alınır: A uzman görev/rapor kontrolü, B bağımsız inceleme paketi, C ürün kalite dosyası | P1 | Test Geçmişi, Tek Rapor | Katman A dilim içi; B/C belge | Belge denetimi + A katmanı testi | Katman belgesi, test çıktısı |
| MIH-REQ-QLT-006 | İlk teslimatta bağımsız denetçi portalı zorunlu değildir; sonraki aşama sınırı belgelenir | P2 | Test Geçmişi | — | Belge denetimi | Sınırlama belgesi |

### 3.10 Arka plan işleri

| Kimlik | Gereksinim | Öncelik | Ekran / akış | Alan modeli | Test | Kabul kanıtı |
|---|---|---|---|---|---|---|
| MIH-REQ-JOB-001 | Uzun işlemler kalıcı iş kuyruğunda yürütülür | P0 | Materyaller, Ses, Tek Rapor | `ProcessingJob`, kuyruk | Entegrasyon testi | Test çıktısı |
| MIH-REQ-JOB-002 | Kuyruk bekliyor, çalışıyor, tamamlandı, uyarıyla tamamlandı, başarısız, iptal edildi, yeniden deneme bekliyor durumlarını ayırt eder | P0 | İş durumu görünümleri | `ProcessingJob.status` | Durum makinesi testi | Test çıktısı |
| MIH-REQ-JOB-003 | İptal ve yeniden deneme desteklenir; aynı işin iki kez uygulanmasını engelleyen idempotency tanımlanır | P0 | İş durumu görünümleri | `ProcessingJob.idempotencyKey` | Entegrasyon testi: çift tetikleme | Test çıktısı |
| MIH-REQ-JOB-004 | İptal ve hata özgün dosya veya önceki başarılı çıktıları silmez | P0 | İş durumu görünümleri | `ProcessingJob` | Negatif test | Negatif test çıktısı |
| MIH-REQ-JOB-005 | Hata, bekleme, iptal, yeniden deneme ve boş durum görünümleri tasarlanır | P0 | Tüm ilgili ekranlar | Arayüz durum bileşenleri | Uçtan uca + görsel test | Ekran görüntüleri |

### 3.11 Güvenlik ve mahremiyet

| Kimlik | Gereksinim | Öncelik | Ekran / akış | Alan modeli | Test | Kabul kanıtı |
|---|---|---|---|---|---|---|
| MIH-REQ-SEC-001 | Yerel kasa sır ve hassas anahtarları güvenli saklama gereksinimlerine uygun korur | P1 | Kasa ve Güvenlik | Kasa adaptörü | Kasa entegrasyon testi | Test çıktısı, sınırlama belgesi |
| MIH-REQ-SEC-002 | Orijinal dosyaların özeti alınır; bütünlük kontrolü ve dışa aktarma kayıtları tutulur | P0 | Materyaller, Tek Rapor | `AuditEvent` | Entegrasyon testi | Test çıktısı |
| MIH-REQ-SEC-003 | Kullanıcı verisi veya sırları loglanmaz | P0 | Tüm akışlar | Log adaptörü | Negatif test: log içeriğinde sır yok | Negatif test çıktısı |
| MIH-REQ-SEC-004 | Ağ servisi kullanılacaksa açıkça belirtilir; veri aktarımı kullanıcı izni gerektirir | P1 | Ayarlar | `EngineProfile`, izin kaydı | Birim testi | Test çıktısı |

### 3.12 Sentetik veri

| Kimlik | Gereksinim | Öncelik | Ekran / akış | Alan modeli | Test | Kabul kanıtı |
|---|---|---|---|---|---|---|
| MIH-REQ-SNT-001 | Geliştirme ve otomatik testlerde gerçek kişi, dava, ses veya bilirkişi raporu verisi kullanılmaz | P0 | Tüm veri katmanı | Tüm varlıklar | Sabit test verisi (fixture) denetim testi | Fixture denetim çıktısı |
| MIH-REQ-SNT-002 | Arayüzde, A4 önizlemede ve DOCX çıktısında "SENTETİK ÖRNEK — RESMÎ BELGE DEĞİLDİR" ibaresi görünür | P0 | Tüm ekranlar, A4, DOCX | `ReportDocument.watermark` | Görsel + DOCX içerik testi | Ekran görüntüsü, DOCX metin doğrulaması |
| MIH-REQ-SNT-003 | Belge, arayüz ve dışa aktarılan DOCX açıkça sentetik olarak işaretlenir | P0 | Yeni Görevlendirme, Tek Rapor | `Task.synthetic` | Entegrasyon testi | Test çıktısı |

### 3.13 Erişilebilirlik ve okunabilirlik

| Kimlik | Gereksinim | Öncelik | Ekran / akış | Alan modeli | Test | Kabul kanıtı |
|---|---|---|---|---|---|---|
| MIH-REQ-A11Y-001 | Tüm kontroller klavyeyle kullanılır; odak sırası ve görünür odak korunur | P0 | Tüm ekranlar | Arayüz bileşenleri | Klavye erişilebilirlik testi | Test çıktısı, ekran görüntüsü |
| MIH-REQ-A11Y-002 | Sekmeler ve sekme panelleri uygun erişilebilirlik ilişkilerine sahiptir; ok tuşlarıyla gezinme çalışır | P0 | Görev çalışma alanı | Arayüz bileşenleri | Erişilebilirlik testi (rol/aria) | Test çıktısı |
| MIH-REQ-A11Y-003 | Türkçe içerik, yüzde 200 yakınlaştırma ve dar ekranlarda okunabilir olmalıdır | P0 | Tüm ekranlar | Biçem katmanı | Görsel test: %200 yakınlaştırma ve dar ekran | Ekran görüntüleri |
| MIH-REQ-A11Y-004 | Metin boyutları okunabilir düzeyde tutulur (7–10 px metin kullanılmaz) | P0 | Tüm ekranlar | Biçem katmanı | Biçem denetim testi | Denetim çıktısı |
| MIH-REQ-A11Y-005 | Görünen klavye kısayolu (⌘K/⌃K) gerçekten çalışır veya gösterilmez | P1 | Üst çubuk genel arama | Arayüz kısayol katmanı | Uçtan uca test | Test çıktısı |
| MIH-REQ-A11Y-006 | Arama kapsamı doğru adlandırılır; görev, materyal, transkript ve dosya referanslarında gerçek arama sunulur | P1 | Üst çubuk genel arama | Arama kullanım senaryosu | Uçtan uca test | Test çıktısı |
| MIH-REQ-A11Y-007 | Erişilebilirlik hedef düzeyi ve test matrisi tanımlanır | P1 | — | — | Belge denetimi | ADR-00n (erişilebilirlik hedefi) |

### 3.14 Dil ilkesi

| Kimlik | Gereksinim | Öncelik | Ekran / akış | Alan modeli | Test | Kabul kanıtı |
|---|---|---|---|---|---|---|
| MIH-REQ-DIL-001 | README, ürün belgeleri, iş kayıtları, çekme isteği metinleri, ADR'ler, commit mesajları ve kullanıcıya görünen metinler Türkçedir | P0 | Tüm belgeler, tüm ekranlar | — | Belge/arayüz metin denetimi | Denetim çıktısı |
| MIH-REQ-DIL-002 | Kaynak kodla eşleşen teknik tanımlayıcılar çevrilmez (`ReportDocument`, `taskId`, OCR, ASR, DOCX, Tauri vb.) | P0 | Kaynak kod | — | Statik denetim testi | Denetim çıktısı |
| MIH-REQ-DIL-003 | İngilizce metinler gereksiz yere proje belgelerine taşınmaz | P0 | Tüm belgeler | — | Belge denetimi | Denetim çıktısı |

## 4. Kabul ölçütü eşlemesi

Sözleşmedeki K-01 … K-12 kabul ölçütlerinin gereksinimlere eşlemesi:

| Kabul ölçütü | İlgili gereksinimler |
|---|---|
| K-01 Yeni görev taslağı benzersiz kimlikle oluşur; kaynak belge bilgisi kaybolmaz | MIH-REQ-TSK-004, MIH-REQ-DOC-001, MIH-REQ-MAT-002 |
| K-02 İki görev arasında veri sızmaz | MIH-REQ-TSK-001, MIH-REQ-TSK-002, MIH-REQ-TSK-003, MIH-REQ-TSK-007 |
| K-03 Beklenen ve alınan materyal listeleri ayrı çalışır | MIH-REQ-MAT-004, MIH-REQ-TSK-005 |
| K-04 Orijinal ses/dosya değişmez; türetilmiş çıktı kaynağına bağlıdır | MIH-REQ-MAT-002, MIH-REQ-AUD-001, MIH-REQ-AUD-005 |
| K-05 Ham ASR ile insan düzeltmesi ayrı ve sürümlüdür | MIH-REQ-TRN-001, MIH-REQ-TRN-002, MIH-REQ-TRN-003 |
| K-06 Segment zamanları gerçek kaydın zaman ekseniyle uyumludur | MIH-REQ-AUD-002, MIH-REQ-AUD-003, MIH-REQ-TRN-004 |
| K-07 Sorular, yanıtlar, bulgular ve `EvidenceRef` ilişkileri izlenebilir | MIH-REQ-QST-001 … MIH-REQ-QST-007 |
| K-08 Tek `ReportDocument` bütün rapor görünüm ve çıktılarını besler | MIH-REQ-RPT-001, MIH-REQ-RPT-002, MIH-REQ-RPT-003 |
| K-09 Üretilen DOCX açılır; sayfa düzeni ve Türkçe karakterler doğrulanır | MIH-REQ-RPT-006, MIH-REQ-RPT-007 |
| K-10 Kalite kontrolleri eksik gerçek veriyi doğru biçimde engeller/uyarır | MIH-REQ-QLT-001, MIH-REQ-QLT-002, MIH-REQ-RPT-005 |
| K-11 Kritik akışlar klavyeyle çalışır ve otomatik test edilir | MIH-REQ-A11Y-001, MIH-REQ-A11Y-002, MIH-REQ-A11Y-005 |
| K-12 Test, hata, iptal, yeniden deneme ve kurtarma kanıtları saklanır | MIH-REQ-JOB-001 … MIH-REQ-JOB-005, MIH-REQ-PLT-004 |

## 5. Öncelik gerekçeleri

**P0 — İlk rapor odaklı dikey dilimin çekirdeği.** Bu gereksinimler karşılanmadan "sentetik görevden açılabilir DOCX rapora" zinciri kurulamaz veya zincir yanlış sonuç üretir. Örnek: görev yalıtımı (MIH-REQ-TSK-002) karşılanmazsa rapor başka görevin verisini içerebilir; bu ürün kabulüne aykırıdır.

**P1 — İlk teslimatın ürün kabulü için gerekli.** Dilim çalışır duruma geldikten sonra aynı teslimatta karşılanması beklenen, ancak dilimin ilk iskeletini engellemeyen gereksinimler. Örnek: genel arama kapsamı (MIH-REQ-A11Y-006), kaynak kullanım izlenebilirliği (MIH-REQ-MAT-006).

**P2 — Sonraki aşamaya taşınabilir.** İlk dilimde üretime hazır gösterilmemesi gereken, ancak mimari sınırı ve açık kararı belgelenmesi zorunlu konular. Örnek: ses iyileştirme araçları (MIH-REQ-AUD-005), bağımsız denetçi portalı (MIH-REQ-QLT-006), ODT/PDF çıktı biçimleri (MIH-REQ-RPT-010).

P2 gereksinimler ilk dilimde **çalışan özellik gibi sunulmaz**; arayüzde devre dışı veya "test bekliyor" durumunda gösterilir (MIH-REQ-DOC-004, MIH-REQ-AUD-006).

## 6. İzlenebilirlik denetimi

- Matriste tanımlı her gereksinim en az bir ekran/akışa ve en az bir teste bağlıdır.
- Alan modeli bağlantıları `docs/05-alan-modeli-ve-durum-makineleri.md` içindeki varlık listesiyle tutarlıdır.
- Test kimlikleri `docs/08-ilk-teslimat-is-listesi.md` içindeki iş kalemlerine bağlanır.
- Sözleşmede tanımlı ancak bu matriste yer almayan bir gereksinim kalmamalıdır. Sözleşme bölüm eşlemesi: bölüm 2 → PLT/DIL, bölüm 4 → TSK/A11Y, bölüm 5.1 → TSK/DOC/MAT, bölüm 5.2 → MAT, bölüm 5.3 → DOC/JOB, bölüm 5.4 → AUD/TRN, bölüm 5.5 → QST, bölüm 5.6 → RPT, bölüm 5.7 → QLT, bölüm 7 → durum makineleri, bölüm 8 → SEC/SNT, bölüm 9 → QLT/RPT, bölüm 11 → A11Y, bölüm 12 → SNT, bölüm 13 → kabul eşlemesi.
