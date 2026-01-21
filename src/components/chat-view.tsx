'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, Send, MicOff, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Waveform } from '@/components/waveform';
import type { IvyMessage } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';

interface ChatViewProps {
  messages: IvyMessage[];
  isThinking: boolean;
  isMicOn: boolean;
  isDetectingSpeech: boolean;
  liveTranscript: string;
  onSendMessage: (message: string) => void;
  onMicToggle: () => void;
  timer: number;
  isTimerRunning: boolean;
}

export function ChatView({
  messages,
  isThinking,
  isMicOn,
  isDetectingSpeech,
  liveTranscript,
  onSendMessage,
  onMicToggle,
  timer,
  isTimerRunning,
}: ChatViewProps) {
  const [userInput, setUserInput] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (viewportRef.current) {
        viewportRef.current.scrollTo({
        top: viewportRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, liveTranscript]);

  const handleSend = () => {
    if (userInput.trim()) {
      onSendMessage(userInput);
      setUserInput('');
    }
  };

  const getWaveformVariant = () => {
    if (isThinking && messages[messages.length-1]?.role === 'user') return 'speaking';
    if (isDetectingSpeech) return 'listening';
    return 'idle';
  };
  
  const minutes = Math.floor(timer / 60).toString().padStart(2, '0');
  const seconds = (timer % 60).toString().padStart(2, '0');

  return (
    <div className="flex flex-col h-full justify-between items-center max-w-4xl mx-auto w-full">
      {isTimerRunning && (
        <div className="w-full py-2 px-4 text-center font-mono text-lg font-semibold bg-muted sticky top-0 z-10 flex items-center justify-center gap-2 border-b">
          <Clock className="w-5 h-5" />
          <span>Session ends in: {minutes}:{seconds}</span>
        </div>
      )}
      <ScrollArea className="w-full flex-1" viewportRef={viewportRef}>
          <div className="px-4 py-8 space-y-4">
              {messages.map((message, index) => (
                  <div key={index} className={cn('flex items-end gap-2', message.role === 'user' ? 'justify-end' : 'justify-start')}>
                      <div className={cn(
                          'p-3 rounded-lg max-w-xl', 
                          message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      )}>
                         <p className="font-bold text-sm mb-1">{message.role === 'user' ? 'Me' : 'Ivy'}</p>
                         <p className="whitespace-pre-wrap">{message.content.replace(/▒/g, '')}
                           {message.content.endsWith('▒') && <span className="animate-pulse">▒</span>}
                         </p>
                      </div>
                  </div>
              ))}
              {liveTranscript && (
                   <div className={cn('flex items-end gap-2 justify-end')}>
                      <div className={cn('p-3 rounded-lg max-w-xl bg-primary text-primary-foreground')}>
                         <p className="font-bold text-sm mb-1">Me</p>
                         <p className="whitespace-pre-wrap">{liveTranscript}</p>
                      </div>
                  </div>
              )}
               {isThinking && messages[messages.length-1]?.role === 'user' && (
                  <div className={cn('flex items-end gap-2 justify-start')}>
                     <div className={cn('p-3 rounded-lg max-w-xl bg-muted')}>
                         <p className="font-bold text-sm mb-1">Ivy</p>
                         <div className="flex items-center space-x-2 py-2">
                            <span className="h-2 w-2 bg-foreground rounded-full animate-pulse" style={{ animationDelay: '0s' }}></span>
                            <span className="h-2 w-2 bg-foreground rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></span>
                            <span className="h-2 w-2 bg-foreground rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></span>
                         </div>
                     </div>
                  </div>
              )}
          </div>
      </ScrollArea>

      <div className="w-full flex flex-col items-center space-y-6 pt-4 px-4">
        <Waveform variant={getWaveformVariant()} />
        <Button
          size="icon"
          className={cn(
            'rounded-full w-20 h-20 border-8 border-background shadow-lg transition-colors',
            isMicOn
              ? 'bg-secondary/20 hover:bg-secondary/30'
              : 'bg-destructive/80 hover:bg-destructive/90'
          )}
          aria-label={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
          onClick={onMicToggle}
          disabled={isThinking}
        >
          {isMicOn ? (
            <Mic className="w-8 h-8 text-secondary" />
          ) : (
            <MicOff className="w-8 h-8 text-destructive-foreground" />
          )}
        </Button>
        <div className="w-full max-w-lg flex items-center space-x-2 pb-8">
          <Input
            type="text"
            placeholder="Type your response..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={isThinking || isMicOn}
            className="h-12 text-base"
          />
          <Button
            onClick={handleSend}
            disabled={isThinking || isMicOn || !userInput}
            size="lg"
          >
            <Send className="w-5 h-5" />
            <span className="sr-only">Send</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
