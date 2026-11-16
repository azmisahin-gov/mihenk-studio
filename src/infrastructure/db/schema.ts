/**
 * SQLite şeması (bkz. ADR-003, docs/05-alan-modeli-ve-durum-makineleri.md).
 *
 * Görev yalıtımı şema düzeyinde zorunludur: her alt kayıt tablosunda `task_id`
 * NOT NULL yabancı anahtardır. Değişmez kayıtlar (transkript sürümü, rapor
 * revizyonu, denetim olayı) yalnızca eklenir; güncelleme tetikleyicilerle
 * engellenir.
 */

export const SCHEMA_VERSION = 1;

export const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS task (
  task_id     TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  case_number TEXT NOT NULL,
  authority   TEXT NOT NULL,
  due_date    TEXT NOT NULL,
  status      TEXT NOT NULL,
  kind        TEXT NOT NULL,
  synthetic   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS assignment_document (
  assignment_id     TEXT PRIMARY KEY,
  task_id           TEXT NOT NULL REFERENCES task(task_id) ON DELETE CASCADE,
  material_id       TEXT NOT NULL,
  document_type     TEXT NOT NULL,
  page_count        INTEGER NOT NULL,
  received_at       TEXT NOT NULL,
  extraction_status TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_assignment_task ON assignment_document(task_id);

CREATE TABLE IF NOT EXISTS extracted_field (
  field_id      TEXT PRIMARY KEY,
  task_id       TEXT NOT NULL REFERENCES task(task_id) ON DELETE CASCADE,
  assignment_id TEXT NOT NULL REFERENCES assignment_document(assignment_id) ON DELETE CASCADE,
  key           TEXT NOT NULL,
  value         TEXT NOT NULL,
  source_page   INTEGER NOT NULL,
  source_region TEXT NOT NULL,
  confidence    REAL NOT NULL,
  confirmation  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_field_task ON extracted_field(task_id);

CREATE TABLE IF NOT EXISTS expected_material (
  expected_id TEXT PRIMARY KEY,
  task_id     TEXT NOT NULL REFERENCES task(task_id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  kind        TEXT NOT NULL,
  source_note TEXT NOT NULL,
  status      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_expected_task ON expected_material(task_id);

CREATE TABLE IF NOT EXISTS material (
  material_id   TEXT PRIMARY KEY,
  task_id       TEXT NOT NULL REFERENCES task(task_id) ON DELETE CASCADE,
  original_name TEXT NOT NULL,
  stored_name   TEXT NOT NULL,
  mime_type     TEXT NOT NULL,
  size_bytes    INTEGER NOT NULL,
  sha256        TEXT NOT NULL,
  received_at   TEXT NOT NULL,
  kind          TEXT NOT NULL,
  status        TEXT NOT NULL,
  duplicate_of  TEXT,
  supersedes    TEXT
);
CREATE INDEX IF NOT EXISTS idx_material_task ON material(task_id);
CREATE INDEX IF NOT EXISTS idx_material_sha ON material(task_id, sha256);

CREATE TABLE IF NOT EXISTS derived_artifact (
  artifact_id        TEXT PRIMARY KEY,
  task_id            TEXT NOT NULL REFERENCES task(task_id) ON DELETE CASCADE,
  source_material_id TEXT NOT NULL,
  job_id             TEXT,
  kind               TEXT NOT NULL,
  params_json        TEXT NOT NULL,
  sha256             TEXT NOT NULL,
  created_at         TEXT NOT NULL,
  reversible         INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_artifact_task ON derived_artifact(task_id);

CREATE TABLE IF NOT EXISTS audio_record (
  audio_id       TEXT PRIMARY KEY,
  task_id        TEXT NOT NULL REFERENCES task(task_id) ON DELETE CASCADE,
  material_id    TEXT NOT NULL,
  duration_ms    INTEGER NOT NULL,
  sample_rate_hz INTEGER NOT NULL,
  channels       INTEGER NOT NULL,
  codec          TEXT NOT NULL,
  origin_note    TEXT NOT NULL,
  sha256         TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audio_task ON audio_record(task_id);

CREATE TABLE IF NOT EXISTS processing_job (
  job_id            TEXT PRIMARY KEY,
  task_id           TEXT NOT NULL REFERENCES task(task_id) ON DELETE CASCADE,
  kind              TEXT NOT NULL,
  status            TEXT NOT NULL,
  idempotency_key   TEXT NOT NULL,
  attempt           INTEGER NOT NULL DEFAULT 0,
  max_attempts      INTEGER NOT NULL DEFAULT 3,
  progress          REAL NOT NULL DEFAULT 0,
  error_code        TEXT,
  error_message     TEXT,
  created_at        TEXT NOT NULL,
  started_at        TEXT,
  finished_at       TEXT,
  cancel_requested  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_job_task ON processing_job(task_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_job_idempotency ON processing_job(task_id, idempotency_key);

CREATE TABLE IF NOT EXISTS transcript_version (
  version_id          TEXT PRIMARY KEY,
  task_id             TEXT NOT NULL REFERENCES task(task_id) ON DELETE CASCADE,
  audio_id            TEXT NOT NULL REFERENCES audio_record(audio_id) ON DELETE CASCADE,
  kind                TEXT NOT NULL,
  source              TEXT NOT NULL,
  created_by          TEXT NOT NULL,
  created_at          TEXT NOT NULL,
  previous_version_id TEXT,
  note                TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tversion_task ON transcript_version(task_id);

CREATE TRIGGER IF NOT EXISTS trg_tversion_immutable
BEFORE UPDATE ON transcript_version
BEGIN
  SELECT RAISE(ABORT, 'Transkript sürümü değiştirilemez');
END;

CREATE TRIGGER IF NOT EXISTS trg_tversion_no_delete
BEFORE DELETE ON transcript_version
WHEN OLD.kind = 'ham-asr'
BEGIN
  SELECT RAISE(ABORT, 'Ham ASR sürümü silinemez');
END;

CREATE TABLE IF NOT EXISTS transcript_segment (
  segment_id     TEXT PRIMARY KEY,
  task_id        TEXT NOT NULL REFERENCES task(task_id) ON DELETE CASCADE,
  version_id     TEXT NOT NULL REFERENCES transcript_version(version_id) ON DELETE CASCADE,
  audio_id       TEXT NOT NULL REFERENCES audio_record(audio_id) ON DELETE CASCADE,
  idx            INTEGER NOT NULL,
  start_ms       INTEGER NOT NULL,
  end_ms         INTEGER NOT NULL,
  speaker_label  TEXT NOT NULL,
  text           TEXT NOT NULL,
  uncertain      INTEGER NOT NULL DEFAULT 0,
  review_state   TEXT NOT NULL,
  priority_reason TEXT,
  note           TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_segment_task ON transcript_segment(task_id);
CREATE INDEX IF NOT EXISTS idx_segment_audio ON transcript_segment(audio_id, version_id);

CREATE TABLE IF NOT EXISTS question (
  question_id     TEXT PRIMARY KEY,
  task_id         TEXT NOT NULL REFERENCES task(task_id) ON DELETE CASCADE,
  idx             INTEGER NOT NULL,
  text            TEXT NOT NULL,
  source_field_id TEXT,
  source_note     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_question_task ON question(task_id);

CREATE TABLE IF NOT EXISTS answer (
  answer_id   TEXT PRIMARY KEY,
  task_id     TEXT NOT NULL REFERENCES task(task_id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES question(question_id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  status      TEXT NOT NULL,
  version     INTEGER NOT NULL,
  answered_by TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_answer_task ON answer(task_id);

CREATE TABLE IF NOT EXISTS evidence_ref (
  evidence_id TEXT PRIMARY KEY,
  task_id     TEXT NOT NULL REFERENCES task(task_id) ON DELETE CASCADE,
  kind        TEXT NOT NULL,
  material_id TEXT,
  page        INTEGER,
  region      TEXT,
  audio_id    TEXT,
  segment_id  TEXT,
  start_ms    INTEGER,
  end_ms      INTEGER,
  note        TEXT NOT NULL,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_evidence_task ON evidence_ref(task_id);

CREATE TABLE IF NOT EXISTS answer_evidence (
  answer_id   TEXT NOT NULL REFERENCES answer(answer_id) ON DELETE CASCADE,
  evidence_id TEXT NOT NULL REFERENCES evidence_ref(evidence_id) ON DELETE CASCADE,
  task_id     TEXT NOT NULL REFERENCES task(task_id) ON DELETE CASCADE,
  PRIMARY KEY (answer_id, evidence_id)
);
CREATE INDEX IF NOT EXISTS idx_answer_evidence_task ON answer_evidence(task_id);

CREATE TABLE IF NOT EXISTS finding (
  finding_id  TEXT PRIMARY KEY,
  task_id     TEXT NOT NULL REFERENCES task(task_id) ON DELETE CASCADE,
  code        TEXT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  severity    TEXT NOT NULL,
  status      TEXT NOT NULL,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_finding_task ON finding(task_id);

CREATE TABLE IF NOT EXISTS finding_evidence (
  finding_id  TEXT NOT NULL REFERENCES finding(finding_id) ON DELETE CASCADE,
  evidence_id TEXT NOT NULL REFERENCES evidence_ref(evidence_id) ON DELETE CASCADE,
  task_id     TEXT NOT NULL REFERENCES task(task_id) ON DELETE CASCADE,
  PRIMARY KEY (finding_id, evidence_id)
);

CREATE TABLE IF NOT EXISTS report_document (
  report_id          TEXT PRIMARY KEY,
  task_id            TEXT NOT NULL UNIQUE REFERENCES task(task_id) ON DELETE CASCADE,
  status             TEXT NOT NULL,
  current_revision_id TEXT NOT NULL,
  synthetic          INTEGER NOT NULL DEFAULT 1,
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS report_revision (
  revision_id     TEXT PRIMARY KEY,
  task_id         TEXT NOT NULL REFERENCES task(task_id) ON DELETE CASCADE,
  report_id       TEXT NOT NULL REFERENCES report_document(report_id) ON DELETE CASCADE,
  revision_no     INTEGER NOT NULL,
  reason          TEXT NOT NULL,
  created_by      TEXT NOT NULL,
  created_at      TEXT NOT NULL,
  source_versions TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_revision_task ON report_revision(task_id, report_id, revision_no);

CREATE TRIGGER IF NOT EXISTS trg_revision_immutable
BEFORE UPDATE ON report_revision
BEGIN
  SELECT RAISE(ABORT, 'Rapor revizyonu değiştirilemez');
END;

CREATE TABLE IF NOT EXISTS report_appendix (
  appendix_id TEXT PRIMARY KEY,
  task_id     TEXT NOT NULL REFERENCES task(task_id) ON DELETE CASCADE,
  report_id   TEXT NOT NULL REFERENCES report_document(report_id) ON DELETE CASCADE,
  revision_id TEXT NOT NULL,
  title       TEXT NOT NULL,
  idx         INTEGER NOT NULL,
  content     TEXT NOT NULL,
  source_refs TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_appendix_task ON report_appendix(task_id, report_id);

CREATE TABLE IF NOT EXISTS quality_check (
  check_id      TEXT PRIMARY KEY,
  task_id       TEXT NOT NULL REFERENCES task(task_id) ON DELETE CASCADE,
  report_id     TEXT NOT NULL REFERENCES report_document(report_id) ON DELETE CASCADE,
  revision_id   TEXT NOT NULL,
  code          TEXT NOT NULL,
  label         TEXT NOT NULL,
  status        TEXT NOT NULL,
  detail        TEXT NOT NULL,
  computed_at   TEXT NOT NULL,
  computed_from TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_qcheck_task ON quality_check(task_id, report_id);

CREATE TABLE IF NOT EXISTS approval_event (
  approval_id TEXT PRIMARY KEY,
  task_id     TEXT NOT NULL REFERENCES task(task_id) ON DELETE CASCADE,
  report_id   TEXT NOT NULL REFERENCES report_document(report_id) ON DELETE CASCADE,
  kind        TEXT NOT NULL,
  actor_name  TEXT NOT NULL,
  actor_role  TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  note        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_approval_task ON approval_event(task_id);

CREATE TRIGGER IF NOT EXISTS trg_approval_immutable
BEFORE UPDATE ON approval_event
BEGIN
  SELECT RAISE(ABORT, 'Onay olayı değiştirilemez');
END;

CREATE TABLE IF NOT EXISTS audit_event (
  event_id    TEXT PRIMARY KEY,
  task_id     TEXT NOT NULL,
  at          TEXT NOT NULL,
  actor       TEXT NOT NULL,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT NOT NULL,
  detail_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_task ON audit_event(task_id, at);

CREATE TRIGGER IF NOT EXISTS trg_audit_immutable
BEFORE UPDATE ON audit_event
BEGIN
  SELECT RAISE(ABORT, 'Denetim olayı değiştirilemez');
END;

CREATE TABLE IF NOT EXISTS expert_profile (
  profile_id       TEXT PRIMARY KEY,
  display_name     TEXT NOT NULL,
  profession       TEXT NOT NULL,
  registry_no      TEXT NOT NULL,
  working_language TEXT NOT NULL,
  status           TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS module (
  module_id   TEXT PRIMARY KEY,
  code        TEXT NOT NULL,
  name        TEXT NOT NULL,
  description TEXT NOT NULL,
  status      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS engine_profile (
  engine_id        TEXT PRIMARY KEY,
  module_id        TEXT NOT NULL REFERENCES module(module_id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  version          TEXT NOT NULL,
  status           TEXT NOT NULL,
  network_required INTEGER NOT NULL DEFAULT 0,
  params_json      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;
