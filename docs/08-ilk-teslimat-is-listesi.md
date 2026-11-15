# İlk teslimat — sonlu ve sıralı iş listesi

**Belge durumu:** Taslak — proje sahibi gözden geçirmesi bekleniyor
**Bağlı iş kaydı:** #1 (plan) → #2 (uygulama)
**İlgili belgeler:** `docs/04-gereksinim-izlenebilirlik-matrisi.md`, `docs/05-alan-modeli-ve-durum-makineleri.md`, `docs/06-mimari-karar-kayitlari.md`, `docs/07-acik-kararlar-ve-riskler.md`

> İlk teslimatın amacı bütün menülerin dolu görünmesi değil, **baştan sona çalışan ve kanıtlanabilir bir rapor dikey dilimi**dir. Bu liste sonludur: her iş kalemi, bir tamamlanma tanımına (DoD) ve üretilecek test kanıtına bağlıdır.

## 1. Nasıl okunur

- **İş kimliği:** `İ-<sıra>` biçimindedir ve uygulama sırasına göredir.
- **Bağımlılık:** İşin başlaması için tamamlanmış olması gereken işler.
- **DoD:** İşin "tamamlandı" sayılması için karşılanması gereken ölçülebilir koşullar.
- **Test kanıtı:** Çekme isteğine eklenmesi zorunlu somut çıktı.
- **Gereksinim:** `docs/04-gereksinim-izlenebilirlik-matrisi.md` içindeki kimlikler.

Bir iş, testi geçmeden ve kanıtı üretilmeden `tamamlandı` işaretlenemez. CI yeşil olması tek başına kanıt değildir.

## 2. Aşama A — Temel ve altyapı

| İş | Başlık | Bağımlılık | Gereksinim | DoD | Test kanıtı |
|---|---|---|---|---|---|
| İ-01 | Proje iskeleti ve araç zinciri kurulumu | — | MIH-REQ-PLT-001 | TypeScript çekirdek, test çalıştırıcısı ve derleme betiği çalışır; `npm test` ve `npm run build` hatasız tamamlanır | Derleme çıktısı, boş test paketinin geçtiği çıktı |
| İ-02 | Katman iskeleti ve bağımlılık yönü denetimi | İ-01 | MIH-REQ-PLT-001 | `domain`, `application`, `infrastructure`, `ui` katmanları oluşur; bağımlılık denetim testi `domain` katmanının dış katmanları içe aktarmadığını doğrular | Bağımlılık denetim testi çıktısı (ADR-002) |
| İ-03 | SQLite veri deposu adaptörü ve şema sürümleme | İ-02 | MIH-REQ-TSK-001, MIH-REQ-PLT-004 | `node:sqlite` ile şema oluşturulur; `task_id` zorunlu yabancı anahtar; şema sürümü kaydedilir | Şema testi; yabancı anahtar ihlali testi |
| İ-04 | Görev kapsamlı depo (repository) katmanı | İ-03 | MIH-REQ-TSK-001, MIH-REQ-TSK-002, MIH-REQ-TSK-007 | Her okuma/yazma `taskId` alır; kapsamsız alt kayıt listeleme yöntemi yoktur | Tip/derleme denetimi + kapsamsız çağrı reddi testi |
| İ-05 | Kalıcı iş kuyruğu ve kurtarma | İ-03 | MIH-REQ-JOB-001 … 005, MIH-REQ-PLT-004 | Durumlar ayrışır; `idempotencyKey` çift tetiklemeyi engeller; açılışta kurtarma `çalışıyor` → `yeniden-denetim-bekliyor` yapar; iptal/başarısızlık veri silmez | Durum makinesi testi, idempotency testi, kurtarma testi, iptal veri koruma testi |
| İ-06 | Denetim izi (AuditEvent) ve zaman/kimlik üretimi | İ-03 | MIH-REQ-SEC-002, MIH-REQ-QLT-003 | Önemli olaylar kaydedilir; kimlikler benzersiz; sır loglanmaz | Audit kayıt testi, sır sızıntısı negatif testi |

## 3. Aşama B — Alan modeli ve kullanım senaryoları

