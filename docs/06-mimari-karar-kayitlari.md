# Mimari Karar Kayıtları (ADR)

**Belge durumu:** Öneri — proje sahibi/teknik sorumlu onayı bekleniyor
**Bağlı iş kaydı:** #1
**İlgili belgeler:** `docs/05-alan-modeli-ve-durum-makineleri.md`, `docs/07-acik-kararlar-ve-riskler.md`, `docs/08-ilk-teslimat-is-listesi.md`

> Sözleşme bölüm 10, teknoloji seçiminin karar kaydıyla kesinleşmesini ister ve tek bir yığını önceden onaylamaz. Aşağıdaki kayıtlar öneri niteliğindedir. **ADR-001, ADR-003, ADR-004 ve ADR-008 proje sahibi onayı gerektirir;** ilk dikey dilim bu öneriler üzerine kurulmuştur ve onay gelmezse değiştirilebilir biçimde tasarlanmıştır.

Durum değerleri: `Önerildi`, `Kabul edildi`, `Reddedildi`, `Yerine yenisi geçti`.

---

## ADR-001 — Masaüstü kabuğu ve teknoloji yığını

**Durum:** Önerildi — onay bekliyor
**Tarih:** 15 Kasım 2026
**İlgili gereksinimler:** MIH-REQ-PLT-001, MIH-REQ-PLT-002, MIH-REQ-PLT-005

### Bağlam

Ürün, bilirkişinin yerel cihazında çalışan, görev bazında yalıtılmış, kaynak izi tutan ve gerçek DOCX üretebilen bir masaüstü uygulamasıdır. Arayüz referansı React/TypeScript tabanlı bir prototiptir (`MihenkStudio.tsx`, `studio.css`). Sözleşme mikro hizmet mimarisini ilk teslimat varsayılanı saymaz, ancak tek bir yığını da onaylamaz.

### Seçenekler

| Seçenek | Açıklama | Güçlü yön | Zayıf yön |
|---|---|---|---|
| A | Tauri 2 (Rust kabuk) + TypeScript çekirdek + web arayüzü | Küçük paket, yerel dosya/kasa erişimi, kabul edilmiş arayüzün doğrudan kullanımı | Rust derleme zinciri ve platform bağımlılıkları gerekir; CI karmaşıklığı artar |
| B | Electron + TypeScript çekirdek + web arayüzü | Tek dil (TypeScript), olgun ekosistem, hızlı ilerleme | Büyük paket boyutu, bellek tüketimi, yerel kasa için ayrı iş |
| C | Node yerel servis + web arayüzü (masaüstü kabuğu sonraki aşamada) | Aynı çekirdek kod her iki kabukla da çalışır; CI'da bağımlılık yok | "Tek masaüstü uygulaması" hedefi için paketleme adımı eksik |
| D | Tarayıcı tabanlı PWA | Kurulum kolaylığı | Yerel dosya/kasa ve yerel motor erişimi sınırlı; yerel öncelikli ilke zayıflar |

### Karar (öneri)

**C üzerinden A'ya geçiş yolu.** Çekirdek (alan modeli, uygulama kullanım senaryoları, altyapı adaptörleri) **TypeScript** ile, kabuk bağımsız biçimde yazılır. İlk dikey dilim bu çekirdeği **Node.js** üzerinde çalıştırır ve arayüzü yerel bir servis üzerinden besler. Masaüstü paketleme **Tauri 2** ile sonraki aşamada yapılır; Rust tarafı yalnızca dosya sistemi, kasa ve işletim sistemi köprüsüyle sınırlı tutulur.

### Gerekçe

1. Kabul edilmiş görsel referans zaten React/TypeScript'tir; arayüz dilini değiştirmek gereksiz yeniden yazım olur.
2. İlk teslimatın hedefi "baştan sona çalışan ve kanıtlanabilir rapor dilimi"dir; paketleme bu hedefin önüne geçmemelidir.
3. Tauri'ye geçiş, çekirdek kod değişmeden mümkündür; bu nedenle karar ertelenebilir ve geri döndürülebilir.
4. Rust/SEDA/kasa kodunun gelecekteki aktarımı için ayrı entegrasyon kararı gerekir (bkz. ADR-011).

### Sonuçlar

