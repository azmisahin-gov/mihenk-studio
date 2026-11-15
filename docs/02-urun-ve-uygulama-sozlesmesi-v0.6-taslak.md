# MİHENK Studio v0.6 — ürün ve uygulama sözleşmesi (TASLAK)

**Durum:** Taslak — proje sahibinin açık onayı bekleniyor  
**Tarih:** 15 Kasım 2026  
**Kapsam:** v0.5 Studio kullanıcı deneyiminin bağımsız depoda sıfırdan uygulanması

> Bu belge onaylanmış nihai kapsam değildir. Proje sahibinin açık onayı alınmadan geliştirme kapsamı dondurulmuş, gereksinimler kesinleşmiş veya ürün kabul edilmiş sayılmaz.

## 1. Amaç ve ürün tanımı

MİHENK Studio; bilirkişinin görevlendirme belgelerini, beklenen ve teslim alınan materyalleri, ses kayıtlarını, ham ASR çıktısını, insan tarafından düzeltilmiş transkripti, soruları, bulguları, kaynak dayanaklarını ve rapor teslimatını görev bazında yönetmesini sağlayan yerel öncelikli masaüstü çalışma alanıdır.

Uygulama bilirkişinin meslekî kararını vermez. Kaynağı izlenebilir hâle getirir, tekrarlanabilir işlemleri destekler, eksiklikleri görünür kılar ve bilirkişinin inceleme/raporlama işini düzenler. Nihai değerlendirme, yanıt, imza ve resmî teslim kararı insanda kalır.

## 2. Temel ürün ilkeleri

1. **Görev merkezli:** Her materyal, kayıt, transkript, soru, yanıt, dayanak, bulgu ve rapor bir göreve aittir.
2. **Yerel öncelikli:** Dosyalar varsayılan olarak kullanıcının cihazında işlenir. Ağ gerektiren özellikler açıkça belirtilir ve kapalı ağda uygulama temel görevlerini kaybetmez.
3. **Kaynak izi:** Her çıkarım, metin, bulgu ve rapor ifadesi dayanağına geri izlenebilir.
4. **Orijinali koru:** Kaynak belge ve ses değişmez tutulur. Dönüştürme ve iyileştirme türetilmiş kopya üretir.
5. **İnsan denetimi:** OCR, ASR veya model sonucu uzman tarafından doğrulanmadan kesin bilgi sayılmaz.
6. **Açık belirsizlik:** Okunamayan veya duyulmayan içerik tahmin edilmez; belirsizlik görünür bırakılır.
7. **Tek rapor modeli:** A4 önizleme, DOCX/ODT/PDF çıktısı ve kalite kontrolü aynı kanonik rapor verisinden üretilir.
8. **Gösterilen kontrol çalışır:** Gerçek işlevi olmayan düğme veya ayar, çalışan özellik gibi sunulmaz.
9. **Sentetik test verisi:** Geliştirme ve otomatik testlerde gerçek kişi, dava, ses veya bilirkişi raporu verisi kullanılmaz.

## 3. Kullanıcı ve yetki sınırı

Birincil kullanıcı, kendi görev dosyalarını yöneten bilirkişidir. Uygulama uzman profilini, uzmanlık modüllerini ve motor/model yapılandırmasını birbirinden ayırır.

İlk teslimatın hedefi tek uzmanlı yerel kullanım ve rapor üretimidir. Birden çok kullanıcı arasında eşzamanlı görev paylaşımı, merkezi kurum yönetimi, uzaktan bilirkişi portalı ve bağımsız denetçi portalı ilk teslimata dahil değildir. Sonraki aşamalar için veri ve yetki sınırları ayrıca tasarlanır.

## 4. Ana ekran ve gezinme sözleşmesi

Kabul edilmiş v0.5 görsel hiyerarşisi esas alınır:

- Genel Bakış
- Görevlerim
- Yeni Görevlendirme
- Görev Çalışma Alanı
- Bilirkişi Profilim
- Uzmanlık Modülleri
- Motorlar ve Modeller
- Ses Araçları
- Dil ve Metin
- Test Geçmişi
- Kasa ve Güvenlik
- Uygulama Ayarları

