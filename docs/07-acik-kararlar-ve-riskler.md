# Açık kararlar, varsayımlar ve riskler

**Belge durumu:** Taslak — proje sahibi gözden geçirmesi bekleniyor
**Bağlı iş kaydı:** #1
**İlgili belgeler:** `docs/06-mimari-karar-kayitlari.md`, `docs/07-acik-kararlar-ve-riskler.md`

> Bu belgedeki maddeler **karar değildir**. Her madde, proje sahibinin veya teknik sorumlunun açık onayını bekleyen bir açık karardır. Bir madde onaylanmadan "kesinleşti" sayılmaz. Hiçbir varsayım karar gibi sunulmaz.

## 1. Onay bekleyen açık kararlar

Sözleşme bölüm 15'te sayılan konular ve uygulama sırasında ortaya çıkan ek konular:

| No | Açık karar | Neden gerekli | Öneri (onay bekler) | Etkilenen gereksinimler | Karar sahibi | Durum |
|---|---|---|---|---|---|---|
| AK-01 | Masaüstü kabuğu ve teknoloji yığını | Tauri/Electron/Node seçimi paketleme, CI ve dağıtımı belirler | ADR-001: TS çekirdek + Node çalıştırıcı, Tauri paketleme sonraki aşama | MIH-REQ-PLT-001, MIH-REQ-PLT-005 | Proje sahibi + teknik sorumlu | Açık |
| AK-02 | Yerel veri tabanı ve şifreli kasa seçimi | Veri bütünlüğü, yalıtım ve sır saklama mimarisini belirler | ADR-003: SQLite (WAL); kasa ayrı karar | MIH-REQ-SEC-001, MIH-REQ-TSK-001 | Teknik sorumlu | Açık |
| AK-03 | OCR motorunun lisans, dil ve çevrim dışı koşulları | İlk dilimde yok; sonraki aşama kapsamını ve dağıtımı belirler | Sonraki aşamada motor profili doğrulamasıyla | MIH-REQ-DOC-002, MIH-REQ-DOC-004 | Proje sahibi | Açık |
| AK-04 | ASR modelinin lisans, dil ve çevrim dışı koşulları | Transkript üretim yolu ve model sürümü izlenebilirliğini belirler | Sonraki aşama; `EngineProfile` ile sürüm izlenir | MIH-REQ-TRN-001, MIH-REQ-TRN-006 | Proje sahibi | Açık |
| AK-05 | Ses dosyası ve türetilmiş kopya biçimleri | Depolama hacmi, geri alınabilirlik ve bütünlük izini belirler | Orijinal biçim korunur; türetilmiş çıktı ayrı dosya + özet | MIH-REQ-AUD-001, MIH-REQ-AUD-005 | Teknik sorumlu | Açık |
| AK-06 | Rapor şablonu ve DOCX doğrulama platformları | Sayfa düzeni kanıtının hangi görüntüleyiciyle verileceğini belirler | ADR-004: LibreOffice ile doğrulama; Word ayrıca doğrulanmalı notu | MIH-REQ-RPT-007 | Proje sahibi | Açık |
| AK-07 | Yedekleme, geri yükleme ve denetim kaydı saklama süresi | Veri kaybı riskini ve mahremiyet süresini belirler | İlk dilimde dışa aktarma + bütünlük özeti; politika sonraki aşama | MIH-REQ-SEC-002, MIH-REQ-PLT-004 | Proje sahibi | Açık |
| AK-08 | Bağımsız denetim paketi için sonraki aşama sınırı | Katman B kapsamını belirler | İlk dilimde yalnızca salt okunur paket fikri belgelenir | MIH-REQ-QLT-005, MIH-REQ-QLT-006 | Proje sahibi | Açık |
| AK-09 | Erişilebilirlik hedef düzeyi ve test matrisi | "Yeterince erişilebilir" kararını nesnelleştirir | ADR-008: WCAG 2.2 AA, otomatik + klavye testleri | MIH-REQ-A11Y-001 … 007 | Proje sahibi | Açık |
| AK-10 | `EvidenceRef` veri modeli: ayrık sütun mu, polimorfik hedef mi | Şema, sorgu ve doğrulama biçimini belirler | Ayrık hedef türü + zorunlu hedef kimliği; doğrulama iş kuralıyla | MIH-REQ-QST-003 | Teknik sorumlu | Açık |
| AK-11 | `ReportDocument` içeriğinin yapısal bölüm modeli mi, düzenlenebilir zengin metin mi | Rapor düzenleme deneyimini ve DOCX eşlemesini belirler | Yapısal bölüm modeli; serbest metin yalnızca ilgili bölüm içinde | MIH-REQ-RPT-004 | Proje sahibi | Açık |
| AK-12 | Rapor imza ve resmî teslim akışının kapsamı | "İmza" iddiası üretmemek için sınır gerekir | İlk dilimde imza alanı yalnızca görsel; e-imza yok | MIH-REQ-RPT-005, MIH-REQ-QLT-003 | Proje sahibi | Açık |
| AK-13 | Altın sentetik senaryonun hangi görevlendirme türünü temsil edeceği | Örnek içeriğin ürünü yanlış yönlendirmemesi için gerekir | Tarafsız, uydurma merci ve kişi adı içermeyen sentetik tür | MIH-REQ-SNT-001, MIH-REQ-SNT-002 | Proje sahibi | Açık |
| AK-14 | Genel arama kapsamının ilk dilimdeki sınırı | Görünen kısayol ve arama vaadinin doğru olması için gerekir | İlk dilimde görev + materyal + transkript metni araması | MIH-REQ-A11Y-005, MIH-REQ-A11Y-006 | Proje sahibi | Açık |
| AK-15 | Çok kullanıcı ve merkezi yönetim için veri/yetki sınırı | Sonraki aşama mimarisini belirler | İlk dilimde tek uzman, yerel; yetki modeli sonraki aşama | MIH-REQ-TSK-007 | Proje sahibi | Açık |
| AK-16 | Mevcut Rust/SEDA/kasa kodunun aktarımı | İki kanalın bağımsızlığını korurken yeniden kullanım kararı | Aktarım yok; gerekirse ayrı entegrasyon kararı | MIH-REQ-PLT-001 | Proje sahibi | Açık |

