'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ThumbsUp, ThumbsDown, Award } from 'lucide-react';

interface FeedbackPanelProps {
  feedback: string;
}

export default function FeedbackPanel({ feedback }: FeedbackPanelProps) {
  // Parse feedback sections
  const feedbackSection = feedback.match(/FEEDBACK:([\s\S]*?)(?=SCORE:|SUGGESTIONS:|$)/i)?.[1]?.trim() || '';
  
  const scoreMatch = feedback.match(/SCORE:\s*(\d+)/i);
  const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;
  
  const suggestionsSection = feedback.match(/SUGGESTIONS:([\s\S]*?)$/i)?.[1]?.trim() || '';
  const suggestions = suggestionsSection
    .split('-')
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  // Determine score color and icon
  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-500';
    if (score >= 5) return 'text-amber-500';
    return 'text-red-500';
  };
  
  const getScoreIcon = (score: number) => {
    if (score >= 8) return <ThumbsUp className="w-5 h-5" />;
    if (score >= 5) return <Award className="w-5 h-5" />;
    return <ThumbsDown className="w-5 h-5" />;
  };
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-6 space-y-4"
    >
      <h3 className="text-lg font-medium">Feedback:</h3>
      
      <div className="bg-secondary/30 p-4 rounded-md space-y-4">
        {/* Score */}
        <div className="flex items-center justify-between">
          <span className="font-medium">Score:</span>
          <div className="flex items-center space-x-2">
            <span className={`text-xl font-bold ${getScoreColor(score)}`}>{score}/10</span>
            <span className={getScoreColor(score)}>{getScoreIcon(score)}</span>
          </div>
        </div>
        
        {/* Feedback text */}
        <div>
          <h4 className="font-medium mb-2">Analysis:</h4>
          <p className="text-sm">{feedbackSection}</p>
        </div>
        
        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Suggestions for improvement:</h4>
            <ul className="list-disc pl-5 space-y-1">
              {suggestions.map((suggestion, index) => (
                <li key={index} className="text-sm">{suggestion}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </motion.div>
  );
}
