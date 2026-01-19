'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, Send, Bot, User, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Waveform } from '@/components/waveform';
import type { IvyMessage } from '@/lib/types';
import { cn } from '@/lib/utils';

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

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  const handleSend = () => {
    if (userInput.trim()) {
      onSendMessage(userInput);
      setUserInput('');
    }
  };

  const lastMessage = messages[messages.length - 1];

  const getWaveformVariant = () => {
    if (isThinking) return 'speaking';
    if (isListening) return 'listening';
    return 'idle';
  };

  return (
    <div className="flex flex-col h-full justify-between items-center max-w-4xl mx-auto w-full">
      <div className="flex-1 w-full" />
      <div
        ref={scrollAreaRef}
        className="text-center w-full px-4 h-32 flex items-center justify-center"
      >
        {isListening ? (
          <p className="text-2xl md:text-3xl lg:text-4xl font-medium font-headline leading-tight text-muted-foreground animate-in fade-in duration-500">
            {liveTranscript || 'Listening...'}
          </p>
        ) : lastMessage?.role === 'assistant' && !isThinking ? (
          <p className="text-2xl md:text-3xl lg:text-4xl font-medium font-headline leading-tight animate-in fade-in duration-500">
            {lastMessage.content}
          </p>
        ) : null}
        {isThinking && !isListening && (
          <div className="flex flex-col items-center justify-center space-y-4">
            <p className="text-muted-foreground">Ivy is thinking...</p>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-end w-full" />

      <div className="w-full flex flex-col items-center space-y-8 mt-12 px-4">
        <Button
          size="icon"
          className={cn(
            'rounded-full w-24 h-24 border-8 border-background shadow-lg transition-colors',
            isListening
              ? 'bg-destructive/80 hover:bg-destructive/90'
              : 'bg-secondary/20 hover:bg-secondary/30'
          )}
          aria-label={isListening ? 'Stop Talking' : 'Talk'}
          onClick={onMicClick}
          disabled={isThinking}
        >
          {isListening ? (
            <MicOff className="w-10 h-10 text-destructive-foreground" />
          ) : (
            <Mic className="w-10 h-10 text-secondary" />
          )}
        </Button>
        <Waveform variant={getWaveformVariant()} />
        <div className="w-full max-w-lg flex items-center space-x-2 pb-8">
          <Input
            type="text"
            placeholder="Type your response to simulate voice..."
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
