/**
 * Arayüz veri istemcisi.
 *
 * Arayüz yalnızca bu istemci üzerinden uygulama katmanına erişir; doğrudan
 * veri tabanı veya dosya sistemine erişmez (bkz. ADR-002).
 */

export interface TaskSummary {
  taskId: string;
  title: string;
  caseNumber: string;
  authority: string;
  dueDate: string;
  status: string;
  kind: string;
  synthetic: boolean;
  createdAt: string;
  updatedAt: string;
  counts: {
    materials: number;
    audios: number;
    questions: number;
    answers: number;
    evidence: number;
    findings: number;
    segments: number;
    pendingConfirmation: number;
    unreviewedSegments: number;
  };
  approved: boolean;
}

export interface SegmentView {
  segmentId: string;
  taskId: string;
  versionId: string;
  audioId: string;
  index: number;
  startMs: number;
  endMs: number;
  speakerLabel: string;
  text: string;
  uncertain: boolean;
  reviewState: string;
  priorityReason: string | null;
  note: string;
}

export interface EvidenceView {
  evidenceId: string;
  taskId: string;
  kind: "belge" | "ses-segmenti";
  materialId?: string;
  page?: number;
  region?: string;
  audioId?: string;
  segmentId?: string;
  startMs?: number;
  endMs?: number;
  note: string;
  createdAt: string;
  label: string;
}

export interface TaskBundleView {
  task: {
    taskId: string;
    title: string;
    caseNumber: string;
    authority: string;
    dueDate: string;
    status: string;
    kind: string;
    synthetic: boolean;
    createdAt: string;
    updatedAt: string;
  };
  assignments: {
    assignmentId: string;
    taskId: string;
    materialId: string;
    documentType: string;
    pageCount: number;
    receivedAt: string;
    extractionStatus: string;
  }[];
  fields: {
    fieldId: string;
    key: string;
    value: string;
    sourcePage: number;
    sourceRegion: string;
    confidence: number;
    confirmation: string;
  }[];
  expectedMaterials: { expectedId: string; label: string; kind: string; sourceNote: string; status: string }[];
  materials: {
    materialId: string;
    originalName: string;
    storedName: string;
    mimeType: string;
    sizeBytes: number;
    sha256: string;
    receivedAt: string;
    kind: string;
    status: string;
  }[];
  audios: {
    audioId: string;
    materialId: string;
    durationMs: number;
    sampleRateHz: number;
    channels: number;
    codec: string;
    originNote: string;
    sha256: string;
    fileName: string;
  }[];
  transcriptVersions: {
    versionId: string;
    audioId: string;
    kind: string;
    source: string;
    createdBy: string;
    createdAt: string;
    note: string;
  }[];
  latestSegments: SegmentView[];
  rawSegments: SegmentView[];
  questions: { questionId: string; index: number; text: string; sourceNote: string }[];
  answers: {
    answerId: string;
    questionId: string;
    text: string;
    status: string;
    version: number;
    answeredBy: string;
    updatedAt: string;
  }[];
  evidence: EvidenceView[];
  findings: {
    findingId: string;
    code: string;
    title: string;
    description: string;
    severity: string;
    status: string;
    createdAt: string;
  }[];
  findingEvidence: { findingId: string; evidenceId: string }[];
  answerEvidence: { answerId: string; evidenceId: string }[];
  approved: boolean;
}

export interface QualityCheckView {
  checkId: string;
  code: string;
  label: string;
  status: "geçti" | "uyarı" | "engel" | "bekliyor";
  detail: string;
  computedFrom: string[];
}

export interface ReportView {
  viewModel: {
    header: {
      line1: string;
      authority: string;
      title: string;
      caseNumber: string;
      taskTitle: string;
      generatedAt: string;
      revisionNo: number;
      notice: string;
    };
    sections: {
      id: string;
      heading: string;
      paragraphs: string[];
      bullets: string[];
      qa: { question: string; answer: string; evidence: string[] }[];
      findings: { code: string; title: string; description: string; severity: string; evidence: string[] }[];
      sourceRefs: string[];
      pageBreakBefore: boolean;
    }[];
    appendices: { title: string; blocks: { heading: string; lines: string[] }[] }[];
    notice: string;
    revisionId: string;
    pageCountHint: number;
  };
  checks: QualityCheckView[];
  summary: { blocking: number; warnings: number; pending: number; passed: number };
  status: string;
  revisionNo: number;
  approvals: { approvalId: string; kind: string; actorName: string; occurredAt: string; note: string }[];
}

export interface ScreenMeta {
  id: string;
  label: string;
  group: string;
  availability: "işlevli" | "kısmi" | "sonraki-aşama";
  workingFeatures: string[];
  disabledFeatures: { label: string; reason: string }[];
}

export interface ApiError extends Error {
  status: number;
}

