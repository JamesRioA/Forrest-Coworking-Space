import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, ScrollView, Dimensions, Platform, Image, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { THEME } from '../src/utils/theme';
import { supabase } from '../src/supabase';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [authUser, setAuthUser] = useState<any>(null);
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);

  // Mock stats for now since we don't have aggregates set up, 
  // or we can try to fetch real stats if needed. I'll just use the UI design's numbers.
  // Wait, I should probably do a real query for total sessions if possible.
  const [stats, setStats] = useState({ total_sessions: 47, hours_logged: 126, member_since: "Jan '25" });

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace('/login');
      return;
    }
    setAuthUser(user);

    let { data: profile } = await supabase.from('profiles').select('*').eq('auth_user_id', user.id).single();
    if (profile) {
      setProfile(profile);
      
      // Calculate member since
      const date = new Date(profile.created_at || user.created_at);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const memberSinceStr = `${months[date.getMonth()]} '${date.getFullYear().toString().substring(2)}`;
      
      // Fetch actual stats - total sessions and hours
      const { data: sessions } = await supabase
        .from('sessions')
        .select('start_time, end_time, status')
        .eq('profile_id', profile.id)
        .eq('status', 'completed');
        
      let totalHours = 0;
      let totalSessions = 0;
      
      if (sessions && sessions.length > 0) {
        totalSessions = sessions.length;
        totalHours = sessions.reduce((acc, curr) => {
           if (curr.start_time && curr.end_time) {
              const start = new Date(curr.start_time).getTime();
              const end = new Date(curr.end_time).getTime();
              return acc + (end - start) / (1000 * 60 * 60);
           }
           return acc;
        }, 0);
      }

      setStats({
        total_sessions: totalSessions,
        hours_logged: Math.round(totalHours),
        member_since: memberSinceStr
      });
    }
    setIsLoading(false);
  }

  async function handleLogout() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLogoutModalVisible(true);
  }

  const confirmLogout = async () => {
    setIsLogoutModalVisible(false);
    await supabase.auth.signOut();
    router.replace('/login');
  };

  function getInitials(name: string) {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
      </View>
    );
  }

  // Derive display name: profile DB -> Google auth metadata -> fallback
  const displayName = profile?.full_name || authUser?.user_metadata?.full_name || authUser?.user_metadata?.name || 'Guest';

  // Real membership check using actual DB columns (same pattern as scan.tsx)
  const isMember = profile?.is_member && profile?.membership_expires_at && new Date(profile.membership_expires_at) > new Date();

  // Format membership expiry date for display
  function formatExpiryDate(dateStr: string): string {
    const date = new Date(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
         
        {/* TOP BAR */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Feather name="chevron-left" size={28} color={THEME.colors.primary} />
            <Text style={styles.backText}>Profile</Text>
          </TouchableOpacity>
        </View>

        {/* HEADER PROFILE INFO */}
        <View style={styles.header}>
            <View style={styles.avatarContainer}>
               {profile?.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
               ) : (
                  <View style={styles.avatarFallback}>
                     <Text style={styles.avatarInitials}>{getInitials(displayName)}</Text>
                  </View>
               )}
            </View>
            
            <Text style={styles.nameText}>{displayName}</Text>
            <Text style={styles.emailText}>{authUser?.email || ''}</Text>

            {isMember ? (
               <View style={styles.badgeContainer}>
                  <View style={styles.badgeDot} />
                  <Text style={styles.badgeText}>Member · Expires {formatExpiryDate(profile.membership_expires_at)}</Text>
               </View>
            ) : (
               <View style={[styles.badgeContainer, { backgroundColor: '#F3F1EC' }]}>
                  <Text style={[styles.badgeText, { color: THEME.colors.textMuted }]}>Not Member</Text>
               </View>
            )}
        </View>

        <View style={styles.content}>
           {/* STATS ROW */}
           <View style={styles.statsRow}>
              <View style={styles.statCard}>
                 <Text style={styles.statValue}>{stats.total_sessions}</Text>
                 <Text style={styles.statLabel}>TOTAL{'\n'}SESSIONS</Text>
              </View>
              <View style={styles.statCard}>
                 <Text style={styles.statValue}>{stats.hours_logged}</Text>
                 <Text style={styles.statLabel}>HOURS{'\n'}LOGGED</Text>
              </View>
              <View style={styles.statCard}>
                 <Text style={styles.statValue}>{stats.member_since}</Text>
                 <Text style={styles.statLabel}>MEMBER{'\n'}SINCE</Text>
              </View>
           </View>

           {/* MENU LIST */}
           <View style={styles.menuCard}>
              <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/profile-edit')}>
                 <View style={styles.menuItemLeft}>
                    <Feather name="edit" size={20} color={THEME.colors.textMuted} style={styles.menuIcon} />
                    <Text style={styles.menuItemText}>Edit Profile</Text>
                 </View>
                 <Feather name="chevron-right" size={20} color={THEME.colors.textMuted} />
              </TouchableOpacity>
              
              <View style={styles.divider} />
              
              <TouchableOpacity style={styles.menuItem}>
                 <View style={styles.menuItemLeft}>
                    <Feather name="clock" size={20} color={THEME.colors.textMuted} style={styles.menuIcon} />
                    <Text style={styles.menuItemText}>My Sessions</Text>
                 </View>
                 <Feather name="chevron-right" size={20} color={THEME.colors.textMuted} />
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity style={styles.menuItem}>
                 <View style={styles.menuItemLeft}>
                    <Feather name="bell" size={20} color={THEME.colors.textMuted} style={styles.menuIcon} />
                    <Text style={styles.menuItemText}>Notifications</Text>
                 </View>
                 <Feather name="chevron-right" size={20} color={THEME.colors.textMuted} />
              </TouchableOpacity>
              
              <View style={styles.divider} />

              <TouchableOpacity style={styles.menuItem}>
                 <View style={styles.menuItemLeft}>
                    <Feather name="help-circle" size={20} color={THEME.colors.textMuted} style={styles.menuIcon} />
                    <Text style={styles.menuItemText}>Help & Support</Text>
                 </View>
                 <Feather name="chevron-right" size={20} color={THEME.colors.textMuted} />
              </TouchableOpacity>
           </View>

           {/* LOGOUT BUTTON */}
           <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Feather name="log-out" size={20} color={THEME.colors.error} style={{ marginRight: 8 }} />
              <Text style={styles.logoutText}>Sign Out</Text>
           </TouchableOpacity>
        </View>
      </ScrollView>

      {/* CUSTOM BOTTOM NAVIGATION */}
      <View style={styles.bottomNavContainer}>
        <View style={styles.bottomNavContent}>
           <TouchableOpacity style={styles.navItem} onPress={() => router.push('/dashboard')}>
              <Feather name="home" size={24} color={THEME.colors.textMuted} style={{ opacity: 0.5 }} />
           </TouchableOpacity>
           <TouchableOpacity style={styles.navItem} onPress={() => {}}>
              <Feather name="map" size={24} color={THEME.colors.textMuted} style={{ opacity: 0.5 }} />
           </TouchableOpacity>
           
           <View style={styles.fabWrapper}>
              <TouchableOpacity style={styles.fabInner} onPress={() => router.push('/dashboard')}>
                 <Feather name="camera" size={24} color="#fff" />
              </TouchableOpacity>
           </View>
           
           <TouchableOpacity style={styles.navItem} onPress={() => {}}>
              <Feather name="target" size={24} color={THEME.colors.textMuted} style={{ opacity: 0.5 }} />
           </TouchableOpacity>
           <TouchableOpacity style={styles.navItem} onPress={() => {}}>
              {profile?.avatar_url ? (
                 <Image source={{ uri: profile.avatar_url }} style={styles.navAvatar} />
              ) : (
                 <Feather name="user" size={24} color={THEME.colors.primary} />
              )}
              <View style={styles.navIndicator} />
           </TouchableOpacity>
        </View>
      </View>
      {/* LOGOUT CONFIRMATION MODAL */}
      <Modal
        visible={isLogoutModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsLogoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
               <Feather name="log-out" size={32} color={THEME.colors.error} />
            </View>
            
            <Text style={styles.modalTitle}>Sign Out</Text>
            <Text style={styles.modalSubtitle}>Are you sure you want to leave?{'\n'}We'll be here when you get back!</Text>
            
            <View style={styles.modalButtons}>
               <TouchableOpacity 
                 style={[styles.modalButton, styles.cancelButton]} 
                 onPress={() => setIsLogoutModalVisible(false)}
               >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
               </TouchableOpacity>
               
               <TouchableOpacity 
                 style={[styles.modalButton, styles.confirmButton]} 
                 onPress={confirmLogout}
               >
                  <Text style={styles.confirmButtonText}>Sign Out</Text>
               </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: THEME.spacing.md,
    paddingTop: THEME.spacing.lg,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  backText: {
    fontSize: 18,
    fontWeight: '500',
    color: THEME.colors.primary,
    marginLeft: 4,
  },
  header: {
    alignItems: 'center',
    paddingTop: THEME.spacing.md,
    paddingBottom: THEME.spacing.lg,
  },
  avatarContainer: {
    marginBottom: THEME.spacing.md,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarFallback: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 28,
    color: '#fff',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', web: 'Georgia, serif' }),
  },
  nameText: {
    fontSize: 28,
    fontWeight: '400',
    color: '#000000',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', web: 'Georgia, serif' }),
    marginBottom: 4,
  },
  emailText: {
    fontSize: 14,
    color: THEME.colors.textMuted,
    marginBottom: 16,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ADE80',
    marginRight: 8,
  },
  badgeText: {
    color: '#2E7D32',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: THEME.spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: THEME.spacing.xl,
  },
  statCard: {
    backgroundColor: '#fff',
    width: (width - THEME.spacing.lg * 2 - 24) / 3,
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    ...THEME.shadows.soft,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8CA095',
    textAlign: 'center',
    letterSpacing: 1,
  },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 8,
    ...THEME.shadows.soft,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    marginRight: 16,
    width: 24,
    textAlign: 'center',
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: THEME.colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F1EC',
    marginHorizontal: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: THEME.spacing.xl,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  logoutText: {
    color: THEME.colors.error,
    fontSize: 15,
    fontWeight: '600',
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
  
  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    ...THEME.shadows.medium,
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: THEME.colors.primary,
    marginBottom: 12,
  },
  modalSubtitle: {
    fontSize: 15,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F1EC',
  },
  cancelButtonText: {
    color: THEME.colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: THEME.colors.error,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
