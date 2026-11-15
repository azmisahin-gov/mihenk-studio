# Depo bilgisi (ajan hafızası)

Bu dosya, MİHENK Studio deposunda çalışan geliştirici/ajan için kalıcı bağlam sağlar.

## Depo amacı

MİHENK Studio, bilirkişinin görevlendirme belgelerini, ses kayıtlarını, transkriptleri, soruları,
bulguları, dayanakları ve rapor teslimatını görev bazında yönetmesini sağlayan yerel öncelikli bir
masaüstü çalışma alanıdır. Bu depo, mevcut `azmisahin-gov/mihenk` deposundan **bağımsız** bir yeniden
yapım kanalıdır.

**Sınır:** `azmisahin-gov/mihenk` deposuna dokunulmaz. Oradaki kod kopyalanmaz, PR #46 birleştirilmez.
Yalnızca kabul edilmiş kullanıcı deneyimi ve ürün kuralları referans alınır.

## Dil ilkesi (zorunlu)

- Belgeler, iş kayıtları, çekme isteği metinleri, ADR'ler, commit mesajları ve kullanıcıya görünen tüm
  metinler **Türkçe**dir.
- Kaynak kodla birebir eşleşen teknik tanımlayıcılar çevrilmez: `ReportDocument`, `taskId`,
  `EvidenceRef`, `TranscriptSegment`, `TranscriptVersion`, `ProcessingJob`, OCR, ASR, DOCX, ODT, PDF,
  Tauri, WAI-ARIA, CI, PR, ADR.
- İngilizce metinler proje belgelerine taşınmaz. Ayrıntı: `DIL-ILKESI.md`.

## Komutlar

```bash
npm install
npm run typecheck          # tsc --noEmit
npm run build:ui           # vite build → dist/ui
npm run build              # typecheck + build:ui
npm start                  # yerel servis (127.0.0.1:12000), altın senaryoyu tohumlar
npm test                   # tüm testler (vitest)
npm run test:unit          # birim + yalıtım
npm run test:integration
npm run test:e2e
npm run seed               # altın senaryodan DOCX üretir
npm run evidence:docx      # DOCX + LibreOffice doğrulaması (evidence/)
npm run evidence:states    # hata/bekleme/iptal/yeniden deneme/boş durum görüntüleri
npm run evidence:screens   # kritik ekran görüntüleri
npm run evidence           # tüm kanıt üretimi
```

## Ortam notları

- Node 22+ gerekir (`node:sqlite` yerleşik modülü).
- `node:sqlite` yalnızca `createRequire` ile yüklenebilir; bkz. `src/infrastructure/db/sqlite.ts`.
  Vite/vitest altında `node:` ön ekli modüller `vitest.config.ts` içindeki eklentiyle dışa aktarılır.
- LibreOffice `LD_LIBRARY_PATH=/usr/lib/libreoffice/program` olmadan açılmayabilir; kanıt aracı bunu
  kendisi ayarlar.
- Ekran görüntüsü araçları sistem Chromium'unu kullanır (`/usr/bin/chromium`); yoksa Playwright'ın
  tarayıcısına düşer. Yol `CHROMIUM_PATH` ile verilebilir.

## Mimari kuralları

Katmanlar ve bağımlılık yönü (dıştan içe tek yön):

```
src/ui  →  src/server  →  src/application  →  src/domain  ←  src/infrastructure
```

- `src/domain`: dış bağımlılık yoktur. Varlıklar (`types.ts`), durum makineleri, doğrulamalar.
- `src/application`: kullanım senaryoları, görünüm modeli, görev veri paketi.
- `src/infrastructure`: SQLite, dosya deposu, DOCX üretimi, tohumlama, sağlayıcılar.
- `src/ui`: React arayüzü; yalnızca API istemcisi üzerinden veriye erişir.
- `src/server`: yerel HTTP servisi; uygulama katmanını arayüze açar.

## Değişmez kurallar

1. **Görev yalıtımı:** Her alt kayıt `taskId` taşır. Tüm depo yöntemleri `TaskScope` alır. Kapsamsız alt
   kayıt listeleme yöntemi eklenmez. Yeni tablo eklendiğinde `task_id` NOT NULL yabancı anahtar zorunludur.
