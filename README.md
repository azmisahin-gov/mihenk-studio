# MİHENK v0.5 Studio — bağımsız yeniden yapım deposu

Bu depo, proje sahibinin görsel yönünü kabul ettiği MİHENK v0.5 Studio deneyiminin **Türkçe ürün sözleşmesi temelinde, sıfırdan ve bağımsız olarak yeniden uygulanması** için hazırlanmıştır. Bu çalışma, mevcut `azmisahin-gov/mihenk` deposundan ayrı bir geliştirme kanalıdır.

> **Dil ilkesi:** Bu depodaki açıklamalar, ürün belgeleri, GitHub iş kayıtları, karar kayıtları ve kullanıcıya görünen metinler Türkçe yazılır. Kaynak kodla birebir eşleşmesi gereken sınıf, işlev, alan, dosya yolu, teknik kısaltma ve standart adları (ör. `ReportDocument`, `taskId`, OCR, ASR, DOCX, Tauri) özgün biçimde korunur.

## Nereden başlanmalı?

1. [Arayüz ve ürün denetim raporu](docs/01-arayuz-ve-urun-denetim-raporu.md) — v0.5 prototipinin kapsamı, doğrulanan davranışları, eksikleri ve korunacak tasarım kararları.
2. [Ürün ve uygulama sözleşmesi v0.6 (taslak)](docs/02-urun-ve-uygulama-sozlesmesi-v0.6-taslak.md) — yeni uygulamanın veri, davranış, güvenlik, rapor, mimari ve kabul kuralları.
3. [Bağımsız uygulayıcı ajan talimatları](docs/03-bagimsiz-uygulayici-ajan-talimatlari.md) — sıfırdan uygulama yapacak geliştirici/ajan için görev tanımı ve teslim koşulları.
4. [Türkçe dil ilkesi](DIL-ILKESI.md) — teknik tanımlayıcıların korunması ve proje metinlerinde Türkçe kullanım kuralları.

## Uygulama planı belgeleri (#1)

5. [Gereksinim izlenebilirlik matrisi](docs/04-gereksinim-izlenebilirlik-matrisi.md) — her gereksinimin benzersiz kimliği, önceliği ve gereksinim → ekran/akış → alan modeli → test → kabul kanıtı zinciri.
6. [Alan modeli ve durum makineleri](docs/05-alan-modeli-ve-durum-makineleri.md) — varlık ilişkileri ve görev/iş/materyal/transkript/rapor durum makineleri.
7. [Mimari Karar Kayıtları (ADR)](docs/06-mimari-karar-kayitlari.md) — teknoloji ve mimari kararların seçenek, gerekçe, sonuç ve riskleriyle önerisi.
8. [Açık kararlar ve riskler](docs/07-acik-kararlar-ve-riskler.md) — onay bekleyen kararlar, belirsiz noktalar ve risk kaydı.
9. [İlk teslimat iş listesi](docs/08-ilk-teslimat-is-listesi.md) — sonlu, sıralı, bağımlılıkları gösterilmiş iş kalemleri ve tamamlanma tanımları.

> Bu belgeler **taslaktır** ve proje sahibinin gözden geçirmesini bekler. v0.6 sözleşmesi onaylanmadan kapsam kesinleşmiş sayılmaz.

## Kaynak ve tasarım referansları

- İncelenen çekme isteği: [mihenk çekme isteği #46](https://github.com/azmisahin-gov/mihenk/pull/46)
- İncelenen kaynak dal: `feat/wireframe-v0.5-workspace`
- İncelenen uç commit: `824b95a4a7e7b423e95eff12c2f0263612614c6f`
- Proje sahibinin kabul ettiği tasarım: [MİHENK v0.5 arayüz taslağı belgesi](https://github.com/azmisahin-gov/mihenk-arge/blob/main/docs/02-urun/56-12-wireframe-v0.5.md)
- Kalite ve denetim yaklaşımı: [56.12 Kalite Güvencesi ve Denetim Modeli](https://github.com/azmisahin-gov/mihenk-arge/blob/main/docs/02-urun/56-12-kalite-ve-denetim-modeli-v1.0.md)
- Prototipin kapsam açıklaması: [v0.5 prototip notu](https://github.com/azmisahin-gov/mihenk/blob/feat/wireframe-v0.5-workspace/docs/ui-prototype-v0.5.md)

## Ürün ve depo sınırları

- Bu depo bağımsız yeniden yapım kanalıdır; mevcut `mihenk` uygulamasının yerine geçmiş sayılmaz.
- Mevcut `mihenk` deposunun `main`, `preview`, sürüm yayımlama ve güncelleyici akışlarına dokunulmaz. Çekme isteği #46 birleştirilmez ve kaynak dal yeniden yazılmaz.
- Mevcut uygulamanın kodu kopyalanıp yeni uygulamanın temeli yapılmaz. Kabul edilmiş kullanıcı deneyimi ve ürün kuralları referans alınır; uygulama sıfırdan geliştirilir.
- Gerçek kişi, dosya, ses, transkript veya bilirkişi raporu verisi kullanılmaz. Yalnızca açıkça sentetik olarak işaretlenmiş test verileri kullanılır.
- v0.6 sözleşmesi hâlâ taslaktır. Proje sahibinin açık onayı alınmadan kapsam kesinleştirilmiş veya ürün kabul edilmiş sayılmaz.

## İlk teslimat

İlk hedef, menüleri tek tek doldurmak değil; bir sentetik görev, iki ses kaydı, sorular, kaynak dayanakları ve bulgular üzerinden tek bir kanonik rapor üretmek; aynı veriden A4 önizleme ve çalışan DOCX çıktısı almaktır. Ayrıntılar [uygulama talimatlarında](docs/03-bagimsiz-uygulayici-ajan-talimatlari.md) açıklanmıştır.