Görev Çalışma Alanı şu alt sekmeleri içerir:

1. Görev Özeti
2. Görevlendirme
3. Materyaller
4. Ses ve Transkript
5. Sorular ve Bulgular
6. Tek Rapor

Her sekme aynı seçili görev kimliğiyle çalışır. Görev değiştirildiğinde tüm alt paneller yeni görevin verisini yükler; önceki görevin verisi görünmez ve işlem bağlamında taşınmaz.

## 5. Temel iş akışları

### 5.1 Görev oluşturma ve görevlendirme alımı

- Kullanıcı belgeyi içeri alır; dosya adı, türü, boyutu, özeti ve alım zamanı kaydedilir.
- İlk alımda benzersiz görev taslağı oluşturulur. Daha sonra düzenlenen alanlar taslak kaydına bağlıdır.
- OCR alanı, kaynak belge/sayfa/alan konumuyla ilişkilendirilir.
- Belirsiz alanlar tahminle doldurulmaz; teyit kuyruğuna alınır.
- Beklenen materyaller ile teslim alınan materyaller ayrı envanterlerdir.
- Eksik materyal görevin oluşturulmasını veya mevcut materyalin incelenmesini engellemez.
- Kullanıcı görevi açıkça başlatana kadar taslak durumunda kalabilir.

### 5.2 Materyal ve kaynak bütünlüğü

Her materyal görev, kaynak türü, özgün dosya özeti, MIME türü, boyut, alınma zamanı ve doğrulama durumu taşır. Özgün dosya üzerine yazılmaz. Yeniden adlandırma ve dönüştürme özgün kaynağı kaybetmemelidir.

Aynı dosyanın tekrar eklenmesi, yinelenen kayıt olarak belirlenmeli veya açık bir yeni sürüm ilişkisi kurulmalıdır. Kaynak belgenin hangi görevden geldiği ve hangi rapor/kanıt kayıtlarınca kullanıldığı izlenebilir olmalıdır.

### 5.3 OCR ve arka plan işleri

OCR sonucu; motor adı/sürümü, parametreler, sayfa, alan, koordinat, metin, güven/uyarı ve işlem zamanı ile saklanır. Kaynak metin korunur; insan düzeltmesi ayrı bir sürüm üretir.

Uzun işlemler kalıcı iş kuyruğunda yürütülür. Kuyruk en azından bekliyor, çalışıyor, başarıyla tamamlandı, uyarıyla tamamlandı, başarısız, iptal edildi ve yeniden deneme bekliyor durumlarını ayırt eder. İptal, yeniden deneme, uygulama kapanışı sonrası kurtarma ve aynı işin iki kez uygulanmasını engelleyen idempotency davranışı tanımlanmalıdır.

### 5.4 Ses ve transkript incelemesi

- Orijinal ses hiçbir araç tarafından değiştirilmez.
- ASR çıktısı ham ve salt okunur bir sürüm olarak saklanır.
- Uzmanın metin düzeltmesi yeni bir revizyon oluşturur; ham ASR silinmez.
- Segmentler başlangıç/bitiş zamanlarıyla ve kaynak kayıt kimliğiyle bağlıdır.
- Zaman gösterimi ve oynatma ekseni aynı birimi kullanır; milisaniye veya örnek karesi hassasiyeti korunur.
- Konuşmacı A/B etiketleri yalnızca o kayıt içindeki anonim gruplardır. Kimlik tespiti veya kayıtlar arası ses biyometrisi değildir.
- Belirsiz duyulan kelime uydurulmaz. Anlaşılmayan konuşma açıkça işaretlenir.
- Serbest büyük dil modeli (LLM), konuşmanın kelime kaynağı değildir; transkripsiyon uyduramaz veya ham metnin yerine geçemez.
- Gürültü azaltma, kanal ayrımı ve diğer işlemler geri alınabilir türetilmiş kopyalarda yürütülür; parametre ve işlem izi saklanır.

### 5.5 Sorular, yanıtlar, dayanaklar ve bulgular

Her soru bir görevle ilişkilidir. Her yanıt, yanıtlayan uzmanı, durumunu, sürümünü ve dayanaklarını taşır. Dayanak yalnızca işaret kutusu değildir; belirli materyal, belge sayfası/alanı veya ses kaydı/segment/zaman aralığına referans vermelidir.

