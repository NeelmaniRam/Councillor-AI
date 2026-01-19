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

type AppState = 'welcome' | 'context' | 'chat' | 'report';

const TYPING_SPEED = 50; // ms per character
const UTTERANCE_PAUSE_DURATION = 1200; // ms to wait after user stops talking

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

  const audioRef = useRef<HTMLAudioElement>(null);
  const recognitionRef = useRef<any>(null);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const utteranceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const finalTranscriptRef = useRef<string>('');

  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        setHasBrowserSupport(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognitionRef.current = recognition;
      } else {
        setHasBrowserSupport(false);
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
  
  const startTypingEffect = useCallback((text: string, audioDuration: number) => {
    stopTypingEffect();
    setMessages(prev => [...prev, { role: 'assistant', content: '▒' }]);
  
    let charIndex = 0;
    // Adjust typing speed based on audio length for better sync
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
    try {
      const { media } = await textToSpeech(text);
      if (audioRef.current && media) {
        audioRef.current.src = media;
        audioRef.current.onloadedmetadata = () => {
          const duration = audioRef.current?.duration || 0;
          startTypingEffect(text, duration);
          audioRef.current?.play();
        };
      } else {
        throw new Error('Audio element not found or TTS failed.');
      }
    } catch (error) {
      console.error(error);
      toast({
        title: 'Could not play audio',
        description: 'There was an error generating the voice response.',
        variant: 'destructive',
      });
      startTypingEffect(text, 0); // Type out text even if audio fails
      startTransition(() => {});
    }
  }, [toast, startTypingEffect]);

  const handleSendMessage = useCallback(async (userInput: string) => {
    if (!userInput.trim() || isThinking) return;

    // Clear any pending utterance timeouts
    if (utteranceTimeoutRef.current) clearTimeout(utteranceTimeoutRef.current);
    finalTranscriptRef.current = '';
    setLiveTranscript('');
    stopTypingEffect();

    const newMessages: IvyMessage[] = [...messages, { role: 'user', content: userInput }];
    setMessages(newMessages);

    startTransition(async () => {
      try {
        const convResult = await aiDrivenConversation({
          ...studentProfile,
          conversationHistory: newMessages.map(m => ({ role: m.role, content: m.content })),
          insights,
        });
        
        startTransition(() => {}); // Set isThinking to false

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
          if (convResult.careerPaths && convResult.careerPaths.length > 0) {
            setMessages(prev => [...prev, { role: 'assistant', content: convResult.nextPrompt! }]);
            setFinalReport({
              studentProfile,
              ...insights,
              recommendedPaths: convResult.careerPaths.map((p) => ({ name: p })),
              reasoning: convResult.nextPrompt || 'Based on your conversation.',
            });
            setAppState('report');
            setIsMicOn(false);
            recognitionRef.current?.stop();
            return;
          }
          handlePlayAudio(convResult.nextPrompt);
        }
      } catch (error) {
        console.error(error);
        toast({
          title: 'An error occurred',
          description: 'The AI assistant ran into a problem. Please try again.',
          variant: 'destructive',
        });
        setMessages(messages); // Revert to previous messages on error
      }
    });
  }, [isThinking, messages, studentProfile, insights, handlePlayAudio, stopTypingEffect, toast]);

  const setupRecognition = useCallback(() => {
    if (!recognitionRef.current) return;
  
    recognitionRef.current.onresult = (event: any) => {
      // Barge-in: if Ivy is speaking, pause her.
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause(); // onpause handler will call stopTypingEffect
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
          handleSendMessage(textToSend);
        }
      }, UTTERANCE_PAUSE_DURATION);
    };
  
    recognitionRef.current.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      if (event.error === 'not-allowed') {
        toast({
          variant: 'destructive',
          title: 'Microphone permission denied',
          description: 'Please enable microphone access in your browser settings to use voice features.',
        });
        setIsMicOn(false);
      }
    };
  
    recognitionRef.current.onend = () => {
      if (isMicOn) {
        recognitionRef.current.start();
      }
    };
  
    recognitionRef.current.onaudiostart = () => setIsDetectingSpeech(true);
    recognitionRef.current.onaudioend = () => setIsDetectingSpeech(false);
  
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
      recognitionRef.current?.start();
    } else {
      recognitionRef.current?.stop();
    }
  };

  const handleStartConversation = useCallback(async () => {
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
        const result = await aiDrivenConversation(input);
        startTransition(() => {});
        
        if (result.updatedInsights) setInsights(result.updatedInsights as Insights);
        if (result.nextPrompt) handlePlayAudio(result.nextPrompt);

      } catch (error) {
        console.error(error);
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
    setAppState('welcome');
    setStudentProfile({ name: '', grade: '', curriculum: '', country: '' });
    setMessages([]);
    setInsights({ interests: [], strengths: [], constraints: [], careerClusters: [] });
    setFinalReport(null);
    setIsMicOn(false);
    recognitionRef.current?.stop();
    stopTypingEffect();
    if(audioRef.current) audioRef.current.pause();
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
          />
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
