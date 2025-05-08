'use client';

import { useMemo } from 'react';
import { BarChart3, TrendingUp, Award } from 'lucide-react';

interface StatsPanelProps {
  interviewHistory: Array<{
    question: string;
    answer: string;
    feedback: string;
    score: number;
  }>;
}

export default function StatsPanel({ interviewHistory }: StatsPanelProps) {
  const stats = useMemo(() => {
    if (!interviewHistory.length) {
      return {
        totalInterviews: 0,
        totalQuestions: 0,
        averageScore: 0,
        bestScore: 0,
        recentScores: []
      };
    }
    
    // Group by interview sessions (assuming consecutive questions are part of the same interview)
    const interviews: Array<Array<typeof interviewHistory[0]>> = [];
    let currentInterview: typeof interviewHistory = [];
    
    interviewHistory.forEach((item, index) => {
      if (index > 0 && item.question.includes('Question 1')) {
        interviews.push([...currentInterview]);
        currentInterview = [item];
      } else {
        currentInterview.push(item);
      }
    });
    
    if (currentInterview.length) {
      interviews.push(currentInterview);
    }
    
    // Calculate stats
    const totalInterviews = interviews.length;
    const totalQuestions = interviewHistory.length;
    const allScores = interviewHistory.map(item => item.score);
    const averageScore = allScores.length 
      ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 10) / 10
      : 0;
    const bestScore = Math.max(...allScores, 0);
    
    // Get recent scores (last 5)
    const recentScores = allScores.slice(-5).reverse();
    
    return {
      totalInterviews,
      totalQuestions,
      averageScore,
      bestScore,
      recentScores
    };
  }, [interviewHistory]);
  
  if (!interviewHistory.length) {
    return (
      <div className="py-2 text-center text-muted-foreground">
        <p>No interview data yet</p>
        <p className="text-sm">Complete an interview to see your stats</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4 py-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-secondary/30 p-3 rounded-md">
          <div className="flex items-center space-x-2 text-muted-foreground mb-1">
            <BarChart3 size={16} />
            <span className="text-xs font-medium">Interviews</span>
          </div>
          <p className="text-2xl font-bold">{stats.totalInterviews}</p>
        </div>
        
        <div className="bg-secondary/30 p-3 rounded-md">
          <div className="flex items-center space-x-2 text-muted-foreground mb-1">
            <TrendingUp size={16} />
            <span className="text-xs font-medium">Avg Score</span>
          </div>
          <p className="text-2xl font-bold">{stats.averageScore}</p>
        </div>
      </div>
      
      <div className="bg-secondary/30 p-3 rounded-md">
        <div className="flex items-center space-x-2 text-muted-foreground mb-2">
          <Award size={16} />
          <span className="text-xs font-medium">Best Score</span>
        </div>
        <div className="flex items-center">
          <div className="w-full bg-secondary rounded-full h-2.5">
            <div 
              className="bg-primary h-2.5 rounded-full" 
              style={{ width: `${(stats.bestScore / 10) * 100}%` }}
            ></div>
          </div>
          <span className="ml-2 text-sm font-medium">{stats.bestScore}/10</span>
        </div>
      </div>
      
      {stats.recentScores.length > 0 && (
        <div>
          <div className="flex items-center space-x-2 text-muted-foreground mb-2">
            <TrendingUp size={16} />
            <span className="text-xs font-medium">Recent Scores</span>
          </div>
          <div className="flex justify-between h-10">
            {stats.recentScores.map((score, i) => (
              <div key={i} className="flex flex-col items-center">
                <div 
                  className="bg-primary w-6" 
                  style={{ height: `${(score / 10) * 100}%` }}
                ></div>
                <span className="text-xs mt-1">{score}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
