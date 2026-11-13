import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { CommunityPostType, CommunityPost, StudentRole, ProjectStage } from '../../types';
import * as ImagePicker from 'expo-image-picker';

export interface PostComposerModalProps {
  visible: boolean;
  initialType?: CommunityPostType;
  allowedTypes?: CommunityPostType[];
  onClose: () => void;
  onSubmit: (post: Omit<CommunityPost, 'id' | 'createdAt' | 'createdAtTimestamp' | 'likesCount' | 'commentsCount' | 'author'>) => Promise<any>;
}

const POST_TYPES: { id: CommunityPostType; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { id: 'idea', label: 'Idea', icon: 'bulb-outline', color: Colors.accentAmber },
  { id: 'service', label: 'Service', icon: 'construct-outline', color: Colors.accentCyan },
  { id: 'story', label: 'Story', icon: 'book-outline', color: Colors.accentPurple },
  { id: 'event_collab', label: 'Event Collab', icon: 'trophy-outline', color: Colors.primary },
  { id: 'project', label: 'Project', icon: 'rocket-outline', color: Colors.accentGreen },
  { id: 'question', label: 'Question', icon: 'help-circle-outline', color: Colors.info },
  { id: 'achievement', label: 'Achievement', icon: 'ribbon-outline', color: Colors.accentAmber },
];

const AVAILABLE_ROLES: StudentRole[] = [
  'Developer',
  'AI/ML Engineer',
  'UI/UX Designer',
  'Hardware Engineer',
  'Researcher',
  'Founder / Product',
  'Business / Growth',
];

