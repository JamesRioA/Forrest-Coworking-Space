import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { THEME } from '../src/utils/theme';
import { supabase } from '../src/supabase';
import { Feather } from '@expo/vector-icons';
import { Input } from '../src/components/Input';
import { Button } from '../src/components/Button';
import * as Haptics from 'expo-haptics';

export default function ProfileEditScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [fullName, setFullName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [address, setAddress] = useState('');
  const [authUserId, setAuthUserId] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace('/login');
      return;
    }
    setAuthUserId(user.id);

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (profile) {
      setFullName(profile.full_name || user.user_metadata?.full_name || user.user_metadata?.name || '');
      setContactNumber(profile.contact_number || '');
      setAddress(profile.address || '');
    } else {
      // Fallback for new users who haven't had a profile entry yet
      setFullName(user.user_metadata?.full_name || user.user_metadata?.name || '');
    }
    setIsLoading(false);
  }

  async function handleSave() {
    if (!fullName.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        contact_number: contactNumber.trim(),
        address: address.trim()
      })
      .eq('auth_user_id', authUserId);

    setIsSaving(false);

    if (error) {
       Alert.alert('Update Failed', error.message);
    } else {
       Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
       Alert.alert('Success', 'Profile updated successfully!', [
         { text: 'OK', onPress: () => router.back() }
       ]);
    }
  }

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* HEADER */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Feather name="chevron-left" size={28} color={THEME.colors.primary} />
            <Text style={styles.backText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={{ width: 80 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.formContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Basic Information</Text>
              <Text style={styles.sectionSubtitle}>These details help us manage your stay.</Text>
            </View>

            <Input 
              label="Full Name" 
              placeholder="John Doe" 
              value={fullName}
              onChangeText={setFullName}
            />

            <Input 
              label="Contact Number" 
              placeholder="0917 123 4567" 
              value={contactNumber}
              onChangeText={setContactNumber}
              keyboardType="phone-pad"
            />

            <Input 
              label="Home Address" 
              placeholder="123 Street, City" 
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={3}
            />

            <View style={{ marginTop: THEME.spacing.xxl }}>
              <Button 
                label="Save Changes" 
                onPress={handleSave} 
                isLoading={isSaving}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.md,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 80,
  },
  backText: {
    fontSize: 16,
    color: THEME.colors.primary,
    marginLeft: -4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.primary,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', web: 'Georgia, serif' }),
  },
  scrollContent: {
    paddingBottom: THEME.spacing.xl,
  },
  formContainer: {
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.lg,
  },
  sectionHeader: {
    marginBottom: THEME.spacing.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.colors.primary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: THEME.colors.textMuted,
  },
});
