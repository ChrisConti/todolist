import React, { useContext, useEffect, useState } from 'react';
import { View, Button, StyleSheet, TouchableOpacity, Text, SafeAreaView } from 'react-native';
import { WebView } from 'react-native-webview';

const PP = () => {
  const [showWebView, setShowWebView] = useState(true);

  return (
        <SafeAreaView style={{ flex: 1 }}>
        <WebView source={{ uri: "https://tribubaby.com/about/terms-of-use" }} />
      </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webview: {
    flex: 1,
  },
});

export default PP;

