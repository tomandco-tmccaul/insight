'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  badge?: ReactNode;
}

export function PageHeader({
  title,
  description,
  actions,
  className,
  badge,
}: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className={cn('mb-8 relative', className)}
    >
      {/* Decorative background gradient */}
      <div className="absolute -left-6 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 via-purple-500 to-indigo-500 rounded-full opacity-60" />

      {/* Subtle background glow */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-indigo-50/30 via-purple-50/20 to-transparent rounded-lg blur-xl opacity-50" />

      <div className="flex items-start justify-between gap-6 pl-6">
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Colored accent dot */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
              className="h-2 w-2 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 shadow-lg shadow-blue-500/50"
            />

            <div className="flex items-center gap-3 flex-1 min-w-0">
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                <span className="bg-gradient-to-r from-gray-900 via-blue-700 to-cyan-700 bg-clip-text text-transparent">
                  {title}
                </span>
              </h1>
              {badge && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                >
                  {badge}
                </motion.div>
              )}
            </div>
          </div>

          {description && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.3 }}
              className="relative pl-6"
            >
              {/* Decorative line before description */}
              <div className="absolute left-0 top-2 bottom-0 w-0.5 bg-gradient-to-b from-indigo-200 via-purple-200 to-transparent rounded-full" />
              <p className="text-lg leading-relaxed max-w-3xl text-gray-600">
                {description}
              </p>
            </motion.div>
          )}
        </div>

        {actions && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="flex items-center gap-2 flex-shrink-0"
          >
            {actions}
          </motion.div>
        )}
      </div>

      {/* Bottom border accent */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.3, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className="mt-6 h-px bg-gradient-to-r from-transparent via-indigo-200 to-transparent"
      />
    </motion.div>
  );
}

