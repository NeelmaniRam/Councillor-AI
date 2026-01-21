'use client';

import { useState, useCallback, useTransition, useRef, useEffect } from 'react';
import {
  aiDrivenConversation,
  AIDrivenConversationInput,
} from '@/ai/flows/ai-driven-conversation';
import { textToSpeech } from '@/ai/flows/text-to-speech';
import { generateCareerReport } from '@/ai/flows/generate-career-report';
import type {
  StudentProfile,
  IvyMessage,
  Insights,
  FinalReport,
} from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { IvyLogo } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IvyNotes } from '@/components/ivy-notes';
import { ChatView } from '@/components/chat-view';
import { ReportView } from '@/components/report-view';
import { Loader2 } from 'lucide-react';
import { Mic, Speech } from 'lucide-react';

type AppState = 'welcome' | 'entry-method' | 'context' | 'chat' | 'evaluating' | 'report';
type OnboardingStep = 'name' | 'grade' | 'curriculum' | 'stream' | 'country' | 'done';

const TYPING_SPEED = 50; // ms per character
const UTTERANCE_PAUSE_DURATION = 1200; // ms to wait after user stops talking
const SESSION_DURATION = 900; // 15 minutes in seconds
const EVALUATION_DELAY = 10000; // 10 seconds

export function IvyVoiceGuide() {
  const [appState, setAppState] = useState<AppState>('welcome');
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>('name');
  const [studentProfile, setStudentProfile] = useState<StudentProfile>({
    name: '',
    grade: '',
    curriculum: '',
    stream: '',
    country: '',
  });
  const [messages, setMessages] = useState<IvyMessage[]>([]);
  const [insights, setInsights] = useState<Insights>({
    interests: [],
    strengths: [],
    constraints: [],
    careerClusters: [],
  });
  const [finalReport, setFinalReport] = useState<FinalReport | null>(null);
  const [isThinking, startTransition] = useTransition();
  
  // Voice state
  const [isMicOn, setIsMicOn] = useState(false);
  const [isDetectingSpeech, setIsDetectingSpeech] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [hasBrowserSupport, setHasBrowserSupport] = useState(false);

  // Timer state
  const [timer, setTimer] = useState(SESSION_DURATION);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const recognitionRef = useRef<any>(null);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const utteranceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const finalTranscriptRef = useRef<string>('');

  const { toast } = useToast();

  // Effect for browser support check and recognition setup
  useEffect(() => {
    console.log('Component mounted. Checking for browser support.');
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        setHasBrowserSupport(true);
        console.log('SpeechRecognition API supported.');
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognitionRef.current = recognition;
      } else {
        setHasBrowserSupport(false);
        console.warn('SpeechRecognition API not supported.');
        toast({
          title: 'Voice input not supported',
          description: 'Your browser does not support speech recognition. Please type your responses.',
          variant: 'destructive',
        });
      }
    }
  }, [toast]);

  const stopTypingEffect = useCallback((fullText?: string) => {
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
    setMessages(prev => {
        if (prev.length === 0) return prev;
        const lastMessage = prev[prev.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
            const finalMsgs = [...prev];
            const content = fullText || lastMessage.content.replace(/▒/g, '');
            finalMsgs[finalMsgs.length - 1] = { ...lastMessage, content };
            return finalMsgs;
        }
        return prev;
    });
  }, []);
  
  const handleSessionEnd = useCallback(async () => {
    console.log('Session ended. Generating report.');
    setIsTimerRunning(false);
    if (isMicOn) {
      setIsMicOn(false);
      recognitionRef.current?.stop();
      console.log('Microphone stopped.');
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    stopTypingEffect();
    setAppState('evaluating');

    try {
      console.log('Calling generateCareerReport flow...');
      const reportData = await generateCareerReport({ studentProfile, insights });
      console.log('generateCareerReport result:', reportData);

      setFinalReport({
        studentProfile,
        interests: reportData.interests,
        strengths: reportData.strengths,
        constraints: insights.constraints,
        careerClusters: insights.careerClusters,
        recommendedPaths: reportData.recommendedPaths,
      });

      setTimeout(() => {
          setAppState('report');
      }, EVALUATION_DELAY);

    } catch (error) {
      console.error('Error generating final report:', error);
      toast({
        variant: 'destructive',
        title: 'Report Generation Failed',
        description: 'There was an issue creating your career report. Please try again.',
      });
      setAppState('chat');
    }
  }, [isMicOn, insights, studentProfile, stopTypingEffect, toast]);

  // Effect for session timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && timer > 0) {
      interval = setInterval(() => {
        setTimer((prevTimer) => prevTimer - 1);
      }, 1000);
    } else if (timer <= 0 && isTimerRunning) {
      handleSessionEnd();
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isTimerRunning, timer, handleSessionEnd]);
  
  const startTypingEffect = useCallback((text: string, audioDuration: number) => {
    stopTypingEffect();
    setMessages(prev => [...prev, { role: 'assistant', content: '▒' }]);
  
    let charIndex = 0;
    const calculatedTypingSpeed = audioDuration > 0 && text.length > 0
      ? (audioDuration * 1000) / text.length
      : TYPING_SPEED;
  
    typingIntervalRef.current = setInterval(() => {
      if (charIndex < text.length) {
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage) {
            lastMessage.content = text.substring(0, charIndex + 1) + '▒';
          }
          return newMessages;
        });
        charIndex++;
      } else {
        stopTypingEffect(text);
      }
    }, calculatedTypingSpeed);
  
  }, [stopTypingEffect]);

  const handlePlayAudio = useCallback(async (text: string) => {
    console.log('Playing audio for:', text);
    if (!isTimerRunning) {
      console.log('Starting session timer.');
      setIsTimerRunning(true);
    }
    try {
      const { media } = await textToSpeech(text);
      if (audioRef.current && media) {
        audioRef.current.src = media;
        audioRef.current.onloadedmetadata = () => {
          const duration = audioRef.current?.duration || 0;
          console.log(`Audio duration: ${duration}s`);
          startTypingEffect(text, duration);
          audioRef.current?.play();
        };
      } else {
        throw new Error('Audio element not found or TTS failed.');
      }
    } catch (error) {
      console.error('handlePlayAudio error:', error);
      toast({
        title: 'Could not play audio',
        description: 'There was an error generating the voice response.',
        variant: 'destructive',
      });
      startTypingEffect(text, 0); 
      startTransition(() => {});
    }
  }, [toast, startTypingEffect, isTimerRunning]);

    const handleOnboardingResponse = useCallback((userInput: string) => {
    let nextStep: OnboardingStep = onboardingStep;
    let nextQuestion = '';
    const updatedProfile = { ...studentProfile, [onboardingStep]: userInput.trim() };
    setStudentProfile(updatedProfile);

    switch (onboardingStep) {
        case 'name':
            nextStep = 'grade';
            nextQuestion = `Great to meet you, ${userInput.trim()}! What grade are you in?`;
            break;
        case 'grade':
            nextStep = 'curriculum';
            nextQuestion = `Got it. Which curriculum are you following, like CBSE or IB?`;
            break;
        case 'curriculum':
            nextStep = 'stream';
            nextQuestion = `Thanks. And what's your academic stream, for example, Science, Commerce, or Arts?`;
            break;
        case 'stream':
            nextStep = 'country';
            nextQuestion = `Perfect. Lastly, which country are you studying in?`;
            break;
        case 'country':
            nextStep = 'done';
            // Transition to the main conversation handled below
            break;
    }

    setOnboardingStep(nextStep);
    
    startTransition(async () => {
      if (nextStep !== 'done') {
        handlePlayAudio(nextQuestion);
      } else {
        // Onboarding is done, start the actual conversation
        try {
            console.log('Onboarding complete. Starting main conversation flow.');
            const input: AIDrivenConversationInput = { ...updatedProfile, conversationHistory: [], insights };
            const result = await aiDrivenConversation(input);
            startTransition(() => {});
            if (result.updatedInsights) setInsights(result.updatedInsights as Insights);
            if (result.nextPrompt) handlePlayAudio(result.nextPrompt);
        } catch (error) {
            console.error('Error starting main conversation:', error);
            toast({
                title: 'Error',
                description: 'Could not start the conversation.',
                variant: 'destructive',
            });
        }
      }
    });
  }, [onboardingStep, studentProfile, insights, handlePlayAudio, toast]);

  const handleSendMessage = useCallback(async (userInput: string) => {
    if (!userInput.trim() || isThinking) return;
    console.log('Sending message:', userInput);

    if (utteranceTimeoutRef.current) clearTimeout(utteranceTimeoutRef.current);
    finalTranscriptRef.current = '';
    setLiveTranscript('');
    stopTypingEffect();

    const newMessages: IvyMessage[] = [...messages, { role: 'user', content: userInput }];
    setMessages(newMessages);
    
    if (onboardingStep !== 'done') {
      handleOnboardingResponse(userInput);
      return;
    }

    startTransition(async () => {
      try {
        console.log('Calling aiDrivenConversation flow...');
        const convResult = await aiDrivenConversation({
          ...studentProfile,
          conversationHistory: newMessages.map(m => ({ role: m.role, content: m.content })),
          insights,
        });
        console.log('aiDrivenConversation result:', convResult);
        
        startTransition(() => {});

        if (convResult.updatedInsights) {
           const updated = convResult.updatedInsights;
           setInsights({
              interests: [...new Set([...(insights.interests || []), ...(updated.interests || [])])],
              strengths: [...new Set([...(insights.strengths || []), ...(updated.strengths || [])])],
              constraints: [...new Set([...(insights.constraints || []), ...(updated.constraints || [])])],
              careerClusters: [...new Set([...(insights.careerClusters || []), ...(updated.careerClusters || [])])],
           });
        }

        if (convResult.nextPrompt) {
          handlePlayAudio(convResult.nextPrompt);
        }

        if (convResult.isConcluding) {
          const audio = audioRef.current;
          const onAudioEnd = () => {
            handleSessionEnd();
            audio?.removeEventListener('ended', onAudioEnd);
          };
          if (audio?.paused) {
            onAudioEnd();
          } else {
            audio?.addEventListener('ended', onAudioEnd);
          }
        }
      } catch (error) {
        console.error('handleSendMessage error:', error);
        toast({
          title: 'An error occurred',
          description: 'The AI assistant ran into a problem. Please try again.',
          variant: 'destructive',
        });
        setMessages(messages);
      }
    });
  }, [isThinking, messages, studentProfile, insights, handlePlayAudio, stopTypingEffect, toast, handleSessionEnd, onboardingStep, handleOnboardingResponse]);

  const setupRecognition = useCallback(() => {
    if (!recognitionRef.current) return;
    console.log('Setting up speech recognition handlers.');
  
    recognitionRef.current.onresult = (event: any) => {
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
        console.log('Barge-in detected. Pausing Ivy\'s speech.');
      }
      if (utteranceTimeoutRef.current) {
        clearTimeout(utteranceTimeoutRef.current);
      }
  
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }
      setLiveTranscript(finalTranscriptRef.current + interimTranscript);
  
      utteranceTimeoutRef.current = setTimeout(() => {
        const textToSend = finalTranscriptRef.current.trim();
        if (textToSend) {
          console.log('Utterance detected:', textToSend);
          handleSendMessage(textToSend);
        }
      }, UTTERANCE_PAUSE_DURATION);
    };
  
    recognitionRef.current.onerror = (event: any) => {
      if (event.error === 'network') {
        console.log('Speech recognition network error. Service will restart.');
        return;
      }
      if (event.error === 'aborted') {
        console.log('Speech recognition aborted (e.g., mic off). This is normal.');
        return;
      }
      if (event.error === 'no-speech') {
        console.log('No speech detected. Recognition will restart if mic is on.');
        return;
      }
      
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        toast({
          variant: 'destructive',
          title: 'Microphone permission denied',
          description: 'Please enable microphone access in your browser settings to use voice features.',
        });
        setIsMicOn(false);
      } else {
        toast({
          variant: 'destructive',
          title: 'Voice Recognition Error',
          description: `An unexpected error occurred: ${event.error}`,
        });
      }
    };
  
    recognitionRef.current.onend = () => {
      console.log('Speech recognition service ended.');
      if (isMicOn) {
        console.log('Mic is on, restarting recognition service.');
        recognitionRef.current.start();
      }
    };
  
    recognitionRef.current.onaudiostart = () => {
      console.log('Audio capture started.');
      setIsDetectingSpeech(true);
    };
    recognitionRef.current.onaudioend = () => {
      console.log('Audio capture ended.');
      setIsDetectingSpeech(false);
    };
  
  }, [isMicOn, handleSendMessage, toast]);

  useEffect(() => {
    if (hasBrowserSupport) {
      setupRecognition();
    }
  }, [hasBrowserSupport, setupRecognition]);
  
  const handleMicToggle = () => {
    if (!hasBrowserSupport || isThinking) return;
    
    const newMicState = !isMicOn;
    setIsMicOn(newMicState);

    if (newMicState) {
      console.log('Mic toggled on.');
      recognitionRef.current?.start();
    } else {
      console.log('Mic toggled off.');
      recognitionRef.current?.stop();
    }
  };

  const handleStartTextConversation = useCallback(async () => {
    console.log('Attempting to start text conversation.');
    if (!studentProfile.name) {
      toast({
        title: 'Missing Information',
        description: 'Please enter your name.',
        variant: 'destructive',
      });
      return;
    }
    setAppState('chat');
    setIsMicOn(true);
    recognitionRef.current?.start();

    startTransition(async () => {
      try {
        const input: AIDrivenConversationInput = { ...studentProfile, conversationHistory: [], insights };
        console.log('Sending initial prompt to AI.');
        const result = await aiDrivenConversation(input);
        startTransition(() => {});
        
        if (result.updatedInsights) setInsights(result.updatedInsights as Insights);
        if (result.nextPrompt) handlePlayAudio(result.nextPrompt);

      } catch (error) {
        console.error('handleStartTextConversation error:', error);
        toast({
          title: 'Error',
          description: 'Could not start conversation.',
          variant: 'destructive',
        });
        setAppState('context');
      }
    });
  }, [studentProfile, insights, toast, handlePlayAudio]);

  const handleStartVoiceOnboarding = useCallback(async () => {
    setAppState('chat');
    setIsMicOn(true);
    recognitionRef.current?.start();
    startTransition(() => {
        handlePlayAudio("Welcome to IvyVoice! To start our discovery session, what's your name?");
    });
  }, [handlePlayAudio]);

  const handleRestart = () => {
    console.log('Restarting session.');
    setAppState('welcome');
    setStudentProfile({ name: '', grade: '', curriculum: '', stream: '', country: '' });
    setMessages([]);
    setInsights({ interests: [], strengths: [], constraints: [], careerClusters: [] });
    setFinalReport(null);
    setIsMicOn(false);
    recognitionRef.current?.stop();
    stopTypingEffect();
    if(audioRef.current) audioRef.current.pause();
    setTimer(SESSION_DURATION);
    setIsTimerRunning(false);
    setOnboardingStep('name');
  };
  
  const onAudioEnded = () => stopTypingEffect();
  const onAudioPaused = () => stopTypingEffect();
  
  const renderContent = () => {
     switch (appState) {
      case 'welcome':
        return (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <IvyLogo className="w-24 h-24 text-primary mb-6" />
            <h1 className="text-4xl font-bold font-headline mb-2">
              Welcome to IvyVoice
            </h1>
            <p className="text-muted-foreground text-lg max-w-md mb-8">
              Your personal, voice-guided career discovery journey. Let's find a
              future that fits you best.
            </p>
            <Button size="lg" onClick={() => setAppState('entry-method')}>
              Begin Discovery
            </Button>
          </div>
        );
      case 'entry-method':
        return (
            <div className="flex flex-col items-center justify-center h-full text-center">
                <h1 className="text-3xl font-bold font-headline mb-4">How would you like to start?</h1>
                <p className="text-muted-foreground text-lg max-w-md mb-8">
                You can either type in your details or talk directly to our voice agent.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                    <Button size="lg" onClick={() => setAppState('context')}>
                        <Speech className="mr-2" /> Text-based Entry
                    </Button>
                    <Button size="lg" variant="secondary" onClick={handleStartVoiceOnboarding} disabled={!hasBrowserSupport}>
                        <Mic className="mr-2" /> Talk to Voice Agent
                    </Button>
                </div>
                 {!hasBrowserSupport && <p className="text-destructive text-sm mt-4">Voice input is not supported on your browser. Please use text entry.</p>}
            </div>
        );
      case 'context':
        return (
          <div className="flex items-center justify-center h-full">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="font-headline text-2xl">
                  Tell us a bit about yourself
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleStartTextConversation();
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Alex Doe"
                      value={studentProfile.name}
                      onChange={(e) =>
                        setStudentProfile({ ...studentProfile, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="grade">Grade / Age</Label>
                    <Input
                      id="grade"
                      placeholder="e.g., 11th Grade or 16 years"
                      value={studentProfile.grade}
                      onChange={(e) =>
                        setStudentProfile({ ...studentProfile, grade: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="curriculum">Curriculum</Label>
                    <Input
                      id="curriculum"
                      placeholder="e.g., CBSE, IB, IGCSE"
                      value={studentProfile.curriculum}
                      onChange={(e) =>
                        setStudentProfile({
                          ...studentProfile,
                          curriculum: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stream">Stream</Label>
                    <Input
                      id="stream"
                      placeholder="e.g., Science, Commerce, Arts"
                      value={studentProfile.stream}
                      onChange={(e) =>
                        setStudentProfile({
                          ...studentProfile,
                          stream: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      placeholder="e.g., India"
                      value={studentProfile.country}
                      onChange={(e) =>
                        setStudentProfile({
                          ...studentProfile,
                          country: e.target.value,
                        })
                      }
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isThinking}>
                    {isThinking ? 'Starting...' : 'Start Conversation'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        );
      case 'chat':
        return (
          <ChatView
            messages={messages}
            isThinking={isThinking}
            isMicOn={isMicOn}
            isDetectingSpeech={isDetectingSpeech}
            liveTranscript={liveTranscript}
            onSendMessage={handleSendMessage}
            onMicToggle={handleMicToggle}
            timer={timer}
            isTimerRunning={isTimerRunning}
          />
        );
      case 'evaluating':
        return (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Loader2 className="w-16 h-16 text-primary mb-6 animate-spin" />
            <h1 className="text-3xl font-bold font-headline mb-2">
              Ivy is Evaluating...
            </h1>
            <p className="text-muted-foreground text-lg max-w-md">
              Your conversation is being analyzed to generate a personalized career discovery report.
            </p>
          </div>
        );
      case 'report':
        return finalReport ? (
          <ReportView report={finalReport} onRestart={handleRestart} messages={messages} />
        ) : null;
    }
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      <audio ref={audioRef} onEnded={onAudioEnded} onPause={onAudioPaused} />
      <main className="flex-1 flex flex-col p-4 md:p-8 overflow-y-auto">
        {renderContent()}
      </main>
      {(appState === 'chat' || appState === 'evaluating' || appState === 'report') && (
        <aside className="w-[380px] border-l bg-card p-4 lg:p-6 hidden lg:block no-print">
          <IvyNotes studentProfile={studentProfile} insights={insights} />
        </aside>
      )}
    </div>
  );
}
