import React, { useState, useEffect } from "react";

const OfflineBanner = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const goOffline = () => {
      setIsOffline(true);
      setWasOffline(true);
    };
    const goOnline = () => {
      setIsOffline(false);
      // Show "back online" message briefly
      setTimeout(() => setWasOffline(false), 3000);
    };

    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!isOffline && !wasOffline) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all duration-500 ${
        isOffline
          ? "bg-red-600 text-white"
          : "bg-green-600 text-white animate-fade-in"
      }`}
    >
      {isOffline ? (
        <>
          <i className="fas fa-wifi-slash text-red-200 text-xs" />
          <span>Anda sedang offline — Periksa koneksi internet Anda</span>
          <div className="ml-2 h-3 w-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
        </>
      ) : (
        <>
          <i className="fas fa-wifi text-green-200 text-xs" />
          <span>Koneksi kembali normal</span>
          <i className="fas fa-check text-green-200 text-xs" />
        </>
      )}
    </div>
  );
};

export default OfflineBanner;
