export type StudentProfile = {
  name: string;
  grade: string;
  curriculum: string;
  country: string;
};

export type IvyMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type Insights = {
  interests: string[];
  strengths: string[];
  constraints: string[];
  careerClusters: string[];
};

export type RecommendedPath = {
  name: string;
  whyItFits: string[];
  applicationReadiness: string[];
};

export type FinalReport = {
  studentProfile: StudentProfile;
  interests: string[];
  strengths: string[];
  constraints: string[];
  careerClusters: string[];
  recommendedPaths: RecommendedPath[];
};
