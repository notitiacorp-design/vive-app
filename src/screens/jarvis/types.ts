// Jarvis screen types â shared across JarvisChat and DailyBriefing

export type MessageRole = 'jarvis' | 'user';

export type ChatState = 'idle' | 'typing' | 'waiting' | 'responding';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
}

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}

export interface NightScore {
  score: number;
  deepSleepMinutes: number;
  remMinutes: number;
  awakenings: number;
  hrv: number;
}

export type RecommendationCategory = 'sommeil' | 'nutrition' | 'activite' | 'mental';
export type ImpactLevel = 'high' | 'medium' | 'low';
export type MissionType = 'movement' | 'nutrition' | 'recovery' | 'mindfulness';

export interface Recommendation {
  id: string;
  icon: string;
  title: string;
  description: string;
  category: RecommendationCategory;
  impact: ImpactLevel;
}

export interface DailyMission {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  estimatedMinutes: number;
  type: MissionType;
}

export interface BriefingData {
  nightScore: NightScore;
  topRecommendation: Recommendation;
  missions: DailyMission[];
  date: Date;
}