- Çekirdek hiçbir yerde Tauri/Electron API'sine doğrudan bağlanmaz; dosya, kasa, veri tabanı ve çıktı adaptörlerle erişilir.
- CI, Node çalıştırma ortamında tüm testleri çalıştırabilir.
- Masaüstü paketleme kabul testi (kurulum ve açılış) ilk dilimde zorunlu değildir; sonraki aşamada yapılır.

### Riskler

- **R1:** Proje sahibi Tauri'yi zorunlu kılarsa paketleme işi öne çekilir. *Azaltma:* adaptör sınırları sayesinde çekirdek korunur, yalnızca kabuk eklenir.
- **R2:** Node yerel servis, güvenlik yüzeyi açar (yerel port). *Azaltma:* servis yalnızca `127.0.0.1` üzerinde dinler, rastgele belirteçle korunur ve varsayılan olarak yalnızca aynı makineden erişilir.

---

## ADR-002 — Katmanlı mimari ve bağımlılık yönü

**Durum:** Önerildi
**İlgili gereksinimler:** MIH-REQ-PLT-001, MIH-REQ-TSK-001, MIH-REQ-TSK-002

### Bağlam

Sözleşme, arayüz, uygulama kullanım senaryoları, alan modeli ve altyapı adaptörlerinin ayrılmasını ister.

### Karar

Temiz Mimari sınırları kurulur; bağımlılık yönü **dıştan içe** tek yönlüdür:

```
arayuz (UI)  →  uygulama (use-case)  →  alan (domain)  ←  altyapi (adaptörler)
```

- `domain`: varlıklar, değer nesneleri, durum makineleri, iş kuralları ve doğrulamalar. Hiçbir dış bağımlılığı yoktur.
- `application`: kullanım senaryoları (ör. `CreateTaskDraft`, `SaveTranscriptCorrection`, `BuildReportDocument`, `ExportDocx`). Port arayüzlerini tanımlar.
- `infrastructure`: veri tabanı, dosya sistemi, DOCX üretimi, saat/kimlik üretimi gibi portların gerçek uygulamaları.
- `ui`: arayüz bileşenleri ve sunum mantığı; yalnızca `application` portlarını kullanır.

### Gerekçe

Görev yalıtımı, kaynak izi ve rapor tutarlılığı iş kurallarıdır; arayüz veya veri tabanına gömülürse test edilemez ve kaçak veri riski artar. Bağımlılık yönü içe doğru tutulduğunda alan modeli altyapı değişmeden test edilebilir.

### Sonuçlar

- Otomatik bağımlılık denetimi testi yazılır: `domain` katmanı `infrastructure` veya `ui` katmanını içe aktaramaz.
- Alan doğrulamaları (ör. dayanaksız bulgu reddi) arayüzden bağımsız olarak birim testiyle doğrulanır.

### Riskler

- **R3:** Aşırı soyutlama ilk dilimi yavaşlatabilir. *Azaltma:* yalnızca gerçekten değişen sınırlar (veri tabanı, dosya, DOCX) adaptörleştirilir; başka soyutlama eklenmez.

---

## ADR-003 — Yerel veri deposu

**Durum:** Önerildi — onay bekliyor
**İlgili gereksinimler:** MIH-REQ-PLT-002, MIH-REQ-PLT-004, MIH-REQ-JOB-001, MIH-REQ-SEC-001

### Bağlam

Veri yerel öncelikli tutulmalı; görev yalıtımı şema düzeyinde desteklenmeli; uzun işlerin durumu uygulama kapanışında kaybolmamalıdır.

### Seçenekler

| Seçenek | Değerlendirme |
|---|---|
| SQLite (tek dosya, ilişkisel) | Görev yalıtımı, yabancı anahtar, işlem (transaction) ve sorgu yeteneği güçlü; yerel ve çevrimdışı |
| JSON dosya deposu | Basit; ama eşzamanlılık, sorgu ve bütünlük zayıf; büyüyen veride riskli |
| Belge yönelimli yerel depo (ör. gömülü anahtar-değer) | Esnek şema; ilişki ve kısıt zayıf; yalıtım testi zorlaşır |

### Karar (öneri)

**SQLite**, tek dosya, WAL kipi. Erişim yalnızca `infrastructure` katmanındaki bir depo adaptörü üzerinden yapılır. Çalışma zamanı olarak ilk dilimde Node'un yerleşik `node:sqlite` modülü kullanılır; masaüstü paketleme aşamasında Rust tarafına taşınacaksa aynı şema korunur.