export const PostComposerModal: React.FC<PostComposerModalProps> = ({
  visible,
  initialType = 'idea',
  allowedTypes,
  onClose,
  onSubmit,
}) => {
  const [postType, setPostType] = useState<CommunityPostType>(initialType);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [skillsInput, setSkillsInput] = useState('');
  const [collaborationNeedsInput, setCollaborationNeedsInput] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [linksInput, setLinksInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);

  // Idea fields
  const [problemStatement, setProblemStatement] = useState('');
  const [proposedSolution, setProposedSolution] = useState('');
  const [stage] = useState<ProjectStage>('Concept');
  const [selectedRoles, setSelectedRoles] = useState<StudentRole[]>(['Developer']);

  // Service fields
  const [servicePricing, setServicePricing] = useState('');
  const [serviceAvailability, setServiceAvailability] = useState('');

  // Event Collab fields
  const [eventName, setEventName] = useState('');
  const [eventRoleNeeded, setEventRoleNeeded] = useState('');
  const [eventDate, setEventDate] = useState('');

  // Project fields
  const [demoUrl, setDemoUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');

  const resetForm = () => {
    setTitle('');
    setContent('');
    setSkillsInput('');
    setTagsInput('');
    setLinksInput('');
    setProblemStatement('');
    setProposedSolution('');
    setServicePricing('');
    setServiceAvailability('');
    setEventName('');
    setEventRoleNeeded('');
    setEventDate('');
    setDemoUrl('');
    setGithubUrl('');
    setImages([]);
  };

  const toggleRole = (r: StudentRole) => {
    if (selectedRoles.includes(r)) {
      if (selectedRoles.length > 1) {
        setSelectedRoles(selectedRoles.filter((item) => item !== r));
      }
    } else {
      setSelectedRoles([...selectedRoles, r]);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() && postType !== 'story') {
      Alert.alert('Missing Field', 'Please enter a post title.');
      return;
    }
    if (!content.trim()) {
      Alert.alert('Missing Field', 'Please enter a description or details for your post.');
      return;
    }

    setIsSubmitting(true);
    try {
      const skills = skillsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const tags = tagsInput
        .split(',')
        .map((t) => t.trim().replace(/^#/, ''))
        .filter(Boolean);
      const links = linksInput.split(/[\s,]+/).map((value) => value.trim()).filter(Boolean);
      for (const link of links) {
        try { const parsed = new URL(link); if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error(); }
        catch { Alert.alert('Check your links', 'Use complete http or https links.'); return; }
      }

      await onSubmit({
        type: postType,
        title: title.trim() || content.trim().slice(0, 80),
        content: content.trim(),
        skills: skills.length > 0 ? skills : undefined,
        tags: tags.length > 0 ? tags : undefined,
        links: links.length ? links : undefined,
        images: images.map((image) => image.uri),
        // Idea fields
        problemStatement: postType === 'idea' ? problemStatement.trim() || undefined : undefined,
        proposedSolution: postType === 'idea' ? proposedSolution.trim() || undefined : undefined,
        stage: postType === 'idea' ? stage : undefined,
        // Service fields
        servicePricing: postType === 'service' ? servicePricing.trim() || undefined : undefined,
        serviceAvailability: postType === 'service' ? serviceAvailability.trim() || undefined : undefined,
        // Event fields
        eventName: postType === 'event_collab' ? eventName.trim() || undefined : undefined,
        eventRoleNeeded: postType === 'event_collab' ? eventRoleNeeded.trim() || undefined : undefined,
        eventDate: postType === 'event_collab' ? eventDate.trim() || undefined : undefined,
        // Project fields
        demoUrl: postType === 'project' ? demoUrl.trim() || undefined : undefined,
        githubUrl: postType === 'project' ? githubUrl.trim() || undefined : undefined,
        technologies: postType === 'project' && skills.length > 0 ? skills : undefined,
        rolesNeeded: postType === 'project' ? collaborationNeedsInput.split(',').map((value) => value.trim()).filter(Boolean) as StudentRole[] : postType === 'idea' ? selectedRoles : undefined,
        document: undefined,
      });

      resetForm();
      onClose();
    } catch {
      Alert.alert('Error', 'Unable to publish post. Please check your inputs and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Create Community Post</Text>
              <Text style={styles.headerSubtitle}>Share with students, clubs & organizers</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Type Selector Horizontal Tabs */}
          {(allowedTypes?.length ?? POST_TYPES.length) > 1 ? <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.typeSelectorRow}
          >
            {POST_TYPES.filter((t) => !allowedTypes || allowedTypes.includes(t.id)).map((t) => {
              const selected = postType === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    styles.typeChip,
                    selected && { borderColor: t.color, backgroundColor: t.color + '1A' },
                  ]}
                  onPress={() => setPostType(t.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={t.icon} size={15} color={selected ? t.color : Colors.textMuted} />
                  <Text style={[styles.typeChipText, selected && { color: t.color, fontWeight: '700' }]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView> : null}

          {/* Form Scroll View */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formContainer}>
            {/* Title */}
            <Input
              label={
                postType === 'service'
                  ? 'Service Name (e.g. UI/UX Prototyping, Full-Stack Mentorship)'
                  : postType === 'event_collab'
                  ? 'Event / Initiative Title'
                : postType === 'story'
                  ? 'Headline (optional)'
                : postType === 'question'
                  ? 'Question Summary'
                  : 'Post Title'
              }
              value={title}
              onChangeText={setTitle}
              placeholder={
                postType === 'idea'
                  ? 'E.g., OpenMed — Low-cost portable ECG monitor'
                  : postType === 'service'
                  ? 'E.g., React Native & Figma Design for Hackathon Teams'
                  : postType === 'story'
                  ? 'E.g., What we learned placing 2nd at CalHacks'
                  : postType === 'event_collab'
                  ? 'E.g., Organizing Spring Hackathon — Need Mentors & Judges'
                  : postType === 'project'
                  ? 'E.g., NeuralSketch — AI storyboard animator'
                  : 'E.g., Best way to handle offline SQLite sync in Expo?'
              }
            />

            {/* Description / Content */}
            <Input
              label={
                postType === 'idea'
                  ? 'Overview / Vision'
                  : postType === 'service'
                  ? 'Service Description & What You Offer'
                  : postType === 'story'
                  ? 'Your Story & Lessons Learned'
                  : postType === 'event_collab'
                  ? 'Event Overview & Collaboration Needs'
                  : postType === 'question'
                  ? 'Question Details & Context'
                  : 'Description'
              }
              value={content}
              onChangeText={setContent}
              placeholder="Provide clear details for other students..."
              multiline
              numberOfLines={4}
              style={{ minHeight: 90, textAlignVertical: 'top' }}
            />

            {/* Dynamic Fields for Ideas */}
            {postType === 'idea' ? (
              <>
                <Input
                  label="Problem Statement (Optional)"
                  value={problemStatement}
                  onChangeText={setProblemStatement}
                  placeholder="What specific pain point does this solve?"
                  multiline
                  numberOfLines={2}
                />
                <Input
                  label="Proposed Solution (Optional)"
                  value={proposedSolution}
                  onChangeText={setProposedSolution}
                  placeholder="How does your idea address this problem?"
                  multiline
                  numberOfLines={2}
                />
                <View style={styles.fieldSection}>
                  <Text style={styles.sectionLabel}>ROLES NEEDED</Text>
                  <View style={styles.rolesGrid}>
                    {AVAILABLE_ROLES.map((role) => {
                      const selected = selectedRoles.includes(role);
                      return (
                        <Chip
                          key={role}
                          label={role}
                          selected={selected}
                          onPress={() => toggleRole(role)}
                        />
                      );
                    })}
                  </View>
                </View>
              </>
            ) : null}

            {/* Dynamic Fields for Services */}
            {postType === 'service' ? (
              <View style={styles.twoColRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Input
                    label="Pricing"
                    value={servicePricing}
                    onChangeText={setServicePricing}
                    placeholder="e.g. Free, $20/hr, or Fixed"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Availability"
                    value={serviceAvailability}
                    onChangeText={setServiceAvailability}
                    placeholder="e.g. 10 hrs/wk, Weekends"
                  />
                </View>
              </View>
            ) : null}

            {/* Dynamic Fields for Event Collaboration */}
            {postType === 'event_collab' ? (
              <>
                <Input
                  label="Event Name / Host Club"
                  value={eventName}
                  onChangeText={setEventName}
                  placeholder="e.g. CalHacks 11.0 / GDSC Chapter"
                />
                <Input
                  label="Roles / Help Needed"
                  value={eventRoleNeeded}
                  onChangeText={setEventRoleNeeded}
                  placeholder="e.g. Volunteers, Mentors, Designers, Logistics"
                />
                <Input
                  label="Target Date / Deadline (Optional)"
                  value={eventDate}
                  onChangeText={setEventDate}
                  placeholder="e.g. November 15, 2026"
                />
              </>
            ) : null}

            {/* Dynamic Fields for Projects */}
            {postType === 'project' ? (
              <>
              <View style={styles.twoColRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Input
                    label="Live Demo Link (Optional)"
                    value={demoUrl}
                    onChangeText={setDemoUrl}
                    placeholder="https://..."
                    autoCapitalize="none"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Input
                    label="GitHub Link (Optional)"
                    value={githubUrl}
                    onChangeText={setGithubUrl}
                    placeholder="https://github.com/..."
                    autoCapitalize="none"
                  />
                </View>
              </View>
              <Input label="Collaboration needs (optional)" value={collaborationNeedsInput} onChangeText={setCollaborationNeedsInput} placeholder="e.g. Backend developer, UI designer" />
              </>
            ) : null}

            {/* Skills & Tags */}
            <Input
              label="Relevant Skills / Technologies (comma separated)"
              value={skillsInput}
              onChangeText={setSkillsInput}
              placeholder="e.g. React Native, Python, Figma, PyTorch"
            />

            <Input
              label="Links (optional, comma or space separated)"
              value={linksInput}
              onChangeText={setLinksInput}
              placeholder="https://example.edu/resource"
              autoCapitalize="none"
              keyboardType="url"
            />

            <Input
              label="Tags (comma separated)"
              value={tagsInput}
              onChangeText={setTagsInput}
              placeholder="e.g. AI, OpenSource, Design, Hackathon"
            />

            <View style={styles.fieldSection}>
              <Text style={styles.sectionLabel}>POST IMAGES (UP TO 4)</Text>
              <TouchableOpacity accessibilityRole="button" onPress={async () => {
                const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: 4, quality: 0.8 });
                if (!result.canceled) setImages(result.assets.slice(0, 4));
              }} style={styles.imagePicker}>
                <Ionicons name="image-outline" size={18} color={Colors.primary} />
                <Text style={styles.imagePickerText}>{images.length ? 'Change selected images' : 'Choose images'}</Text>
              </TouchableOpacity>
              {images.length ? <ScrollView horizontal contentContainerStyle={{ gap: 8, paddingTop: 10 }}>{images.map((image) => <Image key={image.uri} source={{ uri: image.uri }} style={styles.imagePreview} />)}</ScrollView> : null}
            </View>

            {/* Submit Action */}
            <View style={styles.submitSection}>
              <Button
                title={isSubmitting ? 'Publishing...' : 'Publish to Community Feed'}
                variant="primary"
                size="md"
                onPress={handleSubmit}
                disabled={isSubmitting}
                style={styles.submitBtn}
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    maxHeight: '88%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: Typography.title3,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeSelectorRow: {
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: 12,
    gap: 8,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  typeChipText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
  },
  formContainer: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 8,
    paddingBottom: 32,
  },
  pdfSection: { marginBottom: 8 },
  pdfPicker: { minHeight: 68, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, backgroundColor: Colors.surfaceElevated, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 12, marginBottom: 14 },
  pdfPickerTitle: { color: Colors.textPrimary, fontSize: 13, fontWeight: Typography.semiBold },
  pdfPickerMeta: { color: Colors.textMuted, fontSize: 10, marginTop: 3 },
  twoColRow: {
    flexDirection: 'row',
  },
  fieldSection: {
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  rolesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  submitSection: {
    marginTop: 12,
  },
  submitBtn: {
    width: '100%',
  },
  imagePicker: { minHeight: 44, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  imagePickerText: { color: Colors.textPrimary, fontSize: 13, fontWeight: '700' },
  imagePreview: { width: 72, height: 72, borderRadius: 9 },
});
