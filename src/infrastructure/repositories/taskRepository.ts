/**
 * Görev deposu.
 *
 * `Task` üst kayıttır; alt kayıtlar `TaskScope` ile kapsamlanır. Görev listesi
 * tüm görevleri döndürebilir (görev listesi ekranı), ancak alt kayıt erişimi
 * her zaman kapsam gerektirir.
 */
import type { Database } from "../db/database.ts";
import type { Task, TaskStatus } from "../../domain/types.ts";
import { toBool, fromBool } from "./base.ts";

interface TaskRow {
  task_id: string;
  title: string;
  case_number: string;
  authority: string;
  due_date: string;
  status: string;
  kind: string;
  synthetic: number;
  created_at: string;
  updated_at: string;
}

function mapTask(row: TaskRow): Task {
  return {
    taskId: row.task_id,
    title: row.title,
    caseNumber: row.case_number,
    authority: row.authority,
    dueDate: row.due_date,
    status: row.status as TaskStatus,
    kind: row.kind,
    synthetic: toBool(row.synthetic),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class TaskRepository {
  constructor(private readonly db: Database) {}

  insert(task: Task): void {
    this.db
      .prepare(
        `INSERT INTO task (task_id, title, case_number, authority, due_date, status, kind,
                           synthetic, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        task.taskId,
        task.title,
        task.caseNumber,
        task.authority,
        task.dueDate,
        task.status,
        task.kind,
        fromBool(task.synthetic),
        task.createdAt,
        task.updatedAt,
      );
  }

  findById(taskId: string): Task | null {
    const row = this.db.prepare("SELECT * FROM task WHERE task_id = ?").get(taskId) as
      | TaskRow
      | undefined;
    return row ? mapTask(row) : null;
  }

  listAll(): Task[] {
    const rows = this.db.prepare("SELECT * FROM task ORDER BY created_at DESC").all() as TaskRow[];
    return rows.map(mapTask);
  }

  updateStatus(taskId: string, status: TaskStatus, updatedAt: string): void {
    this.db
      .prepare("UPDATE task SET status = ?, updated_at = ? WHERE task_id = ?")
      .run(status, updatedAt, taskId);
  }

  updateFields(
    taskId: string,
    fields: Partial<Pick<Task, "title" | "caseNumber" | "authority" | "dueDate" | "kind">>,
    updatedAt: string,
  ): void {
    const current = this.findById(taskId);
    if (!current) throw new Error(`Görev bulunamadı: ${taskId}`);
    this.db
      .prepare(
        `UPDATE task SET title = ?, case_number = ?, authority = ?, due_date = ?, kind = ?, updated_at = ?
         WHERE task_id = ?`,
      )
      .run(
        fields.title ?? current.title,
        fields.caseNumber ?? current.caseNumber,
        fields.authority ?? current.authority,
        fields.dueDate ?? current.dueDate,
        fields.kind ?? current.kind,
        updatedAt,
        taskId,
      );
  }

  /**
   * Görev silme bu dilimde desteklenmez.
   *
   * Değişmez geçmiş kuralı (ham ASR sürümü silinemez) ile toplu görev silme
   * çelişir; bu nedenle silme işlemi açık bir geri alma ve arşivleme kararı
   * alınmadan sunulmaz (bkz. docs/07-acik-kararlar-ve-riskler.md AK-07).
   */
}
