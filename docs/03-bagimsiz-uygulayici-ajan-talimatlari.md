# Bağımsız uygulayıcı ajan — görev ve teslim talimatları

## 1. Görev

MİHENK'in proje sahibi tarafından kabul edilen v0.5 Studio kullanıcı deneyimini koruyarak, yeni ve bağımsız GitHub deposunda uygulamayı sıfırdan geliştir.

Bu depo mevcut azmisahin-gov/mihenk uygulamasının yerine geçmez. İki geliştirme kanalı bağımsızdır.

## 2. Öncelik sırası

Uygulamada aşağıdaki girdiler esas alınır:

1. Proje sahibinin kabul ettiği v0.5 arayüz taslağı.
2. docs/01-arayuz-ve-urun-denetim-raporu.md içindeki bulgular ve görsel referans kararı.
3. Proje sahibi tarafından açıkça onaylanırsa docs/02-urun-ve-uygulama-sozlesmesi-v0.6-taslak.md.
4. 56.12 Kalite Güvencesi ve Denetim Modeli.

v0.6 sözleşmesi şu anda taslaktır. Proje sahibinin açık onayı gelmeden kapsamı kesinleşmiş kabul etme. Karar gerektiren konularda öneri, gerekçe, alternatif ve etkileri yaz; sessiz varsayım yapma.

## 3. Depo ve kanal sınırları

- Yeni depo temiz bir Git geçmişi ve bağımsız uygulama olarak geliştirilmelidir.
- Mevcut mihenk deposunun main, preview, sürüm ve güncelleyici akışlarına dokunma.
- mihenk çekme isteği #46'yı birleştirme, yeniden yazma veya kapatma.
- Mevcut uygulamanın kodunu otomatik kopyalayarak yeni uygulamanın temeli yapma. Kabul edilen kullanıcı deneyimini, metinleri, bilgi hiyerarşisini ve davranış kurallarını referans al.
- Gerekirse mevcut Rust/SEDA/kasa kodunun gelecekteki aktarımı için ayrı entegrasyon kararı hazırla.
- Gerçek vaka, kişi, ses, transkript veya rapor verisi kullanma. Yalnızca sentetik test verisi kullan.

## 4. Kanonik arayüz referansı

Yüksek doğruluklu Studio için esas kaynaklar:
- src/prototype/MihenkStudio.tsx
- src/prototype/studio.css

src/prototype/WireframePrototype.tsx ve wireframe.css önceki taslaklardır; aynı anda kanonik kaynak kabul edilmemelidir.

Kabul edilmiş ekran hiyerarşisini koru. Denetim raporunda kayıtlı görev yalıtımı, kaynak-dayanak, rapor, ses zamanı ve erişilebilirlik kusurlarını yeni uygulamada tekrar etme. Görselde yapılan değişikliği sessizce farklılaştırma; gerekçeyi ve etkisini karar kaydına yaz.

## 5. Mimari beklenti

- Tek masaüstü uygulaması içinde modüler alanlar ve Temiz Mimari sınırları kur.
- Arayüz, uygulama kullanım senaryoları, alan modeli ve altyapı adaptörlerini ayır.
- Her alt kayıt görev kimliğiyle kapsamlanmalı; seçili görev dışına veri sızmamalı.
- Dosya sistemi, yerel kasa, OCR/ASR, ses işleme, veri tabanı ve DOCX üretimi birbirinden ayrılabilir adaptörler olmalı.
- Her uzun iş için kalıcı durum, iptal, yeniden deneme, hata ve kurtarma davranışlarını tasarla.
- Her rapor sürümü dayandığı soru, yanıt, transkript, materyal ve dayanak sürümlerini göstermeli.
- Teknoloji kararlarını Mimari Karar Kaydı (ADR) ile belgele. İlk teslimatta gereksiz mikro hizmet kurma.

## 6. İlk teslimat — rapor odaklı dikey dilim

İlk aşamada tüm menüleri doldurmaya çalışma. Aşağıdaki senaryoyu baştan sona çalışır hâle getir:

