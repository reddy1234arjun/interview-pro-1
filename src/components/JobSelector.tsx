'use client';

import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type JobRole } from './InterviewSimulator';

interface JobSelectorProps {
  selectedJob: JobRole;
  setSelectedJob: (job: JobRole) => void;
  disabled?: boolean;
}

const jobOptions: { value: JobRole; label: string; description: string }[] = [
  {
    value: 'software-engineer',
    label: 'Software Engineer',
    description: 'Technical coding, system design, and problem-solving questions'
  },
  {
    value: 'data-scientist',
    label: 'Data Scientist',
    description: 'Statistics, machine learning, and data analysis questions'
  },
  {
    value: 'marketing',
    label: 'Marketing',
    description: 'Brand strategy, campaign planning, and market analysis questions'
  },
  {
    value: 'product-manager',
    label: 'Product Manager',
    description: 'Product strategy, user experience, and prioritization questions'
  },
  {
    value: 'designer',
    label: 'Designer',
    description: 'UX/UI design, creative process, and portfolio questions'
  }
];

export default function JobSelector({ selectedJob, setSelectedJob, disabled = false }: JobSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };
  
  const selectJob = (job: JobRole) => {
    setSelectedJob(job);
    setIsOpen(false);
  };
  
  const selectedOption = jobOptions.find(option => option.value === selectedJob);
  
  return (
    <div className="space-y-2">
      <label className="text-lg font-medium">Job Role</label>
      <div className="relative">
        <button
          type="button"
          onClick={toggleDropdown}
          className={cn(
            "w-full flex items-center justify-between bg-secondary/50 p-4 rounded-md text-left",
            disabled ? "opacity-70 cursor-not-allowed" : "hover:bg-secondary/70 cursor-pointer",
          )}
          disabled={disabled}
        >
          <div>
            <div className="font-medium">{selectedOption?.label}</div>
            <div className="text-sm text-muted-foreground">{selectedOption?.description}</div>
          </div>
          <ChevronDown size={20} className={cn("transition-transform", isOpen && "rotate-180")} />
        </button>
        
        {isOpen && (
          <div className="absolute z-10 mt-1 w-full bg-card border border-border rounded-md shadow-lg">
            <ul className="py-1 max-h-60 overflow-auto">
              {jobOptions.map((option) => (
                <li 
                  key={option.value}
                  onClick={() => selectJob(option.value)}
                  className={cn(
                    "px-4 py-3 flex items-center justify-between hover:bg-secondary/50 cursor-pointer",
                    selectedJob === option.value && "bg-secondary/30"
                  )}
                >
                  <div>
                    <div className="font-medium">{option.label}</div>
                    <div className="text-sm text-muted-foreground">{option.description}</div>
                  </div>
                  {selectedJob === option.value && <Check size={18} className="text-primary" />}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
