import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { THEME } from '../src/utils/theme';
import { Button } from '../src/components/Button';
import { supabase } from '../src/supabase';

type Zone = 'standard' | 'conference' | null;
type TimeModel = 'open' | 'fixed' | null;

export default function ScanScreen() {
  const router = useRouter();
  const { scanned } = useLocalSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  
  const [hasScanned, setHasScanned] = useState(false);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [zone, setZone] = useState<Zone>(null);
  const [timeModel, setTimeModel] = useState<TimeModel>(null);
  const [availableBlocks, setAvailableBlocks] = useState<any[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<number | null>(null);

  const isProfileMember = profile?.is_member && profile?.membership_expires_at && new Date(profile.membership_expires_at) > new Date();

  useEffect(() => {
    checkProfile();
    if (scanned === 'true') {
      setHasScanned(true);
    }
  }, [scanned]);

  useEffect(() => {
    if (zone && timeModel === 'fixed') {
      fetchBlocks();
    }
  }, [zone, timeModel]);

  async function fetchBlocks() {
    setIsLoading(true);
    const query = supabase.from('fixed_blocks').select('*').eq('zone', zone);
    
    // If not a member, hide member_only blocks
    if (!isProfileMember) {
       query.eq('member_only', false);
    }
    
    const { data } = await query;
    setAvailableBlocks(data || []);
    setIsLoading(false);
  }

  async function checkProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace('/login');
      return;
    }

    const { data: profileRecord, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();

    if (error || !profileRecord) {
      Alert.alert('Error', 'Unable to load profile data');
      setIsLoading(false);
      return;
    }

    if (!profileRecord.contact_number || !profileRecord.address) {
      router.replace('/onboarding');
      return;
    }

    // Check if user already has an active session
    const { data: sessionData } = await supabase
      .from('sessions')
      .select('id')
      .eq('profile_id', profileRecord.id)
      .in('status', ['active', 'pending'])
      .maybeSingle();

    if (sessionData) {
      router.replace('/dashboard');
      return;
    }

    setProfile(profileRecord);
    setIsLoading(false);
  }

  async function handleSubmit() {
    if (!zone || !timeModel) return;

    if (timeModel === 'fixed' && !selectedBlockId) {
      Alert.alert('Notice', 'Please select a duration block first.');
      return;
    }

    setIsLoading(true);
    
    if (timeModel === 'open') {
      const { error } = await supabase.from('sessions').insert({
        profile_id: profile.id,
        zone: zone,
        time_model: 'open',
        status: 'active',
        start_time: new Date().toISOString() // Start instantly for Open
      });

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        router.replace('/dashboard');
      }
    } else {
      const { error } = await supabase.from('sessions').insert({
        profile_id: profile.id,
        zone: zone,
        time_model: 'fixed',
        fixed_block_id: selectedBlockId,
        status: 'pending', // Requires receptionist to confirm payment
        start_time: null 
      });

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        router.replace('/dashboard');
      }
    }
    
    setIsLoading(false);
  }

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
      </View>
    );
  }

  if (!hasScanned) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: THEME.spacing.xl }]}>
        <View style={styles.scanTarget}>
          <Text style={{ fontSize: 40 }}>📸</Text>
        </View>
        <Text style={styles.title}>Scan QR Code</Text>
        <Text style={[styles.subtitle, { textAlign: 'center' }]}>
          Please scan the QR code located on your desk to begin your session.
        </Text>
        
        <View style={{ marginTop: THEME.spacing.xxl, width: '100%' }}>
          <Button 
            label="Simulate QR Scan (Local Dev)" 
            onPress={() => setHasScanned(true)} 
          />
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
       <View style={styles.header}>
        <Text style={styles.title}>Check In</Text>
        <Text style={styles.subtitle}>Select your preferred workspace</Text>
      </View>

      <Text style={styles.sectionTitle}>1. Choose Zone</Text>
      <View style={styles.cardContainer}>
        <Button 
          label="🟦 Standard Room" 
          variant={zone === 'standard' ? 'primary' : 'outline'}
          onPress={() => { setZone('standard'); setTimeModel(null); setSelectedBlockId(null); }}
          style={styles.card}
        />
        <Button 
          label="🟨 Conference Room (Premium)" 
          variant={zone === 'conference' ? 'primary' : 'outline'}
          onPress={() => { setZone('conference'); setTimeModel(null); setSelectedBlockId(null); }}
          style={styles.card}
        />
      </View>

      {zone && (
        <>
          <Text style={styles.sectionTitle}>2. Choose Time Model</Text>
          <View style={styles.cardContainer}>
            <Button 
              label="Open Ended (Pay later)" 
              variant={timeModel === 'open' ? 'primary' : 'outline'}
              onPress={() => { setTimeModel('open'); setSelectedBlockId(null); }}
              style={styles.card}
            />
            <Button 
              label="Fixed Block (Pay upfront)" 
              variant={timeModel === 'fixed' ? 'primary' : 'outline'}
              onPress={() => setTimeModel('fixed')}
              style={styles.card}
            />
          </View>
        </>
      )}

      {zone && timeModel === 'fixed' && availableBlocks.length > 0 && (
         <>
          <Text style={styles.sectionTitle}>3. Select Duration</Text>
          <View style={styles.cardContainer}>
             {availableBlocks.map(block => (
               <Button 
                key={block.id}
                label={`${block.duration_hours} Hours - ₱${block.price}`} 
                variant={selectedBlockId === block.id ? 'primary' : 'outline'}
                onPress={() => setSelectedBlockId(block.id)}
                style={styles.card}
              />
             ))}
          </View>
         </>
      )}

      {zone && timeModel && (timeModel === 'open' || selectedBlockId) && (
         <View style={{ marginTop: THEME.spacing.xl }}>
           <Button label={timeModel === 'open' ? "Start Timer" : "Request Authorization"} onPress={handleSubmit} />
         </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  scroll: {
    padding: THEME.spacing.xl,
    paddingTop: THEME.spacing.xxl,
  },
  scanTarget: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderColor: THEME.colors.primary,
    borderRadius: THEME.radius.lg,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: THEME.spacing.xl,
    backgroundColor: THEME.colors.primary + '10',
  },
  header: {
    marginBottom: THEME.spacing.xl,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  subtitle: {
    fontSize: 16,
    color: THEME.colors.textMuted,
    marginTop: THEME.spacing.xs,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: THEME.colors.primary,
    marginBottom: THEME.spacing.md,
    marginTop: THEME.spacing.lg,
  },
  cardContainer: {
    gap: THEME.spacing.sm,
  },
  card: {
    height: 80,
  }
});
