'use client';

import type { FinalReport, IvyMessage } from '@/lib/types';
import {
  BookOpen,
  Sparkles,
  Compass,
  Briefcase,
  User,
  GraduationCap,
  Globe,
  Download,
  RotateCcw,
  FileText,
  Lightbulb,
  Target,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

interface ReportViewProps {
  report: FinalReport;
  onRestart: () => void;
  messages: IvyMessage[];
}

export function ReportView({ report, onRestart, messages }: ReportViewProps) {
  const handleDownloadPdf = () => {
    window.print();
  };

  const handleDownloadTranscript = () => {
    const transcript = messages
        .map(m => `${m.role === 'user' ? 'Me' : 'Ivy'}: ${m.content}`)
        .join('\n\n');
    
    const blob = new Blob([transcript], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ivy-conversation-transcript.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto w-full py-8">
      <div className="flex justify-between items-center mb-8 no-print">
        <div>
          <h1 className="text-3xl font-bold font-headline">Your Career Discovery Report</h1>
          <p className="text-muted-foreground">A summary of your conversation with Ivy.</p>
        </div>
        <div className="flex gap-2">
           <Button onClick={handleDownloadTranscript} variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            Transcript
          </Button>
          <Button onClick={handleDownloadPdf} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            PDF Report
          </Button>
          <Button onClick={onRestart}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Start Over
          </Button>
        </div>
      </div>

      <div className="printable-area bg-background p-8 rounded-lg border">
        <Card className="border-none shadow-none print-break-inside-avoid">
          <CardHeader>
            <CardTitle className="text-2xl font-bold font-headline">Student Snapshot</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center"><User className="w-4 h-4 mr-2 text-muted-foreground" />Name: <strong className="ml-1">{report.studentProfile.name}</strong></div>
              <div className="flex items-center"><GraduationCap className="w-4 h-4 mr-2 text-muted-foreground" />Grade: <strong className="ml-1">{report.studentProfile.grade}</strong></div>
            </div>
          </CardContent>
        </Card>

        <Separator className="my-6" />

        <div className="grid md:grid-cols-2 gap-8 print-break-inside-avoid">
          {report.interests.length > 0 && <Card className="border-none shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center"><Sparkles className="w-5 h-5 mr-2 text-accent" />Top Interests</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1">
                {report.interests.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </CardContent>
          </Card>}
          {report.strengths.length > 0 && <Card className="border-none shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center"><Compass className="w-5 h-5 mr-2 text-accent" />Key Strengths</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1">
                {report.strengths.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </CardContent>
          </Card>}
        </div>
        
        <Separator className="my-6" />

        <Card className="border-none shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl font-bold font-headline"><Briefcase className="w-6 h-6 mr-3 text-primary" />Recommended Career Paths</CardTitle>
            <CardDescription>Based on your conversation, here are a few career paths that align with your profile.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {report.recommendedPaths.length > 0 ? (
                <Accordion type="single" collapsible className="w-full">
                  {report.recommendedPaths.map((path, i) => (
                    <AccordionItem value={`item-${i}`} key={i} className="bg-card/50 rounded-lg border print-break-inside-avoid mb-4 data-[state=open]:border-primary/50">
                       <AccordionTrigger className="text-lg font-semibold text-primary hover:no-underline px-6 py-4">
                        {path.name}
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-6">
                        <div className="space-y-6">
                          <div>
                            <h4 className="font-semibold mb-3 flex items-center"><Target className="w-4 h-4 mr-2 text-accent" />Why This Fits You</h4>
                            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground pl-2">
                              {path.whyItFits.map((reason, j) => <li key={j}>{reason}</li>)}
                            </ul>
                          </div>
                          <div>
                            <h4 className="font-semibold mb-3 flex items-center"><Lightbulb className="w-4 h-4 mr-2 text-accent" />Application Readiness Hints</h4>
                            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground pl-2">
                              {path.applicationReadiness.map((hint, j) => <li key={j}>{hint}</li>)}
                            </ul>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
            ) : (
                <p className='text-muted-foreground'>No specific career paths were finalized in this session. Continue your conversation with Ivy to explore more options!</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
