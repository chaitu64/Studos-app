import { CommunityPost, StudyResource } from '../types';
import { RESOURCE_API_URL } from './resourceApi';

const avatar = (seed: string) => `https://i.pravatar.cc/160?u=studos-${seed}`;
const photo = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=82`;
const pdfPreview = {
  networks: require('../../assets/demo-documents/demo-cn-notes-page-1.png'),
  dataStructures: require('../../assets/demo-documents/demo-dsa-paper-page-1.png'),
  databases: require('../../assets/demo-documents/demo-dbms-paper-page-1.png'),
  operatingSystems: require('../../assets/demo-documents/demo-os-diagrams-page-1.png'),
};

const authors = {
  priya: { id: 'preview_priya', name: 'Priya K.', avatar: avatar('priya'), college: 'CSE · 3rd Year', role: 'Student' },
  rohit: { id: 'preview_rohit', name: 'Rohit S.', avatar: avatar('rohit'), college: 'AIML · 2nd Year', role: 'Student' },
  arjun: { id: 'preview_arjun', name: 'Arjun M.', avatar: avatar('arjun'), college: 'ECE · 3rd Year', role: 'Student' },
  karthik: { id: 'preview_karthik', name: 'Karthik P.', avatar: avatar('karthik'), college: 'AIML · 2nd Year', role: 'Student' },
  megha: { id: 'preview_megha', name: 'Megha T.', avatar: avatar('megha'), college: 'CSE · 2nd Year', role: 'Student' },
  aditya: { id: 'preview_aditya', name: 'Aditya S.', avatar: avatar('aditya'), college: 'Mechanical · 3rd Year', role: 'Student' },
  neha: { id: 'preview_neha', name: 'Neha R.', avatar: avatar('neha'), college: 'IT · Final Year', role: 'Student' },
  vivek: { id: 'preview_vivek', name: 'Vivek N.', avatar: avatar('vivek'), college: 'Civil · 2nd Year', role: 'Student' },
};

export const DEMO_STUDY_RESOURCES: StudyResource[] = [
  {
    id: 'preview_resource_cn_unit_3', type: 'notes', title: 'Computer Networks — Unit 3 Notes',
    subject: 'Computer Networks', academicYear: '3rd Year', pageCount: 3,
    description: 'Clear handwritten notes covering TCP congestion control, sliding window protocols, flow control, and error detection.',
    aiSummary: 'Explains the major TCP mechanisms, congestion management, and sliding window concepts with diagrams and examples.',
    summaryIsPreview: true, summaryStatus: 'completed', topics: ['TCP', 'Flow Control', 'Congestion Control'], fileName: 'demo-cn-notes.pdf',
    pdfUrl: `${RESOURCE_API_URL}/api/resources/demo-cn-notes/original`, thumbnailUrl: `${RESOURCE_API_URL}/api/resources/demo-cn-notes/thumbnail`, thumbnailAsset: pdfPreview.networks, thumbnailStatus: 'completed', fileType: 'application/pdf',
    uploader: authors.priya, uploadedAt: '2h ago', demo: true,
  },
  {
    id: 'preview_resource_dsa_questions', type: 'important_questions', title: 'Data Structures — Important Questions',
    subject: 'Data Structures', academicYear: '2nd Year', pageCount: 2,
    description: 'Frequently repeated questions covering trees, graphs, hashing, and dynamic programming.',
    aiSummary: 'An illustrative preview grouping high-frequency questions by unit and expected answer depth.',
    summaryIsPreview: true, summaryStatus: 'completed', topics: ['Trees', 'Graphs', 'Hashing'], fileName: 'demo-dsa-paper.pdf',
    pdfUrl: `${RESOURCE_API_URL}/api/resources/demo-dsa-paper/original`, thumbnailUrl: `${RESOURCE_API_URL}/api/resources/demo-dsa-paper/thumbnail`, thumbnailAsset: pdfPreview.dataStructures, thumbnailStatus: 'completed', fileType: 'application/pdf',
    uploader: authors.rohit, uploadedAt: '5h ago', demo: true,
  },
  {
    id: 'preview_resource_dbms_paper', type: 'previous_paper', title: 'DBMS Previous Papers — 2023–25',
    subject: 'Database Management Systems', academicYear: '2nd Year', pageCount: 3,
    description: 'Three university papers with unit-wise marks and a quick repetition index.',
    aiSummary: 'Illustrative preview: normalization, transactions, indexing, and SQL joins appear most often.',
    summaryIsPreview: true, summaryStatus: 'completed', topics: ['Normalization', 'Transactions', 'Indexing'], fileName: 'demo-dbms-paper.pdf',
    pdfUrl: `${RESOURCE_API_URL}/api/resources/demo-dbms-paper/original`, thumbnailUrl: `${RESOURCE_API_URL}/api/resources/demo-dbms-paper/thumbnail`, thumbnailAsset: pdfPreview.databases, thumbnailStatus: 'completed', fileType: 'application/pdf',
    uploader: authors.megha, uploadedAt: 'Yesterday', demo: true,
  },
  {
    id: 'preview_resource_os_guide', type: 'study_guide', title: 'Operating Systems — Last Week Guide',
    subject: 'Operating Systems', academicYear: '3rd Year', pageCount: 2,
    description: 'A focused revision route with scheduling numericals, deadlocks, memory, and file systems.',
    aiSummary: 'Illustrative preview with a seven-day revision sequence and checkpoints for core numericals.',
    summaryIsPreview: true, summaryStatus: 'completed', topics: ['Scheduling', 'Deadlocks', 'Paging'], fileName: 'demo-os-diagrams.pdf',
    pdfUrl: `${RESOURCE_API_URL}/api/resources/demo-os-diagrams/original`, thumbnailUrl: `${RESOURCE_API_URL}/api/resources/demo-os-diagrams/thumbnail`, thumbnailAsset: pdfPreview.operatingSystems, thumbnailStatus: 'completed', fileType: 'application/pdf',
    uploader: authors.neha, uploadedAt: '2d ago', demo: true,
  },
];

const post = (value: Omit<CommunityPost, 'createdAtTimestamp' | 'likesCount' | 'commentsCount'>, index: number): CommunityPost => ({
  ...value, createdAtTimestamp: Date.now() - index * 3600000, likesCount: 0, commentsCount: 0,
  demo: true, demoLabel: 'Preview data · Development only',
});

export const DEMO_HOME_POSTS: CommunityPost[] = [
  post({ id: 'preview_story_hackathon', type: 'story', title: 'The moment our prototype finally worked', content: 'At 4:10 AM the campus assistant answered its first real question. We cut half the feature list, fixed one embarrassing demo bug, and somehow presented with energy.', author: authors.arjun, createdAt: '2h', category: 'Hackathon', images: [photo('photo-1504384308090-c894fdcc538d'), photo('photo-1521737711867-e3b97375f902')], tags: ['Hackathon', 'Teamwork'] }, 1),
  post({ id: 'preview_story_research', type: 'achievement', title: 'Research internship shortlist!', content: 'I made the first IISc shortlist. The most useful advice was to make my statement specific: one problem, one experiment, and what I genuinely wanted to learn.', author: authors.aditya, createdAt: '4h', images: [photo('photo-1523240795612-9a054b0db644')], tags: ['Research', 'Internship'] }, 2),
  post({ id: 'preview_story_wifi', type: 'idea', title: 'Could attendance work with existing WiFi?', content: 'I am testing whether signal patterns can identify classroom presence without extra hardware. Still early; looking for someone who enjoys backend systems and messy data.', author: authors.karthik, createdAt: '6h', rolesNeeded: ['Developer', 'AI/ML Engineer'], tags: ['CampusTech', 'WiFi'] }, 3),
  post({ id: 'preview_story_workshop', type: 'story', title: 'Three lessons from our first PCB workshop', content: 'Label every component tray, test power before plugging in the IC, and keep one working board untouched for comparison. Sharing the checklist after we clean it up.', author: authors.neha, createdAt: 'Yesterday', images: [photo('photo-1518770660439-4636190af475'), photo('photo-1581092160562-40aa08e78837')], tags: ['Workshop', 'Electronics'] }, 4),
  post({ id: 'preview_story_team', type: 'event_collab', title: 'Two places open on our SIH team', content: 'We have Android and design covered. We need one backend developer and someone who enjoys user interviews and pitching.', author: authors.priya, createdAt: '1d', eventName: 'Smart India Hackathon', eventRoleNeeded: 'Backend + Product Research', tags: ['TeamUp', 'SIH'] }, 5),
  post({ id: 'preview_story_internship', type: 'story', title: 'What my first backend internship actually taught me', content: 'Writing endpoints was the easy part. Reading logs, asking precise questions, and shipping one small safe change at a time took most of my attention.', author: authors.rohit, createdAt: '2d', tags: ['Internship', 'Backend'] }, 6),
  post({ id: 'preview_story_event', type: 'event_collab', title: 'Open Source Evening — Friday', content: 'Bring one issue you want to understand. Maintainers and first-time contributors will pair up for ninety minutes in Lab 3.', author: authors.megha, createdAt: '3d', eventName: 'Open Source Evening', eventDate: 'Friday · 4:30 PM', tags: ['Event', 'OpenSource'] }, 7),
];

export const getDemoHomePage = (page: number, perPage = 5) => {
  const start = (page - 1) * perPage;
  return { items: DEMO_HOME_POSTS.slice(start, start + perPage), hasMore: start + perPage < DEMO_HOME_POSTS.length };
};
