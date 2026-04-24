/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const ContextMenu = ({ x, y, options, onClose }) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Adjust position if menu goes off screen
  const [adjustedPos, setAdjustedPos] = useState({ x, y });

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const winW = window.innerWidth;
      const winH = window.innerHeight;

      let newX = x;
      let newY = y;

      if (x + rect.width > winW) newX = x - rect.width;
      if (y + rect.height > winH) newY = y - rect.height;

      if (newX !== adjustedPos.x || newY !== adjustedPos.y) {
        setAdjustedPos({ x: newX, y: newY });
      }
    }
  }, [x, y, adjustedPos.x, adjustedPos.y]);

  return (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.95, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      transition={{ duration: 0.1, ease: "easeOut" }}
      style={{ top: adjustedPos.y, left: adjustedPos.x }}
      className="fixed z-[100] min-w-[180px] overflow-hidden rounded-xl border border-slate-200 bg-white/80 p-1.5 shadow-2xl backdrop-blur-xl"
    >
      {options.map((option, index) => (
        <React.Fragment key={index}>
          {option.type === "divider" ? (
            <div className="my-1 h-px bg-slate-100" />
          ) : (
            <button
              onClick={() => {
                option.onClick();
                onClose();
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold transition-all ${
                option.danger
                  ? "text-red-500 hover:bg-red-50"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <i className={`fas ${option.icon} w-4 text-center text-xs opacity-70`} />
              <span>{option.label}</span>
            </button>
          )}
        </React.Fragment>
      ))}
    </motion.div>
  );
};

export default ContextMenu;