| İş | Başlık | Bağımlılık | Gereksinim | DoD | Test kanıtı |
|---|---|---|---|---|---|
| İ-07 | Görev ve görevlendirme belgesi modeli | İ-04 | MIH-REQ-TSK-004 … 006, MIH-REQ-DOC-001 | İlk belge alımında benzersiz taslak görev oluşur; görev durum makinesi kuralları uygulanır | Birim testleri: benzersiz kimlik, durum geçişleri, eksik materyalle görev açma |
| İ-08 | Beklenen ve alınan materyal modeli | İ-07 | MIH-REQ-MAT-001 … 005, MIH-REQ-TSK-005 | İki envanter ayrı; özet (sha256) ve durum yönetimi; yinelenen kayıt tespiti | Entegrasyon testi; özet değişmezliği testi; yinelenen tespit testi |
| İ-09 | Ses kaydı ve zaman ekseni modeli | İ-08 | MIH-REQ-AUD-001 … 004, 006 | Süre ms cinsinden; segment sınırları kayıt süresiyle doğrulanır; orijinal ses özeti korunur | Birim testi: zaman sınırı; özet değişmezliği testi |
| İ-10 | Transkript sürümü ve segment modeli | İ-09 | MIH-REQ-TRN-001 … 007 | `raw-asr` değiştirilemez; insan düzeltmesi yeni sürüm üretir; filtre alanları bağımsız | Değişmezlik testi, sürümleme testi, filtre bağımsızlığı testi |
| İ-11 | Soru, yanıt, dayanak ve bulgu modeli | İ-10 | MIH-REQ-QST-001 … 007 | `EvidenceRef` hedefsiz olamaz; dayanaksız bulgu reddedilir; yanıt sürümü izlenir | Negatif testler: hedefsiz dayanak, dayanaksız bulgu |
| İ-12 | Rapor modeli, revizyon ve kalite kontrolü | İ-11 | MIH-REQ-RPT-001, 004, 005, 008; MIH-REQ-QLT-001 … 004 | Görev başına tek `ReportDocument`; her değişiklik yeni revizyon; kontroller gerçek veriden türer; onay ayrı olay | Birim testleri: tek rapor, revizyon kaynağı, kalite kontrolü gerçek veriden, onaysız tamamlanamaz |

## 4. Aşama C — Uygulama hizmetleri (kullanım senaryoları)

| İş | Başlık | Bağımlılık | Gereksinim | DoD | Test kanıtı |
|---|---|---|---|---|---|
| İ-13 | Görev oluşturma kullanım senaryosu | İ-07 | MIH-REQ-TSK-004, MIH-REQ-DOC-001, 003 | Belge alımından taslak görev, alanlar ve beklenen materyal listesi üretilir; belirsiz alan teyit kuyruğuna gider | Entegrasyon testi; teyit kuyruğu testi |
| İ-14 | Altın sentetik senaryo tohumlama (seed) | İ-13, İ-12 | MIH-REQ-SNT-001, 002, 003; sözleşme bölüm 12 | Sabit fixture ile: 1 görevlendirme belgesi, 2 ses kaydı, ≥3 soru, iki kayda dağıtılmış segmentler, ≥2 farklı kayıttan dayanak, ≥2 bulgu, ham ASR + ≥1 insan düzeltmesi, ≥1 rapor revizyonu | Fixture denetim testi; tohumlama entegrasyon testi; sentetik işaret testi |
| İ-15 | Transkript düzeltme kullanım senaryosu | İ-10, İ-14 | MIH-REQ-TRN-002, 003, 005 | Düzeltme yeni sürüm üretir; ham sürüm korunur; belirsiz segment işaretlenir | Entegrasyon testi; ham sürüm korunumu testi |
| İ-16 | Yanıt, dayanak ve bulgu kullanım senaryoları | İ-11, İ-14 | MIH-REQ-QST-002 … 007 | Yanıt kaydedilir; dayanak gerçek hedefe bağlanır; bulgu dayanaksız oluşturulamaz; değişiklik rapor revizyonu tetikler | Entegrasyon testleri; negatif testler; revizyon tetikleme testi |
| İ-17 | Rapor derleme kullanım senaryosu | İ-16 | MIH-REQ-RPT-002, 003, 004, 008 | `ReportDocument` tüm bölümleriyle derlenir; görünüm modeli üretilir; kullanılan kaynak sürümleri kaydedilir | Entegrasyon testi: bölüm doluluğu ve kaynak sürüm kaydı |
| İ-18 | Kalite kontrolü hesaplama senaryosu | İ-17 | MIH-REQ-QLT-001, 002; MIH-REQ-RPT-005 | Eksik veri engel/uyarı üretir; kanıtsız kontrol geçti sayılmaz; eksik rapor onaylanamaz | Negatif testler: eksik yanıt, dayanaksız bulgu, onaysız tamamlanamaz |
| İ-19 | DOCX dışa aktarma senaryosu | İ-17 | MIH-REQ-RPT-006, 007, 009; MIH-REQ-SNT-002 | Açılabilir DOCX üretilir; her sayfada sentetik uyarı; ekler dahil; Türkçe karakterler doğru | DOCX açma testi, içerik testi, karakter testi |
| İ-20 | A4 önizleme görünüm modeli | İ-17 | MIH-REQ-RPT-002, 003; MIH-REQ-SNT-002 | Önizleme ile DOCX aynı görünüm modelinden üretilir; içerik karşılaştırması tutarlı | Karşılaştırma entegrasyon testi |
| İ-21 | Görev yalıtımı negatif test paketi | İ-13 … İ-20 | MIH-REQ-TSK-002, 003, 007 | İki görev arasında hiçbir alt kayıt sızmaz; görev B kimliğiyle görev A kaydına yazma reddedilir | Negatif test paketi çıktısı |

