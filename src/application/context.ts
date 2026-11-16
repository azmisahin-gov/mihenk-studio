/**
 * Uygulama kullanım senaryoları (use-case) ortak bağımlılıkları.
 */
import type { Database } from "../infrastructure/db/database.ts";
import type { Clock, HashProvider, IdGenerator } from "../infrastructure/providers.ts";
import type { FileStore } from "../infrastructure/fs/fileStore.ts";
import { TaskRepository } from "../infrastructure/repositories/taskRepository.ts";
import { JobRepository, AuditRepository } from "../infrastructure/repositories/jobRepository.ts";
import { TaskScope } from "../infrastructure/repositories/base.ts";
import {
  AssignmentRepository,
  ExpectedMaterialRepository,
  ExtractedFieldRepository,
  MaterialRepository,
  DerivedArtifactRepository,
} from "../infrastructure/repositories/materialRepository.ts";
import { AudioRepository, TranscriptRepository } from "../infrastructure/repositories/audioRepository.ts";
import {
  AnswerRepository,
  EvidenceRepository,
  FindingRepository,
  QuestionRepository,
} from "../infrastructure/repositories/questionRepository.ts";
import { ReportRepository } from "../infrastructure/repositories/reportRepository.ts";

export interface AppContext {
  db: Database;
  clock: Clock;
  ids: IdGenerator;
  hash: HashProvider;
  files: FileStore;
}

/** Bir görevin tüm depolarını görev kapsamıyla birlikte döndürür. */
export function repositoriesFor(ctx: AppContext, taskId: string) {
  const scope = TaskScope.of(taskId);
  return {
    scope,
    tasks: new TaskRepository(ctx.db),
    assignments: new AssignmentRepository(ctx.db, scope),
    fields: new ExtractedFieldRepository(ctx.db, scope),
    expectedMaterials: new ExpectedMaterialRepository(ctx.db, scope),
    materials: new MaterialRepository(ctx.db, scope),
    derivedArtifacts: new DerivedArtifactRepository(ctx.db, scope),
    audios: new AudioRepository(ctx.db, scope),
    transcripts: new TranscriptRepository(ctx.db, scope),
    questions: new QuestionRepository(ctx.db, scope),
    answers: new AnswerRepository(ctx.db, scope),
    evidence: new EvidenceRepository(ctx.db, scope),
    findings: new FindingRepository(ctx.db, scope),
    reports: new ReportRepository(ctx.db, scope),
    jobs: new JobRepository(ctx.db),
    audit: new AuditRepository(ctx.db),
  };
}

export type TaskRepositories = ReturnType<typeof repositoriesFor>;

export interface Actor {
  name: string;
  role: string;
}

export const DEFAULT_ACTOR: Actor = { name: "Örnek Bilirkişi", role: "bilirkişi" };

export function audit(
  repos: TaskRepositories,
  ctx: AppContext,
  taskId: string,
  actor: Actor,
  action: string,
  entityType: string,
  entityId: string,
  detail: Record<string, unknown> = {},
): void {
  repos.audit.append({
    eventId: ctx.ids.next("audit"),
    taskId,
    at: ctx.clock.now(),
    actor: actor.name,
    action,
    entityType,
    entityId,
    detailJson: JSON.stringify(detail),
  });
}
