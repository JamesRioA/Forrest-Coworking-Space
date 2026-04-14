import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { THEME } from '../src/utils/theme';
import { Input } from '../src/components/Input';
import { Button } from '../src/components/Button';
import { supabase } from '../src/supabase';

export default function OnboardingScreen() {
  const router = useRouter();
  const [mobileNumber, setMobileNumber] = useState('');
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Optionally fetch if they already partially have data
    supabase.auth.getUser().then(({ data }) => {
       if (data.user) {
         supabase.from('profiles').select('contact_number, address').eq('auth_user_id', data.user.id).single()
         .then(({ data: profile }) => {
            if (profile) {
               if (profile.contact_number) setMobileNumber(profile.contact_number);
               if (profile.address) setAddress(profile.address);
            }
         });
       }
    });
  }, []);

  async function handleComplete() {
    if (!mobileNumber || !address) {
      Alert.alert('Required', 'Please provide both mobile number and address to continue.');
      return;
    }
    
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setIsLoading(false);
      return;
    }

    const { error } = await supabase.from('profiles').update({
      contact_number: mobileNumber,
      address: address
    }).eq('auth_user_id', user.id);

    setIsLoading(false);

    if (error) {
      Alert.alert('Update Failed', error.message);
    } else {
      router.replace('/scan');
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome!</Text>
          <Text style={styles.subtitle}>We just need a few more details to complete your profile.</Text>
        </View>

        <View style={styles.form}>
          <Input 
            label="Mobile Number" 
            placeholder="09171234567" 
            value={mobileNumber}
            onChangeText={setMobileNumber}
            keyboardType="phone-pad"
          />
           <Input 
            label="Home Address" 
            placeholder="123 Street, City" 
            value={address}
            onChangeText={setAddress}
          />

          <View style={styles.actionGap} />

          <Button 
            label="Complete Profile" 
            onPress={handleComplete} 
            isLoading={isLoading} 
          />
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
    padding: THEME.spacing.xl,
    justifyContent: 'center',
  },
  header: {
    marginBottom: THEME.spacing.xxl,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: THEME.colors.primary,
    marginBottom: THEME.spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: THEME.colors.textMuted,
  },
  form: {
    width: '100%',
  },
  actionGap: {
    height: THEME.spacing.md,
  },
});
