'use client';

import { useState, useCallback, useTransition } from 'react';
import {
  aiDrivenConversation,
  AIDrivenConversationInput,
} from '@/ai/flows/ai-driven-conversation';
import { extractInsights } from '@/ai/flows/real-time-insight-extraction';
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

export function IvyVoiceGuide() {
  const [appState, setAppState] = useState<AppState>('welcome');
  const [studentProfile, setStudentProfile] = useState<StudentProfile>({
    name: '',
    grade: '',
    curriculum: '',
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

  const { toast } = useToast();

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
    startTransition(async () => {
      try {
        const input: AIDrivenConversationInput = {
          ...studentProfile,
          conversationHistory: [],
        };
        const result = await aiDrivenConversation(input);
        if (result.nextPrompt) {
          setMessages([{ role: 'assistant', content: result.nextPrompt }]);
        }
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
  }, [studentProfile, toast]);

  const handleSendMessage = useCallback(
    async (userInput: string) => {
      if (!userInput.trim()) return;

      const newMessages: IvyMessage[] = [
        ...messages,
        { role: 'user', content: userInput },
      ];
      setMessages(newMessages);

      startTransition(async () => {
        try {
          // 1. Extract insights from user response
          const insightResult = await extractInsights({
            studentResponse: userInput,
            existingInsights: JSON.stringify(insights),
          });
          
          const updatedInsights: Insights = {
            interests: [...new Set([...insights.interests, ...insightResult.interests.split(',').map(s => s.trim()).filter(Boolean)])],
            strengths: [...new Set([...insights.strengths, ...insightResult.strengths.split(',').map(s => s.trim()).filter(Boolean)])],
            constraints: [...new Set([...insights.constraints, ...insightResult.constraints.split(',').map(s => s.trim()).filter(Boolean)])],
            careerClusters: [...new Set([...insights.careerClusters, ...insightResult.careerClusters.split(',').map(s => s.trim()).filter(Boolean)])],
          };
          setInsights(updatedInsights);

          // 2. Get next AI prompt
          const convResult = await aiDrivenConversation({
            ...studentProfile,
            conversationHistory: newMessages.map((m) => ({
              role: m.role === 'user' ? 'user' : 'assistant',
              content: m.content,
            })),
            insights: updatedInsights,
          });

          if (convResult.nextPrompt) {
            setMessages((prev) => [
              ...prev,
              { role: 'assistant', content: convResult.nextPrompt },
            ]);
          }

          // 3. Check for convergence to report
          if (convResult.careerPaths && convResult.careerPaths.length > 0) {
            setFinalReport({
              studentProfile,
              ...updatedInsights,
              recommendedPaths: convResult.careerPaths.map((p) => ({ name: p })),
              reasoning: convResult.nextPrompt,
            });
            setAppState('report');
          }
        } catch (error) {
          console.error(error);
          toast({
            title: 'An error occurred',
            description: 'The AI assistant ran into a problem. Please try again.',
            variant: 'destructive',
          });
          setMessages(messages); // Revert messages on error
        }
      });
    },
    [messages, insights, studentProfile, toast]
  );
  
  const handleRestart = () => {
    setAppState('welcome');
    setStudentProfile({ name: '', grade: '', curriculum: '', country: '' });
    setMessages([]);
    setInsights({ interests: [], strengths: [], constraints: [], careerClusters: [] });
    setFinalReport(null);
  };

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
            onSendMessage={handleSendMessage}
          />
        );
      case 'report':
        return finalReport ? (
          <ReportView report={finalReport} onRestart={handleRestart} />
        ) : null;
    }
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
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
