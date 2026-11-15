/**
 * Materyaller sekmesi.
 *
 * Beklenen ve teslim alınan materyal ayrı listelenir; eksik materyal görevi
 * engellemez (bkz. MIH-REQ-MAT-004, MIH-REQ-TSK-005).
 */
import type { TaskBundleView } from "../../api.ts";
import { Badge, Panel } from "../../components/ui.tsx";
import { formatBytes, formatDateTime, materialStatusTone } from "../../format.ts";

export function MaterialsTab({ bundle }: { bundle: TaskBundleView }) {
  return (
    <div className="st-grid-2">
      <Panel
        title="Beklenen materyaller"
        description="Belgede tarif edilen materyaller; teslim alınanlarla karıştırılmaz."
        action={
          <Badge tone={bundle.expectedMaterials.some((item) => item.status === "bekleniyor") ? "amber" : "green"}>
            {bundle.expectedMaterials.filter((item) => item.status === "bekleniyor").length} bekliyor
          </Badge>
        }
      >
        <div className="st-stack">
          {bundle.expectedMaterials.map((item) => (
            <div key={item.expectedId} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span aria-hidden="true">{item.kind === "ses" ? "🎧" : "📁"}</span>
              <div style={{ flex: 1 }}>
                <strong style={{ display: "block", fontSize: 13 }}>{item.label}</strong>
                <small style={{ color: "var(--st-muted)" }}>{item.sourceNote}</small>
              </div>
              <Badge tone={materialStatusTone(item.status)}>{item.status}</Badge>
            </div>
          ))}
          <div className="st-callout info">
            <div>
              <span>Eksik materyaller görevi açmayı engellemez; görev alanından daha sonra eklenebilir.</span>
            </div>
          </div>
        </div>
      </Panel>

      <Panel
        title="Teslim alınan materyaller"
        description="Özgün dosyalar değiştirilmeden saklanır; her kaydın bütünlük özeti tutulur."
      >
        <div className="st-table-wrap">
          <table className="st-table">
            <caption style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}>
              Teslim alınan materyal listesi
            </caption>
            <thead>
              <tr>
                <th scope="col">DOSYA</th>
                <th scope="col">TÜR</th>
                <th scope="col">BOYUT</th>
                <th scope="col">DURUM</th>
                <th scope="col">ALINMA</th>
              </tr>
            </thead>
            <tbody>
              {bundle.materials.map((material) => (
                <tr key={material.materialId}>
                  <td>
                    <strong style={{ display: "block", fontSize: 13 }}>{material.originalName}</strong>
                    <small className="st-muted-cell">sha256: {material.sha256.slice(0, 20)}…</small>
                  </td>
                  <td>{material.mimeType}</td>
                  <td>{formatBytes(material.sizeBytes)}</td>
                  <td>
                    <Badge tone={materialStatusTone(material.status)}>{material.status}</Badge>
                  </td>
                  <td className="st-muted-cell">{formatDateTime(material.receivedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
