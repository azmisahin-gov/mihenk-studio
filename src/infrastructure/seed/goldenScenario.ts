/**
 * Altın sentetik senaryo (bkz. sözleşme bölüm 12, MIH-REQ-SNT-001).
 *
 * Bu sabit test verisi TAMAMEN SENTETİKTİR. Gerçek kişi, gerçek dava dosyası,
 * gerçek ses kaydı veya gerçek bilirkişi raporu içermez. Merci, kişi ve dosya
 * adları uydurmadır ve açıkça örnek olarak işaretlenmiştir.
 *
 * Senaryo içeriği:
 * - 1 sentetik görevlendirme belgesi (3 soru içerir)
 * - Aynı göreve bağlı 2 sentetik ses kaydı
 * - Her iki kayda dağıtılmış zaman damgalı segmentler
 * - Ham ASR + 1 insan düzeltme sürümü
 * - 2 farklı kayıttan somut dayanak referansları
 * - 2 bulgu
 */

export const SYNTHETIC_MARKER = "SENTETİK ÖRNEK — RESMÎ BELGE DEĞİLDİR";

export interface GoldenAssignmentField {
  key: string;
  value: string;
  sourcePage: number;
  sourceRegion: string;
  confidence: number;
  uncertain?: boolean;
}

export interface GoldenSegment {
  index: number;
  startMs: number;
  endMs: number;
  speakerLabel: string;
  /** Ham ASR metni. */
  rawText: string;
  /** İnsan düzeltmesi sonrası metin; düzeltme yoksa rawText ile aynıdır. */
  correctedText: string;
  uncertain?: boolean;
  priorityReason?: string | null;
}

export interface GoldenAudio {
  key: string;
  fileName: string;
  durationMs: number;
  sampleRateHz: number;
  channels: number;
  codec: string;
  originNote: string;
  segments: GoldenSegment[];
}

export interface GoldenQuestion {
  index: number;
  text: string;
  /** Bu sorunun yanıt metni. */
  answer: string;
}

export interface GoldenFinding {
  code: string;
  title: string;
  description: string;
  severity: "düşük" | "orta" | "yüksek";
  /** Hangi ses kaydı ve segment sırasına dayandığı. */
  evidence: { audioKey: string; segmentIndex: number; note: string }[];
}

