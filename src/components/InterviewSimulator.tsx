'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Play, Pause, RotateCcw, Settings, ChevronDown, ChevronUp, MessageSquare, BarChart3 } from 'lucide-react';
import { generateText, generateTextStream } from '@/lib/api/util';
import { cn } from '@/lib/utils';
import JobSelector from './JobSelector';
import FeedbackPanel from './FeedbackPanel';
import SettingsPanel from './SettingsPanel';
import StatsPanel from './StatsPanel';
// Use the type declarations without importing

// Define interview states
type InterviewState = 'idle' | 'listening' | 'processing' | 'feedback' | 'completed';

// Define job roles
export type JobRole = 'software-engineer' | 'data-scientist' | 'marketing' | 'product-manager' | 'designer';

export default function InterviewSimulator() {
  // State management
  const [interviewState, setInterviewState] = useState<InterviewState>('idle');
  const [selectedJob, setSelectedJob] = useState<JobRole>('software-engineer');
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [userResponse, setUserResponse] = useState<string>('');
  const [feedback, setFeedback] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [questionNumber, setQuestionNumber] = useState<number>(1);
  const [totalQuestions, setTotalQuestions] = useState<number>(5);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showStats, setShowStats] = useState<boolean>(false);
  const [streamingResponse, setStreamingResponse] = useState<string>('');
  const [interviewHistory, setInterviewHistory] = useState<Array<{
    question: string;
    answer: string;
    feedback: string;
    score: number;
  }>>([]);
  
  // References
  const recognitionRef = useRef<any>(null);
  const aiProvider = 'azure-gpt-4o';
  const [isSpeechSupported, setIsSpeechSupported] = useState<boolean>(true);

  // Check if speech recognition is supported
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
      setIsSpeechSupported(isSupported);
      if (!isSupported) {
        console.warn('Speech recognition is not supported in this browser');
      }
    }
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        // Import browser-only dependencies
        const SpeechRecognition = 
          window.SpeechRecognition || 
          window.webkitSpeechRecognition;
        
        if (SpeechRecognition) {
          recognitionRef.current = new SpeechRecognition();
          recognitionRef.current.continuous = true;
          recognitionRef.current.interimResults = true;
          recognitionRef.current.lang = 'en-US';
          
          recognitionRef.current.onresult = (event: any) => {
            const transcript = Array.from(event.results)
              .map((result: any) => result[0])
              .map((result: any) => result.transcript)
              .join('');
            
            setUserResponse(transcript);
          };
          
          recognitionRef.current.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            setIsListening(false);
          };
          
          recognitionRef.current.onend = () => {
            if (isListening) {
              try {
                recognitionRef.current.start();
              } catch (error) {
                console.error('Failed to restart recognition:', error);
                setIsListening(false);
              }
            }
          };
          
          console.log('Speech recognition initialized successfully');
        } else {
          console.warn('SpeechRecognition API not supported in this browser');
        }
      } catch (error) {
        console.error('Error initializing speech recognition:', error);
      }
    }
    
    // Load interview history from localStorage
    if (typeof window !== 'undefined') {
      const savedHistory = localStorage.getItem('interviewHistory');
      if (savedHistory) {
        setInterviewHistory(JSON.parse(savedHistory));
      }
    }
  }, []);

  // Save interview history to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && interviewHistory.length > 0) {
      localStorage.setItem('interviewHistory', JSON.stringify(interviewHistory));
    }
  }, [interviewHistory]);

  // Toggle speech recognition
  const toggleListening = () => {
    if (isListening) {
      try {
        recognitionRef.current?.stop();
        setIsListening(false);
        
        if (interviewState === 'listening') {
          setInterviewState('processing');
          processUserResponse();
        }
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
      }
    } else {
      try {
        if (!recognitionRef.current) {
          // Try to reinitialize if recognition object is not available
          const SpeechRecognition = 
            window.SpeechRecognition || 
            window.webkitSpeechRecognition;
          
          if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'en-US';
            
            recognitionRef.current.onresult = (event: any) => {
              const transcript = Array.from(event.results)
                .map((result: any) => result[0])
                .map((result: any) => result.transcript)
                .join('');
              
              setUserResponse(transcript);
            };
            
            recognitionRef.current.onerror = (event: any) => {
              console.error('Speech recognition error:', event.error);
              setIsListening(false);
            };
            
            recognitionRef.current.onend = () => {
              if (isListening) {
                try {
                  recognitionRef.current?.start();
                } catch (error) {
                  console.error('Failed to restart recognition:', error);
                  setIsListening(false);
                }
              }
            };
          }
        }
        
        recognitionRef.current?.start();
        setIsListening(true);
        
        if (interviewState === 'idle' || interviewState === 'completed') {
          startInterview();
        } else {
          setInterviewState('listening');
        }
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        alert('Could not start speech recognition. Please make sure your browser supports this feature and you have granted microphone permissions.');
        setIsListening(false);
      }
    }
  };

  // Start the interview
  const startInterview = async () => {
    setInterviewState('processing');
    setQuestionNumber(1);
    setUserResponse('');
    setFeedback('');
    
    try {
      const prompt = `You are an expert interviewer for ${formatJobTitle(selectedJob)} positions. 
      Generate a challenging but realistic interview question that would be asked in a real interview. 
      The question should be specific to the ${formatJobTitle(selectedJob)} role.
      Only respond with the question text, nothing else.`;
      
      let question = '';
      await generateTextStream(
        prompt,
        (chunk) => {
          question += chunk;
          setStreamingResponse(question);
        },
        aiProvider
      );
      
      setCurrentQuestion(question);
      setStreamingResponse('');
      setInterviewState('listening');
      
      if (!isListening && recognitionRef.current) {
        recognitionRef.current.start();
        setIsListening(true);
      }
    } catch (error) {
      console.error('Error starting interview:', error);
      setCurrentQuestion('Failed to generate question. Please try again.');
      setInterviewState('idle');
    }
  };

  // Process the user's response
  const processUserResponse = async () => {
    if (!userResponse.trim()) {
      setFeedback("I didn't catch your response. Please try again.");
      setInterviewState('listening');
      return;
    }
    
    try {
      const prompt = `
      You are an expert interviewer and coach for ${formatJobTitle(selectedJob)} positions.
      
      The candidate was asked the following question:
      "${currentQuestion}"
      
      The candidate's response was:
      "${userResponse}"
      
      Please provide constructive feedback on the candidate's response. Evaluate:
      1. Content relevance and accuracy
      2. Structure and clarity of communication
      3. Confidence and delivery (based on the text)
      4. Technical accuracy (if applicable)
      
      Also provide a score from 1-10 and specific suggestions for improvement.
      Format your response as:
      
      FEEDBACK:
      [Your detailed feedback here]
      
      SCORE: [1-10]
      
      SUGGESTIONS:
      - [Suggestion 1]
      - [Suggestion 2]
      - [Suggestion 3]
      `;
      
      let feedbackResponse = '';
      await generateTextStream(
        prompt,
        (chunk) => {
          feedbackResponse += chunk;
          setStreamingResponse(feedbackResponse);
        },
        aiProvider
      );
      
      setFeedback(feedbackResponse);
      setStreamingResponse('');
      
      // Extract score from feedback (assuming format "SCORE: X")
      const scoreMatch = feedbackResponse.match(/SCORE:\s*(\d+)/i);
      const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 5;
      
      // Add to interview history
      setInterviewHistory(prev => [
        ...prev,
        {
          question: currentQuestion,
          answer: userResponse,
          feedback: feedbackResponse,
          score
        }
      ]);
      
      setInterviewState('feedback');
    } catch (error) {
      console.error('Error processing response:', error);
      setFeedback('Failed to analyze your response. Please try again.');
      setInterviewState('feedback');
    }
  };

  // Move to the next question
  const nextQuestion = async () => {
    if (questionNumber >= totalQuestions) {
      setInterviewState('completed');
      return;
    }
    
    setQuestionNumber(prev => prev + 1);
    setUserResponse('');
    setFeedback('');
    setInterviewState('processing');
    
    try {
      const previousQuestions = interviewHistory
        .slice(-3)
        .map(item => item.question)
        .join('\n- ');
      
      const prompt = `
      You are an expert interviewer for ${formatJobTitle(selectedJob)} positions.
      
      Generate a challenging but realistic interview question that would be asked in a real interview.
      The question should be specific to the ${formatJobTitle(selectedJob)} role.
      
      This is question ${questionNumber + 1} of ${totalQuestions}.
      
      Previous questions asked in this interview:
      - ${previousQuestions || 'None yet'}
      
      Make sure this question is different from previous ones and explores another aspect of the candidate's skills.
      Only respond with the question text, nothing else.
      `;
      
      let question = '';
      await generateTextStream(
        prompt,
        (chunk) => {
          question += chunk;
          setStreamingResponse(question);
        },
        aiProvider
      );
      
      setCurrentQuestion(question);
      setStreamingResponse('');
      setInterviewState('listening');
      
      if (!isListening && recognitionRef.current) {
        recognitionRef.current.start();
        setIsListening(true);
      }
    } catch (error) {
      console.error('Error generating next question:', error);
      setCurrentQuestion('Failed to generate question. Please try again.');
      setInterviewState('idle');
    }
  };

  // Reset the interview
  const resetInterview = () => {
    setInterviewState('idle');
    setCurrentQuestion('');
    setUserResponse('');
    setFeedback('');
    setQuestionNumber(1);
    
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }
  };

  // Format job title for display
  const formatJobTitle = (job: JobRole): string => {
    return job.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="flex flex-col space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Interview Simulator</h1>
        <p className="text-muted-foreground mt-2">
          Practice your interview skills with AI-powered feedback
        </p>
      </div>
      
      {/* Main interview interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left panel - Job selection and settings */}
        <div className="lg:col-span-1">
          <div className="bg-card rounded-lg shadow-sm p-6 space-y-6">
            <JobSelector 
              selectedJob={selectedJob} 
              setSelectedJob={setSelectedJob}
              disabled={interviewState !== 'idle' && interviewState !== 'completed'}
            />
            
            <div className="flex flex-col space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Interview Settings</h3>
                <button 
                  onClick={() => setShowSettings(!showSettings)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showSettings ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
              </div>
              
              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <SettingsPanel 
                      totalQuestions={totalQuestions}
                      setTotalQuestions={setTotalQuestions}
                      disabled={interviewState !== 'idle' && interviewState !== 'completed'}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="flex flex-col space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Interview Stats</h3>
                <button 
                  onClick={() => setShowStats(!showStats)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showStats ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
              </div>
              
              <AnimatePresence>
                {showStats && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <StatsPanel interviewHistory={interviewHistory} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
        
        {/* Center panel - Main interview area */}
        <div className="lg:col-span-2">
          <div className="bg-card rounded-lg shadow-sm p-6 space-y-6">
            {/* Interview progress */}
            {interviewState !== 'idle' && (
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">
                  Question {questionNumber} of {totalQuestions}
                </span>
                <div className="w-2/3 bg-secondary rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full" 
                    style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
            
            {/* Interview content */}
            <div className="min-h-[400px] flex flex-col justify-between">
              {/* Question display */}
              <div className="space-y-4">
                {interviewState === 'idle' || interviewState === 'completed' ? (
                  <div className="text-center py-12">
                    <h2 className="text-2xl font-semibold mb-4">
                      {interviewState === 'completed' 
                        ? 'Interview Completed!' 
                        : 'Ready to Start Your Interview?'}
                    </h2>
                    <p className="text-muted-foreground mb-8">
                      {interviewState === 'completed'
                        ? `You've completed all ${totalQuestions} questions. Would you like to start a new interview?`
                        : `Click the button below to begin your ${formatJobTitle(selectedJob)} interview.`}
                    </p>
                    <button
                      onClick={startInterview}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 rounded-md font-medium flex items-center justify-center mx-auto"
                    >
                      <Play size={18} className="mr-2" />
                      {interviewState === 'completed' ? 'Start New Interview' : 'Start Interview'}
                    </button>
                  </div>
                ) : (
                  <>
                    <h3 className="text-lg font-medium">Question:</h3>
                    <div className="bg-secondary/50 p-4 rounded-md">
                      {interviewState === 'processing' && !currentQuestion ? (
                        <div className="animate-pulse">
                          {streamingResponse || 'Generating question...'}
                        </div>
                      ) : (
                        <p>{currentQuestion}</p>
                      )}
                    </div>
                    
                    {(interviewState === 'listening' || interviewState === 'processing' || interviewState === 'feedback') && (
                      <>
                        <h3 className="text-lg font-medium mt-6">Your Response:</h3>
                        <div className="space-y-2">
                          <div className={cn(
                            "bg-secondary/30 p-4 rounded-md min-h-[100px] relative",
                            isListening && "border-2 border-primary/50"
                          )}>
                            {userResponse ? (
                              <p>{userResponse}</p>
                            ) : (
                              <p className="text-muted-foreground italic">
                                {isListening ? "I'm listening... speak your answer" : "No response recorded yet"}
                              </p>
                            )}
                            
                            {isListening && (
                              <div className="absolute bottom-2 right-2 flex space-x-1">
                                <span className="animate-pulse text-primary">●</span>
                                <span className="animate-pulse text-primary" style={{ animationDelay: '0.2s' }}>●</span>
                                <span className="animate-pulse text-primary" style={{ animationDelay: '0.4s' }}>●</span>
                              </div>
                            )}
                          </div>
                          
                          {!isListening && interviewState === 'listening' && (
                            <div className="flex space-x-2">
                              <textarea
                                value={userResponse}
                                onChange={(e) => setUserResponse(e.target.value)}
                                placeholder="Type your answer here if you prefer not to use voice..."
                                className="w-full p-2 border border-border rounded-md bg-secondary/20 min-h-[100px] resize-none"
                              />
                            </div>
                          )}
                        </div>
                      </>
                    )}
                    
                    {interviewState === 'feedback' && (
                      <FeedbackPanel feedback={feedback} />
                    )}
                    
                    {interviewState === 'processing' && !feedback && userResponse && (
                      <div className="mt-6">
                        <h3 className="text-lg font-medium">Feedback:</h3>
                        <div className="bg-secondary/30 p-4 rounded-md min-h-[100px]">
                          <div className="animate-pulse">
                            {streamingResponse || 'Analyzing your response...'}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
              
              {/* Controls */}
              {(interviewState !== 'idle' && interviewState !== 'completed') && (
                <div className="flex justify-between items-center mt-8">
                  <button
                    onClick={resetInterview}
                    className="bg-secondary hover:bg-secondary/80 text-secondary-foreground px-4 py-2 rounded-md flex items-center"
                  >
                    <RotateCcw size={18} className="mr-2" />
                    Reset
                  </button>
                  
                  <div className="flex space-x-4">
                    <div className="space-y-2">
                      <div className="flex space-x-2">
                        {isSpeechSupported ? (
                          <button
                            onClick={toggleListening}
                            className={cn(
                              "px-4 py-2 rounded-md flex items-center",
                              isListening 
                                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" 
                                : "bg-primary text-primary-foreground hover:bg-primary/90"
                            )}
                          >
                            {isListening ? (
                              <>
                                <MicOff size={18} className="mr-2" />
                                Stop Recording
                              </>
                            ) : (
                              <>
                                <Mic size={18} className="mr-2" />
                                {interviewState === 'feedback' ? 'Record Next Answer' : 'Start Recording'}
                              </>
                            )}
                          </button>
                        ) : (
                          <div className="text-amber-500 flex items-center text-sm">
                            <Mic size={16} className="mr-1" />
                            Voice recording not supported in this browser
                          </div>
                        )}
                        
                        {!isListening && interviewState === 'listening' && (
                          <button
                            onClick={() => {
                              if (userResponse.trim()) {
                                setInterviewState('processing');
                                processUserResponse();
                              } else {
                                alert('Please provide a response before submitting.');
                              }
                            }}
                            className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md"
                          >
                            Submit Response
                          </button>
                        )}
                      </div>
                      
                      {!isSpeechSupported && interviewState === 'listening' && (
                        <p className="text-sm text-muted-foreground">
                          Please use the text input below to type your response.
                        </p>
                      )}
                    </div>
                    
                    {interviewState === 'feedback' && (
                      <button
                        onClick={nextQuestion}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md flex items-center"
                      >
                        Next Question
                        <ChevronDown size={18} className="ml-2 rotate-270" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
