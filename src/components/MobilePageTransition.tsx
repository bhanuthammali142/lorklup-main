import React from 'react';
import { motion } from 'framer-motion';

interface MobilePageTransitionProps {
  children: React.ReactNode;
}

export const MobilePageTransition: React.FC<MobilePageTransitionProps> = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className="w-full h-full flex flex-col flex-1"
    >
      {children}
    </motion.div>
  );
};
