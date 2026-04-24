import React, { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";

const Certificate = React.forwardRef(({ result, examConfig }, ref) => {
  if (!result) return null;

  const isPassed = (result.score ?? 0) >= (result.passScore || 70);
  const dateStr = result.submittedAt?.toDate
    ? result.submittedAt.toDate().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

  const resultUrl = `${window.location.origin}/?view=result&id=${result.id}`;

  const getGrade = (score) => {
    if (score >= 90) return "A";
    if (score >= 80) return "B";
    if (score >= 70) return "C";
    return "D";
  };

  return (
    <div ref={ref} className="certificate-print">
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 0; }
          body * { visibility: hidden; }
          .certificate-print, .certificate-print * { visibility: visible !important; }
          .certificate-print { 
            position: fixed; left: 0; top: 0;
            width: 297mm; height: 210mm;
          }
        }
        .certificate-print {
          width: 297mm; height: 210mm;
          font-family: 'Georgia', 'Times New Roman', serif;
          position: relative;
          overflow: hidden;
          background: white;
          color: #1e293b;
        }
      `}</style>

      {/* Outer border */}
      <div
        style={{
          position: "absolute",
          inset: "8mm",
          border: isPassed ? "3px solid #10b981" : "3px solid #94a3b8",
          borderRadius: "4px",
        }}
      />
      {/* Inner border */}
      <div
        style={{
          position: "absolute",
          inset: "11mm",
          border: isPassed ? "1px solid #6ee7b7" : "1px solid #cbd5e1",
          borderRadius: "2px",
        }}
      />

      {/* Content */}
      <div
        style={{
          position: "absolute",
          inset: "14mm",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "10mm 20mm",
        }}
      >
        {/* Logo + School */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6mm" }}>
          <img
            src="/logo.png"
            alt="Logo"
            style={{ width: "42px", height: "42px", objectFit: "contain", filter: "drop-shadow(0 1px 2px rgb(0 0 0 / 0.1))" }}
          />
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: "12px", fontWeight: "bold", color: "#475569", letterSpacing: "2px", textTransform: "uppercase" }}>
              SDN 02 Cibadak
            </div>
            <div style={{ fontSize: "9px", color: "#94a3b8" }}>
              Smart CBT · Sistem Ujian Berbasis Komputer
            </div>
          </div>
        </div>

        {/* Title */}
        <div style={{ fontSize: "28px", fontWeight: "bold", letterSpacing: "4px", textTransform: "uppercase", color: isPassed ? "#059669" : "#64748b", marginBottom: "2mm" }}>
          SERTIFIKAT
        </div>
        <div style={{ fontSize: "12px", color: "#94a3b8", letterSpacing: "2px", marginBottom: "8mm" }}>
          {isPassed ? "KELULUSAN UJIAN" : "KEIKUTSERTAAN UJIAN"}
        </div>

        {/* Divider */}
        <div style={{ width: "60mm", height: "1px", background: isPassed ? "#10b981" : "#cbd5e1", marginBottom: "8mm" }} />

        {/* Text */}
        <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "3mm" }}>
          Diberikan kepada:
        </div>
        <div style={{ fontSize: "24px", fontWeight: "bold", color: "#1e293b", marginBottom: "2mm", fontStyle: "italic" }}>
          {result.studentName}
        </div>
        <div style={{ fontSize: "10px", color: "#94a3b8", marginBottom: "6mm" }}>
          NISN: {result.studentId} · Kelas {result.kelas || "–"}
        </div>

        <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "4mm", maxWidth: "160mm", lineHeight: "1.6" }}>
          Telah {isPassed ? "LULUS" : "mengikuti"} <strong>{examConfig?.title || result.examName || "Ujian"}</strong> yang
          diselenggarakan pada tanggal <strong>{dateStr}</strong> dengan
          hasil sebagai berikut:
        </div>

        {/* Scores */}
        <div style={{ display: "flex", gap: "16px", marginBottom: "6mm" }}>
          <div style={{ padding: "6px 20px", border: "1px solid #e2e8f0", borderRadius: "8px", textAlign: "center" }}>
            <div style={{ fontSize: "8px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px" }}>Skor</div>
            <div style={{ fontSize: "22px", fontWeight: "bold", color: isPassed ? "#059669" : "#ef4444" }}>
              {result.score}
            </div>
          </div>
          <div style={{ padding: "6px 20px", border: "1px solid #e2e8f0", borderRadius: "8px", textAlign: "center" }}>
            <div style={{ fontSize: "8px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px" }}>Benar</div>
            <div style={{ fontSize: "22px", fontWeight: "bold", color: "#1e293b" }}>
              {result.correct}/{result.total}
            </div>
          </div>
          <div style={{ padding: "6px 20px", border: "1px solid #e2e8f0", borderRadius: "8px", textAlign: "center" }}>
            <div style={{ fontSize: "8px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px" }}>Grade</div>
            <div style={{ fontSize: "22px", fontWeight: "bold", color: "#1e293b" }}>
              {getGrade(result.score ?? 0)}
            </div>
          </div>
          <div style={{ padding: "6px 20px", border: "1px solid #e2e8f0", borderRadius: "8px", textAlign: "center" }}>
            <div style={{ fontSize: "8px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px" }}>Status</div>
            <div style={{ fontSize: "14px", fontWeight: "bold", color: isPassed ? "#059669" : "#ef4444", marginTop: "4px" }}>
              {isPassed ? "LULUS ✓" : "BELUM LULUS"}
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", width: "100%", marginTop: "auto" }}>
          {/* QR Code */}
          <div style={{ textAlign: "center" }}>
            <QRCodeSVG value={resultUrl} size={60} level="M" />
            <div style={{ fontSize: "7px", color: "#94a3b8", marginTop: "2px" }}>Scan untuk verifikasi</div>
          </div>

          {/* Date + Signature area */}
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "9px", color: "#64748b" }}>
              Cibadak, {dateStr}
            </div>
            <div style={{ width: "50mm", borderBottom: "1px solid #cbd5e1", margin: "14mm auto 2mm" }} />
            <div style={{ fontSize: "9px", fontWeight: "bold", color: "#475569" }}>
              Kepala Sekolah
            </div>
          </div>

          {/* Stamp area */}
          <div style={{ textAlign: "center", opacity: 0.3 }}>
            <div style={{
              width: "48px", height: "48px", borderRadius: "50%",
              border: "2px solid #64748b",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "6px", color: "#64748b", fontWeight: "bold", textTransform: "uppercase",
              lineHeight: "1.2",
            }}>
              SDN 02<br/>CIBADAK
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

Certificate.displayName = "Certificate";

export default Certificate;
