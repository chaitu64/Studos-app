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
  | 'Job'
  | 'Competition'
  | 'Quiz'
  | 'Scholarship'
  | 'Workshop'
  | 'Conference'
  | 'Fellowship'
  | 'Research';

export type OpportunityCategory =
  | 'Hackathons'
  | 'Internships'
  | 'Jobs'
  | 'Competitions'
  | 'Quizzes'
  | 'Scholarships'
  | 'Workshops'
  | 'Conferences / Meets';

export interface UserProfile {
  id: string;
  name: string;
  givenName?: string;
  middleName?: string;
  familyName?: string;
  email?: string;
  authProvider?: string;
  emailVerified?: boolean;
  collegeEmail?: string;
  dateOfBirth?: string;
  avatar: string;
  college: string;
  branch?: string;
  degree: string;
  studyYear?: string;
  gradYear: string;
  shortBio: string;
  primaryRole?: StudentRole;
  skills: string[];
  interests: string[];
  availability?: '10-15 hrs/wk' | '15-20 hrs/wk' | 'Full-time' | 'Weekends only';
  goals?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  /** False when the optional public-link columns have not been deployed yet. */
  profileLinksAvailable?: boolean;
  onboardingCompleted?: boolean;
  phoneNumber?: string;
  ideasCount?: number;
  hackathonsCount?: number;
  leaderboardRank?: number;
  points?: number;
  badges?: string[];
  isVerified?: boolean;
}

export type StudentIdentity =
  | { type: 'real'; id: string }
  | { type: 'demo'; id: string };

export interface StudentDirectoryProfile extends UserProfile {
  identity: StudentIdentity;
  isDemo: boolean;
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
    identity?: StudentIdentity;
    name: string;
    avatar: string;
    college: string;
    role: string;
    studyYear?: string;
  };
  createdAt: string;
  upvotes?: number;
  commentsCount?: number;
  visibility: 'Public' | 'Unlisted' | 'Private';
  roadmap: IdeaRoadmapItem[];
  tags: string[];
  isUpvoted?: boolean;
  isBookmarked?: boolean;
  bookmarkAvailable?: boolean;
  /** Optional values are only rendered when stored in the idea payload. */
  ideaType?: string;
  collaborationOpen?: boolean;
  resources?: { label: string; url: string }[];
  collaboratorCount?: number;
  collaboratorNames?: string[];
}

export interface TeamMember {
  id: string;
  identity?: StudentIdentity;
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
  applicantCount?: number;
  isSaved?: boolean;
  myApplicationStatus?: 'pending' | 'accepted' | 'declined' | 'withdrawn';
  myApplicationRole?: string;
  applications?: { id: string; applicantId: string; applicantName: string; applicantAvatar: string; applicantRole: string; requestedRole?: string; message: string; status: 'pending' | 'accepted' | 'declined' | 'withdrawn'; createdAt: string }[];
}

export interface Opportunity {
  id: string;
  title: string;
  organizer: string;
  organizerLogo?: string;
  bannerImage?: string;
  type: OpportunityType;
  category?: OpportunityCategory;
  format: 'Online' | 'In-Person' | 'Hybrid';
  location: string;
  startDate?: string;
  deadline: string;
  deadlineIso?: string;
  timezone?: string;
  daysRemaining?: number;
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
  tags?: string[];
  description: string;
  officialUrl: string;
  checklist?: string[];
  source?: string;
  verificationTimestamp?: string;
  status?: 'Open' | 'Closing Soon' | 'Closed' | 'Upcoming' | 'Expired';
  isSaved?: boolean;
  featured?: boolean;
  publishedAt?: string;
  updatedAt?: string;
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
  membersCount?: number;
  icon: string;
  isPrivate: boolean;
}

export interface NotificationItem {
  id: string;
  type: 'match' | 'team_application' | 'team_invite' | 'message' | 'idea_collab' | 'deadline' | 'achievement' | 'general';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  avatar?: string;
  isDemo?: boolean;
}

export interface LeaderboardUser {
  id: string;
  rank: number;
  name: string;
  avatar: string;
  college: string;
  role: string;
  points: number;
  categoryRank?: string;
  badges?: string[];
  weeklyGain?: number;
  verifiedContributions?: number;
}

export type CommunityPostType =
  | 'idea'
  | 'service'
  | 'story'
  | 'event_collab'
  | 'project'
  | 'question'
  | 'study_material'
  | 'poll'
  | 'achievement';

