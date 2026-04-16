import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator, Image, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { THEME } from '../src/utils/theme';
import { Button } from '../src/components/Button';
import { supabase } from '../src/supabase';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

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
      // No profile exists yet (new signup user) — send to onboarding
      router.replace('/onboarding');
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

  // Pre-scan state: QR scanner placeholder
  if (!hasScanned) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
           
          {/* HEADER with Forrest logo */}
          <View style={styles.header}>
             <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Image source={require('../assets/forrest-inapp.png')} style={{ width: 170, height: 48, marginLeft: -32 }} resizeMode="contain" />
                <TouchableOpacity style={styles.bellBtn} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
                   <Feather name="bell" size={20} color={THEME.colors.primary} />
                   <View style={styles.bellBadge} />
                </TouchableOpacity>
             </View>
          </View>

          {/* SCANNER VIEW */}
          <View style={styles.scannerSection}>
             <View style={styles.scannerCard}>
                {/* Corner brackets to simulate a scanner viewfinder */}
                <View style={styles.cornerTL} />
                <View style={styles.cornerTR} />
                <View style={styles.cornerBL} />
                <View style={styles.cornerBR} />

                <View style={styles.crosshair}>
                   <View style={[styles.crosshairLine, { width: 20, height: 1 }]} />
                   <View style={[styles.crosshairLine, { width: 1, height: 20, position: 'absolute' }]} />
                </View>
             </View>

             <Text style={styles.scanInstruction}>Point your camera at the{'\n'}QR code at the desk.</Text>
             
             <TouchableOpacity onPress={() => router.push('/support')}>
                <Text style={styles.troubleLink}>Having trouble?</Text>
             </TouchableOpacity>

             {/* Dev simulation button */}
             <View style={{ marginTop: 32, width: '100%', paddingHorizontal: THEME.spacing.lg }}>
               <Button 
                 label="Simulate QR Scan (Dev)" 
                 onPress={() => setHasScanned(true)} 
               />
             </View>
          </View>
        </ScrollView>

        {/* CUSTOM BOTTOM NAVIGATION */}
        <View style={styles.bottomNavContainer}>
          <View style={styles.bottomNavContent}>
             <TouchableOpacity style={styles.navItem} onPress={() => router.replace('/dashboard')}>
                <Feather name="home" size={24} color={THEME.colors.textMuted} style={{ opacity: 0.5 }} />
             </TouchableOpacity>
             <TouchableOpacity style={styles.navItem} onPress={() => router.replace('/rooms')}>
                <Feather name="map" size={24} color={THEME.colors.textMuted} style={{ opacity: 0.5 }} />
             </TouchableOpacity>
             
             <View style={styles.fabWrapper}>
                <TouchableOpacity style={styles.fabInner} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}>
                   <Feather name="camera" size={24} color="#fff" />
                </TouchableOpacity>
             </View>
             
             <TouchableOpacity style={styles.navItem} onPress={() => {}}>
                <Feather name="target" size={24} color={THEME.colors.textMuted} style={{ opacity: 0.5 }} />
             </TouchableOpacity>
             <TouchableOpacity style={styles.navItem} onPress={() => router.replace('/profile')}>
                {profile?.avatar_url ? (
                   <Image source={{ uri: profile.avatar_url }} style={[styles.navAvatar, { opacity: 0.5 }]} />
                ) : (
                   <Feather name="user" size={24} color={THEME.colors.textMuted} style={{ opacity: 0.5 }} />
                )}
             </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Post-scan state: Check-in flow
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
         
        {/* HEADER with Forrest logo */}
        <View style={styles.header}>
           <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Image source={require('../assets/forrest-inapp.png')} style={{ width: 170, height: 48, marginLeft: -32 }} resizeMode="contain" />
              <TouchableOpacity style={styles.bellBtn} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
                 <Feather name="bell" size={20} color={THEME.colors.primary} />
                 <View style={styles.bellBadge} />
              </TouchableOpacity>
           </View>
        </View>

        <View style={styles.content}>
           <View style={styles.checkinHeader}>
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

           {!!zone && (
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

           {!!zone && timeModel === 'fixed' && availableBlocks.length > 0 && (
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

           {!!zone && !!timeModel && (timeModel === 'open' || !!selectedBlockId) && (
              <View style={{ marginTop: THEME.spacing.xl }}>
                <Button label={timeModel === 'open' ? "Start Timer" : "Request Authorization"} onPress={handleSubmit} />
              </View>
           )}
        </View>
      </ScrollView>

      {/* CUSTOM BOTTOM NAVIGATION */}
      <View style={styles.bottomNavContainer}>
        <View style={styles.bottomNavContent}>
           <TouchableOpacity style={styles.navItem} onPress={() => router.replace('/dashboard')}>
              <Feather name="home" size={24} color={THEME.colors.textMuted} style={{ opacity: 0.5 }} />
           </TouchableOpacity>
           <TouchableOpacity style={styles.navItem} onPress={() => router.replace('/rooms')}>
              <Feather name="map" size={24} color={THEME.colors.textMuted} style={{ opacity: 0.5 }} />
           </TouchableOpacity>
           
           <View style={styles.fabWrapper}>
              <TouchableOpacity style={styles.fabInner} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}>
                 <Feather name="camera" size={24} color="#fff" />
              </TouchableOpacity>
           </View>
           
           <TouchableOpacity style={styles.navItem} onPress={() => {}}>
              <Feather name="target" size={24} color={THEME.colors.textMuted} style={{ opacity: 0.5 }} />
           </TouchableOpacity>
           <TouchableOpacity style={styles.navItem} onPress={() => router.replace('/profile')}>
              {profile?.avatar_url ? (
                 <Image source={{ uri: profile.avatar_url }} style={[styles.navAvatar, { opacity: 0.5 }]} />
              ) : (
                 <Feather name="user" size={24} color={THEME.colors.textMuted} style={{ opacity: 0.5 }} />
              )}
           </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const CORNER_SIZE = 32;
const CORNER_BORDER = 3;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  header: {
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.lg,
    paddingBottom: THEME.spacing.md,
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F1EC',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.error,
  },

  /* Scanner Section */
  scannerSection: {
    alignItems: 'center',
    paddingTop: THEME.spacing.xl,
  },
  scannerCard: {
    width: width - THEME.spacing.lg * 2 - 24,
    aspectRatio: 1.3,
    backgroundColor: '#fff',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    ...THEME.shadows.soft,
    marginBottom: 28,
  },
  crosshair: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  crosshairLine: {
    backgroundColor: THEME.colors.textMuted,
    opacity: 0.3,
  },
  
  /* Corner brackets */
  cornerTL: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderTopWidth: CORNER_BORDER,
    borderLeftWidth: CORNER_BORDER,
    borderColor: THEME.colors.primary,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderTopWidth: CORNER_BORDER,
    borderRightWidth: CORNER_BORDER,
    borderColor: THEME.colors.primary,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderBottomWidth: CORNER_BORDER,
    borderLeftWidth: CORNER_BORDER,
    borderColor: THEME.colors.primary,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderBottomWidth: CORNER_BORDER,
    borderRightWidth: CORNER_BORDER,
    borderColor: THEME.colors.primary,
    borderBottomRightRadius: 8,
  },

  scanInstruction: {
    fontSize: 16,
    color: THEME.colors.primary,
    textAlign: 'center',
    lineHeight: 24,
    fontStyle: 'italic',
  },
  troubleLink: {
    fontSize: 14,
    color: THEME.colors.textMuted,
    marginTop: 16,
    opacity: 0.6,
  },

  /* Check-in flow */
  content: {
    paddingHorizontal: THEME.spacing.lg,
  },
  checkinHeader: {
    marginBottom: THEME.spacing.xl,
  },
  title: {
    fontSize: 32,
    fontWeight: '400',
    color: THEME.colors.primary,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', web: 'Georgia, serif' }),
  },
  subtitle: {
    fontSize: 15,
    color: THEME.colors.textMuted,
    marginTop: THEME.spacing.xs,
  },
  sectionTitle: {
    fontSize: 16,
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
  },

  /* Bottom Nav */
  bottomNavContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...THEME.shadows.medium,
    paddingBottom: 24,
    paddingTop: 12,
  },
  bottomNavContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  navItem: {
    alignItems: 'center',
    padding: 8,
    position: 'relative',
  },
  navAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  fabWrapper: {
    top: -24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...THEME.shadows.medium,
  },
});
