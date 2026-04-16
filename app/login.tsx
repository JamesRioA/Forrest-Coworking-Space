import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { THEME } from '../src/utils/theme';
import { Input } from '../src/components/Input';
import { Button } from '../src/components/Button';
import { supabase } from '../src/supabase';
import AntDesign from '@expo/vector-icons/AntDesign';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

// Ensure the browser session is properly cleared to avoid hanging states on mobile
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin() {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setIsLoading(false);
    if (error) {
      Alert.alert('Login Failed', error.message);
    } else {
      router.replace('/scan');
    }
  }

  async function handleGoogleAuth() {
    setIsLoading(true);
    
    // Use an expo-managed deep link URI instead of a hardcoded localhost
    const redirectUrl = Linking.createURL('/dashboard'); 

    if (Platform.OS === 'web') {
       const { error } = await supabase.auth.signInWithOAuth({ 
          provider: 'google',
          options: {
            redirectTo: window.location.origin,
          }
       });
       if (error) Alert.alert('Google Auth Failed', error.message);
    } else {
       const { data, error } = await supabase.auth.signInWithOAuth({ 
         provider: 'google',
         options: {
           redirectTo: redirectUrl,
           skipBrowserRedirect: true // Let expo-web-browser handle this
         }
       });
       
       if (error) {
          Alert.alert('Google Auth Failed', error.message);
       } else if (data?.url) {
          try {
             // Open the secure browser modal on the phone
             const res = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
             
             if (res.type === 'success' && res.url) {
                // Manually parse fragment because RN URL parsing is finicky with hashes
                const urlObj = res.url;
                const hashString = urlObj.includes('#') ? urlObj.substring(urlObj.indexOf('#') + 1) : null;
                
                if (hashString) {
                    const params = hashString.split('&').reduce((acc, current) => {
                        const [key, value] = current.split('=');
                        acc[key] = decodeURIComponent(value);
                        return acc;
                    }, {} as Record<string, string>);
                    
                    if (params.access_token && params.refresh_token) {
                        await supabase.auth.setSession({
                            access_token: params.access_token,
                            refresh_token: params.refresh_token
                        });
                        router.replace('/dashboard');
                    }
                }
             }
          } catch (e) {
             console.log(e);
             Alert.alert('Browser Flow Cancelled');
          }
       }
    }
    
    setIsLoading(false);
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Image 
            source={require('../assets/forrest-logo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Check in to Forrest Co-Working</Text>
        </View>

        <View style={styles.form}>
          <Input 
            label="Email Address" 
            placeholder="name@example.com" 
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Input 
            label="Password" 
            placeholder="Password" 
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <Text style={styles.forgotPassword} onPress={() => Alert.alert('Notice', 'Forgot password flow will be implemented soon.')}>
            Forgot Password?
          </Text>

          <View style={styles.actionGap} />

          <Button 
            label="Sign In" 
            onPress={handleLogin} 
            isLoading={isLoading} 
          />
          <Button 
            label="Continue with Google" 
            variant="outline" 
            leftIcon={<AntDesign name="google" size={20} color={THEME.colors.primary} />}
            onPress={handleGoogleAuth} 
          />
          
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Text style={styles.link} onPress={() => router.push('/signup')}>Sign Up</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: THEME.spacing.xl,
  },
  header: {
    marginBottom: THEME.spacing.xxl,
    alignItems: 'center', // Center logo visually
  },
  logo: {
    width: 200,
    height: 80,
    marginBottom: THEME.spacing.md,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: THEME.colors.primary,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginBottom: THEME.spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: THEME.colors.textMuted,
  },
  form: {
    width: '100%',
  },
  forgotPassword: {
    color: THEME.colors.primary,
    fontWeight: '600',
    fontSize: 14,
    textDecorationLine: 'underline',
    alignSelf: 'flex-start',
    marginTop: -THEME.spacing.sm,
  },
  actionGap: {
    height: THEME.spacing.xl,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: THEME.spacing.xl,
  },
  footerText: {
    color: THEME.colors.textMuted,
    fontSize: 14,
  },
  link: {
    color: THEME.colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
});
