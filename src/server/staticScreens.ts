/**
 * Statik ekran tanımları.
 *
 * İlk dikey dilimde tam işlevli olmayan ekranlar kaldırılmaz; kabul edilmiş
 * v0.5 görsel hiyerarşisi korunur. Ancak gerçek işlevi olmayan her kontrol
 * devre dışı veya "sonraki aşama" olarak işaretlenir (bkz. ADR-011, ADR-012).
 */

export type ScreenAvailability = "işlevli" | "kısmi" | "sonraki-aşama";

export interface StaticScreenItem {
  id: string;
  label: string;
  group: string;
  availability: ScreenAvailability;
  /** Bu ekranda gerçekten çalışan özellikler. */
  workingFeatures: string[];
  /** Devre dışı bırakılan ve nedeni açıkça yazılan özellikler. */
  disabledFeatures: { label: string; reason: string }[];
}

export const STATIC_SCREENS: StaticScreenItem[] = [
  {
    id: "overview",
    label: "Genel Bakış",
    group: "ÇALIŞMA ALANI",
    availability: "işlevli",
    workingFeatures: ["Görev sayıları gerçek görev verisinden türetilir", "Öncelikli çalışma kartı gerçek eksiklikten gelir"],
    disabledFeatures: [],
  },
  {
    id: "tasks",
    label: "Görevlerim",
    group: "ÇALIŞMA ALANI",
    availability: "işlevli",
    workingFeatures: ["Görev listesi ve durum filtresi gerçek veriyle çalışır"],
    disabledFeatures: [],
  },
  {
    id: "new-assignment",
    label: "Yeni Görevlendirme",
    group: "ÇALIŞMA ALANI",
    availability: "işlevli",
    workingFeatures: ["Belge alımı gerçek görev taslağı üretir", "Alanlar kaynağa bağlıdır", "Teyit kuyruğu çalışır"],
    disabledFeatures: [
      { label: "Otomatik OCR", reason: "Üretim OCR motoru bu aşamada kurulu değil; alanlar elle girilir ve teyit edilir." },
    ],
  },
  {
    id: "workspace",
    label: "Görev Çalışma Alanı",
    group: "ÇALIŞMA ALANI",
    availability: "işlevli",
    workingFeatures: ["Altı sekme gerçek görev verisiyle çalışır", "Görev değişiminde panel durumu sıfırlanır"],
    disabledFeatures: [],
  },
  {
    id: "profile",
    label: "Bilirkişi Profilim",
    group: "KİŞİSEL",
    availability: "sonraki-aşama",
    workingFeatures: [],
    disabledFeatures: [
      { label: "Profil düzenleme ve kaydetme", reason: "Kalıcı profil formu sonraki aşamada; ilk dilimde rapor dilimi önceliklidir." },
    ],
  },
  {
    id: "modules",
    label: "Uzmanlık Modülleri",
    group: "UZMANLIK",
    availability: "sonraki-aşama",
    workingFeatures: [],
    disabledFeatures: [{ label: "Modül kurulumu", reason: "Modül yönetimi sonraki aşamada." }],
  },
  {
    id: "engines",
    label: "Motorlar ve Modeller",
    group: "UZMANLIK",
    availability: "sonraki-aşama",
    workingFeatures: [],
    disabledFeatures: [
      { label: "OCR motoru", reason: "Üretim OCR motoru kurulu değil; doğrulanmamış motor etkinleştirilemez." },
      { label: "ASR modeli", reason: "Üretim ASR modeli kurulu değil; ham transkript sentetik veri olarak yüklenir." },
    ],
  },
  {
    id: "audio-tools",
    label: "Ses Araçları",
    group: "UZMANLIK",
    availability: "sonraki-aşama",
    workingFeatures: [],
    disabledFeatures: [
      { label: "Gürültü azaltma", reason: "Gelişmiş ses iyileştirme sonraki aşamada; türetilmiş kopya ve işlem izi gerektirir." },
      { label: "Spektrogram", reason: "Gelişmiş görselleştirme sonraki aşamada." },
      { label: "Kanal ayrımı", reason: "Sonraki aşamada; orijinal ses değiştirilmez." },
    ],
  },
  {
    id: "language-tools",
    label: "Dil ve Metin",
    group: "UZMANLIK",
    availability: "sonraki-aşama",
    workingFeatures: [],
    disabledFeatures: [
      { label: "Serbest metin modeli ayarları", reason: "Serbest büyük dil modeli transkripsiyon kelimesinin kaynağı değildir." },
    ],
  },
  {
    id: "test-history",
    label: "Test Geçmişi",
    group: "UZMANLIK",
    availability: "kısmi",
    workingFeatures: ["Kalite katmanı A (uzman görev/rapor kontrolü) gerçek veriden hesaplanır"],
    disabledFeatures: [
      { label: "Bağımsız denetçi portalı", reason: "Katman B portalı ilk teslimatta zorunlu değil; sonraki aşama sınırı belgelenmiştir." },
    ],
  },
  {
    id: "vault",
    label: "Kasa ve Güvenlik",
    group: "SİSTEM",
    availability: "sonraki-aşama",
    workingFeatures: ["Denetim izi (AuditEvent) kaydedilir"],
    disabledFeatures: [
      { label: "Şifreli kasa ve sır saklama", reason: "Kasa adaptörü sonraki aşamada; ilk dilimde sır saklanmaz." },
    ],
  },
  {
    id: "settings",
    label: "Uygulama Ayarları",
    group: "SİSTEM",
    availability: "kısmi",
    workingFeatures: ["Kenar çubuğu daraltma tercihi yerel olarak saklanır"],
    disabledFeatures: [
      { label: "Kontrast ve animasyon ayarları", reason: "Tema ayarları sonraki aşamada; hedef erişilebilirlik düzeyi ADR-008'de tanımlıdır." },
    ],
  },
];

export function listStaticScreens(): StaticScreenItem[] {
  return STATIC_SCREENS;
}

/** Kapsam dışı alanların dürüst listesi (bkz. ADR-011). */
export const OUT_OF_SCOPE_ITEMS = [
  "Üretim OCR motoru ve üretim kalitesinde belge çıkarımı",
  "Üretim ASR modeli kurulumu ve kıyaslaması",
  "Gelişmiş ses iyileştirme ve spektrogram araçları",
  "UYAP portalına otomatik giriş veya gönderim",
  "Bağımsız denetçi portalı",
  "Pilot sertifikasyonu veya hukuki uygunluk iddiası",
  "Şifreli kasa ve sır saklama",
  "Masaüstü kurulum paketi ve otomatik güncelleme",
];
