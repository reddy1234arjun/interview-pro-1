'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Send, Bookmark, BookmarkCheck, Copy, Share2, History, Code, FileText, ChevronDown, ChevronUp, X, Save, Trash2 } from 'lucide-react';
import { generateTextStream } from '@/lib/api/util';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
// No need for technical domains as we'll detect them automatically

// Define answer types
export type AnswerType = 'detailed' | 'brief' | 'code-only';

// Define question item structure
export interface QuestionItem {
  id: string;
  question: string;
  answer: string;
  detectedDomain: string;
  answerType: AnswerType;
  timestamp: number;
  isBookmarked: boolean;
}

export default function TechInterviewPrep() {
  // State management
  const [question, setQuestion] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [answer, setAnswer] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [answerType, setAnswerType] = useState<AnswerType>('detailed');
  const [streamingResponse, setStreamingResponse] = useState<string>('');
  const [questionHistory, setQuestionHistory] = useState<QuestionItem[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const [isSpeechSupported, setIsSpeechSupported] = useState<boolean>(true);
  const [copiedToClipboard, setCopiedToClipboard] = useState<boolean>(false);
  const [speechDebug, setSpeechDebug] = useState<string>('');
  
  // References
  const recognitionRef = useRef<any>(null);
  const aiProvider = 'azure-gpt-4o';
  const questionInputRef = useRef<HTMLTextAreaElement>(null);
  const answerContainerRef = useRef<HTMLDivElement>(null);

  // Helper function to create a simple speech recognition instance
  const createSpeechRecognition = () => {
    if (typeof window === 'undefined') return null;
    
    try {
      const SpeechRecognition = 
        window.SpeechRecognition || 
        window.webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        setSpeechDebug('Speech recognition not supported');
        setIsSpeechSupported(false);
        return null;
      }
      
      const recognition = new SpeechRecognition();
      recognition.continuous = true; // Enable continuous recognition to capture longer phrases
      recognition.interimResults = true; // Get interim results for better feedback
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1; // Only need one alternative
      
      // Add visual feedback
      recognition.onstart = () => {
        setSpeechDebug('Listening for your question...');
      };
      
      recognition.onaudiostart = () => {
        setSpeechDebug('Audio capture started - speak now');
      };
      
      recognition.onspeechend = () => {
        setSpeechDebug('Speech ended - processing...');
        // Don't stop automatically to ensure we capture everything
        setTimeout(() => {
          try {
            recognition.stop();
          } catch (e) {
            console.error('Error stopping recognition:', e);
          }
        }, 1000);
      };
      
      return recognition;
    } catch (error) {
      console.error('Error creating speech recognition:', error);
      setSpeechDebug(`Error: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  };

  // Check if speech recognition is supported and request microphone permissions
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
      setIsSpeechSupported(isSupported);
      
      if (!isSupported) {
        console.warn('Speech recognition is not supported in this browser');
        setSpeechDebug('Speech recognition API not available');
        return;
      }
      
      // Test microphone permissions
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          console.log('Microphone permission granted');
          setSpeechDebug('Microphone permission granted');
          // Stop all tracks to release the microphone
          stream.getTracks().forEach(track => track.stop());
        })
        .catch(err => {
          console.error('Microphone permission denied:', err);
          setSpeechDebug(`Microphone permission issue: ${err.message}`);
        });
    }
  }, []);

  // Initialize speech recognition capabilities check
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        // Check if the browser supports SpeechRecognition
        const SpeechRecognition = 
          window.SpeechRecognition || 
          window.webkitSpeechRecognition;
        
        if (SpeechRecognition) {
          console.log("Speech recognition API is available");
          setIsSpeechSupported(true);
          
          // Test microphone permissions
          navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
              console.log('Microphone permission granted');
              setSpeechDebug('Microphone access granted');
              
              // Release the microphone immediately
              stream.getTracks().forEach(track => track.stop());
            })
            .catch(err => {
              console.error('Microphone permission denied:', err);
              setSpeechDebug(`Microphone access denied: ${err.message}`);
              setIsSpeechSupported(false);
            });
        } else {
          console.warn("Speech Recognition API not available in this browser");
          setSpeechDebug("Speech recognition not supported in this browser");
          setIsSpeechSupported(false);
        }
      } catch (error) {
        console.error('Error checking speech recognition:', error);
        setSpeechDebug(`Error: ${error instanceof Error ? error.message : String(error)}`);
        setIsSpeechSupported(false);
      }
    }
    
    // Load question history from localStorage
    if (typeof window !== 'undefined') {
      const savedHistory = localStorage.getItem('techInterviewQuestions');
      if (savedHistory) {
        try {
          setQuestionHistory(JSON.parse(savedHistory));
        } catch (error) {
          console.error('Error parsing saved history:', error);
        }
      }
    }
  }, []);

  // Save question history to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && questionHistory.length > 0) {
      localStorage.setItem('techInterviewQuestions', JSON.stringify(questionHistory));
    }
  }, [questionHistory]);

  // Reset copied state after 2 seconds
  useEffect(() => {
    if (copiedToClipboard) {
      const timer = setTimeout(() => {
        setCopiedToClipboard(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [copiedToClipboard]);

  // Toggle speech recognition
  const toggleListening = () => {
    if (isListening) {
      try {
        recognitionRef.current?.stop();
        setIsListening(false);
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
      }
    } else {
      try {
        // Always reinitialize the recognition object to ensure fresh state
        const SpeechRecognition = 
          window.SpeechRecognition || 
          window.webkitSpeechRecognition;
        
        if (SpeechRecognition) {
          // Create a new instance each time to avoid stale state
          recognitionRef.current = new SpeechRecognition();
          recognitionRef.current.continuous = true;
          recognitionRef.current.interimResults = true;
          recognitionRef.current.lang = 'en-US';
          
          // Set up the event handlers
          recognitionRef.current.onresult = (event: any) => {
            try {
              // Accumulate the entire transcript from all results
              let fullTranscript = '';
              const results = Array.from(event.results);
              
              // Process all results to get the complete transcript
              for (let i = 0; i < results.length; i++) {
                fullTranscript += results[i][0].transcript + ' ';
              }
              
              // Clean up the transcript
              fullTranscript = fullTranscript.trim();
              
              console.log("Full speech recognized:", fullTranscript);
              
              // Update the question state with the complete transcript
              setQuestion(fullTranscript);
              
              // Update debug info
              setSpeechDebug(`Transcript updated: ${fullTranscript.substring(0, 30)}...`);
              
              // Check if the last result is final to trigger answer generation
              const lastResult = results[results.length - 1];
              if (lastResult[0].isFinal) {
                const timer = setTimeout(() => {
                  if (fullTranscript.trim() && !isProcessing) {
                    generateAnswer();
                  }
                }, 1500);
                
                return () => clearTimeout(timer);
              }
            } catch (err) {
              console.error("Error processing speech result:", err);
              setSpeechDebug(`Error processing speech: ${err instanceof Error ? err.message : String(err)}`);
            }
          };
          
          recognitionRef.current.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            setSpeechDebug(`Recognition error: ${event.error}`);
            setIsListening(false);
          };
          
          recognitionRef.current.onend = () => {
            console.log("Speech recognition ended");
            if (isListening) {
              try {
                recognitionRef.current?.start();
                console.log("Restarted speech recognition");
              } catch (error) {
                console.error('Failed to restart recognition:', error);
                setSpeechDebug(`Failed to restart: ${error instanceof Error ? error.message : String(error)}`);
                setIsListening(false);
              }
            }
          };
          
          recognitionRef.current.onstart = () => {
            console.log("Speech recognition started");
            setSpeechDebug("Listening active - speak now");
          };
        }
        
        // Start the recognition
        recognitionRef.current?.start();
        setIsListening(true);
        
        // Focus the question input
        if (questionInputRef.current) {
          questionInputRef.current.focus();
        }
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        setSpeechDebug(`Start error: ${error instanceof Error ? error.message : String(error)}`);
        alert('Could not start speech recognition. Please make sure your browser supports this feature and you have granted microphone permissions.');
        setIsListening(false);
      }
    }
  };

  // Generate answer for the question
  const generateAnswer = async () => {
    if (!question.trim()) {
      alert('Please enter a question first.');
      return;
    }
    
    setIsProcessing(true);
    setAnswer('');
    setStreamingResponse('');
    
    // Generate a unique ID for this question
    const questionId = Date.now().toString();
    setCurrentQuestionId(questionId);
    
    try {
      let answerTypePrompt = '';
      
      switch (answerType) {
        case 'brief':
          answerTypePrompt = 'Provide a concise answer (2-3 paragraphs maximum).';
          break;
        case 'code-only':
          answerTypePrompt = 'Focus primarily on code examples with minimal explanation.';
          break;
        case 'detailed':
        default:
          answerTypePrompt = 'Provide a comprehensive answer with detailed explanations and examples.';
          break;
      }
      
      const prompt = `
      You are an expert technical interviewer and coach specializing in programming, computer science, and software development.
      
      Please answer the following technical interview question:
      
      "${question}"
      
      First, identify the technical domain this question belongs to (e.g., Python, SQL, JavaScript, System Design, etc.).
      Then provide your answer based on that domain expertise.
      
      ${answerTypePrompt}
      
      Format your response using Markdown:
      - Use ## for section headings
      - Use code blocks with appropriate language syntax highlighting
      - Use bullet points for lists
      - Include examples where appropriate
      - Explain the reasoning behind the answer
      
      If the question is about coding, include working code examples.
      If the question is about system design, include diagrams described in text and explanations.
      If the question is about concepts, provide clear definitions and practical applications.
      `;
      
      let fullResponse = '';
      await generateTextStream(
        prompt,
        (chunk) => {
          fullResponse += chunk;
          setStreamingResponse(fullResponse);
        },
        aiProvider
      );
      
      setAnswer(fullResponse);
      
      // Extract the detected domain from the response
      const domainMatch = fullResponse.match(/^(.*?)(domain|topic|area|field|subject|category):\s*([A-Za-z0-9\s\-+#]+)/i);
      const detectedDomain = domainMatch ? domainMatch[3].trim() : "General Programming";
      
      // Add to question history
      const newQuestion: QuestionItem = {
        id: questionId,
        question,
        answer: fullResponse,
        detectedDomain: detectedDomain,
        answerType,
        timestamp: Date.now(),
        isBookmarked: false
      };
      
      setQuestionHistory(prev => [newQuestion, ...prev]);
      
    } catch (error) {
      console.error('Error generating answer:', error);
      setAnswer('Failed to generate an answer. Please try again.');
    } finally {
      setIsProcessing(false);
      setStreamingResponse('');
      
      // Scroll to the answer
      setTimeout(() => {
        if (answerContainerRef.current) {
          answerContainerRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  };

  // Format domain name for display
  const formatDomainName = (domain: string): string => {
    return domain.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  // Toggle bookmark status for a question
  const toggleBookmark = (id: string) => {
    setQuestionHistory(prev => 
      prev.map(item => 
        item.id === id 
          ? { ...item, isBookmarked: !item.isBookmarked } 
          : item
      )
    );
  };

  // Copy answer to clipboard
  const copyToClipboard = () => {
    if (answer) {
      navigator.clipboard.writeText(answer)
        .then(() => {
          setCopiedToClipboard(true);
        })
        .catch(err => {
          console.error('Failed to copy text: ', err);
        });
    }
  };

  // Share answer
  const shareAnswer = () => {
    if (navigator.share && answer) {
      navigator.share({
        title: 'Technical Interview Answer',
        text: `Question: ${question}\n\nAnswer: ${answer.substring(0, 100)}...`,
        url: window.location.href
      }).catch(err => {
        console.error('Error sharing: ', err);
      });
    } else {
      copyToClipboard();
      alert('Link copied to clipboard! Share it with others.');
    }
  };

  // Load a question from history
  const loadQuestion = (item: QuestionItem) => {
    setQuestion(item.question);
    setAnswer(item.answer);
    setAnswerType(item.answerType);
    setCurrentQuestionId(item.id);
    setShowHistory(false);
    
    // Scroll to the answer
    setTimeout(() => {
      if (answerContainerRef.current) {
        answerContainerRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  // Delete a question from history
  const deleteQuestion = (id: string) => {
    setQuestionHistory(prev => prev.filter(item => item.id !== id));
    
    // If the current question is deleted, clear the UI
    if (currentQuestionId === id) {
      setQuestion('');
      setAnswer('');
      setCurrentQuestionId(null);
    }
  };

  // Clear all questions from history
  const clearHistory = () => {
    if (confirm('Are you sure you want to clear all your question history?')) {
      setQuestionHistory([]);
      setQuestion('');
      setAnswer('');
      setCurrentQuestionId(null);
    }
  };

  return (
    <div className="flex flex-col space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Technical Interview Prep</h1>
        <p className="text-muted-foreground mt-2">
          Get AI-powered answers to technical interview questions
        </p>
        
        {isSpeechSupported && (
          <button
            onClick={() => {
              setSpeechDebug('Starting voice question...');
              
              const recognition = createSpeechRecognition();
              if (!recognition) {
                setSpeechDebug('Could not initialize speech recognition');
                return;
              }
              
              recognition.onresult = (event: any) => {
                try {
                  // Accumulate the entire transcript from all results
                  let fullTranscript = '';
                  const results = Array.from(event.results);
                  
                  for (let i = 0; i < results.length; i++) {
                    fullTranscript += results[i][0].transcript + ' ';
                  }
                  
                  // Clean up the transcript
                  fullTranscript = fullTranscript.trim();
                  
                  setQuestion(fullTranscript);
                  setSpeechDebug(`Processing: "${fullTranscript.substring(0, 30)}..."`);
                  
                  // Automatically generate answer
                  setTimeout(() => {
                    if (fullTranscript.trim()) {
                      generateAnswer();
                    }
                  }, 500);
                } catch (err) {
                  console.error("Error processing voice input:", err);
                  setSpeechDebug(`Error: ${err instanceof Error ? err.message : String(err)}`);
                }
              };
              
              recognition.start();
            }}
            className="mt-6 bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-3 rounded-lg flex items-center mx-auto shadow-md transition-all hover:shadow-lg"
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <div className="animate-spin mr-3 h-5 w-5 border-2 border-current border-t-transparent rounded-full"></div>
                Processing...
              </>
            ) : (
              <>
                <Mic size={20} className="mr-3" />
                Ask Question with Voice
              </>
            )}
          </button>
        )}
      </div>
      
      {/* Main interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left panel - History and settings */}
        <div className="lg:col-span-1">
          <div className="bg-card rounded-lg shadow-sm p-6 space-y-6">
            
            <div className="flex flex-col space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Answer Type</h3>
              </div>
              
              <div className="grid grid-cols-3 gap-2 mt-2">
                <button
                  onClick={() => setAnswerType('detailed')}
                  className={cn(
                    "px-3 py-2 rounded-md text-sm font-medium flex items-center justify-center",
                    answerType === 'detailed'
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary hover:bg-secondary/80"
                  )}
                >
                  <FileText size={16} className="mr-1" />
                  Detailed
                </button>
                <button
                  onClick={() => setAnswerType('brief')}
                  className={cn(
                    "px-3 py-2 rounded-md text-sm font-medium flex items-center justify-center",
                    answerType === 'brief'
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary hover:bg-secondary/80"
                  )}
                >
                  <ChevronDown size={16} className="mr-1" />
                  Brief
                </button>
                <button
                  onClick={() => setAnswerType('code-only')}
                  className={cn(
                    "px-3 py-2 rounded-md text-sm font-medium flex items-center justify-center",
                    answerType === 'code-only'
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary hover:bg-secondary/80"
                  )}
                >
                  <Code size={16} className="mr-1" />
                  Code Only
                </button>
              </div>
              
              {speechDebug && (
                <div className="mt-2 p-2 bg-secondary/30 rounded-md text-xs text-muted-foreground">
                  <p>Speech Recognition Status: {speechDebug}</p>
                </div>
              )}
            </div>
            
            <div className="flex flex-col space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium flex items-center">
                  <History size={18} className="mr-2" />
                  Question History
                </h3>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => setShowHistory(!showHistory)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showHistory ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                  {questionHistory.length > 0 && (
                    <button
                      onClick={clearHistory}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      title="Clear all history"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
              
              <AnimatePresence>
                {showHistory && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    {questionHistory.length > 0 ? (
                      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                        {questionHistory.map((item) => (
                          <div 
                            key={item.id}
                            className={cn(
                              "bg-secondary/30 p-3 rounded-md cursor-pointer hover:bg-secondary/50 transition-colors",
                              currentQuestionId === item.id && "border-l-4 border-primary"
                            )}
                          >
                            <div className="flex justify-between items-start">
                              <div 
                                className="flex-1 mr-2"
                                onClick={() => loadQuestion(item)}
                              >
                                <p className="font-medium line-clamp-2">{item.question}</p>
                                <div className="flex items-center mt-1 text-xs text-muted-foreground">
                                  <span className="bg-secondary/70 px-2 py-0.5 rounded-full">
                                    {formatDomainName(item.detectedDomain)}
                                  </span>
                                  <span className="mx-2">•</span>
                                  <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                                </div>
                              </div>
                              <div className="flex space-x-1">
                                <button
                                  onClick={() => toggleBookmark(item.id)}
                                  className={cn(
                                    "p-1 rounded-md hover:bg-secondary/70",
                                    item.isBookmarked ? "text-amber-500" : "text-muted-foreground"
                                  )}
                                  title={item.isBookmarked ? "Remove bookmark" : "Bookmark this question"}
                                >
                                  {item.isBookmarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                                </button>
                                <button
                                  onClick={() => deleteQuestion(item.id)}
                                  className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-secondary/70"
                                  title="Delete question"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-4 text-center text-muted-foreground">
                        <p>No questions in history</p>
                        <p className="text-sm mt-1">Your questions will appear here</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Bookmarked questions */}
            {questionHistory.some(item => item.isBookmarked) && (
              <div className="flex flex-col space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium flex items-center">
                    <BookmarkCheck size={18} className="mr-2 text-amber-500" />
                    Bookmarked
                  </h3>
                </div>
                
                <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2">
                  {questionHistory
                    .filter(item => item.isBookmarked)
                    .map((item) => (
                      <div 
                        key={`bookmark-${item.id}`}
                        className={cn(
                          "bg-secondary/30 p-3 rounded-md cursor-pointer hover:bg-secondary/50 transition-colors",
                          currentQuestionId === item.id && "border-l-4 border-primary"
                        )}
                        onClick={() => loadQuestion(item)}
                      >
                        <p className="font-medium line-clamp-2">{item.question}</p>
                        <div className="flex items-center mt-1 text-xs text-muted-foreground">
                          <span className="bg-secondary/70 px-2 py-0.5 rounded-full">
                            {formatDomainName(item.detectedDomain)}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Right panel - Question input and answer display */}
        <div className="lg:col-span-2">
          <div className="bg-card rounded-lg shadow-sm p-6 space-y-6">
            {/* Question input */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Your Question:</h3>
                  
                {isSpeechSupported && (
                  <button
                    onClick={() => {
                      setSpeechDebug('Starting quick voice capture...');
                        
                      const recognition = createSpeechRecognition();
                      if (!recognition) {
                        setSpeechDebug('Could not initialize speech recognition');
                        return;
                      }
                        
                      recognition.onresult = (event: any) => {
                        try {
                          // Accumulate the entire transcript from all results
                          let fullTranscript = '';
                          const results = Array.from(event.results);
                          
                          for (let i = 0; i < results.length; i++) {
                            fullTranscript += results[i][0].transcript + ' ';
                          }
                          
                          // Clean up the transcript
                          fullTranscript = fullTranscript.trim();
                          
                          setQuestion(fullTranscript);
                          setSpeechDebug(`Captured: "${fullTranscript.substring(0, 30)}..."`);
                          
                          // Automatically generate answer after capturing
                          setTimeout(() => {
                            if (fullTranscript.trim()) {
                              generateAnswer();
                            }
                          }, 500);
                        } catch (err) {
                          console.error("Error processing quick capture:", err);
                          setSpeechDebug(`Error: ${err instanceof Error ? err.message : String(err)}`);
                        }
                      };
                        
                      recognition.onerror = (event: any) => {
                        setSpeechDebug(`Error: ${event.error}`);
                      };
                        
                      recognition.onend = () => {
                        console.log('Quick capture ended');
                      };
                        
                      recognition.start();
                    }}
                    className="flex items-center space-x-1 bg-primary/10 hover:bg-primary/20 px-4 py-2 rounded-md text-primary font-medium transition-colors"
                    title="Speak question and get answer automatically"
                  >
                    <Mic size={16} className="mr-1" />
                    <span>Speak & Answer</span>
                  </button>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center">
                  <div className="flex-1 font-medium">Input Method:</div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setIsListening(false)}
                      className={cn(
                        "px-3 py-1 text-sm rounded-md flex items-center",
                        !isListening 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-secondary text-secondary-foreground"
                      )}
                    >
                      <span className="mr-1">✏️</span> Type
                    </button>
                    {isSpeechSupported && (
                      <button
                        onClick={toggleListening}
                        className={cn(
                          "px-3 py-1 text-sm rounded-md flex items-center",
                          isListening 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-secondary text-secondary-foreground"
                        )}
                      >
                        <Mic size={14} className="mr-1" /> Voice → Answer
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="relative">
                  <textarea
                    ref={questionInputRef}
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Enter your technical interview question here..."
                    className={cn(
                      "w-full p-4 rounded-md bg-secondary/30 min-h-[120px] resize-none border",
                      isListening ? "border-primary border-2" : "border-primary/20"
                    )}
                    disabled={isProcessing}
                  />
                  {isListening && (
                    <div className="absolute bottom-2 right-2 flex space-x-1">
                      <span className="animate-pulse text-primary">●</span>
                      <span className="animate-pulse text-primary" style={{ animationDelay: '0.2s' }}>●</span>
                      <span className="animate-pulse text-primary" style={{ animationDelay: '0.4s' }}>●</span>
                    </div>
                  )}
                  {isListening && (
                    <div className="absolute top-2 right-2 bg-primary/10 px-2 py-1 rounded text-xs flex items-center">
                      <Mic size={12} className="mr-1 animate-pulse text-primary" />
                      <span>Listening... speak your complete question</span>
                    </div>
                  )}
                  
                  {isListening && (
                    <div className="absolute top-10 right-2 bg-primary/5 px-2 py-1 rounded text-xs">
                      <span className="text-primary/70">Keep speaking until finished</span>
                    </div>
                  )}
                </div>
                
                {speechDebug && (
                  <div className="p-2 bg-secondary/30 rounded-md text-xs text-muted-foreground">
                    <p>Status: {speechDebug}</p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between">
                <div className="flex space-x-2">
                  {isSpeechSupported && (
                    <button
                      onClick={toggleListening}
                      className={cn(
                        "px-4 py-2 rounded-md flex items-center relative",
                        isListening 
                          ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" 
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      )}
                      disabled={isProcessing}
                    >
                      {isListening ? (
                        <>
                          <MicOff size={18} className="mr-2" />
                          Stop Recording
                          <span className="absolute top-0 right-0 h-3 w-3 rounded-full bg-red-500 animate-pulse"></span>
                        </>
                      ) : (
                        <>
                          <Mic size={18} className="mr-2" />
                          Ask with Voice
                        </>
                      )}
                    </button>
                  )}
                  
                  <button
                    onClick={() => {
                      setSpeechDebug('Testing microphone...');
                      
                      // Test microphone permissions
                      navigator.mediaDevices.getUserMedia({ audio: true })
                        .then(stream => {
                          setSpeechDebug('Microphone working! You can now record your question.');
                          
                          // Release the microphone
                          stream.getTracks().forEach(track => track.stop());
                          
                          // Clear the message after 3 seconds
                          setTimeout(() => {
                            setSpeechDebug('');
                          }, 3000);
                        })
                        .catch(err => {
                          setSpeechDebug(`Microphone error: ${err.message}. Please grant microphone permissions.`);
                        });
                    }}
                    className="bg-secondary/70 text-secondary-foreground hover:bg-secondary px-3 py-2 rounded-md text-sm"
                    type="button"
                  >
                    Test Mic
                  </button>
                </div>
                
                <button
                  onClick={generateAnswer}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2 rounded-md flex items-center"
                  disabled={isProcessing || !question.trim()}
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Send size={18} className="mr-2" />
                      Get Answer
                    </>
                  )}
                </button>
              </div>
              
              {isListening && (
                <div className="mt-2 p-3 bg-primary/5 border border-primary/20 rounded-md">
                  <div className="flex items-center text-primary">
                    <Mic size={16} className="mr-2 animate-pulse" />
                    <span>Speak your complete question clearly. I'm capturing your entire speech and will automatically generate an answer when you finish.</span>
                  </div>
                  <div className="mt-2 text-sm text-primary/70 flex items-center">
                    <span>✓</span>
                    <span className="ml-1">Your entire speech will be captured, not just the last part</span>
                  </div>
                </div>
              )}
              
              {!isSpeechSupported && (
                <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-md">
                  <div className="flex items-center text-amber-500">
                    <Mic size={16} className="mr-2" />
                    <span>Speech recognition is not available in your browser. Please use the text input instead.</span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Answer display */}
            {(answer || isProcessing) && (
              <div ref={answerContainerRef} className="mt-8 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Answer:</h3>
                  
                  {answer && (
                    <div className="flex space-x-2">
                      <button
                        onClick={copyToClipboard}
                        className={cn(
                          "p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/70",
                          copiedToClipboard && "text-green-500"
                        )}
                        title="Copy to clipboard"
                      >
                        <Copy size={18} />
                      </button>
                      <button
                        onClick={shareAnswer}
                        className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/70"
                        title="Share answer"
                      >
                        <Share2 size={18} />
                      </button>
                      <button
                        onClick={() => currentQuestionId && toggleBookmark(currentQuestionId)}
                        className={cn(
                          "p-2 rounded-md hover:bg-secondary/70",
                          currentQuestionId && questionHistory.find(q => q.id === currentQuestionId)?.isBookmarked 
                            ? "text-amber-500" 
                            : "text-muted-foreground hover:text-amber-500"
                        )}
                        title="Bookmark this question"
                        disabled={!currentQuestionId}
                      >
                        {currentQuestionId && questionHistory.find(q => q.id === currentQuestionId)?.isBookmarked 
                          ? <BookmarkCheck size={18} /> 
                          : <Bookmark size={18} />}
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="bg-secondary/30 p-6 rounded-md prose prose-slate max-w-none">
                  {isProcessing ? (
                    <div className="animate-pulse">
                      {streamingResponse || 'Generating answer...'}
                    </div>
                  ) : (
                    <ReactMarkdown
                      components={{
                        code({className, children, ...props}) {
                          const match = /language-(\w+)/.exec(className || '')
                          // Access inline from props safely
                          return !('inline' in props) && match ? (
                            <SyntaxHighlighter
                              style={atomDark}
                              language={match[1]}
                              PreTag="div"
                              {...props}
                            >
                              {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                          ) : (
                            <code className={className} {...props}>
                              {children}
                            </code>
                          )
                        }
                      }}
                    >
                      {answer}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
