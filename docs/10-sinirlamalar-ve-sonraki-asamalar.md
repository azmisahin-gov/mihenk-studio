# Sınırlamalar, sonraki aşamalar ve dürüstlük beyanı

**Belge durumu:** Güncel — ilk rapor odaklı dikey dilim
**Bağlı iş kaydı:** #2
**İlgili belgeler:** `docs/06-mimari-karar-kayitlari.md` (ADR-011, ADR-012), `docs/09-kullanim-ve-gelistirme.md`

> Bu belge, üretilen yazılımın **ne olduğunu ve ne olmadığını** açıkça bildirir. Test edilmemiş bir işlev
> tamamlanmış olarak bildirilmez. Hiçbir gerçek dışı başarı beyanı yapılmaz.

## 1. Dürüstlük beyanı

### Ne üretildi

- Çalışan bir yerel servis ve arayüz; gerçek veri tabanı, gerçek dosya deposu ve gerçek DOCX üretimi.
- Sentetik bir görevden açılabilir DOCX rapora uzanan, baştan sona test edilmiş bir dikey dilim.
- 77 otomatik test (birim, yalıtım, entegrasyon, uçtan uca ve erişilebilirlik).
- LibreOffice ile doğrulanmış DOCX çıktısı ve sayfa görüntüsü.

### Ne üretilmedi

- Üretim OCR motoru veya gerçek belge çıkarımı.
- Üretim ASR modeli veya gerçek ses çözümlemesi.
- Gerçek ses oynatma motoru (zaman ekseni ve segment seçimi çalışır; ses çalınmaz).
- Şifreli kasa, sır saklama, masaüstü kurulum paketi, otomatik güncelleme.
- UYAP entegrasyonu, bağımsız denetçi portalı, elektronik imza.
- Pilot sertifikasyonu veya hukuki uygunluk iddiası.

### Tüm veriler sentetiktir

Bu depodaki ve üretilen çıktılardaki tüm belgeler, ses kayıtları, transkriptler, sorular, yanıtlar,
bulgular ve raporlar **tamamen uydurmadır**. Hiçbir gerçek kişi, dava dosyası, ses kaydı veya bilirkişi
raporu kullanılmamıştır. Merci adları, dosya numaraları ve kişi adları uydurma olup "(SENTETİK)" olarak
işaretlenmiştir.

Üretilen her belge ve arayüz "SENTETİK ÖRNEK — RESMÎ BELGE DEĞİLDİR" uyarısı taşır. Üretilen DOCX hiçbir
resmî işlemde kullanılamaz.

## 2. Arayüzde "sonraki aşama" olarak işaretlenen alanlar

Bu alanlar arayüzde kaldırılmadı; kabul edilmiş görsel hiyerarşi korundu. Ancak hiçbiri çalışan özellik
gibi sunulmaz; her biri gerekçesiyle devre dışı gösterilir (bkz. ADR-011, ADR-012).

| Alan | İlk dilimde durum | Gerekçe | Sonraki aşama sınırı |
|---|---|---|---|
| Otomatik OCR | Yok | Üretim OCR motoru kurulu değil | `OcrEngine` portu; motor profili doğrulanmadan etkinleştirilemez |
| ASR modeli | Yok | Üretim ASR modeli kurulu değil | `AsrEngine` portu; model sürümü `EngineProfile` içinde izlenir |
| Ses oynatma | Yok | Gerçek oynatma motoru yok | Ses adaptörü; imleç ve segment seçimi zaten aynı zaman eksenini kullanır |
| Gürültü azaltma | Yok | Türetilmiş kopya ve işlem izi gerektirir | `AudioProcessAdapter` portu; orijinal ses değişmez |
| Spektrogram | Yok | Gelişmiş görselleştirme | Ses adaptörü |
| Kanal ayrımı | Yok | Türetilmiş kopya gerektirir | Ses adaptörü |
| Serbest metin modeli ayarları | Yok | Serbest LLM transkripsiyon kelimesinin kaynağı değildir | Ayrı karar |
| Şifreli kasa | Yok | İlk dilimde sır saklanmaz; yalnızca denetim izi tutulur | İşletim sistemi anahtar zinciri kararı (AK-02) |
| Bağımsız denetçi portalı | Yok | Katman B portalı zorunlu değil | Ayrı yetki modeli ve ağ servisi kararı (AK-08) |
| Profil düzenleme | Yok | Kalıcı profil formu sonraki aşama | Profil yönetimi |
| Uzmanlık modülü kurulumu | Yok | Modül yönetimi sonraki aşama | Modül kataloğu |
| Kontrast ve animasyon ayarları | Yok | Tema ayarları sonraki aşama | Erişilebilirlik hedefi ADR-008'de tanımlı |
| ODT/PDF çıktı | Yok | İlk dilimin zorunlu çıktısı DOCX | `ReportExporter` portunun ek uygulamaları |
| Masaüstü paketi | Yok | Paketleme ilk dilimin hedefi değil | Tauri kabuğu (ADR-001) |