export class ApiClient {
  constructor(
    private readonly baseUrl = "",
    private readonly token = "",
  ) {}

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        ...(this.token ? { "x-mihenk-token": this.token } : {}),
        ...(init.headers ?? {}),
      },
    });
    if (!response.ok) {
      let message = `İstek başarısız (${response.status})`;
      try {
        const body = (await response.json()) as { error?: string };
        if (body.error) message = body.error;
      } catch {
        // gövde okunamadı; varsayılan mesaj kullanılır
      }
      const error = new Error(message) as ApiError;
      error.status = response.status;
      throw error;
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return (await response.json()) as T;
    }
    return (await response.arrayBuffer()) as unknown as T;
  }

  health(): Promise<{ ok: boolean }> {
    return this.request("/api/health");
  }

  meta(): Promise<{ screens: ScreenMeta[] }> {
    return this.request("/api/meta");
  }

  listTasks(): Promise<TaskSummary[]> {
    return this.request("/api/tasks");
  }

  getTask(taskId: string): Promise<{ summary: TaskSummary; bundle: TaskBundleView }> {
    return this.request(`/api/tasks/${encodeURIComponent(taskId)}`);
  }

  createTask(payload: Record<string, unknown>): Promise<{ taskId: string; pendingConfirmation: number }> {
    return this.request("/api/tasks", { method: "POST", body: JSON.stringify(payload) });
  }

  confirmField(taskId: string, fieldId: string, value: string): Promise<{ ok: boolean }> {
    return this.request(`/api/tasks/${encodeURIComponent(taskId)}/fields/${encodeURIComponent(fieldId)}/confirm`, {
      method: "POST",
      body: JSON.stringify({ value }),
    });
  }

  saveAnswer(
    taskId: string,
    questionId: string,
    text: string,
    complete: boolean,
  ): Promise<{ answerId: string; status: string }> {
    return this.request(`/api/tasks/${encodeURIComponent(taskId)}/answers`, {
      method: "POST",
      body: JSON.stringify({ questionId, text, complete }),
    });
  }

  createEvidence(taskId: string, payload: Record<string, unknown>): Promise<{ evidenceId: string }> {
    return this.request(`/api/tasks/${encodeURIComponent(taskId)}/evidence`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  createFinding(
    taskId: string,
    payload: { code: string; title: string; description: string; severity: string; evidenceIds: string[] },
  ): Promise<{ findingId: string }> {
    return this.request(`/api/tasks/${encodeURIComponent(taskId)}/findings`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  verifyFinding(taskId: string, findingId: string, note: string): Promise<{ ok: boolean }> {
    return this.request(
      `/api/tasks/${encodeURIComponent(taskId)}/findings/${encodeURIComponent(findingId)}/verify`,
      { method: "POST", body: JSON.stringify({ note }) },
    );
  }

  linkAnswerEvidence(taskId: string, answerId: string, evidenceId: string): Promise<{ ok: boolean }> {
    return this.request(
      `/api/tasks/${encodeURIComponent(taskId)}/answers/${encodeURIComponent(answerId)}/evidence`,
      { method: "POST", body: JSON.stringify({ evidenceId }) },
    );
  }

  saveCorrection(
    taskId: string,
    audioId: string,
    note: string,
    corrections: { segmentId: string; text: string; uncertain?: boolean }[],
  ): Promise<{ versionId: string; kind: string }> {
    return this.request(`/api/tasks/${encodeURIComponent(taskId)}/transcript/corrections`, {
      method: "POST",
      body: JSON.stringify({ audioId, note, corrections }),
    });
  }

  getReport(taskId: string): Promise<ReportView> {
    return this.request(`/api/tasks/${encodeURIComponent(taskId)}/report`);
  }

  buildReport(taskId: string, reason: string): Promise<{ reportId: string; revisionId: string; status: string }> {
    return this.request(`/api/tasks/${encodeURIComponent(taskId)}/report/build`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  }

  approveReport(taskId: string, note: string): Promise<{ ok: boolean }> {
    return this.request(`/api/tasks/${encodeURIComponent(taskId)}/report/approve`, {
      method: "POST",
      body: JSON.stringify({ note }),
    });
  }

  async exportDocx(taskId: string): Promise<{ bytes: Uint8Array; fileName: string; pageCount: number; notice: string }> {
    const response = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/report/export`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(this.token ? { "x-mihenk-token": this.token } : {}),
      },
      body: JSON.stringify({}),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({ error: "Dışa aktarma başarısız." }))) as { error?: string };
      throw new Error(body.error ?? "Dışa aktarma başarısız.");
    }
    const buffer = new Uint8Array(await response.arrayBuffer());
    return {
      bytes: buffer,
      fileName: decodeURIComponent(
        (response.headers.get("content-disposition") ?? "").replace(/.*filename="?([^";]+)"?.*/, "$1"),
      ),
      pageCount: Number(response.headers.get("x-mihenk-page-count") ?? "0"),
      notice: response.headers.get("x-mihenk-notice") ?? "",
    };
  }

  listJobs(taskId: string): Promise<
    { jobId: string; kind: string; status: string; progress: number; errorMessage?: string }[]
  > {
    return this.request(`/api/tasks/${encodeURIComponent(taskId)}/jobs`);
  }

  cancelJob(taskId: string, jobId: string): Promise<{ ok: boolean }> {
    return this.request(`/api/tasks/${encodeURIComponent(taskId)}/jobs/${encodeURIComponent(jobId)}/cancel`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  }
}