### Gerekçe

1. Görev yalıtımı, `taskId` üzerinde yabancı anahtar ve zorunlu alan kısıtlarıyla şema düzeyinde güvenceye alınır.
2. İş kuyruğu (`ProcessingJob`) kalıcı tabloda tutulur; kurtarma testi gerçek veri üzerinde yapılabilir.
3. Eklenen-değişmez kayıtlar (`TranscriptVersion`, `ReportRevision`, `AuditEvent`) işlem ve tetikleyiciyle korunabilir.
4. Harici bağımlılık gerektirmeyen çözüm, CI'da kurulum riskini azaltır.

### Sonuçlar

- Şema sürümleme (migration) mekanizması ilk günden kurulur.
- Kasa/sır saklama ilk dilimde SQLite içinde tutulmaz; sır saklama ayrı bir adaptör kararıdır (ADR-011 ve açık kararlar listesi).

### Riskler

- **R4:** SQLite dosyası kullanıcı tarafından kopyalanır veya bozulursa veri kaybı olur. *Azaltma:* yedekleme/geri yükleme kararı açık kararlar listesindedir; ilk dilimde dışa aktarma ve bütünlük özeti tutulur.
- **R5:** Node yerleşik SQLite API'si deneysel olabilir. *Azaltma:* depo adaptörü arayüzü sabit tutulur; gerekirse `better-sqlite3` gibi bir uygulamayla değiştirilir, çağıran kod değişmez.

---

## ADR-004 — DOCX üretimi ve doğrulaması

**Durum:** Önerildi — onay bekliyor
**İlgili gereksinimler:** MIH-REQ-RPT-006, MIH-REQ-RPT-007, MIH-REQ-RPT-010, MIH-REQ-SNT-002

### Bağlam

İlk teslimatta gerçek ve açılabilir DOCX zorunludur; sayfa düzeni ve Türkçe karakterler doğrulanmalıdır. ODT/PDF mimaride düşünülür ama zorunlu değildir.

### Seçenekler

| Seçenek | Değerlendirme |
|---|---|
| `docx` (npm) ile programatik OOXML üretimi | Saf TypeScript, şablon gerekmez, CI'da hızlı; tam denetim |
| Bir DOCX şablonunu doldurma (ör. `docxtemplater`) | Şablon yönetimi ve lisans koşulları; esneklik sınırlı |
| LibreOffice headless ile HTML/ODT'den dönüştürme | Ağır bağımlılık, biçim denetimi zayıf; ama PDF doğrulaması için değerli |

### Karar (öneri)

DOCX **programatik olarak** `docx` kütüphanesiyle üretilir. Doğrulama için LibreOffice headless, DOCX'i PDF'e çevirir ve sayfa görüntüsü alınır. ODT/PDF çıktıları aynı `ReportDocument` modelinden beslenecek ikinci adaptörler olarak tasarlanır, ilk dilimde uygulanmaz.

### Gerekçe

1. Tek kanonik modelden programatik üretim, önizleme–çıktı tutarlılığını (MIH-REQ-RPT-003) doğrudan garanti eder.
2. Saf TypeScript üretim, test ortamında ek servis gerektirmez.
3. LibreOffice yalnızca **doğrulama** için kullanılır; üretim yolu LibreOffice'e bağımlı değildir, bu yüzden kullanıcı kurulumu hafif kalır.

### Sonuçlar

- DOCX üretimi bir çıktı adaptörü (`DocxReportExporter`) arkasında toplanır.
- Test, üretilen DOCX'i (a) XML olarak içerik doğrular, (b) LibreOffice ile PDF'e çevirip sayfa sayısı ve metin akışını doğrular.
- "SENTETİK ÖRNEK — RESMÎ BELGE DEĞİLDİR" ibaresi hem her sayfanın üst bilgisinde hem de gövde üstünde yer alır.

### Riskler

- **R6:** Word sürümleri arasında sayfa düzeni farkı olabilir. *Azaltma:* sayfa düzeni kanıtı LibreOffice ile üretilir ve "Word'de ayrıca doğrulanmalıdır" sınırı belgelenir.
- **R7:** Türkçe karakterler için font gömme gerekebilir. *Azaltma:* DejaVu/Segoe uyumlu fontlar seçilir; doğrulama testi ı/İ/ş/ğ/ç/ö/ü karakterlerini içerir.

---

