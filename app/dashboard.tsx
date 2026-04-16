import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, Image, TouchableOpacity, ScrollView, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { THEME } from '../src/utils/theme';
import { supabase } from '../src/supabase';
import { Button } from '../src/components/Button';

import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

function formatTimer(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function DashboardScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [authUser, setAuthUser] = useState<any>(null);
  


  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    checkActiveSession();

    const channelName = `customer-session-${Date.now()}`;
    const channel = supabase.channel(channelName)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sessions' }, (payload) => {
        if (activeSession && payload.new.id === activeSession.id) {
          setActiveSession({ ...activeSession, ...payload.new });
          if (payload.new.status === 'completed') {
            setActiveSession(null);
            Alert.alert('Checked Out', 'Your session has been completed.');
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeSession?.id]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeSession && activeSession.status === 'active' && activeSession.start_time) {
      interval = setInterval(() => {
        const start = new Date(activeSession.start_time).getTime();
        const now = new Date().getTime();
        
        if (activeSession.time_model === 'open') {
          // Count UP
          const diffInSeconds = Math.floor((now - start) / 1000);
          setElapsedSeconds(diffInSeconds > 0 ? diffInSeconds : 0);
        } else if (activeSession.time_model === 'fixed' && activeSession.fixed_blocks?.duration_hours) {
          const durationSeconds = activeSession.fixed_blocks.duration_hours * 3600;
          const diffInSeconds = Math.floor((now - start) / 1000);
          
          if (diffInSeconds <= durationSeconds) {
             // Count DOWN
             setElapsedSeconds(durationSeconds - diffInSeconds);
          } else {
             // OVERTIME: Count UP
             setElapsedSeconds(diffInSeconds - durationSeconds);
          }
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeSession]);

  async function checkActiveSession() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace('/login');
      return;
    }
    setAuthUser(user);

    let { data: profile } = await supabase.from('profiles').select('*').eq('auth_user_id', user.id).single();
    if (profile?.role === 'admin') {
      router.replace('/admin');
      return;
    }

    // New user with no profile or incomplete profile → onboarding
    if (!profile || !profile.contact_number || !profile.address) {
      router.replace('/onboarding');
      return;
    }

    if (profile) {
      // Sync Google data offensively so we don't block UI if database update fails
      const updates: any = {};
      if (!profile.avatar_url && user.user_metadata?.avatar_url) {
         profile.avatar_url = user.user_metadata.avatar_url;
         updates.avatar_url = profile.avatar_url;
      }
      if (!profile.full_name && (user.user_metadata?.full_name || user.user_metadata?.name)) {
         profile.full_name = user.user_metadata.full_name || user.user_metadata.name;
         updates.full_name = profile.full_name;
      }
      if (Object.keys(updates).length > 0) {
         // Fire and forget to not block rendering if RLS policy or network trips up
         supabase.from('profiles').update(updates).eq('id', profile.id).then();
      }
      
      setProfile(profile);

      const { data: session } = await supabase
        .from('sessions')
        .select(`*, fixed_blocks(duration_hours)`)
        .eq('profile_id', profile.id)
        .in('status', ['active', 'pending'])
        .single();
      
      if (session) {
         setActiveSession(session);
         // Initialize timer immediately
         if (session.start_time) {
            const start = new Date(session.start_time).getTime();
            const now = new Date().getTime();
            const diffInSeconds = Math.floor((now - start) / 1000);
            if (session.time_model === 'open') {
               setElapsedSeconds(diffInSeconds > 0 ? diffInSeconds : 0);
            } else if (session.time_model === 'fixed' && session.fixed_blocks?.duration_hours) {
               const durationSecs = session.fixed_blocks.duration_hours * 3600;
               if (diffInSeconds <= durationSecs) {
                 setElapsedSeconds(durationSecs - diffInSeconds);
               } else {
                 setElapsedSeconds(diffInSeconds - durationSecs);
               }
            }
         }
      }
    }
    setIsLoading(false);
  }

  function handleOpenScanner() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/scan');
  }

  function getGreeting() {
    const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Manila',
        hour: 'numeric',
        hourCycle: 'h23',
    };
    const hourString = new Intl.DateTimeFormat('en-US', options).format(new Date());
    const hour = parseInt(hourString, 10);
    
    if (hour < 12) return 'GOOD MORNING';
    if (hour === 12) return 'GOOD NOON';
    if (hour < 18) return 'GOOD AFTERNOON';
    return 'GOOD EVENING';
  }

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
      </View>
    );
  }

  const isOvertime = activeSession && activeSession.time_model === 'fixed' && activeSession.start_time && 
        (Math.floor((new Date().getTime() - new Date(activeSession.start_time).getTime()) / 1000) > (activeSession.fixed_blocks?.duration_hours * 3600));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
         
        {/* HEADER SECTION */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
             <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Image source={require('../assets/forrest-inapp.png')} style={{ width: 170, height: 48, marginLeft: -32 }} resizeMode="contain" />
             </View>
             <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity style={[styles.bellBtn, { marginRight: 12 }]} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
                   <Feather name="bell" size={20} color={THEME.colors.primary} />
                   <View style={styles.bellBadge} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
                   {profile?.avatar_url ? (
                      <Image source={{ uri: profile.avatar_url }} style={{ width: 40, height: 40, borderRadius: 20 }} />
                   ) : (
                      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F1EC', justifyContent: 'center', alignItems: 'center' }}>
                         <Feather name="user" size={20} color={THEME.colors.primary} />
                      </View>
                   )}
                </TouchableOpacity>
             </View>
          </View>
          
          <View style={{ marginTop: THEME.spacing.xl }}>
             <Text style={styles.greetingText}>{getGreeting()}</Text>
             <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <Text style={styles.userName}>{profile?.full_name || authUser?.user_metadata?.full_name || authUser?.user_metadata?.name || 'Guest'} 🌲</Text>
             </View>
          </View>
        </View>

        <View style={styles.content}>
           {/* ACTIVE SESSION CARD */}
           {activeSession ? (
             <View style={styles.activeCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                   <View>
                      <Text style={styles.cardLabel}>ACTIVE SESSION</Text>
                      <Text style={styles.cardSubText}>
                         {activeSession.zone === 'standard' ? 'Standard Seat' : 'Conference Room'} • A-04
                      </Text>
                   </View>
                   <View style={styles.liveIndicator}>
                      <View style={styles.liveDot} />
                      <Text style={styles.liveText}>{activeSession.status === 'pending' ? 'Pending' : 'Live'}</Text>
                   </View>
                </View>

                <View style={{ marginTop: 24, marginBottom: 24 }}>
                   <Text style={[styles.timerText, isOvertime && { color: THEME.colors.warning }]}>
                      {activeSession.status === 'active' ? formatTimer(elapsedSeconds) : '--:--:--'}
                   </Text>
                   {isOvertime && <Text style={{ color: THEME.colors.warning, fontSize: 12, marginTop: -8 }}>Overtime Tracking</Text>}
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                   <View>
                      <Text style={styles.cardLabel}>RUNNING TOTAL</Text>
                      <Text style={styles.priceText}>₱{activeSession.total_billed ? Number(activeSession.total_billed).toFixed(2) : '0.00'}</Text>
                   </View>
                   <TouchableOpacity style={styles.checkoutBtn} onPress={() => alert('Proceeding to Checkout')}>
                      <Text style={styles.checkoutBtnText}>Check Out</Text>
                      <Feather name="arrow-up-right" size={16} color="#fff" style={{ marginLeft: 4 }} />
                   </TouchableOpacity>
                </View>
             </View>
           ) : (
             <View style={styles.noSessionCard}>
                <Feather name="clock" size={32} color={THEME.colors.textMuted} style={{ marginBottom: 12 }} />
                <Text style={{ fontSize: 18, color: THEME.colors.primary, fontWeight: '600' }}>No Active Session</Text>
                <Text style={{ fontSize: 14, color: THEME.colors.textMuted, textAlign: 'center', marginTop: 4 }}>Scan a QR code at your desk or{'\n'}visit the front desk to start.</Text>
             </View>
           )}

           {/* QUICK ACCESS */}
           <Text style={styles.sectionHeader}>QUICK ACCESS</Text>
           <View style={styles.quickAccessRow}>
              {[ { icon: 'door', label: 'Rooms', action: () => router.push('/rooms') }, { icon: 'bed-outline', label: 'Capsule' }, { icon: 'qrcode-scan', label: 'Scan', action: handleOpenScanner }].map((item, idx) => (
                 <TouchableOpacity key={idx} style={styles.quickCard} onPress={item.action || (() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light))}>
                    <MaterialCommunityIcons name={item.icon as any} size={28} color={THEME.colors.primary} />
                    <Text style={styles.quickText}>{item.label}</Text>
                 </TouchableOpacity>
              ))}
           </View>

           {/* PROMOS */}
           <TouchableOpacity style={styles.promoCard}>
              <View style={[styles.promoBar, { backgroundColor: THEME.colors.primary }]} />
              <View style={{ flex: 1 }}>
                 <Text style={styles.promoTitle}>Night Owl Pass</Text>
                 <Text style={styles.promoDesc}>Unlimited access 8PM – 6AM</Text>
              </View>
              <View style={styles.promoPriceBadge}>
                 <Text style={styles.promoPriceText}>₱299</Text>
              </View>
           </TouchableOpacity>

           <TouchableOpacity style={[styles.promoCard, { marginTop: 12 }]}>
              <View style={[styles.promoBar, { backgroundColor: '#F2D3A1' }]} />
              <View style={{ flex: 1 }}>
                 <Text style={styles.promoTitle}>Member Discount</Text>
                 <Text style={styles.promoDesc}>Save 20% with Unlipass membership</Text>
              </View>
              <Feather name="arrow-up-right" size={20} color={THEME.colors.textMuted} />
           </TouchableOpacity>
        </View>
      </ScrollView>

      {/* CUSTOM BOTTOM NAVIGATION */}
      <View style={styles.bottomNavContainer}>
        <View style={styles.bottomNavContent}>
           <TouchableOpacity style={styles.navItem} onPress={() => {}}>
              <Feather name="home" size={24} color={THEME.colors.primary} />
              <View style={styles.navIndicator} />
           </TouchableOpacity>
           <TouchableOpacity style={styles.navItem} onPress={() => router.push('/rooms')}>
              <Feather name="map" size={24} color={THEME.colors.textMuted} style={{ opacity: 0.5 }} />
           </TouchableOpacity>
           
           <View style={styles.fabWrapper}>
              <TouchableOpacity style={styles.fabInner} onPress={handleOpenScanner}>
                 <Feather name="camera" size={24} color="#fff" />
              </TouchableOpacity>
           </View>
           
           <TouchableOpacity style={styles.navItem} onPress={() => {}}>
              <Feather name="target" size={24} color={THEME.colors.textMuted} style={{ opacity: 0.5 }} />
           </TouchableOpacity>
           <TouchableOpacity style={styles.navItem} onPress={() => router.push('/profile')}>
              {profile?.avatar_url ? (
                 <Image source={{ uri: profile.avatar_url }} style={styles.navAvatar} />
              ) : (
                 <Feather name="user" size={24} color={THEME.colors.textMuted} style={{ opacity: 0.5 }} />
              )}
           </TouchableOpacity>
        </View>
      </View>

    </SafeAreaView>
  );
}

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
    position: 'relative'
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
  greetingText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.primary,
    letterSpacing: 1.2,
  },
  userName: {
    fontSize: 28,
    fontWeight: '400',
    color: '#000000',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', web: 'Georgia, serif' }),
  },
  content: {
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.md,
  },
  activeCard: {
    backgroundColor: THEME.colors.primary,
    borderRadius: 16,
    padding: 24,
    ...THEME.shadows.medium,
  },
  noSessionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    ...THEME.shadows.soft,
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8CA095',
    letterSpacing: 1,
    marginBottom: 4,
  },
  cardSubText: {
    fontSize: 14,
    color: '#D1DBD5',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ADE80',
    marginRight: 6,
  },
  liveText: {
    fontSize: 12,
    color: '#4ADE80',
    fontWeight: '600',
  },
  timerText: {
    fontSize: 48,
    fontWeight: '300',
    color: '#ffffff',
    fontVariant: ['tabular-nums'],
  },
  priceText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
  },
  checkoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    alignItems: 'center',
  },
  checkoutBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8CA095',
    letterSpacing: 1.2,
    marginTop: 32,
    marginBottom: 16,
    marginHorizontal: 8,
  },
  quickAccessRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickCard: {
    backgroundColor: '#fff',
    width: (width - THEME.spacing.lg * 2 - 32) / 3,
    aspectRatio: 1,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    ...THEME.shadows.soft,
  },
  quickText: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '500',
    color: THEME.colors.primary,
  },
  promoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    ...THEME.shadows.soft,
  },
  promoBar: {
    width: 4,
    height: 32,
    borderRadius: 2,
    marginRight: 16,
  },
  promoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.colors.primary,
    marginBottom: 4,
  },
  promoDesc: {
    fontSize: 13,
    color: THEME.colors.textMuted,
  },
  promoPriceBadge: {
    backgroundColor: '#F3F1EC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  promoPriceText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  bottomNavContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...THEME.shadows.medium,
    paddingBottom: 24, // Safe area roughly
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
  navIndicator: {
    width: 24,
    height: 3,
    backgroundColor: THEME.colors.primary,
    borderRadius: 3,
    position: 'absolute',
    bottom: -10,
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