export interface CommunityPostComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userRole?: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  isOwn?: boolean;
}

export interface CommunityPost {
  id: string;
  type: CommunityPostType;
  title: string;
  content: string;
  author: {
    id: string;
    identity?: StudentIdentity;
    name: string;
    avatar: string;
    college?: string;
    role?: string;
    isVerified?: boolean;
  };
  createdAt: string;
  createdAtTimestamp: number;
  category?: string;
  tags?: string[];
  skills?: string[];
  images?: string[];
  links?: string[];
  attachments?: string[];
  metadata?: Record<string, unknown>;
  document?: StudyResource;

  // For Ideas:
  problemStatement?: string;
  proposedSolution?: string;
  targetAudience?: string;
  stage?: ProjectStage;
  rolesNeeded?: StudentRole[];
  ideaId?: string;

  // For Services:
  servicePricing?: string;
  serviceAvailability?: string;

  // For Event / Hackathon Collab:
  eventName?: string;
  eventRoleNeeded?: string;
  eventDate?: string;
  teamId?: string;
  openPositions?: number;

  // For Projects:
  demoUrl?: string;
  githubUrl?: string;
  technologies?: string[];
  projectId?: string;

  // Real Engagement
  likesCount?: number;
  commentsCount?: number;
  isLiked?: boolean;
  isSaved?: boolean;
  likesAvailable?: boolean;
  commentsAvailable?: boolean;
  savesAvailable?: boolean;
  comments?: CommunityPostComment[];
}

export type StudyResourceType =
  | 'notes'
  | 'previous_paper'
  | 'important_questions'
  | 'lab_manual'
  | 'study_guide';

export type AcademicPdfCategory =
  | 'important_questions'
  | 'previous_question_paper'
  | 'lecture_notes'
  | 'unit_notes'
  | 'study_materials'
  | 'assignment'
  | 'laboratory_manual'
  | 'practical_record'
  | 'syllabus'
  | 'model_question_paper'
  | 'reference_material'
  | 'other';

export interface AcademicPdf {
  id: string;
  title: string;
  subject_name: string | null;
  subject_code: string | null;
  academic_year: number | null;
  semester: number | null;
  year_semester: string | null;
  category: AcademicPdfCategory;
  description: string;
  college: string | null;
  degree: string | null;
  regulation: string | null;
  source_created_at: string | null;
  source_modified_at: string | null;
  original_file_name: string | null;
  pdf_url: string | null;
  preview_url: string | null;
  file_size: number | null;
  page_count: number | null;
  university: string;
  is_verified: boolean;
  is_published: boolean;
  extraction_status: string;
  created_at: string;
}

export interface StudyResource {
  id: string;
  type: StudyResourceType;
  title: string;
  subject: string;
  college?: string;
  university?: string;
  degree?: string;
  studyYear?: string;
  regulation?: string;
  unitModule?: string;
  subjectCode?: string;
  language?: string;
  academicYear: string;
  pageCount: number;
  description: string;
  aiSummary?: string;
  summaryIsPreview?: boolean;
  topics: string[];
  fileName: string;
  pdfUrl?: string;
  pdfFileName?: string;
  youtubeLink?: string;
  driveFileId?: string;
  fileSizeMb?: number;
  sourceFolderUrl?: string;
  createdAt?: string;
  resourceKind?: 'folder' | 'pdf' | 'link';
  parentResourceId?: string | null;
  driveMimeType?: string | null;
  driveThumbnailUrl?: string | null;
  driveFileSize?: number | null;
  driveCreatedAt?: string | null;
  driveModifiedAt?: string | null;
  thumbnailUrl?: string;
  thumbnailAsset?: number;
  fileSize?: number;
  fileType: 'application/pdf';
  semester?: string;
  branch?: string;
  thumbnailStatus: 'pending' | 'processing' | 'completed' | 'failed';
  summaryStatus?: 'pending' | 'processing' | 'completed' | 'unavailable' | 'failed';
  uploader: CommunityPost['author'];
  uploadedAt: string;
  isBookmarked?: boolean;
}

export type StudyResourceLinkType = 'youtube' | 'chatgpt';

export interface StudyResourceLink {
  id: string;
  study_resource_id: string;
  resource_type: StudyResourceLinkType;
  title: string;
  url: string;
  submitted_by: string;
  created_at: string;
  updated_at: string;
  contributorName?: string;
  isMine: boolean;
}

