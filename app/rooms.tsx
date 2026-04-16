import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Dimensions, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { THEME } from '../src/utils/theme';
import { supabase } from '../src/supabase';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const STATIC_ROOMS = [
  {
    id: 'liferoom',
    title: 'Liferoom',
    description: 'where user can chill and have ambience where they can also sleep.',
    imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=600&auto=format&fit=crop', // Cozy seating / chill area
    basePriceMember: 30,
    basePriceNonMember: 35,
    rateType: 'hr',
  },
  {
    id: 'study',
    title: 'Study Room',
    description: 'customer have each their own space.',
    imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=600&auto=format&fit=crop', // Tables with partitions/individual spaces
    basePriceMember: 30,
    basePriceNonMember: 35,
    rateType: 'hr',
  },
  {
    id: 'conference',
    title: 'Conference Room',
    description: 'where the customer shares two big tables.',
    imageUrl: 'https://images.unsplash.com/photo-1573164713988-8665fc963095?q=80&w=600&auto=format&fit=crop', // Big table sharing
    basePriceMember: 30,
    basePriceNonMember: 35,
    rateType: 'hr',
  },
  {
    id: 'exclusive',
    title: 'Exclusive Conference Room',
    description: 'Great for those who want to do exclusive meeting.',
    imageUrl: 'https://images.unsplash.com/photo-1505409859467-3a796fd5798e?q=80&w=600&auto=format&fit=crop', // Premium meeting room
    basePriceMember: null,
    basePriceNonMember: null,
    rateType: '12 / 24 hours',
  },
  {
    id: 'capsule',
    title: 'Capsule',
    description: 'Customer can sleep in for the night.',
    imageUrl: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?q=80&w=600&auto=format&fit=crop', // Capsule hotel / pod aesthetic
    basePriceMember: null,
    basePriceNonMember: null,
    rateType: 'Overnight',
  }
];

export default function RoomsScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      let { data: profile } = await supabase.from('profiles').select('*').eq('auth_user_id', user.id).single();
      if (profile) {
        setProfile(profile);
      }
    }
    setIsLoading(false);
  }

  const isMember = profile?.is_member && profile?.membership_expires_at && new Date(profile.membership_expires_at) > new Date();

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
         
        {/* TOP BAR */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Feather name="chevron-left" size={28} color={THEME.colors.primary} />
            <Text style={styles.backText}>Spaces</Text>
          </TouchableOpacity>
        </View>

        {/* HEADER SECTION */}
        <View style={styles.header}>
           <Text style={styles.browseText}>BROWSE</Text>
           <Text style={styles.titleText}>Explore Zones</Text>
           <Text style={styles.subtitleText}>Select your zone to check availability.</Text>
        </View>

        <View style={styles.content}>
           {STATIC_ROOMS.map((room) => {
              const currentPrice = isMember && room.basePriceMember !== null ? room.basePriceMember : room.basePriceNonMember;
              
              return (
                 <TouchableOpacity 
                   key={room.id} 
                   style={styles.roomCard}
                   onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                 >
                    <View style={styles.imageContainer}>
                       <Image source={{ uri: room.imageUrl }} style={styles.roomImage} />
                    </View>
                    
                    <View style={styles.cardContent}>
                       <View style={styles.cardTopRow}>
                          <Text style={styles.roomTitle}>{room.title}</Text>
                          {currentPrice ? (
                            <Text style={styles.roomPrice}>
                               ₱{currentPrice}<Text style={styles.roomPriceType}>/{room.rateType}</Text>
                            </Text>
                          ) : (
                            <Text style={[styles.roomPrice, { fontSize: 13, color: THEME.colors.textMuted }]}>
                               {room.rateType}
                            </Text>
                          )}
                       </View>
                       
                       <View style={styles.cardBottomRow}>
                          <Feather name="users" size={14} color={THEME.colors.textMuted} />
                          <Text style={styles.roomDesc} numberOfLines={2}>
                             {room.description}
                          </Text>
                       </View>
                    </View>
                 </TouchableOpacity>
              );
           })}
        </View>
      </ScrollView>

      {/* CUSTOM BOTTOM NAVIGATION */}
      <View style={styles.bottomNavContainer}>
        <View style={styles.bottomNavContent}>
           <TouchableOpacity style={styles.navItem} onPress={() => router.replace('/dashboard')}>
              <Feather name="home" size={24} color={THEME.colors.textMuted} style={{ opacity: 0.5 }} />
           </TouchableOpacity>
           <TouchableOpacity style={styles.navItem}>
              <Feather name="map" size={24} color={THEME.colors.primary} />
              <View style={styles.navIndicator} />
           </TouchableOpacity>
           
           <View style={styles.fabWrapper}>
              <TouchableOpacity style={styles.fabInner} onPress={() => {}}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  header: {
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.md,
    paddingBottom: THEME.spacing.md,
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
  browseText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8CA095',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  titleText: {
    fontSize: 36,
    fontWeight: '400',
    color: THEME.colors.primary,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', web: 'Georgia, serif' }),
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 15,
    color: THEME.colors.textMuted,
  },
  content: {
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.md,
  },
  roomCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 20,
    ...THEME.shadows.medium,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 180,
  },
  roomImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F1EC',
  },
  badgeContainer: {
    position: 'absolute',
    bottom: 12,
    left: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    ...THEME.shadows.soft, // Ensure the badge pops over the image
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardContent: {
    padding: 20,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  roomTitle: {
    fontSize: 20,
    fontWeight: '400',
    color: THEME.colors.primary,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', web: 'Georgia, serif' }),
    flex: 1,
  },
  roomPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.colors.primary,
    marginLeft: 12,
  },
  roomPriceType: {
    fontSize: 13,
    fontWeight: '500',
    color: THEME.colors.textMuted,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  roomDesc: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
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
});