## 5. Aşama D — Arayüz (kabul edilmiş v0.5 görsel dili)

| İş | Başlık | Bağımlılık | Gereksinim | DoD | Test kanıtı |
|---|---|---|---|---|---|
| İ-22 | Uygulama kabuğu: kenar çubuğu, üst çubuk, gezinme | İ-01 | MIH-REQ-DIL-001, MIH-REQ-A11Y-001 | Kabul edilmiş 12 ekran hiyerarşisi ve görsel dil korunur; gezinme klavyeyle çalışır | Ekran görüntüsü (masaüstü + dar ekran); klavye testi |
| İ-23 | Görevlerim ve Genel Bakış (gerçek veriden) | İ-22, İ-13 | MIH-REQ-TSK-003 | Kart ve sayılar gerçek görev verisinden türetilir; sabit örnek sayı yoktur | Ekran görüntüsü; veri türetme testi |
| İ-24 | Yeni Görevlendirme akışı | İ-23, İ-13 | MIH-REQ-DOC-001 … 004, MIH-REQ-MAT-004 | Belge alımı gerçek taslak üretir; alanlar kaynağa bağlı; teyit kuyruğu görünür; eksik materyal engellemez | Ekran görüntüsü; uçtan uca test |
| İ-25 | Görev çalışma alanı sekmeleri ve sekme erişilebilirliği | İ-24 | MIH-REQ-A11Y-002 | Altı sekme gerçek veriyle çalışır; `role`/`aria` ilişkileri ve ok tuşu gezinmesi doğru | Erişilebilirlik testi; ekran görüntüsü |
| İ-26 | Materyaller sekmesi | İ-25, İ-08 | MIH-REQ-MAT-001 … 005 | Beklenen ve alınan materyal ayrı listelenir; durum ve bütünlük görünür | Ekran görüntüsü; entegrasyon testi |
| İ-27 | Ses ve Transkript sekmesi | İ-25, İ-15 | MIH-REQ-AUD-002 … 004, MIH-REQ-TRN-001 … 007 | Zaman ekseni ortak (ms); segment seçimi zamanla uyumlu; ham ve düzeltilmiş sürüm ayrı; belirsizlik görünür | Ekran görüntüsü; zaman ekseni uçtan uca testi |
| İ-28 | Sorular ve Bulgular sekmesi | İ-25, İ-16 | MIH-REQ-QST-001 … 007 | Soru, yanıt, dayanak ve bulgu ilişkileri gerçek; dayanak seçimi kayıt/segment hedefli | Ekran görüntüsü; uçtan uca test |
| İ-29 | Tek Rapor sekmesi: A4 önizleme ve kalite kontrolü | İ-25, İ-18, İ-20 | MIH-REQ-RPT-002 … 005; MIH-REQ-QLT-001 … 004 | A4 önizleme kanonik modelden; kontrol listesi gerçek eksiklikten; onay ayrı eylem | Ekran görüntüsü; A4 önizleme kanıtı |
| İ-30 | DOCX dışa aktarma düğmesi ve durum görünümleri | İ-29, İ-19 | MIH-REQ-RPT-006, 007; MIH-REQ-JOB-005 | Dışa aktarma gerçek dosya üretir; bekleme/hata/iptal/yeniden deneme görünür | Açılabilir DOCX; hata/bekleme ekran görüntüleri |
| İ-31 | Devre dışı ve "sonraki aşama" ekranlarının dürüst gösterimi | İ-22 | MIH-REQ-DOC-004, MIH-REQ-AUD-006, MIH-REQ-QLT-006, MIH-REQ-RPT-010 | Gerçek işlevi olmayan kontrol etkin düğme olarak gösterilmez; gerekçe ekranda yazılır | Ekran görüntüleri; denetim testi |
| İ-32 | Sentetik uyarının arayüzde görünürlüğü | İ-22, İ-14 | MIH-REQ-SNT-002, 003 | "SENTETİK ÖRNEK — RESMÎ BELGE DEĞİLDİR" arayüzde ve önizlemede görünür | Ekran görüntüsü; görünürlük testi |

## 6. Aşama E — Doğrulama, kanıt ve teslim

