import React from 'react';
import type { CSSProperties } from 'react';
import { StyleSheet, View } from 'react-native';

type Props = { pdfUrl: string; onLoad: () => void; onError: () => void };

export default function PdfViewer({ pdfUrl, onLoad, onError }: Props) {
  const viewerUrl = `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(pdfUrl)}`;
  return (
    <View style={styles.root}>
      <iframe
        title="In-app PDF reader"
        src={viewerUrl}
        onLoad={onLoad}
        onError={onError}
        style={frameStyle}
        referrerPolicy="no-referrer"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 500, backgroundColor: '#252525', overflow: 'hidden', borderRadius: 12 },
});

const frameStyle: CSSProperties = { width: '100%', height: '100%', minHeight: 500, backgroundColor: '#252525', border: 'none' };
