import { Stack, useRouter, useSegments } from 'expo-router';
import { ThemeProvider, DefaultTheme } from '@react-navigation/native';
import { THEME } from '../src/utils/theme';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../src/supabase';
import { Session } from '@supabase/supabase-js';
import { View, Image, Animated, Easing, StyleSheet } from 'react-native';

const AppTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: THEME.colors.primary,
    background: THEME.colors.background,
    card: THEME.colors.background,
    text: THEME.colors.text,
    border: THEME.colors.border,
    notification: THEME.colors.accent,
  },
};

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [isResolved, setIsResolved] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const router = useRouter();

  useEffect(() => {
    // Elegant pulsing entrance animation for splash logo
    const animation = Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 1, duration: 800, useNativeDriver: false }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
          Animated.timing(scaleAnim, { toValue: 0.95, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: false })
        ])
      )
    ]);
    animation.start();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      // Give the splash screen a slight min-delay so the animation is fully visible briefly
      setTimeout(() => {
        setIsResolved(true);
      }, 1000);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      animation.stop();
      subscription.unsubscribe();
    };
  }, []);

  // Safe routing after the RootLayout is fully mounted (isResolved = true)
  const segments = useSegments();
  useEffect(() => {
    if (!isResolved) return;

    const inAuthGroup = segments[0] === 'login' || segments[0] === 'signup';
    const isRoot = !segments[0] || segments[0] === '(index)';

    if (!session && !inAuthGroup) {
      // Not signed in and trying to access a protected route
      router.replace('/login');
    } else if (session && (inAuthGroup || isRoot)) {
      // Signed in and trying to access auth screens OR just landed on root
      router.replace('/dashboard');
    }
  }, [session, isResolved, segments]);

  if (!isResolved) {
    return (
      <View style={[StyleSheet.absoluteFill, { backgroundColor: THEME.colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Animated.Image 
          source={require('../assets/forrest-logo.png')} 
          style={{ width: 140, height: 140, opacity: opacityAnim, transform: [{ scale: scaleAnim }] }} 
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <ThemeProvider value={AppTheme}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: THEME.colors.background },
          headerTintColor: THEME.colors.primary,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: THEME.colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: 'Login', headerShown: false }} />
        <Stack.Screen name="signup" options={{ title: 'Sign Up', headerShown: false }} />
        <Stack.Screen name="scan" options={{ title: 'Scan Check-In', headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ title: 'Complete Profile' }} />
        <Stack.Screen name="dashboard" options={{ title: 'Customer Dashboard', headerShown: false }} />
        <Stack.Screen name="admin" options={{ title: 'Admin Terminal', headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}