## ADR-005 — A4 önizleme yaklaşımı

**Durum:** Önerildi
**İlgili gereksinimler:** MIH-REQ-RPT-002, MIH-REQ-RPT-003, MIH-REQ-SNT-002

### Karar

A4 önizleme, `ReportDocument` modelinden üretilen **HTML/CSS A4 sayfa görünümü** olarak uygulanır. Önizleme ve DOCX aynı model nesnesinden türetilir; ayrı veri yolları kullanılmaz. Önizleme sayfa numaralandırması, üst bilgi ve sentetik filigranı DOCX ile aynı kurallardan alır.

### Gerekçe

Önizleme ile çıktı arasındaki tutarsızlık, denetim raporundaki P1 bulgusunun (rapor kanonik modelden üretilmiyor) temel nedenidir. Tek modelden iki görünüm üretmek bu sınıfı hatadan kurtarır.

### Sonuçlar

- Her iki çıktı aynı `ReportDocument` → `ReportViewModel` dönüşümünden geçer.
- Entegrasyon testi, önizleme metinleri ile DOCX metinlerinin aynı kaynak veriden geldiğini karşılaştırır.

### Riskler

- **R8:** HTML/CSS ile DOCX sayfa kırılımı birebir aynı olmayabilir. *Azaltma:* sayfa kırılımı kuralları (bölüm bazlı) modele taşınır ve iki çıktıda da aynı kural uygulanır; birebir görsel eşitlik iddia edilmez, içerik eşitliği test edilir.

---

## ADR-006 — Görev yalıtımının teknik uygulanışı

**Durum:** Önerildi
**İlgili gereksinimler:** MIH-REQ-TSK-001 … MIH-REQ-TSK-003, MIH-REQ-TSK-007

### Karar

1. Tüm alt kayıt tablolarında `task_id` zorunlu yabancı anahtardır; `NULL` kabul edilmez.
2. Depo (repository) arayüzlerinde her okuma ve yazma yöntemi `taskId` parametresi alır. `taskId` olmadan alt kayıt listesi döndüren bir yöntem yoktur.
3. Kullanım senaryoları (use-case) girişte `taskId` doğrular; kayıt gerçekten o göreve ait değilse işlem reddedilir.
4. Arayüz oturumu tek bir `activeTaskId` taşır; görev değişiminde panel durumu sıfırlanır.
5. Negatif testler: (a) görev A verisi görev B sorgusunda görünmez, (b) görev B kimliğiyle görev A kaydına yazma reddedilir, (c) kapsamsız sorgu çağrısı derleme düzeyinde mümkün değildir.

### Gerekçe

Denetim raporundaki en yüksek öncelikli P1 bulgusu, görev yalıtımının işaret düzeyinde kalmasıdır. Yalıtım veri katmanında zorunlu kılınırsa arayüz hatası veri sızıntısına dönüşemez.

### Riskler

- **R9:** `taskId` parametresini her yönteme eklemek tekrarlı görünebilir. *Azaltma:* kapsam, tip düzeyinde (`TaskScopedQuery`) taşınır; tekrar kod yerine tip güvencesiyle engellenir.

---

## ADR-007 — Arka plan işleri, kurtarma ve idempotency

**Durum:** Önerildi
**İlgili gereksinimler:** MIH-REQ-JOB-001 … MIH-REQ-JOB-005, MIH-REQ-PLT-004

### Karar

İşler kalıcı bir kuyruk tablosunda (`ProcessingJob`) tutulur ve uygulama içi bir iş yürütücü tarafından işlenir. Durumlar: `bekliyor`, `çalışıyor`, `tamamlandı`, `uyarı`, `başarısız`, `iptal-edildi`, `yeniden-denetim-bekliyor`. Her iş `idempotencyKey` taşır; aynı anahtarla ikinci tetikleme yeni iş açmaz. Uygulama açılışında `çalışıyor` durumunda kalan işler `yeniden-denetim-bekliyor` durumuna alınır (kurtarma). İptal isteği işarettir (`cancelRequested`); iş bir sonraki denetim noktasında durur ve kaynak/çıktı silinmez.

### Gerekçe

Sözleşme bölüm 5.3 ve 8, kalıcı durum, iptal, yeniden deneme ve kapanış sonrası kurtarma ister. Mikro hizmet kurmadan, tek süreç içi kalıcı kuyruk bu gereksinimleri karşılar.

