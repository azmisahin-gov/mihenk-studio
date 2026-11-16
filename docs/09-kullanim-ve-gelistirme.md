# MİHENK Studio — kullanım ve geliştirme belgesi

**Sürüm:** v0.6 rapor odaklı dikey dilim 1
**Durum:** Çalışan ilk dikey dilim · Sentetik örnek · Resmî belge üretmez

Bu belge, uygulamanın nasıl çalıştırılacağını, hangi işlevlerin gerçekten çalıştığını ve hangi alanların
sonraki aşamaya bırakıldığını açıklar. Sınırlamaların tam listesi
[`docs/10-sinirlamalar-ve-sonraki-asamalar.md`](10-sinirlamalar-ve-sonraki-asamalar.md) içindedir.

## 1. Neler çalışır (bu dilimde)

- **Görev oluşturma:** Görevlendirme belgesi alındığında benzersiz görev taslağı oluşur; kaynak belge
  bilgisi ve özeti (sha256) korunur.
- **Görev yalıtımı:** Her alt kayıt `taskId` taşır. Görev değiştirildiğinde tüm paneller yeni görevin
  verisini yükler; başka görevin verisi görünmez. Bu, veri katmanında zorunlu kılınır ve negatif testlerle
  doğrulanır.
- **Belge alanları:** Alanlar kaynak sayfa/bölge ile ilişkilidir. Okunamayan alanlar tahmin edilmez; teyit
  kuyruğuna alınır ve insan tarafından doldurulur.
- **Materyal envanteri:** Beklenen ve teslim alınan materyal ayrı listelenir. Eksik materyal görev
  oluşturmayı engellemez.
- **Ses ve transkript:** Segment zamanları milisaniye cinsindendir ve kaydın zaman ekseniyle doğrulanır.
  Ham ASR ve insan düzeltmesi ayrı, değişmez sürümlerdir. Duyulamayan içerik uydurulmaz; açıkça işaretlenir.
- **Soru, yanıt, dayanak, bulgu:** Dayanak gerçek bir belge sayfasına veya ses segmentine bağlanır.
  Kanıtsız bulgu oluşturulamaz. Yanıt sürümleri izlenir.
- **Tek kanonik rapor:** Tek `ReportDocument` kaydı; A4 önizleme ve DOCX çıktısı aynı revizyondan üretilir.
- **Rapor kalite kontrolleri:** Kontroller gerçek görev verisinden hesaplanır. Kanıtlanmayan kontrol geçti
  sayılmaz; uzman onayı ayrı bir olaydır.
- **Açılabilir DOCX:** Üretilen dosya gerçek bir OOXML paketidir, LibreOffice ile açılır ve doğrulanır.
- **Sentetik işaret:** Arayüzde, A4 önizlemede ve DOCX'in her sayfasında
  "SENTETİK ÖRNEK — RESMÎ BELGE DEĞİLDİR" uyarısı görünür.
- **İş kuyruğu:** Uzun işlemler kalıcı kayıt taşır; iptal, yeniden deneme ve uygulama kapanışı sonrası
  kurtarma desteklenir. İptal veya hata hiçbir kaynağı silmez.
- **Klavye erişimi:** Sekmeler ok tuşlarıyla gezinir; görünür odak ve erişilebilir adlar tanımlıdır.
  Görünen ⌘K/⌃K kısayolu gerçekten çalışır.

## 2. Çalıştırma

### Gereksinimler

