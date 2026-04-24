import React, { useState } from "react";
import { Joyride, STATUS } from "react-joyride";

const ExamTour = ({ run, onFinish }) => {
  const [steps] = useState([
    {
      target: ".tour-question",
      content: "Ini adalah teks pertanyaan. Gambar atau teks bacaan akan muncul di atasnya jika ada.",
      disableBeacon: true,
      placement: "bottom",
    },
    {
      target: ".tour-answer",
      content: "Klik pada opsi jawaban di sini. Anda juga bisa menggunakan kotak centang untuk PG Kompleks.",
      placement: "top",
    },
    {
      target: ".tour-bottom-nav",
      content: "Gunakan tombol ini untuk berpindah soal. Jika ragu dengan jawaban Anda, centang 'Ragu-ragu'.",
      placement: "top",
    },
    {
      target: ".tour-sidebar",
      content: "Di panel ini Anda bisa melihat indikator semua soal dan langsung lompat ke soal tertentu. Kuning untuk ragu-ragu, Hijau untuk sudah dijawab.",
      placement: "left",
    },
    {
      target: ".tour-timer",
      content: "Perhatikan sisa waktu Anda di sini. Jika waktu habis, jawaban akan otomatis dikumpulkan.",
      placement: "bottom",
    },
    {
      target: ".tour-tools",
      content: "Gunakan fitur ini! Anda bisa mencoret-coret (Scratchpad), mengecilkan/membesarkan teks, dan mengaktifkan Fullscreen.",
      placement: "bottom",
    },
  ]);

  const handleJoyrideCallback = (data) => {
    const { status } = data;
    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];
    
    if (finishedStatuses.includes(status)) {
      onFinish();
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: "#4f46e5", // indigo-600
          textColor: "#334155", // slate-700
          backgroundColor: "#ffffff",
          zIndex: 1000,
        },
        buttonNext: {
          backgroundColor: "#4f46e5",
          borderRadius: "8px",
          fontWeight: "bold",
        },
        buttonBack: {
          color: "#64748b",
          fontWeight: "bold",
        },
        buttonSkip: {
          color: "#94a3b8",
        },
        tooltipContainer: {
          textAlign: "left",
          fontSize: "14px",
        },
      }}
      locale={{
        back: "Kembali",
        close: "Tutup",
        last: "Selesai",
        next: "Lanjut",
        skip: "Lewati Tour",
      }}
    />
  );
};

export default ExamTour;