### Riskler

- **R10:** Uzun süren gerçek OCR/ASR işleri ilk dilimde yoktur; kuyruk önce rapor dışa aktarma ve tohumlama işlerinde kullanılır. *Azaltma:* kuyruk sözleşmesi gerçek işler için hazır tutulur, testler durum geçişleriyle doğrulanır.

---

## ADR-008 — Erişilebilirlik hedef düzeyi ve test matrisi

**Durum:** Önerildi — onay bekliyor
**İlgili gereksinimler:** MIH-REQ-A11Y-001 … MIH-REQ-A11Y-007

### Karar (öneri)

Hedef: **WCAG 2.2 düzey AA**, masaüstü ve dar ekran, Türkçe içerik, yüzde 200 yakınlaştırma. Test matrisi:

| Alan | Yöntem |
|---|---|
| Klavye erişimi | Tüm kritik akışlar yalnızca klavyeyle uçtan uca test edilir |
| Odak yönetimi | Görünür odak denetimi; odak tuzağı testi (diyalog) |
| Rol/ilişki | Sekme ve sekme paneli `role`/`aria-*` denetimi |
| Kontrast | Metin ve denetim öğeleri için otomatik kontrast kontrolü |
| Okunabilirlik | En küçük metin boyutu denetimi; %200 yakınlaştırmada taşma testi |
| Ekran okuyucu adları | Tüm etkileşimli öğelerde erişilebilir ad zorunluluğu |

### Gerekçe

Denetim raporundaki P2 bulguları (dalga biçiminin klavye eylemi olmadan düğme olması, eksik sekme ilişkileri, küçük metinler) doğrudan erişilebilirlik kusurlarıdır. Hedef düzey yazılı olmadan "yeterince erişilebilir" kararı öznel kalır.

### Riskler

- **R11:** Tam WCAG 2.2 AA doğrulaması uzman denetimi gerektirir. *Azaltma:* otomatik testler ve klavye senaryoları ilk dilimde uygulanır; bağımsız erişilebilirlik denetimi sonraki aşama olarak açıkça belgelenir ve "sertifikalı" iddiası yapılmaz.

---

## ADR-009 — Test stratejisi

**Durum:** Önerildi
**İlgili gereksinimler:** MIH-REQ-QLT-005, tüm test kanıtları

### Karar

Dört katmanlı test:

1. **Birim testleri** — alan kuralları, durum makineleri, doğrulamalar (dayanaksız bulgu reddi, eksik rapor tamamlanamaz).
2. **Entegrasyon testleri** — kullanım senaryoları, gerçek SQLite ve dosya sistemiyle (taklit yok).
3. **Görev yalıtımı negatif testleri** — görevler arası sızıntıyı yakalayan zorunlu test grubu.
4. **Uçtan uca testler** — arayüz üzerinden altın senaryo: görev oluştur → iki ses → sorular → dayanaklar → bulgular → rapor → A4 önizleme → DOCX; ayrıca klavye ve erişilebilirlik kontrolleri.

Altın senaryo test verisi `fixtures/` altında sabit ve sentetiktir; her fixture "SENTETİK" işareti taşır.

### Gerekçe

Sözleşme bölüm 11 ve 13, bu dört katmanı açıkça ister. Taklit (mock) yerine gerçek SQLite ve gerçek DOCX üretimi kullanmak, "CI yeşil ama dosya açılmıyor" durumunu önler.

### Riskler

- **R12:** Uçtan uca testler kırılgan olabilir. *Azaltma:* erişilebilir rol/seçiciler kullanılır, sabit gecikmeler yerine durum beklemesi yapılır.

---

## ADR-010 — Dil ve kimlik politikası

**Durum:** Kabul edildi (depo kuralları zaten `DIL-ILKESI.md` ile sabittir)
**İlgili gereksinimler:** MIH-REQ-DIL-001 … MIH-REQ-DIL-003

### Karar

Belgeler, iş kayıtları, çekme isteği metinleri, ADR'ler, commit mesajları ve kullanıcıya görünen tüm metinler Türkçedir. Kaynak kodla birebir eşleşmesi gereken tanımlayıcılar (`ReportDocument`, `taskId`, `EvidenceRef`, `TranscriptSegment`, OCR, ASR, DOCX, Tauri, WAI-ARIA) özgün biçimde korunur. Kod içindeki teknik adlar İngilizce kalır; açıklamalar Türkçedir.

