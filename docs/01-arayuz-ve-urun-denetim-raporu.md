# MİHENK v0.5 Studio — arayüz ve ürün kapsamı denetim raporu

**Denetim tarihi:** 15 Kasım 2026  
**İncelenen depo:** azmisahin-gov/mihenk  
**Çekme isteği:** [#46 — v0.5 yüksek doğruluklu çalışma alanı arayüzü](https://github.com/azmisahin-gov/mihenk/pull/46)  
**Kaynak dal:** feat/wireframe-v0.5-workspace  
**İncelenen commit:** 824b95a4a7e7b423e95eff12c2f0263612614c6f

## 1. Yönetici özeti

v0.5 Studio, proje sahibinin görsel olarak incelediği ve tasarım yönünü kabul ettiği yüksek doğruluklu arayüz referansıdır. Ana menü, görev listesi, yeni görevlendirme, görev çalışma alanının altı sekmesi, uzman profili, uzmanlık modülleri, motorlar/modeller, ses araçları, dil/metin, test geçmişi, kasa/güvenlik ve ayarlar kapsam içindedir.

**Sonuç:** Görsel kapsam, bağımsız uygulamanın kullanıcı deneyimi referansı olarak kullanılabilir. Ancak prototip, üretime hazır davranış ve veri sözleşmesi değildir. Görev yalıtımı, görev oluşturma, ses-zaman eşlemesi, soru-dayanak ilişkisi, kanonik rapor üretimi, kalite kontrolleri ve erişilebilirlik yeni uygulamada gerçek işlevlerle tamamlanmalıdır.

Bu rapor görsel tasarımı reddetmez. Amaç, yeni uygulayıcının görseli yanlış varsayımlarla çalışan ürün davranışına dönüştürmesini önlemektir.

## 2. Denetim yöntemi ve kanıt sınırı

İnceleme; çekme isteği değişiklikleri, MihenkStudio.tsx, studio.css, src/main.tsx, src/App.tsx, prototip paket yapılandırması, sürekli bütünleştirme iş akışı, prototip açıklaması, kabul edilmiş v0.5 taslağı ve 56.12 kalite/denetim modeli karşılaştırılarak yapıldı.

- Çekme isteği #46 açık ve taslak durumundadır; main dalına birleştirilmemiştir.
- Prototip, VITE_UI_PROTOTYPE=true ayarıyla gerektiğinde yüklenir; bayrak yokken mevcut App varsayılan kalır.
- GitHub Actions çalıştırma #311 (ID 43667334637) başarılıdır. TypeScript/ön yüz derlemesi ile Windows/Linux prototip paketleri üretilmiştir.
- Bu CI sonucu uçtan uca kullanıcı akışını, klavye erişilebilirliğini veya görsel regresyonu kanıtlamaz. Bu testler prototip CI'ında bulunmamaktadır.
- Kurulu Windows/Linux paketleri bu denetimde yeniden etkileşimli olarak çalıştırılmamıştır. Kaynak kod incelemesi ile proje sahibinin görsel kabulü farklı kanıtlardır.

## 3. Kanonik arayüz kaynakları

| Kaynak | Rol |
|---|---|
| src/prototype/MihenkStudio.tsx | v0.5'in asıl yüksek doğruluklu arayüzü; 12 ana ekran ve görev içinde 6 sekme. |
| src/prototype/studio.css | Studio çalışma alanının biçemleri ve duyarlı ekran kırılımları. |
| src/main.tsx | Prototipin çevre değişkeniyle koşullu yüklenmesi. |
| src/App.tsx | Mevcut ürünün varsayılan uygulama akışı; v0.5 Studio'nun üretim uygulaması değildir. |
| src/prototype/WireframePrototype.tsx ve wireframe.css | Önceki, düşük ayrıntılı tarihsel taslak; kanonik Studio kaynağı değildir. |
| docs/ui-prototype-v0.5.md | Örnek işlevlerle gerçek işlevlerin ayrımını açıklayan prototip notu. |

## 4. Ekran kapsamı

| Alan | Denetim sonucu |
|---|---|
| Genel Bakış | Kart ve özetler sentetik/sabit; gerçek görev durumundan türemiyor. |
| Görevlerim | Arama ve durum filtresi örnek veri üzerinde çalışıyor; sayılar sabit. |
| Yeni görevlendirme | Örnek belge kartı dışında gerçek dosya alımı, OCR, görev taslağı ve alan düzenleme yok. |
| Görev çalışma alanı | Özet, Görevlendirme, Materyaller, Ses ve Transkript, Sorular ve Bulgular, Tek Rapor sekmeleri görsel olarak mevcut. |
| Bilirkişi profili ve uzmanlık modülleri | Görsel sunum mevcut; gerçek profil formu ve kalıcı modül yönetimi yok. |
| Motorlar ve modeller | SEDA/Whisper adayları gösteriliyor; doğrulanmış etkin model profili yok. |
| Ses araçları ve Dil/Metin | İşlem ilkeleri ve katalog görünümleri var; gerçek ses işleme/ASR ayarı yok. |
| Test geçmişi | Kabul kapıları gösteriliyor; gerçek kıyaslama kaydı yok. |
| Kasa ve Güvenlik | Örnek kasa durumu var; gerçek kasa, denetim izi ve güvenlik olayı üretimi yok. |
| Uygulama ayarları | Menü daraltma tercihi çalışıyor; diğer kontrollerin çoğu gerçek ayar uygulamıyor. |

## 5. Bulgular ve zorunlu ürün kararları

Öncelik: **P1** veri doğruluğu veya kullanıcı kararını etkileyen zorunlu sözleşme; **P2** kullanılabilirlik, erişilebilirlik veya anlam tutarlılığı; **P3** sonraki aşama iyileştirmesi.

### P1 — Görevler arası veri yalıtımı

Aktif görev başlığı değişse de kayıt, materyal, soru, bulgu, transkript ve rapor bileşenleri aynı sentetik veri kümesini kullanabiliyor. Bu nedenle bir görev başka görevin kayıtlarını gösterebilir.

**Gereksinim:** Her alt kayıt taskId ile kapsamlanmalı. Sorgu, rapor, dışa aktarma ve arayüz yalnızca seçili görevin verisini kullanmalı. İki görev arasında çapraz veri sızıntısını yakalayan otomatik test zorunludur.

### P1 — Yeni görevlendirme gerçek taslak üretmiyor

Örnek belge kartı yalnızca görsel durumu değiştiriyor; ana eylem sabit demo-014 görevini açıyor. Gerçek dosya alımı, OCR alanlarını doğrulama ve taslak kaydı oluşturma yok.

**Gereksinim:** İlk belge alımında benzersiz görev taslağı oluşmalı. Belge kimliği, sayfa/alan kökeni ve çıkarım durumu korunmalı. Okunamayan veya çelişkili alanlar tahmin edilmeden insan teyidine gönderilmeli. Eksik materyal görev oluşturmayı engellememeli.

### P1 — Soru, yanıt, dayanak ve bulgu ilişkisi eksik

questionEvidence yalnızca mantıksal işarettir; kayıt, segment, zaman veya belge sayfası referansı değildir. Bulgular sabittir ve rapor içeriği düzenlenen yanıtlardan türememektedir.

**Gereksinim:** Question → Answer → EvidenceRef ilişkisi gerçek olmalı. Dayanak; görev, materyal, kaynak türü, sayfa veya ses zaman aralığı/segment kimliği taşımalı. Bulgu ve rapor paragrafı kaynağına geri izlenebilmelidir.

### P1 — Tek Rapor kanonik modelden üretilmiyor

A4 görünümü iki sabit sayfadır; soru yanıtları, materyaller, transkript düzeltmeleri, bulgular ve kalite kontrolle bağlı değildir. Dışa aktarma devre dışıdır.

**Gereksinim:** Tek görev için tek kanonik ReportDocument bulunmalı. A4 önizleme, DOCX/ODT/PDF çıktıları ve rapor kalite kontrolü aynı sürümlü modelden üretilmelidir. Ekler aynı rapor paketine bağlı olmalı; kaynak ve zaman bağı korunmalıdır.

### P1 — Rapor kontrol listesi gerçek koşullardan türemiyor

Kontrol kutuları bağımsız örnek durumlarıdır; zorunlu veri eksik olsa bile tamamlandı yapılabilir.

**Gereksinim:** Otomatik kontroller görev, materyal, transkript, dayanak, yanıt ve çıktı verisinden hesaplanmalı. İnsan onayı ayrı kaydedilmelidir. Kanıtlanmayan bir kontrol otomatik olarak geçti sayılamaz.

### P2 — Ses zamanı ve dalga biçimi tutarsız

Dalga biçimi etiketleri sabitken kayıt süreleri farklıdır. Tıklama gerçek zaman yerine segment sıra numarasını seçer. A-B döngüsü gerçek ses döngüsü yapmaz.

**Gereksinim:** Zamanlar ortak birimle, tercihen milisaniye veya örnek karesiyle saklanmalı. Oynatma, imleç, dalga biçimi ve segment seçimi aynı zaman eksenini kullanmalı. A-B tekrarının sınır ve sıfırlama davranışı tanımlanmalıdır.

### P2 — Belirsizlik ve öncelik filtreleri aynı koşula bağlı

Belirsizler filtresi priority işaretini kullanıyor. Düşük model güveni, örtüşen konuşma ve inceleme önceliği farklı kavramlardır.

**Gereksinim:** İnceleme durumu, belirsizlik ve öncelik nedeni ayrı alanlar olmalı; filtreler birbirinden bağımsız çalışmalıdır.

### P2 — Ses araçları gerçek işlem yapmıyor

Oynatıcı, gürültü azaltma, kanal seçimi ve spektrogram görsel durumdan ibaret.

**Gereksinim:** Orijinal ses değişmez kalmalı. İşlem türetilmiş kopyada yürütülmeli; araç, sürüm, parametre, kaynak ve çıktı özeti geçmişe yazılmalıdır. Doğrulanmamış araç devre dışı veya açıkça test bekliyor olmalıdır.

### P2 — Genel arama ve klavye kısayolu eksik

Arama görev başlığı, dosya numarası ve merci metniyle sınırlı; gösterilen ⌘K kısayolu uygulanmamış.

**Gereksinim:** Arama kapsamı doğru adlandırılmalı veya görev, materyal, transkript ve dosya referanslarında gerçek genel arama sunulmalıdır. Görünen kısayol çalışmalıdır.

### P2 — Erişilebilirlik örüntüleri tamamlanmamış

Dalga biçimi klavye eylemi olmadan düğme rolü ve tabIndex kullanıyor. Sekme/sekme paneli ilişkileri ve ok tuşlarıyla gezinme eksik; bazı aç/kapat kontrollerinin durum bilgisi yetersiz.

**Gereksinim:** Tüm eylemler klavyeyle kullanılmalı; odak yönetimi, ekran okuyucu adları, sekme ilişkileri, görünür odak ve kontrast otomatik ve manuel test edilmelidir.

### P2 — Okunabilirlik ve sentetik belge uyarısı

Bazı metinler 7–10 px düzeyinde. Resmî belgeye benzeyen sentetik önizlemede sayfa boyunca açık bir uyarı filigranı bulunmuyor.

**Gereksinim:** Türkçe içerik, yüzde 200 yakınlaştırma, kontrast ve dokunma hedefleri test edilmelidir. Sentetik sayfa ve dışa aktarım, “SENTETİK ÖRNEK — RESMÎ BELGE DEĞİLDİR” filigranı taşımalıdır.

### P2/P3 — Gerçek olmayan profil/ayar ve denetim yüzeyleri

Profil düzenleme, uzmanlık ekleme, kontrast/animasyon ayarları gerçek form veya kalıcı tercih üretmiyor. Kalite modelindeki bağımsız denetim görünümü arayüzde tamamlanmamış.

**Gereksinim:** Sunulan her kontrol çalışmalı; çalışmayan eylem düğme gibi gösterilmemelidir. Kalite modeli üç ayrı katmanda ele alınmalıdır: A — uzmanın kendi görev/rapor kontrolleri; B — bağımsız salt okunur inceleme paketi/sonucu; C — MİHENK ürününün sürüm kalite dosyası. Tam denetçi portalı ilk teslim için şart değildir.

### P3 — Otomatik uçtan uca ve görsel regresyon testi yok

Başarılı derleme ve paket üretimi tüm ekran yollarının veya kullanıcı davranışının doğru olduğunu kanıtlamaz.

**Gereksinim:** Kritik akışlarda uçtan uca test, klavye erişilebilirliği, farklı ekran boyutlarında görsel kanıt ve sentetik rapor çıktısı zorunludur. CI yeşil olması tek başına kabul değildir.

## 6. Korunacak tasarım kararları

1. Uzmanın kişisel profili, MİHENK modülleri ve motor/model yapılandırması ayrı katmanlardır.
2. Yeni görevlendirme zorunlu bir ileri-geri sihirbaz değildir; taslak erken oluşturulmalıdır.
3. Beklenen materyal ve teslim alınan materyal ayrıdır; eksik materyal görevi durdurmaz.
4. Kullanıcı tüm kayıtlara ve transkripte erişebilir; öncelik işareti doğruluk yüzdesi değildir.
5. Ham ASR metni ve insan düzeltmesi ayrı sürümlerdir.
6. Konuşmacı A/B grupları kimlik tespiti veya biyometrik eşleştirme değildir.
7. Serbest büyük dil modeli transkripsiyon kelimelerinin kaynağı değildir.
8. Orijinal ses korunur; iyileştirme türetilmiş kopya ve işlem iziyle yapılır.
9. Tek ana rapor ve aynı pakette ekler yaklaşımı korunur; tek zorunlu resmî şablon iddiası yoktur.
10. UYAP Editör aç/kaydet/yeniden aç kabulü geçmeden “UYAP'a hazır” denmez.
11. Nihai meslekî değerlendirme, imza ve resmî teslim bilirkişinin kontrolündedir.

## 7. Prototipin gerçek işlev sınırı

Prototipte gerçek belge yükleme/OCR, ses oynatma/işleme, ASR, kalıcı görev ve rapor kaydı, kasa yazımı, gerçek DOCX/ODT/PDF üretimi, e-imza veya UYAP dosyası/gönderimi yoktur. Bunlar görsel demodan üretim işlevi olarak çıkarılamaz.

## 8. Devir kararı

Çekme isteği #46 ve feat/wireframe-v0.5-workspace dalı bağımsız ürünün görsel referansı olarak korunmalıdır. Kod yeni depoya aynen taşınmamalı; kabul edilmiş ekran düzeni, metinler, renk ve etkileşim beklentileri referans alınarak uygulama sıfırdan kurulmalıdır.

Yeni uygulama için kanonik görsel kaynak src/prototype/MihenkStudio.tsx ve src/prototype/studio.css dosyalarıdır. Eski WireframePrototype.tsx ve wireframe.css yalnızca tarihsel referanstır.
