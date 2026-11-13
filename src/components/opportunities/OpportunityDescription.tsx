import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Colors, Typography } from '../../constants/theme';

const SECTION_HEADINGS = new Set([
  'about the opportunity', 'eligibility', 'eligibility criteria', 'important dates',
  'benefits', 'prizes', 'benefits and prizes', 'requirements', 'how to apply',
  'additional information', 'overview',
]);
const URL_PATTERN = /(https?:\/\/[^\s)\]>]+)/gi;

function renderLinkedText(line: string, paragraphIndex: number) {
  const chunks = line.split(URL_PATTERN);
  return chunks.map((chunk, index) => {
    if (/^https?:\/\//i.test(chunk)) {
      const safeUrl = chunk.replace(/[.,;!?]+$/, '');
      const suffix = chunk.slice(safeUrl.length);
      return <Text key={`${paragraphIndex}-url-${index}`} style={styles.link} onPress={() => { void Linking.openURL(safeUrl).catch(() => undefined); }}>{safeUrl}{suffix}</Text>;
    }
    return <Text key={`${paragraphIndex}-text-${index}`}>{chunk}</Text>;
  });
}

export function OpportunityDescription({ description, title }: { description: string; title?: string }) {
  const blocks = (description || '').replace(/\r/g, '').split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  return (
    <View>
      {blocks.map((block, index) => {
        const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
        return lines.map((line, lineIndex) => {
          if (title && line.toLocaleLowerCase() === title.trim().toLocaleLowerCase()) return null;
          const headingText = line.replace(/:$/, '').trim();
          const isHeading = SECTION_HEADINGS.has(headingText.toLowerCase()) || (/^[A-Z][A-Z\s/&-]{3,}$/.test(headingText) && headingText.length < 70);
          if (index === 0 && lineIndex === 0 && isHeading && /^(about|overview)(\s|$)/i.test(headingText)) return null;
          const isListItem = /^(?:•|[-*])\s+/.test(line);
          const cleanLine = isListItem ? line.replace(/^(?:•|[-*])\s+/, '') : line;
          return (
            <Text key={`${index}-${lineIndex}`} style={[styles.paragraph, isHeading && styles.heading, isListItem && styles.listItem]}>
              {isListItem ? '• ' : null}{renderLinkedText(cleanLine, index * 100 + lineIndex)}
            </Text>
          );
        });
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  paragraph: { fontSize: Typography.body, color: Colors.textSecondary, lineHeight: 23, marginBottom: 10 },
  heading: { fontSize: 15, fontWeight: Typography.semiBold, color: Colors.textPrimary, marginTop: 8, marginBottom: 6 },
  listItem: { paddingLeft: 4 },
  link: { color: Colors.primary, textDecorationLine: 'underline' },
});
