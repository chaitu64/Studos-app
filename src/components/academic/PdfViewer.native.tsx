import React from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

type Props = { pdfUrl: string; onLoad: () => void; onError: () => void };

export default function PdfViewer({ pdfUrl, onLoad, onError }: Props) {
  const viewerUrl = `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(pdfUrl)}`;
  return (
    <View style={styles.root}>
      <WebView
        source={{ uri: viewerUrl }}
        style={styles.webview}
        originWhitelist={['https://*']}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        allowsBackForwardNavigationGestures={false}
        onLoadEnd={onLoad}
        onError={onError}
        onHttpError={(event) => { if (event.nativeEvent.statusCode >= 400) onError(); }}
        onShouldStartLoadWithRequest={(request) => request.url.startsWith('https://mozilla.github.io/pdf.js/')}
        accessibilityLabel="In-app PDF reader"
      />
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: '#252525' }, webview: { flex: 1, backgroundColor: '#252525' } });
