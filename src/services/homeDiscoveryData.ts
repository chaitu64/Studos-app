export interface StudentSpotlight {
  id: string; name: string; avatar: string; branchYear: string; role: string; intro: string;
  skills: string[]; currentWork: string; availability?: string; conversationId?: string;
}

export interface StudentService {
  id: string; title: string; description: string; provider: StudentSpotlight; skills: string[]; availability: string;
}

export interface StudentProjectFeature {
  id: string; title: string; summary: string; author: string; branchYear: string; image?: string;
  technologies: string[]; seeking?: string; achievement?: string;
}

export interface CommunityQuestionPreview {
  id: string; author: string; branchYear: string; title: string; replies: number; topic: string;
}

const portrait = (seed: string) => `https://i.pravatar.cc/240?u=studos-home-${seed}`;
const image = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1000&q=80`;

export const DEMO_STUDENT_SPOTLIGHTS: StudentSpotlight[] = [
  { id: 'talent_ananya', name: 'Ananya R.', avatar: portrait('ananya'), branchYear: 'AIML · 3rd Year', role: 'UI/UX Designer', intro: 'I turn rough student ideas into prototypes people can actually test.', skills: ['Figma', 'React Native', 'Prototyping'], currentWork: 'CampusConnect', availability: 'Design collaborations' },
  { id: 'talent_rahul', name: 'Rahul M.', avatar: portrait('rahul'), branchYear: 'CSE · 3rd Year', role: 'Full Stack Developer', intro: 'Building useful web tools and helping teams ship their first version.', skills: ['React', 'Node.js', 'MongoDB'], currentWork: 'Student productivity platform', availability: 'Hackathon teams' },
  { id: 'talent_karthik', name: 'Karthik P.', avatar: portrait('karthik'), branchYear: 'AIML · 2nd Year', role: 'ML Enthusiast', intro: 'Interested in practical computer vision, especially campus problems.', skills: ['Python', 'TensorFlow', 'OpenCV'], currentWork: 'Smart Attendance', availability: 'ML collaborations' },
  { id: 'talent_sneha', name: 'Sneha K.', avatar: portrait('sneha'), branchYear: 'ECE · 3rd Year', role: 'Video Editor', intro: 'I document events and turn long footage into sharp student stories.', skills: ['Premiere Pro', 'After Effects', 'Canva'], currentWork: 'College media archive', availability: 'Event coverage' },
  { id: 'talent_ishaan', name: 'Ishaan V.', avatar: portrait('ishaan'), branchYear: 'Mechanical · Final Year', role: 'Product Builder', intro: 'CAD, rapid prototypes, and the patience to test one more iteration.', skills: ['SolidWorks', 'Arduino', '3D Printing'], currentWork: 'Assistive gripper', availability: 'Hardware projects' },
  { id: 'talent_fatima', name: 'Fatima N.', avatar: portrait('fatima'), branchYear: 'CSE · 2nd Year', role: 'Technical Writer', intro: 'Making dense technical concepts easier to understand without watering them down.', skills: ['Research', 'Documentation', 'Python'], currentWork: 'Open-source explainers', availability: 'Writing and research' },
];

export const DEMO_STUDENT_SERVICES: StudentService[] = [
  { id: 'service_portfolio', title: 'Need a portfolio website?', description: 'Helping students build clean, responsive portfolios they can confidently send to recruiters.', provider: DEMO_STUDENT_SPOTLIGHTS[1], skills: ['React', 'Node.js', 'Responsive UI'], availability: 'Weekends' },
  { id: 'service_product_ui', title: 'UI review before your demo', description: 'A focused review of hierarchy, usability, and the three screens judges will remember.', provider: DEMO_STUDENT_SPOTLIGHTS[0], skills: ['Figma', 'UX Review', 'Prototype'], availability: '2 slots this week' },
  { id: 'service_video', title: 'Event reels and aftermovies', description: 'Short-form edits for club events, workshops, and hackathon recaps.', provider: DEMO_STUDENT_SPOTLIGHTS[3], skills: ['Editing', 'Colour', 'Motion'], availability: 'Available this month' },
  { id: 'service_cad', title: 'CAD help for prototypes', description: 'Part modelling and print-ready checks for student hardware teams.', provider: DEMO_STUDENT_SPOTLIGHTS[4], skills: ['CAD', 'DFM', '3D Printing'], availability: 'Evenings' },
  { id: 'service_docs', title: 'Make your technical report readable', description: 'Structure, diagrams, and editing for project reports and research summaries.', provider: DEMO_STUDENT_SPOTLIGHTS[5], skills: ['Writing', 'Research', 'Diagrams'], availability: 'Open to collaborate' },
];

export const DEMO_STUDENT_PROJECTS: StudentProjectFeature[] = [
  { id: 'feature_attendance', title: 'Smart Attendance Using WiFi Signals', summary: 'Testing whether existing access-point signals can estimate classroom presence without new hardware.', author: 'Karthik P.', branchYear: 'AIML · 2nd Year', image: image('photo-1558494949-ef010cbdcc31'), technologies: ['Python', 'FastAPI', 'ML'], seeking: 'Backend developer' },
  { id: 'feature_assistant', title: 'AI-Powered Campus Assistant', summary: 'A multilingual assistant for finding rooms, deadlines, forms, and club contacts.', author: 'Team Orbit', branchYear: 'CSE + ECE', image: image('photo-1526374965328-7f61d4dc18c5'), technologies: ['React Native', 'RAG', 'FastAPI'], achievement: '2nd place · Internal Hackathon' },
  { id: 'feature_access', title: 'Accessible Campus Navigation', summary: 'Community-verified step-free paths with entrance and lift availability notes.', author: 'Ananya R. + Devansh J.', branchYear: 'AIML · 3rd Year', image: image('photo-1531403009284-440f080d1e12'), technologies: ['Expo', 'Maps', 'Figma'], seeking: 'Accessibility research' },
  { id: 'feature_events', title: 'College Event Command Centre', summary: 'One view for volunteer shifts, venue changes, registrations, and live announcements.', author: 'Rahul M.', branchYear: 'CSE · 3rd Year', image: image('photo-1497366811353-6870744d04b2'), technologies: ['React', 'Node.js', 'MongoDB'] },
  { id: 'feature_agri', title: 'Crop Health from Phone Video', summary: 'A lightweight computer-vision experiment for detecting leaf stress from short field clips.', author: 'Meera S.', branchYear: 'AIML · Final Year', image: image('photo-1501004318641-b39e6451bec6'), technologies: ['OpenCV', 'TensorFlow Lite'], achievement: 'Research poster shortlisted' },
];

export const DEMO_COMMUNITY_QUESTIONS: CommunityQuestionPreview[] = [
  { id: 'question_btree', author: 'Megha T.', branchYear: 'CSE · 2nd Year', title: 'When should I choose a B+ Tree over hash indexing?', replies: 8, topic: 'DBMS' },
  { id: 'question_socket', author: 'Aarav D.', branchYear: 'IT · 3rd Year', title: 'Polling or WebSockets for a campus bus tracker?', replies: 5, topic: 'Architecture' },
  { id: 'question_team', author: 'Nitya P.', branchYear: 'ECE · 2nd Year', title: 'Need help selecting sensors for an indoor air-quality project', replies: 3, topic: 'Project help' },
  { id: 'question_intern', author: 'Varun B.', branchYear: 'Mechanical · 3rd Year', title: 'How did you structure your first research internship email?', replies: 11, topic: 'Internships' },
];