- Node.js 22 veya üzeri (`node:sqlite` yerleşik modülü gerekir)
- LibreOffice (yalnızca DOCX sayfa düzeni doğrulaması için; üretim yolu bağımlı değildir)
- poppler-utils (isteğe bağlı; PDF'ten sayfa görüntüsü üretimi için)

### Kurulum ve başlatma

```bash
npm install
npm run build:ui      # arayüz derlemesi (dist/ui)
npm start             # yerel servis: http://127.0.0.1:12000
```

İlk açılışta altın sentetik senaryo otomatik tohumlanır. Arayüz aynı adresten sunulur.

### Testler

```bash
npm test              # tüm testler
npm run test:unit     # birim + yalıtım testleri
npm run test:integration
npm run test:e2e
```

### Kanıt üretimi

```bash
npm run evidence:docx     # DOCX üretimi + LibreOffice sayfa düzeni doğrulaması
npm run evidence:states   # hata, bekleme, iptal, yeniden deneme, boş durum görüntüleri
npm run evidence:screens  # kritik ekran görüntüleri
npm run evidence          # üçünün tamamı
```

Çıktılar `evidence/` klasörüne yazılır.

## 3. Mimari

Temiz Mimari sınırları; bağımlılık yönü dıştan içe tek yönlüdür:

```
src/ui            → arayüz (React, TypeScript)
src/server        → yerel servis API'si
src/application   → kullanım senaryoları ve görünüm modeli
src/domain        → varlıklar, durum makineleri, iş kuralları (dış bağımlılık yok)
src/infrastructure→ SQLite, dosya deposu, DOCX üretimi, tohumlama
```

Ayrıntılar: [`docs/06-mimari-karar-kayitlari.md`](06-mimari-karar-kayitlari.md).

## 4. Veri modeli ve yalıtım

Tüm alt kayıtlar `taskId` taşır ve görev kapsamlı depolar (repository) üzerinden erişilir. Kapsamsız alt
kayıt listeleme yöntemi yoktur. Değişmez kayıtlar (`TranscriptVersion` ham sürüm, `ReportRevision`,
`AuditEvent`) veri tabanı tetikleyicileriyle korunur.

Ayrıntılar: [`docs/05-alan-modeli-ve-durum-makineleri.md`](05-alan-modeli-ve-durum-makineleri.md).

## 5. Altın sentetik senaryo

Sabit senaryo `src/infrastructure/seed/goldenScenario.ts` içindedir ve tamamen sentetiktir:

| Öğe | Adet |
|---|---|
| Görevlendirme belgesi | 1 (5 çıkarılmış alan, 1 teyit bekleyen) |
| Materyal | 3 (1 görevlendirme belgesi + 2 ses kaydı) |
| Ses kaydı | 2 (sentetik) |
| Soru / yanıt | 3 soru, 3 yanıt |
| Zaman damgalı segment | 8 (her iki kayda dağıtılmış, 4 + 4) |
| Transkript sürümü | 2 ham ASR + 2 insan düzeltmesi |
| Dayanak | 3 (iki farklı kayıttan) |
| Bulgu | 2 |
| Rapor revizyonu | 1 |
| Beklenen materyal | 2 |

Gerçek kişi, dava, ses veya bilirkişi raporu verisi kullanılmaz. Tüm adlar ve merciler uydurmadır.

## 6. Test kanıtları

| Katman | Kapsam | Dosya |
|---|---|---|
| Birim | Alan kuralları, durum makineleri, kalite kontrolleri | `tests/unit/` |
| Yalıtım | Görevler arası sızıntı negatif testleri | `tests/isolation/` |
| Entegrasyon | Kullanım senaryoları, DOCX, iş kuyruğu | `tests/integration/` |
| Uçtan uca | Arayüz akışı ve erişilebilirlik | `tests/e2e/` |

## 7. Sınırlamalar

Bu dilimde üretim OCR motoru, üretim ASR modeli, gelişmiş ses iyileştirme, UYAP otomatik işlemi, bağımsız
denetçi portalı, şifreli kasa ve masaüstü kurulum paketi yoktur. Bu alanlar arayüzde çalışan özellik gibi
sunulmaz; her biri gerekçesiyle "sonraki aşama" olarak işaretlenir.

Tam liste: [`docs/10-sinirlamalar-ve-sonraki-asamalar.md`](10-sinirlamalar-ve-sonraki-asamalar.md).