## 3. Gerçekten çalışan ama sınırı olan işlevler

Bu işlevler çalışır; ancak kapsamı açıkça sınırlıdır.

| İşlev | Çalışır | Sınır |
|---|---|---|
| Görev yalıtımı | Veri katmanında zorunlu; negatif testlerle doğrulanır | Çok kullanıcılı yetki modeli yoktur; tek uzman, yerel kullanım |
| Görev oluşturma | Gerçek taslak, gerçek dosya, gerçek özet | Belge içeriği okunmaz; alanlar elle girilir ve teyit edilir |
| Transkript sürümleme | Ham ve düzeltilmiş sürümler ayrı ve değişmez | Segment düzeyi düzeltme geçmişi sürüm düzeyinde tutulur |
| Dayanak izi | Belge sayfası ve ses segmentine gerçek referans | Belge koordinatı bölge metni olarak tutulur; piksel koordinatı yoktur |
| Rapor derleme | Tek kanonik model; önizleme ve DOCX tutarlı | Zengin metin düzenleme yoktur; bölümler yapısal modelden üretilir |
| Kalite kontrolleri | Gerçek veriden hesaplanır | Yedi kontrol; sonraki aşamada genişletilir |
| İş kuyruğu | Kalıcı, iptal/yeniden deneme/kurtarma destekli | Gerçek OCR/ASR işleri henüz yoktur; kuyruk rapor çıktısında kullanılır |
| Arama | Görev başlığı, dosya numarası ve merci | Materyal ve transkript metni araması sonraki aşamada (AK-14) |
| DOCX doğrulama | LibreOffice ile açılır ve sayfa düzeni doğrulanır | Microsoft Word ile ayrıca doğrulanmalıdır; bu ortamda Word yoktur |

## 4. Bilinen teknik sınırlar

1. **Ses oynatma yoktur.** Dalga biçimi ve imleç, segment yoğunluğundan türetilen görsel bir gösterimdir;
   gerçek ses verisi değildir. Zaman ekseni, imleç ve segment seçimi gerçek veriyle çalışır.
2. **Yerel servis belirteci.** Yerel API rastgele bir belirteçle korunur ve yalnızca `127.0.0.1` üzerinde
   dinler. Bu, tek kullanıcılı yerel kullanım için yeterlidir; çok kullanıcılı yetkilendirme değildir.
3. **Şema sürümleme.** Şema sürümü kaydedilir; uyuşmazlıkta uygulama açılmaz. Otomatik göç (migration)
   mekanizması henüz yoktur.
4. **Node yerleşik SQLite.** `node:sqlite` deneysel bir API'dir. Depo adaptörü arayüzü sabit tutulduğu için
   gerekirse başka bir uygulamayla değiştirilebilir.
5. **Türkçe karakterler.** DOCX ve PDF'te doğrulanmıştır (ı, İ, ş, ğ, ç, ö, ü). Farklı yazı tipleriyle
   Word'de ayrıca kontrol edilmelidir.
6. **Erişilebilirlik.** Otomatik testler ve klavye senaryoları uygulanmıştır. Bağımsız erişilebilirlik
   denetimi (ekran okuyucu ile gerçek kullanıcı testi) yapılmamıştır; "sertifikalı" iddiası yoktur.

## 5. Sonraki aşama iş sırası

`docs/08-ilk-teslimat-is-listesi.md` içindeki İ-01 … İ-40 listesi ilk dilim içindir. Sonraki aşamalar için
önerilen sıra:

1. **OCR/ASR adaptörleri:** Motor profili doğrulama, sürüm izleme ve iş kuyruğu entegrasyonu.
2. **Ses oynatma ve işleme:** Gerçek oynatma, türetilmiş kopya yönetimi, işlem izi.
3. **Şifreli kasa:** İşletim sistemi anahtar zinciri kararı ve sır saklama.
4. **Rapor genişletme:** Zengin metin düzenleme, ODT/PDF çıktıları, daha fazla kalite kontrolü.
5. **Masaüstü paketleme:** Tauri kabuğu, kurulum ve otomatik güncelleme kararı.
6. **Bağımsız inceleme paketi:** Katman B için salt okunur paket ve yetki modeli.
7. **Genel arama:** Materyal ve transkript metni araması.
8. **Erişilebilirlik denetimi:** Bağımsız ekran okuyucu ve kullanıcı testleri.

## 6. Açık kararlar

Onay bekleyen kararların tam listesi `docs/07-acik-kararlar-ve-riskler.md` içindedir. Özellikle aşağıdakiler
bu dilimin sınırını doğrudan etkiler:

- AK-01 Masaüstü kabuğu ve teknoloji yığını
- AK-02 Yerel veri tabanı ve şifreli kasa seçimi
- AK-06 Rapor şablonu ve DOCX doğrulama platformları
- AK-09 Erişilebilirlik hedef düzeyi ve test matrisi
- AK-11 `ReportDocument` içerik modeli
- AK-14 Genel arama kapsamı
