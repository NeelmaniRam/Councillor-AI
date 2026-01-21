
'use client';

import { useState, useCallback, useTransition, useRef, useEffect } from 'react';
import {
  aiDrivenConversation,
  AIDrivenConversationInput,
} from '@/ai/flows/ai-driven-conversation';
import { textToSpeech } from '@/ai/flows/text-to-speech';
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

type AppState = 'welcome' | 'context' | 'chat' | 'evaluating' | 'report';

const TYPING_SPEED = 50; // ms per character
const UTTERANCE_PAUSE_DURATION = 1200; // ms to wait after user stops talking
const SESSION_DURATION = 300; // 5 minutes in seconds

export function IvyVoiceGuide() {
  const [appState, setAppState] = useState<AppState>('welcome');
  const [studentProfile, setStudentProfile] = useState<StudentProfile>({
    name: 'Alex',
    grade: '11th Grade',
    curriculum: 'IB',
    country: 'USA',
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
  
  const handleSessionEnd = useCallback(() => {
    console.log('Session timer ended. Handling session end.');
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

    setTimeout(() => {
      console.log('Evaluation period ended. Generating final report.');
      setFinalReport({
        studentProfile,
        ...insights,
        recommendedPaths: insights.careerClusters.map((p) => ({ name: p })),
        reasoning: 'Based on the insights gathered during your conversation, here are some career clusters that align with your interests and strengths. Further exploration into specific roles within these clusters is recommended.',
      });
      setAppState('report');
    }, 10000); // 10-second evaluation simulation
  }, [isMicOn, insights, studentProfile, stopTypingEffect]);

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

  const handleSendMessage = useCallback(async (userInput: string) => {
    if (!userInput.trim() || isThinking) return;
    console.log('Sending message:', userInput);

    if (utteranceTimeoutRef.current) clearTimeout(utteranceTimeoutRef.current);
    finalTranscriptRef.current = '';
    setLiveTranscript('');
    stopTypingEffect();

    const newMessages: IvyMessage[] = [...messages, { role: 'user', content: userInput }];
    setMessages(newMessages);

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
  }, [isThinking, messages, studentProfile, insights, handlePlayAudio, stopTypingEffect, toast]);

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

  const handleStartConversation = useCallback(async () => {
    console.log('Attempting to start conversation.');
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
        console.error('handleStartConversation error:', error);
        toast({
          title: 'Error',
          description: 'Could not start conversation.',
          variant: 'destructive',
        });
        setAppState('context');
      }
    });
  }, [studentProfile, insights, toast, handlePlayAudio]);

  const handleRestart = () => {
    console.log('Restarting session.');
    setAppState('welcome');
    setStudentProfile({ name: '', grade: '', curriculum: '', country: '' });
    setMessages([]);
    setInsights({ interests: [], strengths: [], constraints: [], careerClusters: [] });
    setFinalReport(null);
    setIsMicOn(false);
    recognitionRef.current?.stop();
    stopTypingEffect();
    if(audioRef.current) audioRef.current.pause();
    setTimer(SESSION_DURATION);
    setIsTimerRunning(false);
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
            <Button size="lg" onClick={() => setAppState('context')}>
              Begin Discovery
            </Button>
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
                    handleStartConversation();
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
      {appState !== 'welcome' && (
        <aside className="w-[380px] border-l bg-card p-4 lg:p-6 hidden lg:block no-print">
          <IvyNotes studentProfile={studentProfile} insights={insights} />
        </aside>
      )}
    </div>
  );
}
