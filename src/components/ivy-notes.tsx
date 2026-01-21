'use client';

import type { StudentProfile, Insights } from '@/lib/types';
import {
  BookOpen,
  Sparkles,
  ShieldAlert,
  Compass,
  Briefcase,
  User,
  GraduationCap,
  Globe,
  Map,
  Layers,
} from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';

interface IvyNotesProps {
  studentProfile: StudentProfile;
  insights: Insights;
}

function NoteSection({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: React.ElementType;
  items: string[];
}) {
  if (items.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="flex items-center text-sm font-semibold text-muted-foreground mb-3">
        <Icon className="w-4 h-4 mr-2" />
        {title}
      </h3>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li
            key={index}
            className="text-sm bg-background/50 border border-border/50 rounded-md px-3 py-2"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function IvyNotes({ studentProfile, insights }: IvyNotesProps) {
  const profileItems = [
    { icon: User, label: 'Name', value: studentProfile.name },
    { icon: GraduationCap, label: 'Grade', value: studentProfile.grade },
    { icon: BookOpen, label: 'Curriculum', value: studentProfile.curriculum },
    { icon: Layers, label: 'Stream', value: studentProfile.stream },
    { icon: Globe, label: 'Country', value: studentProfile.country },
  ].filter((item) => item.value);

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-xl font-bold font-headline mb-6 text-primary">
        Ivy Notes
      </h2>
      <ScrollArea className="flex-1 pr-4 -mr-4">
        {profileItems.length > 0 && (
          <div className="mb-6">
            <h3 className="flex items-center text-sm font-semibold text-muted-foreground mb-3">
              <Map className="w-4 h-4 mr-2" />
              Student Snapshot
            </h3>
            <div className="space-y-2">
              {profileItems.map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  className="flex items-center text-sm bg-background/50 border border-border/50 rounded-md px-3 py-2"
                >
                  <Icon className="w-4 h-4 mr-3 text-muted-foreground" />
                  <span className="font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <NoteSection
          title="Emerging Interests"
          icon={Sparkles}
          items={insights.interests}
        />
        <NoteSection
          title="Strength Signals"
          icon={Compass}
          items={insights.strengths}
        />
        <NoteSection
          title="Constraints & Preferences"
          icon={ShieldAlert}
          items={insights.constraints}
        />
        <NoteSection
          title="Shortlisted Career Clusters"
          icon={Briefcase}
          items={insights.careerClusters}
        />
      </ScrollArea>
    </div>
  );
}
