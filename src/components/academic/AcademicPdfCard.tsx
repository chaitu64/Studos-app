import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AcademicPdf, AcademicPdfCategory } from '../../types';

const CATEGORY_LABELS: Record<AcademicPdfCategory, string> = {
  important_questions: 'Important questions',
  previous_question_paper: 'Previous paper',
  lecture_notes: 'Lecture notes',
  unit_notes: 'Unit-wise notes',
  study_materials: 'Study material',
  assignment: 'Assignment',
  laboratory_manual: 'Lab manual',
  practical_record: 'Practical record',
  syllabus: 'Syllabus',
  model_question_paper: 'Model paper',
  reference_material: 'Reference',
  other: 'Academic resource',
};

export function academicPdfCategoryLabel(category: AcademicPdfCategory) {
  return CATEGORY_LABELS[category] || 'Academic resource';
}

function formatFileSize(bytes: number | null) {
  if (!bytes || bytes <= 0) return null;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type Props = { pdf: AcademicPdf; onPress: () => void };

export const AcademicPdfCard = React.memo(function AcademicPdfCard({ pdf, onPress }: Props) {
  const size = formatFileSize(pdf.file_size);
  return (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Open ${pdf.title}`} onPress={onPress} activeOpacity={0.88} style={styles.card}>
      <View style={styles.preview}>
        {pdf.preview_url
          ? <Image source={{ uri: pdf.preview_url }} style={styles.image} resizeMode="cover" />
          : <View style={styles.previewFallback}><Ionicons name="document-text-outline" size={38} color="#FF817A" /><Text style={styles.fallbackText}>Preview unavailable</Text></View>}
        <View style={styles.pdfBadge}><Ionicons name="document-text" size={13} color="#FFF" /><Text style={styles.pdfBadgeText}>PDF</Text></View>
        <View style={styles.categoryBadge}><Text style={styles.categoryText}>{academicPdfCategoryLabel(pdf.category)}</Text></View>
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>{pdf.original_file_name || pdf.title}</Text>
        <Text style={styles.subject} numberOfLines={1}>{pdf.subject_name || 'Subject not identified'}{pdf.subject_code ? ` · ${pdf.subject_code}` : ''}</Text>
        <Text style={styles.academic}>{pdf.academic_year ? `Year ${pdf.academic_year}` : 'Year not identified'}{pdf.semester ? ` · Semester ${pdf.semester}` : ''}{pdf.degree ? ` · ${pdf.degree}` : ''}</Text>
        {pdf.college || pdf.regulation ? <Text style={styles.academic} numberOfLines={1}>{[pdf.college, pdf.regulation].filter(Boolean).join(' · ')}</Text> : null}
        <Text style={styles.description} numberOfLines={3}>{pdf.description}</Text>
        <View style={styles.footer}>
          <Text style={styles.fileMeta}>{[size, pdf.page_count ? `${pdf.page_count} pages` : null, 'VVIT verified'].filter(Boolean).join(' · ')}</Text>
          <View style={styles.open}><Text style={styles.openText}>Open PDF</Text><Ionicons name="arrow-forward" size={15} color="#FFF" /></View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: { backgroundColor: '#121624', borderRadius: 18, borderWidth: 1, borderColor: '#252C3D', overflow: 'hidden', marginBottom: 14 },
  preview: { height: 205, backgroundColor: '#0D1018', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  image: { width: '100%', height: '100%', backgroundColor: '#E8E9EC' },
  previewFallback: { alignItems: 'center', gap: 8 }, fallbackText: { color: '#858D9E', fontSize: 11 },
  pdfBadge: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#E5433B', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6 },
  pdfBadgeText: { color: '#FFF', fontWeight: '800', fontSize: 10 },
  categoryBadge: { position: 'absolute', right: 12, bottom: 12, backgroundColor: '#090B0FDD', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  categoryText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  body: { padding: 15 }, title: { color: '#FFF', fontSize: 17, lineHeight: 23, fontWeight: '800' },
  subject: { color: '#FF8C86', fontSize: 12, fontWeight: '700', marginTop: 7 }, academic: { color: '#A5ACBA', fontSize: 11, marginTop: 4 },
  description: { color: '#C4C9D4', fontSize: 12, lineHeight: 18, marginTop: 10 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#252C3D' },
  fileMeta: { color: '#858D9E', fontSize: 10 }, open: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#E5433B' }, openText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
});
