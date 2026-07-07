import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
} from '@react-native-firebase/auth';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  useEffect(() => {
    const auth = getAuth();
    let isSigningIn = false;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user || isSigningIn) {
        return;
      }

      isSigningIn = true;
      signInAnonymously(auth)
        .catch((error: unknown) => {
          console.warn('Anonymous sign-in failed', error);
        })
        .finally(() => {
          isSigningIn = false;
        });
    });

    return unsubscribe;
  }, []);

  return (
    <View style={styles.container}>
      <Text>Open up App.tsx to start working on your app!</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