export const GOLDEN_ASSIGNMENT = {
  title: "Sentetik ses kayıtlarının incelenmesi",
  caseNumber: "2026/9999 S. (SENTETİK)",
  authority: "Örnek Cumhuriyet Başsavcılığı (SENTETİK)",
  dueDate: "24 Kasım 2026",
  kind: "Cumhuriyet başsavcılığı (sentetik)",
  documentName: "Sentetik_Gorevlendirme_2026-9999.pdf",
  documentMimeType: "application/pdf",
  documentType: "Görevlendirme yazısı (sentetik)",
  pageCount: 2,
  fields: [
    {
      key: "Görevlendiren merci",
      value: "Örnek Cumhuriyet Başsavcılığı (SENTETİK)",
      sourcePage: 1,
      sourceRegion: "üst başlık",
      confidence: 0.97,
    },
    {
      key: "Dosya numarası",
      value: "2026/9999 S. (SENTETİK)",
      sourcePage: 1,
      sourceRegion: "dosya bilgisi",
      confidence: 0.95,
    },
    {
      key: "İnceleme konusu",
      value: "Sentetik ses kayıtlarının çözümlenmesi ve konuşmacı gruplarının belirlenmesi",
      sourcePage: 1,
      sourceRegion: "görevlendirme konusu",
      confidence: 0.93,
    },
    {
      key: "Rapor teslim tarihi",
      value: "24 Kasım 2026",
      sourcePage: 1,
      sourceRegion: "süre bilgisi",
      confidence: 0.9,
    },
    {
      // Okunamayan alan: teyit kuyruğuna gider, tahmin edilmez.
      key: "3. sorunun kapsamı",
      value: "",
      sourcePage: 2,
      sourceRegion: "soru listesi · üçüncü madde",
      confidence: 0.42,
      uncertain: true,
    },
  ] as GoldenAssignmentField[],
  expectedMaterials: [
    {
      label: "Sentetik kayıt A (telefon görüşmesi)",
      kind: "ses",
      sourceNote: "Görevlendirme belgesinden çıkarıldı (sentetik)",
    },
    {
      label: "Sentetik kayıt B (ortam kaydı)",
      kind: "ses",
      sourceNote: "Görevlendirme belgesinden çıkarıldı (sentetik)",
    },
  ],
  questions: [
    {
      index: 1,
      text: "İncelenen sentetik kayıtların konuşma içeriğini zaman damgalarıyla döküm hâlinde aktarınız.",
      answer:
        "Sentetik Kayıt A ve Sentetik Kayıt B için zaman damgalı dökümler Ek-1 ve Ek-2'de sunulmuştur. " +
        "Döküm, ham ASR sürümünün uzman tarafından incelenmesiyle oluşturulmuştur.",
    },
    {
      index: 2,
      text:
        "Kayıtlarda birden fazla konuşmacı grubu bulunup bulunmadığını, kimlik tespiti yapmaksızın belirtiniz.",
      answer:
        "Her iki sentetik kayıtta da kayıt içi anonim olarak iki konuşmacı grubu (Konuşmacı A ve Konuşmacı B) " +
        "ayırt edilmiştir. Bu gruplar kimlik tespiti veya biyometrik eşleştirme amacı taşımaz.",
    },
    {
      index: 3,
      text:
        "Kayıtlarda anlaşılmayan veya düşük güvenle çözümlenen bölümleri ve bunların zaman aralıklarını belirtiniz.",
      answer:
        "Sentetik Kayıt B'de 00:00:21.200–00:00:25.600 aralığında arka plan gürültüsü nedeniyle kelime sınırları " +
        "belirsizdir; bu bölüm 'duyulamayan' olarak işaretlenmiş ve metin uydurulmamıştır. " +
        "Sentetik Kayıt A'da 00:00:16.800–00:00:21.200 aralığında iki konuşma üst üste binmiştir.",
    },
  ] as GoldenQuestion[],
  audios: [
    {
      key: "kayit-a",
      fileName: "Sentetik_Kayit_A_telefon.wav",
      durationMs: 47_500,
      sampleRateHz: 16_000,
      channels: 1,
      codec: "WAV · PCM 16-bit",
      originNote: "Sentetik telefon görüşmesi kaydı (uydurma içerik)",
      segments: [
        {
          index: 0,
          startMs: 12_400,
          endMs: 16_800,
          speakerLabel: "Konuşmacı A",
          rawText: "Toplantının başlangıcında gündem maddelerini birlikte değerlendirelim.",
          correctedText: "Toplantının başlangıcında gündem maddelerini birlikte değerlendirelim.",
          priorityReason: "Düşük model güveni",
        },
        {
          index: 1,
          startMs: 16_800,
          endMs: 21_200,
          speakerLabel: "Konuşmacı B",
          rawText: "Önce kayıtların tarihlerini netleştirmemiz gerekiyor.",
          correctedText: "Önce kayıtların tarihlerini netleştirmemiz gerekiyor.",
          priorityReason: "Üst üste konuşma olasılığı",
        },
        {
          index: 2,
          startMs: 21_200,
          endMs: 25_600,
          speakerLabel: "Konuşmacı A",
          rawText: "Tamam, ilgili dosyayı tekrar kontrol ederim.",
          correctedText: "Tamam, ilgili dosyayı tekrar kontrol ederim.",
          priorityReason: null,
        },
        {
          index: 3,
          startMs: 25_600,
          endMs: 30_100,
          speakerLabel: "Konuşmacı B",
          rawText: "Teslim tarihini de not edelim.",
          correctedText: "Teslim tarihini de not edelim.",
          priorityReason: null,
        },
      ],
    },
    {
      key: "kayit-b",
      fileName: "Sentetik_Kayit_B_ortam.wav",
      durationMs: 62_000,
      sampleRateHz: 48_000,
      channels: 2,
      codec: "WAV · PCM 24-bit",
      originNote: "Sentetik ortam kaydı (uydurma içerik)",
      segments: [
        {
          index: 0,
          startMs: 5_200,
          endMs: 9_800,
          speakerLabel: "Konuşmacı A",
          rawText: "Ortam kaydında birden fazla ses kaynağı duyulmaktadır.",
          correctedText: "Ortam kaydında birden fazla ses kaynağı duyulmaktadır.",
          priorityReason: null,
        },
        {
          index: 1,
          startMs: 9_800,
          endMs: 14_500,
          speakerLabel: "Konuşmacı B",
          rawText: "Konuşmacı B, toplantı sırasındaki teknik durumu anlatıyor.",
          correctedText: "Konuşmacı B, toplantı sırasındaki teknik durumu anlatıyor.",
          priorityReason: "Elle kontrol işareti",
        },
        {
          index: 2,
          startMs: 21_200,
          endMs: 25_600,
          speakerLabel: "Konuşmacı A",
          rawText: "Arka plandaki konuşma nedeniyle bu bölüm yeniden dinlenmelidir.",
          correctedText: "Arka plandaki konuşma nedeniyle bu bölüm yeniden dinlenmelidir.",
          uncertain: true,
          priorityReason: "Belirsiz / duyulamayan bölüm",
        },
        {
          index: 3,
          startMs: 25_600,
          endMs: 31_000,
          speakerLabel: "Konuşmacı B",
          rawText: "Kayıt seviyesindeki değişim nedeniyle kelime sınırları kontrol edilmeli.",
          correctedText: "Kayıt seviyesindeki değişim nedeniyle kelime sınırları kontrol edilmeli.",
          priorityReason: "Ses kalitesi değişimi",
        },
      ],
    },
  ] as GoldenAudio[],
  findings: [
    {
      code: "B-01",
      title: "İki kayıtta da anonim konuşmacı grupları ayrışıyor",
      description:
        "Sentetik Kayıt A ve Sentetik Kayıt B'de kayıt içi anonim iki konuşmacı grubu ayırt edilmiştir. " +
        "Gruplar yalnızca o kayda özgüdür; kayıtlar arası biyometrik eşleştirme yapılmamıştır.",
      severity: "orta",
      evidence: [
        { audioKey: "kayit-a", segmentIndex: 1, note: "Konuşmacı B grubunun ilk belirgin konuşması" },
        { audioKey: "kayit-b", segmentIndex: 1, note: "Konuşmacı B grubunun ortam kaydındaki konuşması" },
      ],
    },
    {
      code: "B-02",
      title: "Ortam kaydında belirsiz zaman aralığı bulunuyor",
      description:
        "Sentetik Kayıt B'de 00:00:21.200–00:00:25.600 aralığında arka plan gürültüsü nedeniyle kelime sınırları " +
        "belirsizdir. Bu bölüm 'duyulamayan' olarak işaretlenmiş; metin tahmin edilmemiştir.",
      severity: "yüksek",
      evidence: [{ audioKey: "kayit-b", segmentIndex: 2, note: "Belirsiz olarak işaretlenen bölüm" }],
    },
  ] as GoldenFinding[],
  /** İnsan düzeltme revizyonunda değiştirilecek segmentler. */
  corrections: [
    {
      audioKey: "kayit-a",
      segmentIndex: 0,
      correctedText:
        "Toplantının başlangıcında gündem maddelerini birlikte değerlendirelim. (uzman düzeltmesi)",
      note: "Kısaltma açıldı, kelime sınırı düzeltildi.",
    },
    {
      audioKey: "kayit-b",
      segmentIndex: 0,
      correctedText: "Ortam kaydında birden fazla ses kaynağı duyulmaktadır. (uzman düzeltmesi)",
      note: "Cümle sonu düzeltildi.",
    },
  ],
  reportRevisionReason: "Altın sentetik senaryo: ilk rapor revizyonu",
};

export function goldenSegmentKey(audioKey: string, index: number): string {
  return `${audioKey}:${index}`;
}