Bulgu; açıklama, önem/durum, kaynak dayanakları ve ilgili sorularla bağ kurar. Kanıtsız bulgu üretimi kabul edilmez. Değiştirilen yanıt veya dayanak, rapora yansıyan sürümü belirgin biçimde güncellemelidir.

### 5.6 Tek Rapor ve ekler

Her görev için tek kanonik ReportDocument bulunur. Rapor aşağıdakileri içerir:

- görevlendirme ve kapsam bilgileri,
- materyal envanteri ve inceleme yöntemi,
- kayıt bazında transkript/döküm ekleri,
- sorular ve yanıtlar,
- bulgular ve dayanak referansları,
- sonuç ve uzman tarafından tamamlanan diğer bölümler,
- rapor sürümü, oluşturulma zamanı ve ek listesi.

A4 sayfa önizlemesi, DOCX/ODT/PDF çıktıları ve kalite kontrol sonucu aynı ReportDocument sürümünden üretilir. Önizlemede görünen veriyle dışa aktarılan dosya tutarlı olmalıdır. Uzman eksik alanları tamamlamadan uygulama raporu tamamlanmış gibi işaretleyemez.

İlk teslimatta gerçek ve açılabilir DOCX üretimi zorunludur. DOCX, Microsoft Word veya uyumlu bir görüntüleyicide açılmalı; sayfa düzeni ve Türkçe karakterler doğrulanmalıdır. ODT/PDF biçimleri mimaride düşünülür ancak ilk dikey dilimin zorunlu teslimatı DOCX'tir.

### 5.7 Kalite ve denetim

Kalite modeli üç ayrı katmanda ele alınır:

- **A — Uzman görev/rapor kontrolü:** Raporun dayanak, içerik, eksiklik ve teslim öncesi kontrolleri.
- **B — Bağımsız inceleme paketi:** Ayrı yetkili inceleyici için salt okunur dosya, kanıt ve sonuç paketi. İlk teslimatta portal zorunlu değildir.
- **C — Ürün kalite dosyası:** MİHENK sürümü, test sonuçları, bilinen sınırlamalar, derleme/dağıtım ve karar kayıtları.

Otomatik kontroller gerçek veriden türetilir. İnsan onayı ayrı olay ve kullanıcı bilgisiyle kaydedilir. Otomatik testin geçmesi uzman onayı anlamına gelmez.

## 6. Önerilen alan modeli

Aşağıdaki adlar tasarım tanımlayıcılarıdır; kesin şema Mimari Karar Kaydı ile netleştirilecektir:

| Varlık | Sorumluluk |
|---|---|
| Task | Görev kimliği, durum, tarihler ve üst bağlam. |
| AssignmentDocument | Görevlendirme belgesi ve alım bilgileri. |
| ExtractedField | OCR alanı, kaynak koordinatı ve teyit durumu. |
| ExpectedMaterial | Teslim alınması beklenen materyal. |
| Material | Gerçek kaynak dosya ve bütünlük bilgisi. |
| AudioRecord | Ses kaydı, süre, kanal ve kaynak özeti. |
| ProcessingJob | OCR/ASR/ses/rapor işinin durumu ve tekrar bilgisi. |
| TranscriptVersion | Ham ASR veya insan tarafından oluşturulan değişmez sürüm. |
| TranscriptSegment | Kayıt kimliği, zaman aralığı, konuşmacı grubu ve metin. |
| Question | Görevlendirme sorusu ve sırası. |
| Answer | Soruya verilen uzman yanıtı, durumu ve sürümü. |
| EvidenceRef | Belge sayfası/alanı veya ses segment/zaman dayanağı. |
| Finding | Uzman bulgusu ve dayanak ilişkileri. |
| ReportDocument | Raporun tek kanonik ve sürümlü veri modeli. |
| ReportRevision | Rapor değişikliği ve hangi kaynak sürümlerini kullandığı. |
| AuditEvent | Önemli kullanıcı/iş/çıktı olayının kaydı. |
| ExpertProfile | Kullanıcı profili ve yetkinlik bilgileri. |
| Module / EngineProfile | Uzmanlık modülü ve doğrulanmış araç yapılandırması. |

