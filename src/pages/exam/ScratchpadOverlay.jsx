import React, { useRef, useEffect, useState } from "react";

const ScratchpadOverlay = () => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      const ctx = canvas.getContext("2d");
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#f97316";
    }
  }, []);

  const startDrawing = (e) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const clearCanvas = () => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-white/60 backdrop-blur-sm p-4">
      <div className="flex items-center justify-between rounded-t-xl bg-orange-600 px-4 py-2 text-white">
        <span className="text-xs font-semibold uppercase tracking-wider">
          <i className="fas fa-pen mr-2" />
          Area Coretan
        </span>
        <button
          onClick={clearCanvas}
          className="rounded-md bg-orange-700 px-2 py-1 text-xs font-semibold hover:bg-orange-800 transition"
        >
          Hapus
        </button>
      </div>
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={() => setIsDrawing(false)}
        onTouchStart={(e) => {
          e.preventDefault();
          startDrawing(e.touches[0]);
        }}
        onTouchMove={(e) => {
          e.preventDefault();
          draw(e.touches[0]);
        }}
        onTouchEnd={() => setIsDrawing(false)}
        className="flex-1 cursor-crosshair rounded-b-xl border-2 border-orange-500 bg-white/90 shadow-lg"
        style={{ touchAction: "none" }}
      />
    </div>
  );
};

export default ScratchpadOverlay;