2. **Orijinali koru:** Kaynak dosya ve ses değişmez; dönüşüm türetilmiş kopya üretir.
3. **Değişmez geçmiş:** `TranscriptVersion` (ham ASR), `ReportRevision` ve `AuditEvent` yalnızca eklenir;
   güncelleme tetikleyicilerle engellenir.
4. **Tek kanonik rapor:** Görev başına tek `ReportDocument`. A4 önizleme ve DOCX aynı `ReportViewModel`
   nesnesinden üretilir; ayrı veri yolu açılmaz.
5. **İnsan onayı ayrı:** `tamamlandı`/`onaylandı` durumuna geçiş yalnızca `ApprovalEvent` ile olur.
   Otomatik kontrol geçmesi onay yerine geçmez.
6. **Kanıtsız bulgu yok:** `Finding` en az bir `EvidenceRef` taşımalıdır.
7. **Sentetik işaret:** Arayüzde, A4 önizlemede ve DOCX'in her sayfasında
   "SENTETİK ÖRNEK — RESMÎ BELGE DEĞİLDİR" görünür. Gerçek veri kullanılmaz.
8. **Gösterilen kontrol çalışır:** Gerçek işlevi olmayan kontrol etkin düğme gibi sunulmaz;
   `src/server/staticScreens.ts` içinde gerekçesiyle "sonraki aşama" işaretlenir.
9. **Türkçe metin:** Yeni kullanıcıya görünen tüm metinler Türkçedir.

## Test düzeni

- `tests/helpers/testContext.ts`: bellek içi SQLite + sabit saat/kimlik/özet ile bağlam.
- `tests/unit/`: alan kuralları ve kalite kontrolleri (saf birim).
- `tests/isolation/`: görevler arası sızıntı negatif testleri (**yeni özellikte güncellenmeli**).
- `tests/integration/`: kullanım senaryoları, DOCX içeriği, iş kuyruğu. Taklit (mock) kullanılmaz;
  gerçek SQLite ve gerçek dosya deposu kullanılır.
- `tests/e2e/`: arayüz akışı ve erişilebilirlik (jsdom + gerçek yerel servis).

## Kanıt zorunluluğu

Her çekme isteğinde: birim/entegrasyon/yalıtım/uçtan uca testler, açılabilir DOCX, DOCX sayfa düzeni
kanıtı, A4 önizleme kanıtı, ekran görüntüleri, durum görüntüleri ve CI sonucu. CI yeşil olması tek başına
ürün kabulü değildir. Tamamlanmayan iş tamamlandı işaretlenmez.

## Belge haritası

| Belge | İçerik |
|---|---|
| `docs/01-…` | v0.5 arayüz/ürün denetim raporu (girdi) |
| `docs/02-…` | v0.6 ürün sözleşmesi taslağı (girdi) |
| `docs/03-…` | Bağımsız uygulayıcı talimatları (girdi) |
| `docs/04-…` | Gereksinim izlenebilirlik matrisi (`MIH-REQ-*`) |
| `docs/05-…` | Alan modeli ve durum makineleri |
| `docs/06-…` | Mimari Karar Kayıtları (ADR-001 … ADR-012) |
| `docs/07-…` | Açık kararlar (AK-01 … AK-20) ve riskler (R-01 … R-14) |
| `docs/08-…` | İlk teslimat iş listesi (İ-01 … İ-40) |
| `docs/09-…` | Kullanım ve geliştirme belgesi |
| `docs/10-…` | Sınırlamalar ve sonraki aşamalar (dürüstlük beyanı) |

## Sonraki aşama notu

İlk dikey dilim tamamlandı. Sonraki işler `docs/10-sinirlamalar-ve-sonraki-asamalar.md` bölüm 5'te
sıralanmıştır. Kapsam dışı alanlar (OCR/ASR motoru, ses iyileştirme, kasa, UYAP, denetçi portalı)
arayüzde çalışıyor gibi sunulmaz.