Tüm görev alt kayıtları Task kimliğiyle ilişkilidir. Görevler arası veri sorgusu açık bir yetki ve referans kuralı olmadan mümkün olmamalıdır.

## 7. Durum ve değişiklik kuralları

- Görev durumları: taslak, incelemede, beklemede, rapor hazırlanıyor, uzman onayı bekliyor, tamamlandı, arşivlendi.
- Materyal durumları: bekleniyor, alındı, doğrulandı, sorunlu, yinelenen.
- İş durumu: bekliyor, çalışıyor, uyarı, tamamlandı, başarısız, iptal edildi, yeniden deneme bekliyor.
- Transkript sürümleri değiştirilemez geçmiş olarak tutulur; yeni düzeltme yeni sürümdür.
- Rapor sürümü hangi soru/yanıt/dayanak/transkript sürümlerini kullandığını göstermelidir.
- İptal ve hata, özgün dosya veya önceki başarılı çıktıları silmemelidir.

## 8. Güvenlik ve mahremiyet

- Yerel kasa, sır ve hassas anahtarları güvenli saklama gereksinimlerine uygun korumalıdır.
- Orijinal dosyaların özeti alınır; bütünlük kontrolü ve dışa aktarma kayıtları tutulur.
- Uygulama kapatıldığında sürmekte olan işin durumu kaybolmamalıdır.
- Ağ servisi kullanılacaksa açıkça belirtilmeli; veri aktarımı kullanıcı bilgisi ve izin gerektirmelidir.
- Gerçek vaka verisi, bu depodaki testlere veya ekran görüntülerine eklenmemelidir.
- Örnek belge, rapor, ses ve ekran görüntüleri “SENTETİK ÖRNEK — RESMÎ BELGE DEĞİLDİR” işareti taşımalıdır.

## 9. İnsan kararı olarak kalacak işler

Uygulama aşağıdakileri otomatik tamamlamaz:

- bilirkişinin meslekî görüşü veya nihai kanaati,
- duyulmayan/okunmayan kelimenin tahmini,
- konuşmacının gerçek kimliği veya biyometrik ses eşleştirmesi,
- kanıtsız bulgu veya soru yanıtı üretimi,
- uzman imzası veya resmî teslim kararı,
- UYAP portalına otomatik giriş/gönderim,
- gerçek kabul testi yapılmadan “UYAP'a hazır” beyanı.

## 10. Mimari yön ve teknoloji kararları

Önerilen yön; tek masaüstü uygulaması, modüler alanlar ve Temiz Mimari sınırlarıdır. Arayüz, uygulama kullanım senaryoları, alan modeli ve altyapı adaptörleri birbirinden ayrılmalıdır. Dosya sistemi, yerel kasa, OCR/ASR motorları, ses işleme, veri tabanı ve DOCX üretimi ayrı adaptörler olarak tasarlanmalıdır.

Teknoloji seçimi karar kaydıyla kesinleşmelidir. Rust/Tauri, React/TypeScript ve yerel SQLite/şifreli kasa seçenekleri değerlendirilebilir; ancak bu taslak tek bir yığını onaylamaz. Mikro hizmet mimarisi ilk teslimat için varsayılan değildir.

## 11. Erişilebilirlik, kullanılabilirlik ve test

- Türkçe içerik, yüzde 200 yakınlaştırma ve dar ekranlarda okunabilir olmalıdır.
- Tüm kontroller klavyeyle kullanılmalı; odak sırası ve görünür odak korunmalıdır.
- Sekmeler ve sekme panelleri uygun erişilebilirlik ilişkilerine sahip olmalıdır.
- Hata, bekleme, iptal, yeniden deneme, boş durum ve kurtarma görünümleri tasarlanmalıdır.
- Görevler arası veri sızıntısı için negatif testler zorunludur.
- Gerçek sentetik senaryodan DOCX üretilmeli ve sayfa görüntüsüyle kanıtlanmalıdır.
- Uçtan uca testler, görsel regresyon ve klavye denetimi CI içinde yer almalıdır.
- Başarılı derleme tek başına kabul değildir.

