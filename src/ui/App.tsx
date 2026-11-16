/**
 * MİHENK Studio uygulama kabuğu.
 *
 * Kabul edilmiş v0.5 ekran hiyerarşisi korunur. İlk dikey dilimde rapor odaklı
 * akış tam işlevlidir; diğer ekranlar görsel hiyerarşi korunarak sunulur ve
 * gerçek işlevi olmayan kontroller dürüstçe işaretlenir (bkz. ADR-011, ADR-012).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiClient, type ScreenMeta, type TaskSummary } from "./api.ts";
import { Badge, Button, DisabledItem, Panel, TextButton, Toast } from "./components/ui.tsx";
import { OverviewScreen } from "./screens/OverviewScreen.tsx";
import { TasksScreen } from "./screens/TasksScreen.tsx";
import { NewAssignmentScreen } from "./screens/NewAssignmentScreen.tsx";
import { WorkspaceScreen } from "./screens/WorkspaceScreen.tsx";
import { StaticScreen } from "./screens/StaticScreen.tsx";
import { taskStatusTone, taskStatusLabel } from "./format.ts";

export type ScreenId =
  | "overview"
  | "tasks"
  | "new-assignment"
  | "workspace"
  | "profile"
  | "modules"
  | "engines"
  | "audio-tools"
  | "language-tools"
  | "test-history"
  | "vault"
  | "settings";

const NAV_GROUPS: { label: string; items: { id: ScreenId; label: string }[] }[] = [
  {
    label: "ÇALIŞMA ALANI",
    items: [
      { id: "overview", label: "Genel Bakış" },
      { id: "tasks", label: "Görevlerim" },
      { id: "new-assignment", label: "Yeni Görevlendirme" },
    ],
  },
  {
    label: "KİŞİSEL",
    items: [{ id: "profile", label: "Bilirkişi Profilim" }],
  },
  {
    label: "UZMANLIK",
    items: [
      { id: "modules", label: "Uzmanlık Modülleri" },
      { id: "engines", label: "Motorlar ve Modeller" },
      { id: "audio-tools", label: "Ses Araçları" },
      { id: "language-tools", label: "Dil ve Metin" },
      { id: "test-history", label: "Test Geçmişi" },
    ],
  },
  {
    label: "SİSTEM",
    items: [
      { id: "vault", label: "Kasa ve Güvenlik" },
      { id: "settings", label: "Uygulama Ayarları" },
    ],
  },
];

const SCREEN_TITLES: Record<ScreenId, string> = {
  overview: "Genel Bakış",
  tasks: "Görevlerim",
  "new-assignment": "Yeni Görevlendirme",
  workspace: "Görev Çalışma Alanı",
  profile: "Bilirkişi Profilim",
  modules: "Uzmanlık Modülleri",
  engines: "Motorlar ve Modeller",
  "audio-tools": "Ses Araçları",
  "language-tools": "Dil ve Metin",
  "test-history": "Test Geçmişi",
  vault: "Kasa ve Güvenlik",
  settings: "Uygulama Ayarları",
};

export function App({ client }: { client?: ApiClient }) {
  const api = useMemo(
    () =>
      client ??
      new ApiClient(
        "",
        (globalThis as unknown as { __MIHENK_TOKEN__?: string }).__MIHENK_TOKEN__ ?? "",
      ),
    [client],
  );

  const [screen, setScreen] = useState<ScreenId>("overview");
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [screens, setScreens] = useState<ScreenMeta[]>([]);
  /**
   * Yalnızca ilk yükleme ekranı iskelet gösterir. Sonraki yenilemeler veriyi
   * yerinde günceller; aksi hâlde açık ekranlar yeniden bağlanır ve kullanıcı
   * girdisi (ör. yeni görev formu) kaybolur.
   */
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "ok" | "error" } | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  const notify = useCallback((message: string, tone: "ok" | "error" = "ok") => {
    setToast({ message, tone });
  }, []);

  const reload = useCallback(() => setRefreshToken((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    if (refreshToken === 0) {
      setInitialLoading(true);
    } else {
      setRefreshing(true);
    }
    Promise.all([api.listTasks(), api.meta()])
      .then(([taskList, meta]) => {
        if (cancelled) return;
        setTasks(taskList);
        setScreens(meta.screens);
        setActiveTaskId((current) => current ?? taskList[0]?.taskId ?? null);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Veri yüklenemedi.");
      })
      .finally(() => {
        if (cancelled) return;
        setInitialLoading(false);
        setRefreshing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api, refreshToken]);

  useEffect(() => {
    if (!toast) return;
    const id = globalThis.setTimeout(() => setToast(null), 3600);
    return () => globalThis.clearTimeout(id);
  }, [toast]);

  // ⌘K / Ctrl+K: gösterilen kısayol gerçekten çalışır (bkz. MIH-REQ-A11Y-005).
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    globalThis.addEventListener("keydown", onKeyDown);
    return () => globalThis.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    try {
      const stored = globalThis.localStorage?.getItem("mihenk.studio.sidebar");
      if (stored === "true") setCollapsed(true);
    } catch {
      // yerel tercih isteğe bağlıdır
    }
  }, []);

  useEffect(() => {
    try {
      globalThis.localStorage?.setItem("mihenk.studio.sidebar", String(collapsed));
    } catch {
      // yerel tercih isteğe bağlıdır
    }
  }, [collapsed]);

  const activeTask = tasks.find((task) => task.taskId === activeTaskId) ?? null;

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("tr-TR");
    if (!query) return tasks;
    return tasks.filter((task) =>
      [task.title, task.caseNumber, task.authority].some((value) =>
        value.toLocaleLowerCase("tr-TR").includes(query),
      ),
    );
  }, [tasks, search]);

  function openTask(taskId: string, target: "workspace" = "workspace") {
    setActiveTaskId(taskId);
    setScreen(target);
  }

  return (
    <div className={"mihenk-studio" + (collapsed ? " sidebar-is-collapsed" : "")}>
      <aside className="st-sidebar">
        <div className="st-brand">
          <div className="st-brand-symbol" aria-hidden="true">
            <span>M</span>
          </div>
          {!collapsed ? (
            <div className="st-brand-name">
              <strong>MİHENK</strong>
              <small>BİLİRKİŞİ ÇALIŞMA ALANI</small>
            </div>
          ) : null}
          <button
            className="st-collapse"
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? "Menüyü genişlet" : "Menüyü daralt"}
            title={collapsed ? "Menüyü genişlet" : "Menüyü daralt"}
          >
            <span aria-hidden="true">{collapsed ? "»" : "«"}</span>
          </button>
        </div>

        <nav className="st-nav-scroll" aria-label="Ana gezinme">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              {!collapsed ? <div className="st-nav-label">{group.label}</div> : null}
              {group.items.map((item) => {
                const isActive =
                  screen === item.id ||
                  (item.id === "tasks" && (screen === "new-assignment" || screen === "workspace"));
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={"st-nav-item" + (isActive ? " active" : "")}
                    onClick={() => setScreen(item.id)}
                    aria-label={item.label}
                    aria-current={isActive ? "page" : undefined}
                    title={item.label}
                  >
                    <span aria-hidden="true">•</span>
                    {!collapsed ? <span>{item.label}</span> : null}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="st-sidebar-foot">
          <div className="st-vault-indicator">
            <span className="st-vault-dot" aria-hidden="true" />
            {!collapsed ? (
              <div>
                <strong>Sentetik örnek ortam</strong>
                <small>Gerçek veri yok · çevrimdışı</small>
              </div>
            ) : null}
          </div>
          {!collapsed ? <div className="st-version">RAPOR DİKEY DİLİMİ v0.6 · DİLİM 1</div> : null}
        </div>
      </aside>

      <div className="st-main">
        <header className="st-topbar">
          <div className="st-topbar-context">
            <span>Çalışma alanı</span>
            <span aria-hidden="true">›</span>
            <strong>{SCREEN_TITLES[screen]}</strong>
          </div>
          <div className="st-topbar-actions">
            <label className="st-global-search">
              <span aria-hidden="true">🔍</span>
              <input
                ref={searchRef}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Görev, dosya no. veya merci ara"
                aria-label="Genel arama: görev başlığı, dosya numarası ve merci"
              />
              <kbd>⌘K</kbd>
            </label>
            <span className="st-top-status">
              <i aria-hidden="true" />
              SENTETİK ORTAM
            </span>
            <div className="st-user-chip">
              <span aria-hidden="true">ÖB</span>
              <div>
                <strong>Örnek Bilirkişi</strong>
                <small>Yerel profil</small>
              </div>
            </div>
          </div>
        </header>

        <main className="st-content">
          <div className="st-banner" role="note">
            <span aria-hidden="true">⚠</span>
            SENTETİK ÖRNEK — RESMÎ BELGE DEĞİLDİR · Bu ortamdaki tüm veri uydurmadır.
            {refreshing ? <span style={{ marginLeft: "auto", fontWeight: 400 }}>Yenileniyor…</span> : null}
          </div>

          {error ? (
            <Panel title="Bağlantı hatası">
              <div className="st-callout error">
                <div>
                  <strong>Yerel servise erişilemedi</strong>
                  <span>{error}</span>
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <Button kind="primary" onClick={reload}>
                  Yeniden dene
                </Button>
              </div>
            </Panel>
          ) : null}

          {initialLoading && !error ? (
            <Panel title="Yükleniyor">
              <div className="st-stack">
                <div className="st-skeleton" style={{ width: "40%" }} />
                <div className="st-skeleton" style={{ width: "70%" }} />
                <div className="st-skeleton" style={{ width: "55%" }} />
              </div>
            </Panel>
          ) : null}

          {!initialLoading && !error ? (
            <>
              {screen === "overview" ? (
                <OverviewScreen
                  tasks={tasks}
                  onOpenTask={(taskId) => openTask(taskId)}
                  onNewAssignment={() => setScreen("new-assignment")}
                />
              ) : null}

              {screen === "tasks" ? (
                <TasksScreen
                  tasks={filteredTasks}
                  totalCount={tasks.length}
                  onOpenTask={(taskId) => openTask(taskId)}
                  onNewAssignment={() => setScreen("new-assignment")}
                />
              ) : null}

              {screen === "new-assignment" ? (
                <NewAssignmentScreen
                  api={api}
                  onCreated={(taskId) => {
                    notify("Görev taslağı oluşturuldu.");
                    reload();
                    setActiveTaskId(taskId);
                  }}
                  onOpenTask={(taskId) => openTask(taskId)}
                  onError={(message) => notify(message, "error")}
                  onBack={() => setScreen("tasks")}
                />
              ) : null}

              {screen === "workspace" && activeTask ? (
                <WorkspaceScreen
                  api={api}
                  task={activeTask}
                  refreshToken={refreshToken}
                  onNotify={notify}
                  onReload={reload}
                  onBackToTasks={() => setScreen("tasks")}
                />
              ) : null}

              {screen === "workspace" && !activeTask ? (
                <Panel title="Görev seçilmedi">
                  <div className="st-empty-state">
                    <strong>Çalışma alanı için görev seçin</strong>
                    <span>Görevlerim ekranından bir görev açabilirsiniz.</span>
                  </div>
                </Panel>
              ) : null}

              {!["overview", "tasks", "new-assignment", "workspace"].includes(screen) ? (
                <StaticScreen
                  screen={screens.find((item) => item.id === screen) ?? null}
                  title={SCREEN_TITLES[screen]}
                  tasks={tasks}
                  onOpenTask={(taskId) => openTask(taskId)}
                />
              ) : null}
            </>
          ) : null}
        </main>
      </div>

      {toast ? <Toast message={toast.message} tone={toast.tone} /> : null}
    </div>
  );
}

export { taskStatusTone, taskStatusLabel, Badge, TextButton, DisabledItem };