1. Bir sentetik görevlendirme belgesiyle görev taslağı oluştur.
2. Aynı göreve iki sentetik ses kaydı bağla.
3. En az üç soruyu kaydet.
4. İki kayda ait zaman damgalı transkript segmentleri oluştur.
5. En az iki farklı kayıttan somut EvidenceRef dayanağı bağla.
6. En az iki bulgu oluştur ve sorular/dayanaklarla ilişkilendir.
7. Ham transkript ve en az bir insan düzeltme revizyonunu ayrı koru.
8. Tek bir ReportDocument oluştur; kaynak envanteri, yöntem, sorular, yanıtlar, dayanaklar, bulgular, sonuç ve ekleri bu modelde tut.
9. Aynı modelden A4 önizleme ve açılabilir, gerçek DOCX dosyası üret.
10. Eksik uzman kararı/alanı varsa kalite kontrolü uyarı veya engel vermeli; sahte tamamlanma üretme.
11. Arayüzde ve DOCX'te “SENTETİK ÖRNEK — RESMÎ BELGE DEĞİLDİR” ibaresini görünür tut.

## 7. Her çekme isteğinde zorunlu kanıt

- Birim ve entegrasyon testleri.
- Görevler arası veri sızıntısını engelleyen negatif test.
- Altın senaryo için üretilmiş DOCX dosyası.
- DOCX'in açıldığına ve sayfa düzeninin doğru olduğuna ilişkin görüntü/kanıt.
- İlgili ekranların masaüstü ve dar ekran görüntüleri.
- Kritik eylemler için uçtan uca test ve klavye erişilebilirliği kontrolü.
- Hata, bekleme, iptal, tekrar deneme ve boş durumların görünür kanıtı.
- Derleme ve CI sonucu.
- Değişen ürün davranışına ilişkin Türkçe belge ve gerekiyorsa Mimari Karar Kaydı.

Test edilmemiş bir işlevi tamamlandı olarak bildirme. CI'nın yeşil olması tek başına kabul değildir.

## 8. İlk teslimat kapsamı dışı

Bu ilk dilimde aşağıdakileri üretime hazırmış gibi gösterme:
- gerçek OCR motoru ve üretim kalitesinde belge çıkarımı,
- üretim ASR model kurulumu ve kıyaslama,
- gelişmiş ses iyileştirme/spektrogram araçları,
- UYAP portalına otomatik giriş veya gönderim,
- bağımsız denetçi portalı,
- pilot sertifikasyonu veya hukuki uygunluk iddiası.

Bu alanların sonraki aşamalar için mimari sınırlarını ve açık kararlarını belgeleyebilirsin. Gerçekten uygulanmayan kontrolleri arayüzde etkin düğme olarak gösterme.

## 9. Başlangıç sırası

1. Sözleşmedeki her gereksinimi benzersiz kimlikle gereksinim → ekran → alan modeli → test → kanıt matrisine bağla.
2. Görev izolasyonunu, varlık ilişkilerini ve durum makinelerini tasarla.
3. Teknoloji ve dosya biçimi kararlarını ADR olarak öner.
4. Altın sentetik senaryoyu sabitle ve ilk DOCX rapor çıktısını üret.
5. Rapor odaklı dikey dilimi uçtan uca tamamla.
6. Sonraki aşama kapsamını ve kalan riskleri açıkça yaz.

## 10. İletişim dili

Bu depodaki README, belgeler, iş kayıtları, çekme isteği açıklamaları, Mimari Karar Kayıtları, commit mesajları ve kullanıcıya görünen tüm metinler Türkçe olmalıdır. Kaynak kodla birebir eşleşmesi gereken teknik tanımlayıcıları (ör. ReportDocument, taskId, OCR, ASR, DOCX, Tauri) çevirmeden kullan; gerektiğinde Türkçe açıkla.

Uygulama sonunda teslim edilen her şeyin sentetik olduğunu, nelerin gerçekten çalıştığını ve hangi testlerle doğrulandığını açık biçimde bildir.
