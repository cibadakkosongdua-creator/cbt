import React, { forwardRef } from "react";
import { QRCodeSVG } from "qrcode.react";

const PrintCards = forwardRef(({ students, examTitle = "Kartu Ujian CBT" }, ref) => {
  return (
    <div style={{ display: "none" }}>
      <style type="text/css" media="print">
        {`
          @page {
            size: A4;
            margin: 15mm;
          }
          /* Ensure grid items don't break across pages and have proper spacing */
          .print-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px;
          }
          /* Add top margin to subsequent pages to prevent sticking to the top edge */
          .print-card-wrapper {
            page-break-inside: avoid;
            break-inside: avoid;
            margin-bottom: 8px; /* Extra breathing room */
          }
        `}
      </style>
      <div
        ref={ref}
        className="print-container bg-white"
        style={{
          width: "210mm",   // A4 Width
          padding: "10mm",
          backgroundColor: "white",
        }}
      >
        <div className="grid grid-cols-2 gap-4 print-grid">
          {students.map((student) => (
            <div
              key={student.id}
              className="print-card-wrapper relative overflow-hidden rounded-xl border border-emerald-600 bg-white"
              style={{
                width: "90mm",
                height: "55mm", // Standard ID card size approx
                pageBreakInside: "avoid"
              }}
            >
              {/* Header */}
              <div className="flex items-center gap-3 border-b border-emerald-700 bg-emerald-600 px-3 py-2 text-white">
                <img src="/logo.png" alt="Logo" className="h-8 w-8 object-contain" />
                <div>
                  <div className="text-xs font-bold leading-tight uppercase tracking-wider">{examTitle}</div>
                  <div className="text-[9px] text-emerald-100 font-medium tracking-wide">SDN 02 Cibadak</div>
                </div>
              </div>

              {/* Body */}
              <div className="relative flex items-start px-3 py-2.5 gap-3 h-full pb-4">
                <div className="flex-1 space-y-1 z-10">
                  <div>
                    <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wide">Nama Siswa</div>
                    <div className="text-[11px] font-bold text-slate-900 leading-tight">{student.name}</div>
                  </div>
                  <div>
                    <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wide">Kelas</div>
                    <div className="text-xs font-bold text-slate-800">{student.kelas || "-"}</div>
                  </div>
                  
                  <div className="mt-1.5 grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-2 py-1.5 shadow-sm">
                      <div className="text-[7px] font-bold text-emerald-600 uppercase tracking-widest mb-0.5">User / NISN</div>
                      <div className="text-[10px] font-bold text-emerald-900 font-mono tracking-wider">{student.id}</div>
                    </div>
                    <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-2 py-1.5 shadow-sm">
                      <div className="text-[7px] font-bold text-emerald-600 uppercase tracking-widest mb-0.5">Password</div>
                      <div className="text-[10px] font-bold text-emerald-900 font-mono tracking-wider">{student.password || student.id}</div>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center justify-center pt-0.5 z-10">
                  <div className="p-1 rounded bg-white shadow-sm border border-slate-100">
                    <QRCodeSVG 
                      value={student.id} 
                      size={60} 
                      fgColor="#047857" // emerald-700
                      level="Q" 
                    />
                  </div>
                </div>
              </div>
              
              {/* Decorative Background Pattern */}
              <div className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full border-[10px] border-emerald-50/60 pointer-events-none"></div>
              <div className="absolute -bottom-2 -left-4 h-16 w-16 rounded-full bg-emerald-50/40 pointer-events-none"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

export default PrintCards;