## 12. Altın sentetik test senaryosu

İlk dikey dilim aşağıdaki sabit veri setini kullanmalıdır:

- bir sentetik görevlendirme belgesi,
- aynı göreve bağlı iki sentetik ses kaydı,
- en az üç soru,
- her iki kayda dağıtılmış zaman damgalı transkript segmentleri,
- iki farklı kayıttan en az iki somut dayanak referansı,
- en az iki bulgu,
- en az bir transkript düzeltme sürümü,
- en az bir rapor revizyonu.

Test verisinde gerçek ad, gerçek mahkeme dosyası, gerçek ses veya gerçek bilirkişi raporu bulunmamalıdır. Belge, arayüz ve dışa aktarılan DOCX açıkça sentetik olarak işaretlenmelidir.

## 13. Kabul ölçütleri

| Kimlik | Kabul ölçütü |
|---|---|
| K-01 | Yeni görev taslağı benzersiz kimlikle oluşturulur; kaynak belge bilgisi kaybolmaz. |
| K-02 | İki görev arasında materyal, kayıt, soru, dayanak veya rapor verisi sızmaz. |
| K-03 | Beklenen ve alınan materyal listeleri ayrı çalışır. |
| K-04 | Orijinal ses/dosya değişmez; türetilmiş çıktı kaynağına bağlıdır. |
| K-05 | Ham ASR ile insan düzeltmesi ayrı ve sürümlüdür. |
| K-06 | Segment zamanları gerçek kaydın zaman ekseniyle uyumludur. |
| K-07 | Sorular, yanıtlar, bulgular ve EvidenceRef ilişkileri izlenebilir. |
| K-08 | Tek ReportDocument bütün rapor görünüm ve çıktılarını besler. |
| K-09 | Üretilen DOCX açılır; sayfa düzeni ve Türkçe karakterler doğrulanır. |
| K-10 | Kalite kontrolleri eksik gerçek veriyi doğru biçimde engeller/uyarır. |
| K-11 | Kritik akışlar klavyeyle çalışır ve otomatik test edilir. |
| K-12 | Test, hata, iptal, yeniden deneme ve kurtarma kanıtları saklanır. |

## 14. İlk teslimat sırası

1. Gereksinim → ekran → alan modeli → test → kanıt izlenebilirlik matrisi oluştur.
2. Görev, kaynak, materyal, ses, transkript, soru, dayanak, bulgu ve rapor durum makinelerini netleştir.
3. Açık teknoloji ve mimari kararları Mimari Karar Kaydı ile çöz.
4. Altın sentetik senaryoyu sabitle ve ilk DOCX örneğini üret.
5. Tek kanonik ReportDocument, A4 önizleme ve DOCX çıktısını uçtan uca tamamla.
6. Sonraki aşamada OCR/ASR, ses araçları, kasa ve diğer ekranları gerçek işlevlerle genişlet.

İlk teslimatın amacı bütün menülerin dolu görünmesi değil, baştan sona çalışan ve kanıtlanabilir bir rapor dilimidir.

## 15. Açık kararlar

Aşağıdaki konular proje sahibinin/teknik sorumlunun onayıyla kesinleşmelidir:

- masaüstü kabuğu ve teknoloji yığını,
- yerel veri tabanı ve şifreli kasa seçimi,
- OCR/ASR motorlarının lisans, dil ve çevrim dışı çalışma koşulları,
- ses dosyası ve türetilmiş kopya biçimleri,
- rapor şablonu ve DOCX doğrulama platformları,
- yedekleme, geri yükleme ve denetim kaydı saklama süresi,
- bağımsız denetim paketi için sonraki aşama sınırı,
- erişilebilirlik hedef düzeyi ve test matrisi.

Bu kararlar belirsizken uygulayıcı “tamamlandı” iddiasında bulunamaz; önerisini, gerekçesini ve gerekli kabul kanıtını sunar.

---

**Kabul ilkesi:** Bir iş ancak kodu, testleri, sentetik rapor çıktısı, görsel kanıtı, hata/yanıt koşulları ve dokümantasyonu tamamlandığında biter. Sürekli bütünleştirme kontrollerinin yeşil olması tek başına ürün kabulü değildir.
