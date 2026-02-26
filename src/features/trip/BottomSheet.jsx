"use client";

import React, { useState, useEffect } from "react";
import { motion, useAnimation, useMotionValue } from "framer-motion";

/**
 * Custom BottomSheet using framer-motion.
 * Replaces react-spring-bottom-sheet for better stability in Next.js 14.
 */
export const BottomSheet = ({
  children,
  snapPoints = [0.2, 0.5, 0.9], // Ratios of screen height
  initialSnapIndex = 1,
  header,
}) => {
  const controls = useAnimation();
  const [windowHeight, setWindowHeight] = useState(0);

  useEffect(() => {
    setWindowHeight(window.innerHeight);
  }, []);

  // Calculate pixel values for snap points (distance from TOP)
  // Higher ratio means the sheet is taller (closer to top)
  // Position = windowHeight * (1 - ratio)
  const snapPositions = snapPoints.map((p) => windowHeight * (1 - p));
  const initialPosition = snapPositions[initialSnapIndex] || snapPositions[0];

  useEffect(() => {
    if (windowHeight > 0) {
      controls.start({ y: initialPosition });
    }
  }, [windowHeight, initialPosition, controls]);

  const onDragEnd = (event, info) => {
    const currentY = info.point.y;
    // Find closest snap point
    const closest = snapPositions.reduce((prev, curr) => {
      return Math.abs(curr - currentY) < Math.abs(prev - currentY)
        ? curr
        : prev;
    });

    controls.start({
      y: closest,
      transition: { type: "spring", damping: 25, stiffness: 200 },
    });
  };

  if (windowHeight === 0) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
      <motion.div
        drag="y"
        dragConstraints={{
          top: snapPositions[snapPositions.length - 1],
          bottom: snapPositions[0],
        }}
        dragElastic={0.1}
        onDragEnd={onDragEnd}
        animate={controls}
        initial={{ y: windowHeight }}
        style={{
          height: "100%",
          top: 0,
        }}
        className="absolute left-0 right-0 bg-white rounded-t-[32px] shadow-[0_-8px_30px_rgba(0,0,0,0.1)] pointer-events-auto flex flex-col"
      >
        {/* Handle & Header */}
        <div className="flex-shrink-0">{header}</div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain bg-white">
          {children}
        </div>
      </motion.div>
    </div>
  );
};
