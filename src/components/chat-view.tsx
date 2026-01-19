'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, Send, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Waveform } from '@/components/waveform';
import type { IvyMessage } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';

interface ChatViewProps {
  messages: IvyMessage[];
  isThinking: boolean;
  isListening: boolean;
  liveTranscript: string;
  onSendMessage: (message: string) => void;
  onMicClick: () => void;
}

export function ChatView({
  messages,
  isThinking,
  isListening,
  liveTranscript,
  onSendMessage,
  onMicClick,
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
    if (isListening) return 'listening';
    return 'idle';
  };
  
  return (
    <div className="flex flex-col h-full justify-between items-center max-w-4xl mx-auto w-full">
      <ScrollArea className="w-full flex-1" ref={scrollAreaRef} viewportRef={viewportRef}>
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
              {isListening && (
                   <div className={cn('flex items-end gap-2 justify-end')}>
                      <div className={cn('p-3 rounded-lg max-w-xl bg-primary text-primary-foreground')}>
                         <p className="font-bold text-sm mb-1">Me</p>
                         <p className="whitespace-pre-wrap">{liveTranscript || '...'}</p>
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
            isListening
              ? 'bg-destructive/80 hover:bg-destructive/90'
              : 'bg-secondary/20 hover:bg-secondary/30'
          )}
          aria-label={isListening ? 'Stop Talking' : 'Talk'}
          onClick={onMicClick}
          disabled={isThinking}
        >
          {isListening ? (
            <MicOff className="w-8 h-8 text-destructive-foreground" />
          ) : (
            <Mic className="w-8 h-8 text-secondary" />
          )}
        </Button>
        <div className="w-full max-w-lg flex items-center space-x-2 pb-8">
          <Input
            type="text"
            placeholder="Type your response..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={isThinking || isListening}
            className="h-12 text-base"
          />
          <Button
            onClick={handleSend}
            disabled={isThinking || isListening || !userInput}
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
