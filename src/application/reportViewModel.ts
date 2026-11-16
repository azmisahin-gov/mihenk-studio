/**
 * Rapor görünüm modeli.
 *
 * A4 önizleme ve DOCX çıktısı bu tek modelden üretilir; ayrı veri yolu yoktur
 * (bkz. ADR-005, MIH-REQ-RPT-002, MIH-REQ-RPT-003).
 */
import { SYNTHETIC_NOTICE } from "../domain/types.ts";

export interface ReportHeader {
  line1: string;
  authority: string;
  title: string;
  caseNumber: string;
  taskTitle: string;
  generatedAt: string;
  revisionNo: number;
  notice: string;
}

export interface ReportSection {
  id: string;
  heading: string;
  paragraphs: string[];
  /** Alt madde listesi (materyal envanteri gibi). */
  bullets: string[];
  /** Soru-yanıt çiftleri; soru bölümünde kullanılır. */
  qa: { question: string; answer: string; evidence: string[] }[];
  /** Dayanak referansları; bulgu bölümünde kullanılır. */
  findings: { code: string; title: string; description: string; severity: string; evidence: string[] }[];
  /** Bölümün dayandığı kayıt kimlikleri. */
  sourceRefs: string[];
  pageBreakBefore: boolean;
}

export interface ReportAppendixView {
  title: string;
  blocks: { heading: string; lines: string[] }[];
}

export interface ReportViewModel {
  header: ReportHeader;
  sections: ReportSection[];
  appendices: ReportAppendixView[];
  notice: string;
  revisionId: string;
  /** Sayfa düzeni doğrulaması için bölüm-sayfa eşlemesi. */
  pageCountHint: number;
}

export const REPORT_SECTION_IDS = [
  "gorevlendirme",
  "materyal",
  "yontem",
  "transkript",
  "sorular",
  "bulgular",
  "sonuc",
] as const;
export type ReportSectionId = (typeof REPORT_SECTION_IDS)[number];

export const SECTION_TITLES: Record<ReportSectionId, string> = {
  gorevlendirme: "I. GÖREVLENDİRME VE İNCELEME KONUSU",
  materyal: "II. İNCELENEN MATERYALLER",
  yontem: "III. YÖNTEM VE TEKNİK ARAÇLAR",
  transkript: "IV. SES KAYITLARININ ÇÖZÜMLENMESİ",
  sorular: "V. GÖREVLENDİRME SORULARININ YANITLANMASI",
  bulgular: "VI. İNCELEME BULGULARI",
  sonuc: "VII. SONUÇ",
};

export { SYNTHETIC_NOTICE };
