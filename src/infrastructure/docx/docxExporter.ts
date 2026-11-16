/**
 * DOCX rapor çıktısı (bkz. ADR-004, MIH-REQ-RPT-006, MIH-REQ-RPT-007).
 *
 * Çıktı, `ReportViewModel`'den programatik olarak üretilir; önizleme ile aynı
 * kaynak modeli paylaşır. Her sayfanın üst bilgisinde sentetik uyarı bulunur
 * (bkz. MIH-REQ-SNT-002).
 */
import {
  AlignmentType,
  Document,
  Footer,
  Header,
  HeadingLevel,
  PageBreak,
  PageNumber,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  BorderStyle,
} from "docx";
import type { ReportViewModel } from "../../application/reportViewModel.ts";

const FONT = "DejaVu Sans";
const SYNTHETIC = "SENTETİK ÖRNEK — RESMÎ BELGE DEĞİLDİR";

function noticeParagraph(): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 0 },
    children: [
      new TextRun({
        text: SYNTHETIC,
        bold: true,
        color: "AD5A52",
        size: 18,
        font: FONT,
      }),
    ],
  });
}

function heading(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true, size: 24, font: FONT })],
  });
}

function body(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 120 },
    alignment: AlignmentType.JUSTIFIED,
    children: [new TextRun({ text, size: 21, font: FONT })],
  });
}

function bullet(text: string): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 60 },
    children: [new TextRun({ text, size: 20, font: FONT })],
  });
}

function evidenceLine(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 40 },
    indent: { left: 360 },
    children: [new TextRun({ text: `→ ${text}`, size: 19, italics: true, font: FONT })],
  });
}

function metadataTable(vm: ReportViewModel): Table {
  const rows: [string, string][] = [
    ["Görevlendiren merci", vm.header.authority],
    ["Dosya numarası", vm.header.caseNumber],
    ["İnceleme konusu", vm.header.taskTitle],
    ["Rapor revizyonu", `Rev. ${vm.header.revisionNo}`],
    ["Oluşturma zamanı", vm.header.generatedAt],
  ];
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "D6DFD8" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "D6DFD8" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "D6DFD8" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "D6DFD8" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "E4EAE5" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "E4EAE5" },
    },
    rows: rows.map(
      ([label, value]) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 32, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: label, bold: true, size: 19, font: FONT })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 68, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: value, size: 19, font: FONT })] })],
            }),
          ],
        }),
    ),
  });
}

export function buildReportDocument(vm: ReportViewModel): Document {
  const children: (Paragraph | Table)[] = [];

  // Kapak başlığı
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [new TextRun({ text: vm.header.line1, size: 22, font: FONT })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({ text: vm.header.authority.toLocaleUpperCase("tr-TR"), bold: true, size: 24, font: FONT }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [new TextRun({ text: vm.header.title, bold: true, size: 28, font: FONT })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({ text: `Dosya No: ${vm.header.caseNumber}`, size: 21, font: FONT }),
      ],
    }),
    noticeParagraph(),
    new Paragraph({ spacing: { after: 200 }, children: [] }),
    metadataTable(vm),
    new Paragraph({ spacing: { after: 200 }, children: [] }),
  );

  for (const section of vm.sections) {
    if (section.pageBreakBefore) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
      children.push(noticeParagraph());
      children.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
    }
    children.push(heading(section.heading));
    for (const paragraph of section.paragraphs) children.push(body(paragraph));
    for (const item of section.bullets) children.push(bullet(item));
    for (const qa of section.qa) {
      children.push(new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: qa.question, bold: true, size: 21, font: FONT })] }));
      children.push(body(qa.answer));
      for (const evidence of qa.evidence) children.push(evidenceLine(evidence));
    }
    for (const finding of section.findings) {
      children.push(
        new Paragraph({
          spacing: { before: 80, after: 60 },
          children: [
            new TextRun({ text: `${finding.code} · ${finding.title} (önem: ${finding.severity})`, bold: true, size: 21, font: FONT }),
          ],
        }),
      );
      children.push(body(finding.description));
      for (const evidence of finding.evidence) children.push(evidenceLine(evidence));
    }
  }

  // Ekler
  for (const appendix of vm.appendices) {
    children.push(new Paragraph({ children: [new PageBreak()] }));
    children.push(noticeParagraph());
    children.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
    children.push(heading(appendix.title));
    for (const block of appendix.blocks) {
      children.push(
        new Paragraph({
          spacing: { before: 120, after: 60 },
          children: [new TextRun({ text: block.heading, bold: true, size: 21, font: FONT })],
        }),
      );
      for (const line of block.lines) children.push(body(line));
    }
  }

  // İmza alanı — yalnızca görsel; e-imza veya resmî teslim değildir.
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(noticeParagraph());
  children.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
  children.push(heading("İMZA VE TESLİM"));
  children.push(
    body(
      "Nihai meslekî değerlendirme, imza ve resmî teslim kararı bilirkişinin kontrolündedir. " +
        "Bu belge bir taslaktır ve resmî işlem için kullanılamaz.",
    ),
  );
  children.push(new Paragraph({ spacing: { before: 400 }, children: [] }));
  children.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: "Bilirkişi", bold: true, size: 21, font: FONT })],
    }),
  );
  children.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: "Ad Soyad · Sicil No", size: 19, font: FONT })],
    }),
  );
  children.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 240 },
      children: [
        new TextRun({
          text: "İMZA ALANI · TASLAK (elektronik imza uygulanmamıştır)",
          size: 18,
          italics: true,
          color: "7A8980",
          font: FONT,
        }),
      ],
    }),
  );

  return new Document({
    creator: "MİHENK Studio",
    title: `${vm.header.title} · ${vm.header.caseNumber}`,
    description: SYNTHETIC,
    styles: {
      default: {
        document: {
          run: { font: FONT, size: 21 },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1134, right: 1134, bottom: 1134, left: 1418 },
          },
        },
        headers: {
          default: new Header({
            children: [noticeParagraph()],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: `${SYNTHETIC} · Sayfa `, size: 16, color: "7A8980", font: FONT }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "7A8980", font: FONT }),
                  new TextRun({ text: " / ", size: 16, color: "7A8980", font: FONT }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: "7A8980", font: FONT }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });
}

export async function renderDocxBytes(vm: ReportViewModel): Promise<Uint8Array> {
  const document = buildReportDocument(vm);
  const buffer = await Packer.toBuffer(document);
  return new Uint8Array(buffer);
}
