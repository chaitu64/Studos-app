import { CommunityPost } from '../types';

type DemoStudentSeed = {
  name: string;
  image: number;
  branchYear: string;
  role: string;
  bio: string;
  skills: string[];
  interests: string[];
  project: string;
  lookingFor: string;
  availability: string;
  portfolio?: string;
};

const seeds: DemoStudentSeed[] = [
  { name: 'Ananya R.', image: 47, branchYear: 'AIML · 3rd Year', role: 'UI/UX Designer', bio: 'I love turning complicated ideas into simple, useful experiences.', skills: ['Figma', 'React Native', 'Prototyping'], interests: ['Design systems', 'Accessibility'], project: 'CampusConnect', lookingFor: 'Backend Developer', availability: 'Open to design collaborations', portfolio: 'https://example.com/ananya' },
  { name: 'Rahul M.', image: 12, branchYear: 'CSE · 3rd Year', role: 'Full Stack Developer', bio: 'Building products that solve everyday student problems.', skills: ['React', 'Node.js', 'MongoDB'], interests: ['SaaS', 'Developer tools'], project: 'Student Productivity Platform', lookingFor: 'UI/UX Designer', availability: 'Available for hackathon teams' },
  { name: 'Karthik P.', image: 11, branchYear: 'AIML · 2nd Year', role: 'ML Developer', bio: 'Exploring computer vision and practical AI applications.', skills: ['Python', 'TensorFlow', 'OpenCV'], interests: ['Computer vision', 'Edge AI'], project: 'Smart Attendance System', lookingFor: 'Mobile Developer', availability: 'Evenings and weekends' },
  { name: 'Sneha K.', image: 44, branchYear: 'ECE · 3rd Year', role: 'Video Editor & Creator', bio: 'I document campus stories and make technical ideas easier to watch.', skills: ['Premiere Pro', 'After Effects', 'Canva'], interests: ['Tech events', 'Short films'], project: 'Campus Creators Collective', lookingFor: 'Event teams and storytellers', availability: 'Taking two event projects this month' },
  { name: 'Arjun V.', image: 13, branchYear: 'CSE · 4th Year', role: 'Backend Developer', bio: 'I enjoy designing reliable APIs and systems that stay boring under pressure.', skills: ['FastAPI', 'PostgreSQL', 'Docker'], interests: ['Distributed systems', 'Open source'], project: 'Campus Marketplace', lookingFor: 'Frontend Developer', availability: 'Open to one serious project' },
  { name: 'Meera S.', image: 45, branchYear: 'IT · 2nd Year', role: 'Graphic Designer', bio: 'Experimenting with expressive identities for student clubs and early products.', skills: ['Photoshop', 'Illustrator', 'Canva'], interests: ['Branding', 'Product design'], project: 'Student Brand Kit Library', lookingFor: 'Founders who need visual identity', availability: 'Freelance and club collaborations' },
  { name: 'Dev N.', image: 15, branchYear: 'ECE · 3rd Year', role: 'Embedded Systems Builder', bio: 'Most weekends you will find me debugging sensors and tiny boards.', skills: ['C++', 'ESP32', 'KiCad', 'IoT'], interests: ['Robotics', 'Assistive tech'], project: 'Low-cost Air Quality Mesh', lookingFor: 'Cloud Developer', availability: 'Open for hardware hackathons' },
  { name: 'Aisha F.', image: 32, branchYear: 'CSE · 2nd Year', role: 'Mobile Developer', bio: 'Learning in public while shipping small, polished Android experiences.', skills: ['React Native', 'TypeScript', 'Firebase'], interests: ['Mobile UX', 'EdTech'], project: 'Peer Tutoring App', lookingFor: 'Product Designer', availability: 'Available after classes' },
  { name: 'Vikram J.', image: 8, branchYear: 'Mechanical · 4th Year', role: 'CAD & Product Engineer', bio: 'I like taking mechanisms from rough sketches to testable prototypes.', skills: ['SolidWorks', 'ANSYS', '3D Printing'], interests: ['EVs', 'Product engineering'], project: 'Modular Electric Kart', lookingFor: 'Embedded Engineer', availability: 'Weekend build sessions' },
  { name: 'Nandini B.', image: 49, branchYear: 'Biotech · 3rd Year', role: 'Student Researcher', bio: 'Curious about where wet-lab work meets reproducible data analysis.', skills: ['R', 'Bioinformatics', 'Research Writing'], interests: ['Genomics', 'Public health'], project: 'Plant Pathogen Dataset', lookingFor: 'Data Visualization Partner', availability: 'Research collaborations welcome' },
  { name: 'Harish G.', image: 5, branchYear: 'Civil · 3rd Year', role: 'Sustainability Innovator', bio: 'Working on practical climate ideas that can start inside a college campus.', skills: ['AutoCAD', 'GIS', 'Data Analysis'], interests: ['Green buildings', 'Urban systems'], project: 'Campus Water Audit', lookingFor: 'IoT Developer', availability: 'Open to multidisciplinary teams' },
  { name: 'Pooja T.', image: 48, branchYear: 'CSE · 4th Year', role: 'Cybersecurity Enthusiast', bio: 'I break practice systems, write down what failed, and help others secure theirs.', skills: ['Linux', 'Burp Suite', 'Python', 'OWASP'], interests: ['AppSec', 'CTFs'], project: 'Student Security Checklist', lookingFor: 'Technical Writer', availability: 'CTF teams and security reviews' },
  { name: 'Rohan D.', image: 14, branchYear: 'AIML · 3rd Year', role: 'Data Storyteller', bio: 'Turning messy datasets into clear decisions is my favourite kind of puzzle.', skills: ['Python', 'SQL', 'Power BI'], interests: ['Sports analytics', 'Civic data'], project: 'Placement Trends Explorer', lookingFor: 'Frontend Developer', availability: 'Open to data-heavy projects' },
  { name: 'Ishita C.', image: 43, branchYear: 'EEE · 2nd Year', role: 'Technical Writer', bio: 'I make engineering concepts less intimidating through careful diagrams and words.', skills: ['Technical Writing', 'Notion', 'Illustration'], interests: ['Documentation', 'Science communication'], project: 'Open Lab Manual Project', lookingFor: 'Subject Contributors', availability: 'Available for documentation work' },
];

export const SWIPE_DEMO_POSTS: CommunityPost[] = seeds.map((student, index) => ({
  id: `demo_swipe_${index + 1}`,
  type: 'project',
  title: student.project,
  content: student.bio,
  author: {
    id: `demo_swipe_student_${index + 1}`,
    name: student.name,
    avatar: `https://i.pravatar.cc/480?img=${student.image}`,
    college: student.branchYear,
    role: student.role,
  },
  createdAt: 'Demo profile',
  createdAtTimestamp: Date.now() - index,
  category: student.interests.join(' · '),
  tags: student.interests,
  skills: student.skills,
  technologies: student.skills,
  eventRoleNeeded: student.lookingFor,
  serviceAvailability: student.availability,
  demoUrl: student.portfolio,
  likesCount: 0,
  commentsCount: 0,
  demo: true,
  demoLabel: 'SWIPE DEMO · DEVELOPMENT ONLY',
}));