---

## ADR-011 — İlk teslimat kapsamı dışındaki alanların mimari sınırı

**Durum:** Önerildi
**İlgili gereksinimler:** MIH-REQ-DOC-004, MIH-REQ-AUD-005, MIH-REQ-AUD-006, MIH-REQ-QLT-006, MIH-REQ-RPT-010, MIH-REQ-SEC-001

### Karar

Aşağıdaki alanlar **arayüzde çalışan özellik gibi gösterilmez**; devre dışı veya "test bekliyor" durumunda gösterilir ve mimari sınırı bu kayıtta tanımlanır:

| Alan | İlk dilimde durum | Sonraki aşama sınırı |
|---|---|---|
| Üretim OCR motoru | Yok; alanlar elle girilir/teyit edilir | `OcrEngine` portu; motor profili doğrulanmadan etkinleştirilemez |
| Üretim ASR modeli | Yok; ham transkript sentetik fixture olarak yüklenir | `AsrEngine` portu; model sürümü ve lisans bilgisi `EngineProfile` içinde |
| Gelişmiş ses iyileştirme/spektrogram | Yok | `AudioProcessAdapter` portu; türetilmiş kopya ve işlem izi zorunlu |
| UYAP otomatik giriş/gönderim | Yok | Ayrı adaptör; gerçek kabul testi olmadan "UYAP'a hazır" denmez |
| Bağımsız denetçi portalı | Yok; yalnızca salt okunur paket fikri belgelenir | Ayrı yetki modeli ve ağ servisi kararı |
| Kasa ve sır saklama | İlk dilimde uygulanmaz; yalnızca denetim izi tutulur | İşletim sistemi anahtar zinciri (keychain) veya şifreli kasa kararı |
| ODT/PDF çıktı | Yok; DOCX zorunlu | `ReportExporter` portunun ek uygulamaları |
| Pilot sertifikasyonu / hukuki uygunluk | İddia edilmez | Ayrı süreç |

### Gerekçe

Sözleşme bölüm 8, 9 ve 10 ile denetim raporunun "prototipin gerçek işlev sınırı" bölümü bu ayrımı zorunlu kılar. Arayüzde gerçek olmayan işlevi etkin düğme olarak göstermek, "gösterilen kontrol çalışır" ilkesini ihlal eder.

### Riskler

- **R13:** Kullanıcı, devre dışı görünen araçları "eksik ürün" sanabilir. *Azaltma:* her devre dışı öğe yanında "sonraki aşama" açıklaması gösterilir.

---

## ADR-012 — Ekran kapsamının ilk dilimde daraltılması

**Durum:** Önerildi
**İlgili gereksinimler:** MIH-REQ-DIL-001, MIH-REQ-PLT-005

### Bağlam

Kabul edilmiş v0.5 prototipi 12 ana ekran ve 6 sekme içerir. İlk teslimatın hedefi tüm menüleri doldurmak değil, çalışan bir rapor dilimidir.

### Karar

İlk dilimde **tam işlevli** ekranlar: Genel Bakış (gerçek görev verisinden türetilir), Görevlerim, Yeni Görevlendirme (taslak oluşturma), Görev Çalışma Alanı'nın altı sekmesi (Görev Özeti, Görevlendirme, Materyaller, Ses ve Transkript, Sorular ve Bulgular, Tek Rapor).

Diğer ekranlar (Bilirkişi Profilim, Uzmanlık Modülleri, Motorlar ve Modeller, Ses Araçları, Dil ve Metin, Test Geçmişi, Kasa ve Güvenlik, Uygulama Ayarları) **görsel hiyerarşi korunarak** sunulur; ancak gerçek işlevi olmayan kontroller devre dışı veya "sonraki aşama" olarak işaretlenir. Hiçbir ekran kaldırılmaz; hiçbir ekranda sahte çalışma gösterilmez.

### Gerekçe

Kabul edilmiş görsel yön korunur (ürün sahibi gereksinimi), ancak "gösterilen kontrol çalışır" ilkesi ihlal edilmez. Bu, ADR-011 ile birlikte okunmalıdır.

### Riskler

- **R14:** Çok sayıda devre dışı kontrol, ürünün eksik görünmesine yol açabilir. *Azaltma:* devre dışılık gerekçesi ekranda açıkça yazılır; yol haritası belgesine bağlanır.
