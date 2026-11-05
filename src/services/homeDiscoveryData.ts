export interface StudentSpotlight {
  id: string; name: string; avatar: string; branchYear: string; role: string; intro: string;
  skills: string[]; currentWork: string; availability?: string; conversationId?: string;
  identity?: import('../types').StudentIdentity; isDemo?: boolean;
}

export interface StudentService {
  id: string; title: string; description: string; provider: StudentSpotlight; skills: string[]; availability: string; category?: string; startingPrice?: number;
}

export interface StudentProjectFeature {
  id: string; title: string; summary: string; author: string; branchYear: string; image?: string;
  technologies: string[]; seeking?: string; achievement?: string;
}

export interface CommunityQuestionPreview {
  id: string; author: string; branchYear: string; title: string; replies: number; topic: string;
}