| İş | Başlık | Bağımlılık | Gereksinim | DoD | Test kanıtı |
|---|---|---|---|---|---|
| İ-33 | Erişilebilirlik ve okunabilirlik doğrulaması | İ-29 | MIH-REQ-A11Y-001 … 007 | Kritik akışlar klavyeyle tamamlanır; %200 yakınlaştırma ve dar ekranda okunur; küçük metin yok | Klavye test çıktısı; yakınlaştırma/dar ekran görüntüleri; metin boyutu denetimi |
| İ-34 | Uçtan uca altın senaryo testi | İ-21, İ-30 | Sözleşme bölüm 12; MIH-REQ-RPT-006 | Arayüzden görev oluştur → rapor → A4 önizleme → DOCX zinciri kesintisiz çalışır | Uçtan uca test çıktısı; üretilen DOCX |
| İ-35 | DOCX sayfa düzeni kanıtı | İ-19 | MIH-REQ-RPT-007 | DOCX bir görüntüleyicide açılır; sayfa sayısı ve düzeni doğrulanır; görüntü üretilir | DOCX dosyası; PDF/sayfa görüntüsü; doğrulama kaydı |
| İ-36 | Hata, bekleme, iptal, yeniden deneme ve boş durum kanıtı | İ-30 | MIH-REQ-JOB-005, MIH-REQ-JOB-004 | Beş durum görünür ve test edilir; iptal veri silmez | Beş ekran görüntüsü; durum test çıktısı |
| İ-37 | Sürekli bütünleştirme iş akışı | İ-21 | MIH-REQ-PLT-005 | CI; derleme, tüm testler ve DOCX doğrulama adımlarını çalıştırır | CI çalıştırma bağlantısı ve sonucu |
| İ-38 | Türkçe kullanım ve teknik belgeler | İ-30 | MIH-REQ-DIL-001 … 003 | README, kullanım belgesi, sınırlama belgesi ve ADR'ler güncel; İngilizce metin yok | Belge denetimi |
| İ-39 | Sınırlama ve sonraki aşama belgesi | İ-31 | ADR-011 | Kapsam dışı alanlar ve sonraki aşama sınırları açıkça yazılır | Belge |
| İ-40 | Çekme isteği ve kanıt paketi | İ-34 … İ-39 | Tümü | Tek çekme isteği; tüm kanıtlar bağlı; tamamlanmayan iş tamamlandı işaretlenmez | Çekme isteği bağlantısı ve kanıt listesi |

## 7. Bağımlılık grafiği (özet)

```
İ-01 → İ-02 → İ-03 → İ-04 → İ-05
                    ↘ İ-06
İ-04 → İ-07 → İ-08 → İ-09 → İ-10 → İ-11 → İ-12
İ-07 → İ-13 → İ-14 → İ-15 → İ-16 → İ-17 → İ-18 → İ-19
                                    ↘ İ-20
İ-13 … İ-20 → İ-21
İ-01 → İ-22 → İ-23 → İ-24 → İ-25 → İ-26 / İ-27 / İ-28 → İ-29 → İ-30
İ-22 → İ-31 → İ-32
İ-29 → İ-33
İ-21, İ-30 → İ-34 → İ-35 / İ-36
İ-21 → İ-37
İ-30 → İ-38 → İ-39 → İ-40
```

## 8. Dilim kapsamı dışı (sonraki aşama)

Aşağıdakiler bu listede **iş kalemi değildir**; ilk dilimde çalışan özellik gibi gösterilmez (bkz. ADR-011):

- Üretim OCR motoru ve üretim kalitesinde belge çıkarımı.
- Üretim ASR modeli kurulumu ve kıyaslaması.
- Gelişmiş ses iyileştirme ve spektrogram araçları.
- UYAP portalına otomatik giriş veya gönderim.
- Bağımsız denetçi portalı.
- Pilot sertifikasyonu veya hukuki uygunluk iddiası.
- Masaüstü kurulum paketi ve otomatik güncelleme.
- Şifreli kasa ve sır saklama.

## 9. Tamamlanma ölçütleri (dilim düzeyi)

İlk rapor odaklı dikey dilim, ancak aşağıdakilerin tamamı sağlandığında tamamlanmış sayılır:

1. Altın sentetik senaryo tek komutla tohumlanır ve arayüzde görüntülenir.
2. Kanonik `ReportDocument`, A4 önizleme ve açılabilir DOCX aynı kaynak veriden üretilir.
3. Dayanaklar kaynak kayıt ve segmentlere geri izlenebilir.
4. Görevler arası veri sızıntısı negatif testlerle engellenir.
5. Kalite kontrolleri eksik öğeleri doğru gösterir; uzman kararı veya resmî onay uydurulmaz.
6. Tüm zorunlu kanıtlar (testler, DOCX, ekran görüntüleri, CI sonucu, belgeler) çekme isteğine eklenmiştir.
7. Kapsam dışı alanlar dürüst biçimde işaretlenmiştir.
