export type StudentRole =
  | 'Developer'
  | 'AI/ML Engineer'
  | 'UI/UX Designer'
  | 'Hardware Engineer'
  | 'Researcher'
  | 'Founder / Product'
  | 'Business / Growth';

export type ProjectStage = 'Concept' | 'Research' | 'Prototype' | 'MVP' | 'Launched';

export type OpportunityType =
  | 'Hackathon'
  | 'Internship'
  | 'AI Summit'
  | 'Workshop'
  | 'Research'
  | 'Competition'
  | 'Fellowship'
  | 'Scholarship'
  | 'Quiz'
  | 'Conference'
  | 'Cultural Event'
  | 'College Festival';

export type OpportunityCategory =
  | 'Competitions'
  | 'Hackathons'
  | 'Quizzes'
  | 'Scholarships'
  | 'Workshops'
  | 'Conferences'
  | 'Cultural Events'
  | 'College Festivals'
  | 'Internships'
  | 'Research Programs';

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  college: string;
  degree: string;
  gradYear: string;
  shortBio: string;
  primaryRole: StudentRole;
  skills: string[];
  interests: string[];
  availability: '10-15 hrs/wk' | '15-20 hrs/wk' | 'Full-time' | 'Weekends only';
  goals: string;
  githubUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  projectsCount: number;
  ideasCount: number;
  hackathonsCount: number;
  leaderboardRank: number;
  points: number;
  badges: string[];
  isVerified?: boolean;
}

export interface IdeaComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userRole: string;
  content: string;
  createdAt: string;
  likes: number;
}

export interface IdeaRoadmapItem {
  phase: string;
  title: string;
  completed: boolean;
}

export interface Idea {
  id: string;
  title: string;
  tagline: string;
  problemStatement: string;
  proposedSolution: string;
  targetAudience: string;
  category: 'AI / GenAI' | 'HealthTech' | 'Climate / CleanTech' | 'EdTech' | 'Web3 / FinTech' | 'Robotics & IoT' | 'Developer Tools';
  requiredSkills: string[];
  stage: ProjectStage;
  teamSizeNeeded: number;
  currentTeamSize: number;
  rolesNeeded: StudentRole[];
  creator: {
    id: string;
    name: string;
    avatar: string;
    college: string;
    role: string;
  };
  createdAt: string;
  upvotes: number;
  commentsCount: number;
  visibility: 'Public' | 'Unlisted' | 'Private';
  roadmap: IdeaRoadmapItem[];
  tags: string[];
  isUpvoted?: boolean;
  isBookmarked?: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  avatar: string;
  role: string;
  isLead?: boolean;
}

export interface TeamListing {
  id: string;
  name: string;
  tagline: string;
  description: string;
  projectDomain: string;
  lead: TeamMember;
  members: TeamMember[];
  openRoles: {
    role: StudentRole;
    skills: string[];
    commitment: string;
    filled: boolean;
  }[];
  hackathonOrEvent?: string;
  stage: ProjectStage;
  createdAt: string;
  applicantCount: number;
  isSaved?: boolean;
}

export interface Opportunity {
  id: string;
  title: string;
  organizer: string;
  organizerLogo?: string;
  type: OpportunityType;
  category?: OpportunityCategory;
  format: 'Online' | 'In-Person' | 'Hybrid';
  location: string;
  startDate?: string;
  deadline: string;
  timezone?: string;
  daysRemaining: number;
  eligibility: string;
  prizeOrCompensation: string;
  prizeAmount?: number;
  currency?: string;
  stipend?: string;
  registrationFee?: 'Free' | 'Paid' | string;
  teamSize?: 'Individual' | '2-4 members' | '5+ members' | string;
  minTeamSize?: number;
  maxTeamSize?: number;
  isVerified: boolean;
  requiredSkills: string[];
  description: string;
  officialUrl: string;
  checklist?: string[];
  source?: string;
  verificationTimestamp?: string;
  status?: 'Open' | 'Closing Soon' | 'Closed' | 'Upcoming';
  isSaved?: boolean;
  featured?: boolean;
  publishedAt?: string;
  updatedAt?: string;
}

export interface Project {
  id: string;
  title: string;
  tagline: string;
  description: string;
  thumbnail: string;
  technologies: string[];
  contributors: {
    id: string;
    name: string;
    avatar: string;
    role: string;
  }[];
  status: 'In Development' | 'MVP Ready' | 'Live / Shipped';
  demoUrl?: string;
  githubUrl?: string;
  achievements?: string[];
  likes: number;
  views: number;
  isLiked?: boolean;
  isBookmarked?: boolean;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  timestamp: string;
  isCurrentUser: boolean;
  replyTo?: {
    id: string;
    senderName: string;
    text: string;
  };
}

export interface ChatConversation {
  id: string;
  name: string;
  avatar: string;
  type: 'direct' | 'team' | 'idea' | 'match';
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  subtitle?: string;
  membersCount?: number;
}

export interface ChatRoom {
  id: string;
  title: string;
  topic: string;
  description: string;
  membersCount: number;
  activeNow: number;
  icon: string;
  isPrivate: boolean;
}

export interface NotificationItem {
  id: string;
  type: 'match' | 'team_application' | 'team_invite' | 'message' | 'idea_collab' | 'deadline' | 'achievement';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  avatar?: string;
}

export interface LeaderboardUser {
  id: string;
  rank: number;
  name: string;
  avatar: string;
  college: string;
  role: string;
  points: number;
  categoryRank: string;
  badges: string[];
  weeklyGain: number;
  verifiedContributions: number;
}
