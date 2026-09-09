import { BrandMark } from "@/components/brand-mark";
import type { SitrepData } from "@/lib/sitrep";

type SitrepMapPoint = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  kind: "event" | "shelter";
};

function projectPoints(points: SitrepMapPoint[]) {
  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLon = Math.min(...longitudes);
  const maxLon = Math.max(...longitudes);
  const latSpan = Math.max(0.02, maxLat - minLat);
  const lonSpan = Math.max(0.02, maxLon - minLon);
  const latCenter = (minLat + maxLat) / 2;
  const lonCenter = (minLon + maxLon) / 2;

  return points.map((point) => ({
    ...point,
    x: 10 + ((point.longitude - (lonCenter - lonSpan / 2)) / lonSpan) * 80,
    y: 90 - ((point.latitude - (latCenter - latSpan / 2)) / latSpan) * 80,
  }));
}

export function SitrepDocument({ data, mapPoints }: { data: SitrepData; mapPoints: SitrepMapPoint[] }) {
  const plotted = mapPoints.length ? projectPoints(mapPoints) : [];

  return (
    <article className="sitrep-doc" aria-label={`Laporan situasi ${data.event.name}`}>
      <header className="sitrep-kop">
        <BrandMark className="sitrep-kop-logo" />
        <div className="sitrep-kop-text">
          <p className="sitrep-kop-agency">Badan Penanggulangan Bencana Daerah</p>
          <h1 className="sitrep-kop-title">Laporan Situasi Bencana (Situation Report)</h1>
          <p className="sitrep-kop-meta">
            Pos Komando Tanggap Darurat · Platform SiagaKita · {data.event.province}
          </p>
        </div>
      </header>

      <dl className="sitrep-identity">
        <div>
          <dt>Nomor laporan</dt>
          <dd>{data.documentNumber}</dd>
        </div>
        <div>
          <dt>Tanggal terbit</dt>
          <dd>{data.issuedDateLabel} · {data.issuedTimeLabel}</dd>
        </div>
        <div>
          <dt>Kode kejadian</dt>
          <dd>{data.event.code}</dd>
        </div>
        <div>
          <dt>Level penanganan</dt>
          <dd>{data.event.escalationLevel}</dd>
        </div>
      </dl>

      <section className="sitrep-section">
        <h2>1. Identitas kejadian</h2>
        <table className="sitrep-table sitrep-table-pairs">
          <tbody>
            <tr><th scope="row">Nama kejadian</th><td>{data.event.name}</td></tr>
            <tr><th scope="row">Jenis bencana</th><td>{data.event.type}</td></tr>
            <tr><th scope="row">Lokasi</th><td>{data.event.location}, {data.event.province}</td></tr>
            <tr><th scope="row">Titik koordinat</th><td>{data.event.coordinates}</td></tr>
            <tr><th scope="row">Status wilayah</th><td>{data.event.statusLabel}</td></tr>
            <tr><th scope="row">Pembaruan data</th><td>{data.event.updatedAt}</td></tr>
          </tbody>
        </table>
        <p className="sitrep-narrative">{data.event.summary}</p>
      </section>

      <section className="sitrep-section">
        <h2>2. Ringkasan dampak</h2>
        <div className="sitrep-impact-grid">
          {data.impact.map((item) => (
            <div key={item.label} className="sitrep-impact-item">
              <p className="sitrep-impact-label">{item.label}</p>
              <p className="sitrep-impact-value">{item.value}</p>
              {item.note ? <p className="sitrep-impact-note">{item.note}</p> : null}
            </div>
          ))}
        </div>
      </section>

      <section className="sitrep-section sitrep-section-map">
        <h2>3. Peta koordinat dan posko terdampak</h2>
        <div className="sitrep-map-layout">
          <figure className="sitrep-map">
            <svg viewBox="0 0 100 100" role="img" aria-label="Sebaran titik kejadian dan posko">
              <rect x="0" y="0" width="100" height="100" fill="#ffffff" stroke="#0f172a" strokeWidth="0.4" />
              {[20, 40, 60, 80].map((offset) => (
                <g key={offset} stroke="#cbd5e1" strokeWidth="0.25">
                  <line x1={offset} y1="0" x2={offset} y2="100" />
                  <line x1="0" y1={offset} x2="100" y2={offset} />
                </g>
              ))}
              {plotted.map((point, index) => (
                <g key={point.id}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={point.kind === "event" ? 2.6 : 1.9}
                    fill={point.kind === "event" ? "#b91c1c" : "#ffffff"}
                    stroke="#0f172a"
                    strokeWidth="0.5"
                  />
                  <text x={point.x} y={point.y - 3.4} fontSize="3" textAnchor="middle" fill="#0f172a">
                    {point.kind === "event" ? "K" : index}
                  </text>
                </g>
              ))}
            </svg>
            <figcaption>
              Skema relatif titik kejadian (K, merah) dan posko (nomor sesuai tabel). Koordinat presisi tercantum pada
              tabel posko.
            </figcaption>
          </figure>
          <table className="sitrep-table">
            <thead>
              <tr>
                <th scope="col">No</th>
                <th scope="col">Posko</th>
                <th scope="col">Status</th>
                <th scope="col">Pengungsi</th>
                <th scope="col">Rentan</th>
                <th scope="col">Koordinat</th>
              </tr>
            </thead>
            <tbody>
              {data.shelters.length ? (
                data.shelters.map((shelter, index) => (
                  <tr key={shelter.code}>
                    <td>{index + 1}</td>
                    <td>
                      <span className="sitrep-cell-title">{shelter.name}</span>
                      <span className="sitrep-cell-sub">{shelter.location} · {shelter.code}</span>
                    </td>
                    <td>{shelter.statusLabel}</td>
                    <td>{shelter.population} / {shelter.capacity}</td>
                    <td>{shelter.vulnerable}</td>
                    <td className="sitrep-cell-mono">{shelter.coordinates}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>Belum ada posko yang terhubung dengan kejadian ini.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="sitrep-section">
        <h2>4. Kebutuhan mendesak logistik</h2>
        <table className="sitrep-table">
          <thead>
            <tr>
              <th scope="col">Kebutuhan</th>
              <th scope="col">Posko</th>
              <th scope="col">Diminta</th>
              <th scope="col">Tersedia</th>
              <th scope="col">Kekurangan</th>
              <th scope="col">Urgensi</th>
            </tr>
          </thead>
          <tbody>
            {data.needs.length ? (
              data.needs.map((need) => (
                <tr key={`${need.shelterName}-${need.item}`}>
                  <td>
                    <span className="sitrep-cell-title">{need.item}</span>
                    <span className="sitrep-cell-sub">{need.category}</span>
                  </td>
                  <td>{need.shelterName}</td>
                  <td>{need.requested} {need.unit}</td>
                  <td>{need.available} {need.unit}</td>
                  <td>{need.gap} {need.unit}</td>
                  <td>{need.urgencyLabel}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6}>Tidak ada kebutuhan kritis yang belum terpenuhi pada periode laporan ini.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="sitrep-section">
        <h2>5. Alokasi bantuan aktif</h2>
        <table className="sitrep-table">
          <thead>
            <tr>
              <th scope="col">Kode</th>
              <th scope="col">Muatan</th>
              <th scope="col">Asal → Tujuan</th>
              <th scope="col">Pelaksana</th>
              <th scope="col">ETA</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.allocations.length ? (
              data.allocations.map((allocation) => (
                <tr key={allocation.code}>
                  <td className="sitrep-cell-mono">{allocation.code}</td>
                  <td>{allocation.cargo}</td>
                  <td>{allocation.origin} → {allocation.destination}</td>
                  <td>{allocation.institution}</td>
                  <td>{allocation.eta}</td>
                  <td>{allocation.statusLabel} · {allocation.progress}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6}>Belum ada distribusi bantuan yang berjalan saat laporan diterbitkan.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="sitrep-section">
        <h2>6. Koordinasi lembaga dan catatan keputusan</h2>
        <div className="sitrep-two-column">
          <div>
            <p className="sitrep-subhead">Lembaga dengan kontak aktif</p>
            {data.institutions.length ? (
              <ul className="sitrep-list">
                {data.institutions.map((institution) => (
                  <li key={institution.name}>
                    <span className="sitrep-cell-title">{institution.name}</span>
                    <span className="sitrep-cell-sub">{institution.role} · {institution.statusLabel}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="sitrep-narrative">Belum ada lembaga dengan kontak aktif yang tercatat.</p>
            )}
          </div>
          <div>
            <p className="sitrep-subhead">Saran prioritas sistem</p>
            {data.decisionSupport ? (
              <div className="sitrep-decision">
                <p className="sitrep-cell-title">{data.decisionSupport.title}</p>
                <p className="sitrep-narrative">{data.decisionSupport.rationale}</p>
                <p className="sitrep-cell-sub">
                  Tindakan disarankan: {data.decisionSupport.action} · keyakinan {data.decisionSupport.confidence}.
                  Keputusan akhir tetap pada operator.
                </p>
              </div>
            ) : (
              <p className="sitrep-narrative">Belum ada saran prioritas untuk kejadian ini.</p>
            )}
          </div>
        </div>
      </section>

      <footer className="sitrep-footer">
        <div className="sitrep-verify">
          <p className="sitrep-subhead">Verifikasi publik</p>
          <p className="sitrep-cell-sub">Informasi versi publik dapat dibuka pada tautan berikut:</p>
          <p className="sitrep-cell-mono sitrep-link">{data.publicLink}</p>
          <p className="sitrep-cell-sub">
            Dokumen ini dihasilkan otomatis dari basis data operasi SiagaKita dan sah setelah ditandatangani.
          </p>
        </div>
        <div className="sitrep-signature">
          <p>{data.signature.place}, {data.signature.dateLabel}</p>
          <p className="sitrep-signature-role">{data.signature.roleTitle}</p>
          <div className="sitrep-signature-space" aria-hidden="true" />
          <p className="sitrep-signature-name">(………………………………………)</p>
          <p className="sitrep-cell-sub">{data.signature.unit}</p>
        </div>
      </footer>
    </article>
  );
}

export type { SitrepMapPoint };