## 2. Uygulama sırasında doğan teknik açık kararlar

| No | Konu | Neden | Geçici uygulama (varsayım değil, ilk dilim kararı) | Kalıcı karar bekler |
|---|---|---|---|---|
| AK-17 | Büyük ses dosyalarında özet (sha256) hesabı | Bellek tüketimi | Akış (streaming) ile parça parça hesaplama | AK-05 |
| AK-18 | `TranscriptSegment` düzeltme geçmişinin ayrı tablo gerektirip gerektirmemesi | Denetim izi derinliği | Sürüm düzeyinde geçmiş; segment düzeyinde yalnızca durum | AK-11 |
| AK-19 | Arayüzün ayrı süreç mi, aynı süreç mi çalışacağı | Paketleme ve güvenlik yüzeyi | İlk dilimde aynı süreçte yerel servis (yalnızca `127.0.0.1`) | AK-01 |
| AK-20 | Test çıktılarının (DOCX, ekran görüntüsü, PDF) depoda tutulup tutulmayacağı | Depo boyutu ve kanıt erişilebilirliği | Kanıtlar `evidence/` altında sürümlenir; büyük ara çıktılar üretimde oluşturulur | AK-07 |

## 3. Risk listesi

| No | Risk | Olasılık | Etki | Azaltma | İlgili ADR |
|---|---|---|---|---|---|
| R-01 | Görev yalıtımı arayüz düzeyinde kalır, veri sızıntısı sürer | Orta | Yüksek | Yalıtım veri katmanında zorunlu; negatif testler CI'da | ADR-006 |
| R-02 | Önizleme ile DOCX içeriği ayrışır | Orta | Yüksek | Tek `ReportDocument` → tek görünüm modeli; karşılaştırma testi | ADR-005 |
| R-03 | DOCX Word'de açılır ama düzen bozulur | Düşük-Orta | Orta | LibreOffice doğrulaması + Word sınırı belgelenir | ADR-004 |
| R-04 | Türkçe karakterler DOCX'te bozulur | Düşük | Yüksek | Karakter testi; uygun font seçimi | ADR-004 |
| R-05 | Uzun iş sırasında uygulama kapanır, durum kaybolur | Orta | Orta | Kalıcı kuyruk + açılışta kurtarma | ADR-007 |
| R-06 | Kalite kontrolleri gerçek veriden türemez, sahte tamamlanma üretir | Orta | Yüksek | Kontroller yalnızca gerçek veriden; negatif testler | MIH-REQ-QLT-001 |
| R-07 | Erişilebilirlik hedefi belirsiz kalır, denetim öznel olur | Orta | Orta | ADR-008 ile hedef ve matris sabitlenir | ADR-008 |
| R-08 | Sentetik uyarı arayüzde kalır ama DOCX'te kaybolur | Orta | Yüksek | DOCX içerik testi uyarıyı doğrular | MIH-REQ-SNT-002 |
| R-09 | Kapsam genişler, rapor dilimi tamamlanamaz | Orta | Yüksek | ADR-012: ilk dilim ekran kapsamı sabit | ADR-012 |
| R-10 | Devre dışı kontroller ürünü eksik gösterir | Yüksek | Düşük | Her devre dışı öğe için gerekçe ve yol haritası bağlantısı | ADR-011 |
| R-11 | Gerçek veri yanlışlıkla test verisine karışır | Düşük | Yüksek | Sentetik fixture denetimi; gerçek veri yasağı testi | MIH-REQ-SNT-001 |
| R-12 | SQLite dosyası bozulur veya kopyalanır | Düşük-Orta | Orta | Bütünlük özeti, dışa aktarma, yedekleme kararı | ADR-003, AK-07 |
| R-13 | Node yerleşik SQLite API'si değişir | Düşük | Orta | Depo adaptörü arayüzü sabit; uygulama değiştirilebilir | ADR-003 |
| R-14 | İki geliştirme kanalı karışır | Düşük | Yüksek | `mihenk` deposuna dokunulmaz; kod kopyalanmaz | Talimat bölüm 4 |

