import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { THEME } from '../src/utils/theme';
import { Input } from '../src/components/Input';
import { Button } from '../src/components/Button';
import { supabase } from '../src/supabase';

export default function SignupScreen() {
  const router = useRouter();
  
  // Registration Data
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  
  // OTP Flow
  const [isOtpPending, setIsOtpPending] = useState(false);
  const [otpToken, setOtpToken] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignUp() {
    if (!email || !password || !fullName || !mobileNumber || !address) {
      Alert.alert('Missing Fields', 'Please fill out all required fields.');
      return;
    }

    setIsLoading(true);
    // User metadata will be picked up by the Supabase TRIGGER `handle_new_user` we created,
    // though the trigger currently only maps full_name explicitly. Wait, our trigger was updated. 
    // We should pass everything here so the DB has it, but auth.users only holds metadata. 
    // So we'll run an RPC or wait for the trigger and then update the profile immediately after if needed.
    // Actually, passing them all into raw_user_meta_data allows the trigger to handle it.
    
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          // The trigger we wrote in Phase 1 currently maps handle_new_user but it ignores contact_number and address in metadata.
          // Wait, we need to update the trigger to map them, or just do a manual update post-verification.
        }
      }
    });
    
    setIsLoading(false);
    
    if (error) {
      Alert.alert('Sign Up Failed', error.message);
    } else {
      setIsOtpPending(true);
      Alert.alert('Check your Email', 'We have sent an OTP code to your email address.');
    }
  }

  async function handleVerifyOtp() {
    setIsLoading(true);
    const { error, data } = await supabase.auth.verifyOtp({
      email,
      token: otpToken,
      type: 'email',
    });
    
    if (error) {
      setIsLoading(false);
      Alert.alert('Verification Failed', error.message);
      return;
    }

    // Now update the created profile with missing info (since the trigger left address and contact empty)
    await supabase.from('profiles').update({
      contact_number: mobileNumber,
      address: address
    }).eq('auth_user_id', data.user?.id);
    
    setIsLoading(false);
    router.replace('/scan');
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>{isOtpPending ? 'Verify Email' : 'Create Account'}</Text>
          <Text style={styles.subtitle}>
            {isOtpPending ? `Enter the OTP sent to ${email}` : 'Join Forrest Co-Working'}
          </Text>
        </View>

        {!isOtpPending ? (
          <View style={styles.form}>
            <Input 
              label="Full Name" 
              placeholder="John Doe" 
              value={fullName}
              onChangeText={setFullName}
            />
            <Input 
              label="Email Address" 
              placeholder="name@example.com" 
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
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
            <Input 
              label="Password" 
              placeholder="Secure Password" 
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <View style={styles.actionGap} />

            <Button 
              label="Create Account" 
              onPress={handleSignUp} 
              isLoading={isLoading} 
            />
            
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <Text style={styles.link} onPress={() => router.back()}>Sign In</Text>
            </View>
          </View>
        ) : (
          <View style={styles.form}>
             <Input 
              label="OTP Code" 
              placeholder="123456" 
              value={otpToken}
              onChangeText={setOtpToken}
              keyboardType="number-pad"
            />
             <Button 
              label="Verify & Check In" 
              onPress={handleVerifyOtp} 
              isLoading={isLoading} 
            />
             <Button 
              label="Cancel" 
              variant="outline"
              onPress={() => setIsOtpPending(false)} 
              disabled={isLoading}
            />
          </View>
        )}
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
    justifyContent: 'center'
  },
  header: {
    marginBottom: THEME.spacing.xl,
    marginTop: THEME.spacing.xxl,
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: THEME.spacing.xl,
    paddingBottom: THEME.spacing.xxl,
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
