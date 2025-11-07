'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import {
  Brain,
  ShoppingCart,
  Package,
  Megaphone,
  Globe,
  MessageSquare,
  Target,
  CheckCircle2,
  Loader2,
  Sparkles,
} from 'lucide-react';

interface DataSource {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  status: 'pending' | 'loading' | 'complete';
}

interface InsightsLoadingProps {
  dataSources: DataSource[];
  currentStage: 'fetching' | 'analyzing' | 'complete';
  aiProgress?: number;
  onComplete?: () => void;
}

export function InsightsLoading({ 
  dataSources, 
  currentStage, 
  aiProgress = 0,
  onComplete 
}: InsightsLoadingProps) {

  // Handle completion
  useEffect(() => {
    if (currentStage === 'complete' && onComplete) {
      const timer = setTimeout(() => {
        onComplete();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentStage, onComplete]);

  return (
    <div className="flex min-h-[600px] items-center justify-center">
      <Card className="w-full max-w-2xl p-8">
        <div className="space-y-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <motion.div
              animate={{
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 1,
                ease: "easeInOut",
              }}
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg"
            >
              <Brain className="h-8 w-8 text-white" />
            </motion.div>
            <h2 className="text-2xl font-bold text-gray-900">Generating Insights</h2>
            <p className="mt-2 text-gray-600">
              {currentStage === 'fetching' && 'Collecting data from all sources...'}
              {currentStage === 'analyzing' && 'AI is analyzing your data...'}
              {currentStage === 'complete' && 'Insights ready!'}
            </p>
          </motion.div>

          {/* Data Sources Progress */}
          <AnimatePresence mode="wait">
            {currentStage === 'fetching' && (
              <motion.div
                key="fetching"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Data Sources</h3>
                {dataSources.map((source, index) => {
                  const Icon = source.icon;
                  return (
                    <motion.div
                      key={source.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50/50 p-3"
                    >
                      <div className="flex-shrink-0">
                        {source.status === 'pending' && (
                          <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                        )}
                        {source.status === 'loading' && (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          >
                            <Loader2 className="h-5 w-5 text-indigo-600" />
                          </motion.div>
                        )}
                        {source.status === 'complete' && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          >
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          </motion.div>
                        )}
                      </div>
                      <Icon className={`h-5 w-5 ${
                        source.status === 'complete' ? 'text-green-600' :
                        source.status === 'loading' ? 'text-indigo-600' :
                        'text-gray-400'
                      }`} />
                      <span className={`flex-1 text-sm font-medium ${
                        source.status === 'complete' ? 'text-gray-900' :
                        source.status === 'loading' ? 'text-indigo-600' :
                        'text-gray-500'
                      }`}>
                        {source.name}
                      </span>
                      {source.status === 'loading' && (
                        <motion.div
                          className="h-1 flex-1 rounded-full bg-gray-200"
                          initial={{ width: 0 }}
                          animate={{ width: '100%' }}
                          transition={{ duration: 0.6 }}
                        >
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 0.6 }}
                          />
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {/* AI Analysis Stage */}
          <AnimatePresence mode="wait">
            {currentStage === 'analyzing' && (
              <motion.div
                key="analyzing"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-center gap-3">
                  <motion.div
                    animate={{
                      rotate: [0, 360],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="relative"
                  >
                    <Brain className="h-12 w-12 text-indigo-600" />
                    <motion.div
                      className="absolute inset-0 rounded-full bg-indigo-400/20 blur-xl"
                      animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0.5, 0.8, 0.5],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                  </motion.div>
                  <div className="flex items-center gap-2">
                    {[...Array(3)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="h-2 w-2 rounded-full bg-indigo-600"
                        animate={{
                          y: [0, -8, 0],
                          opacity: [0.5, 1, 0.5],
                        }}
                        transition={{
                          duration: 0.6,
                          repeat: Infinity,
                          delay: i * 0.2,
                          ease: "easeInOut",
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">AI Analysis Progress</span>
                    <span className="text-gray-600">{Math.round(aiProgress)}%</span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
                    <motion.div
                      className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${aiProgress}%` }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Sparkles className="h-3 w-3" />
                    <span>Analyzing patterns, trends, and correlations...</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Complete Stage */}
          <AnimatePresence mode="wait">
            {currentStage === 'complete' && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-500"
                >
                  <CheckCircle2 className="h-8 w-8 text-white" />
                </motion.div>
                <h3 className="text-xl font-bold text-gray-900">Analysis Complete!</h3>
                <p className="mt-2 text-gray-600">Your insights are ready to view</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </div>
  );
}