## 4. Sözleşmede belirsiz veya çelişkili bulunan noktalar

Aşağıdaki noktalar, uygulama sırasında yorum gerektirdiği için açık karar listesine taşınmıştır:

1. **"Tek rapor" ve "ekler" ilişkisi.** Sözleşme tek `ReportDocument` ve aynı pakette ekler der; eklerin rapor gövdesinde mi yoksa ayrı dosyalarda mı yer alacağı belirsizdir. Öneri: ekler model içinde `ReportAppendix` olarak tutulur, DOCX içinde rapor sonunda bölüm olarak yer alır (AK-11).
2. **İnsan onayının kapsamı.** Sözleşme onayın ayrı kaydedilmesini ister; onayın rapor düzeyinde mi, bölüm düzeyinde mi olacağı belirsizdir. Öneri: ilk dilimde rapor düzeyinde tek onay olayı (AK-12).
3. **`EvidenceRef` hedef modeli.** Denetim raporu dayanağın belge sayfası/alanı veya ses segmenti/zaman aralığı olmasını ister; iki hedefin tek tabloda mı yoksa ayrı tablolarda mı tutulacağı belirsizdir (AK-10).
4. **Konuşmacı etiketlerinin yeniden adlandırılması.** Anonim A/B etiketlerinin kullanıcı tarafından yeniden adlandırılıp adlandırılamayacağı belirsizdir. Öneri: etiketler yalnızca kayıt içi sıra numarasıdır; serbest ad girişi kimlik izlenimi vermemek için ilk dilimde yoktur.
5. **Kalite katmanı B'nin ilk dilimde görünürlüğü.** Portal zorunlu değildir; ancak arayüzde "bağımsız inceleme" ifadesinin görünüp görünmeyeceği belirsizdir. Öneri: ilk dilimde katman B yalnızca belge olarak tanımlanır; arayüzde etkin özellik olarak sunulmaz (AK-08).
6. **"UYAP'a hazır" beyanı.** Gerçek kabul testi olmadan bu ifade kullanılmaz; ifadenin hangi kabul testiyle verilebileceği tanımlı değildir. Öneri: ilk dilimde bu ifade hiçbir yerde kullanılmaz.

## 5. Varsayım yasağı

Bu belgede yer alan hiçbir öneri, proje sahibi onayı olmadan ürün kararı olarak sunulmaz. Uygulama sırasında bir gereksinim belirsiz kalırsa:

1. Uygulama o noktada **en güvenli** davranışı seçer (veri üretmez, tahmin etmez, tamamlanmış gösterme).
2. Belirsizlik arayüzde ve belgede açıkça yazılır.
3. Açık karar listesine yeni madde eklenir.
4. Proje sahibine sunulur.
