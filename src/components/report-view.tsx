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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Separator } from './ui/separator';

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

      <div className="printable-area bg-card p-8 rounded-lg">
        <Card className="border-none shadow-none">
          <CardHeader>
            <CardTitle className="text-2xl font-bold font-headline">Student Snapshot</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center"><User className="w-4 h-4 mr-2 text-muted-foreground" />Name: <strong className="ml-1">{report.studentProfile.name}</strong></div>
              <div className="flex items-center"><GraduationCap className="w-4 h-4 mr-2 text-muted-foreground" />Grade: <strong className="ml-1">{report.studentProfile.grade}</strong></div>
              <div className="flex items-center"><BookOpen className="w-4 h-4 mr-2 text-muted-foreground" />Curriculum: <strong className="ml-1">{report.studentProfile.curriculum}</strong></div>
              <div className="flex items-center"><Globe className="w-4 h-4 mr-2 text-muted-foreground" />Country: <strong className="ml-1">{report.studentProfile.country}</strong></div>
            </div>
          </CardContent>
        </Card>

        <Separator className="my-6" />

        <div className="grid md:grid-cols-2 gap-8">
          <Card className="border-none shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center"><Sparkles className="w-5 h-5 mr-2 text-accent" />Top Interests</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1">
                {report.interests.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </CardContent>
          </Card>
          <Card className="border-none shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center"><Compass className="w-5 h-5 mr-2 text-accent" />Key Strengths</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1">
                {report.strengths.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </CardContent>
          </Card>
        </div>

        <Separator className="my-6" />

        <Card className="border-none shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl font-bold font-headline"><Briefcase className="w-6 h-6 mr-3 text-primary" />Recommended Career Paths</CardTitle>
            <CardDescription>{report.reasoning}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {report.recommendedPaths.map((path, i) => (
              <div key={i} className="p-4 bg-background rounded-lg border print-break-inside-avoid">
                <h4 className="font-semibold text-lg text-primary">{path.name}</h4>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
