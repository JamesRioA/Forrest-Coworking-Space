import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, TouchableOpacity, Modal, Switch, ScrollView, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { THEME } from '../src/utils/theme';
import { supabase } from '../src/supabase';
import { Button } from '../src/components/Button';
import { Input } from '../src/components/Input';
import { calculateTotalBilled, BillingInput } from '../src/utils/billingMath';

export default function AdminScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);
  const [brownoutMode, setBrownoutMode] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<'roster' | 'members'>('roster');

  // Member Management State
  const [searchQuery, setSearchQuery] = useState('');
  const [memberResults, setMemberResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [upgradeDuration, setUpgradeDuration] = useState<number>(30); // days

  // Modals
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);
  const [isManualClockInOpen, setIsManualClockInOpen] = useState(false);

  // Manual Clockin State
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestZone, setGuestZone] = useState<'standard' | 'conference'>('standard');
  const [guestTimeModel, setGuestTimeModel] = useState<'open' | 'fixed'>('open');

  useEffect(() => {
    checkAdminAuth();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      fetchSessions();

      const channel = supabase.channel('admin-sessions')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => {
          fetchSessions();
        })
        .subscribe();

      // We should also listen to profiles updates (e.g., if a new guest is added)
      const profilesChannel = supabase.channel('admin-profiles')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
          fetchSessions();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
        supabase.removeChannel(profilesChannel);
      };
    }
  }, [isLoading]);

  async function checkAdminAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace('/login');
      return;
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('auth_user_id', user.id).single();
    if (profile?.role !== 'admin') {
      router.replace('/dashboard');
      return;
    }

    setIsLoading(false);
  }

  async function fetchSessions() {
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        *,
        profiles:profile_id ( full_name, contact_number, is_member ),
        fixed_blocks:fixed_block_id ( duration_hours, price )
      `)
      .in('status', ['pending', 'active'])
      .order('start_time', { ascending: false });

    if (data) {
      // Pending always atop
      const sorted = [...data].sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (b.status === 'pending' && a.status !== 'pending') return 1;
        // If both active, sort by oldest first (closest to overtime)
        if (a.start_time && b.start_time) {
          return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
        }
        return 0;
      });
      setSessions(sorted);
    }
  }

  // Derived styling for traffic lights
  function getTrafficColor(session: any) {
    if (session.status === 'pending') return '#9E9E9E'; // Grey

    // Calculate elapsed and remaining
    const startTime = new Date(session.start_time).getTime();
    const now = new Date().getTime();
    const elapsedHrs = (now - startTime) / (1000 * 60 * 60);

    if (session.time_model === 'fixed' && session.fixed_blocks) {
      const remaining = session.fixed_blocks.duration_hours - elapsedHrs;
      if (remaining < 0) return THEME.colors.error; // Red (Overtime)
      if (remaining < 0.25) return THEME.colors.warning; // Yellow (< 15 mins)
      return THEME.colors.success; // Green
    } else {
      // Open Ended
      if (elapsedHrs > 24) return THEME.colors.error; // Red (Exceeds 24)
      return THEME.colors.success; // Green
    }
  }

  function handleSessionTap(session: any) {
    setSelectedSession(session);
    if (session.status === 'pending') {
      setIsPendingModalOpen(true);
    } else {
      setIsCheckoutModalOpen(true);
    }
  }

  async function authorizePending() {
    if (!selectedSession) return;
    const { error } = await supabase
      .from('sessions')
      .update({ status: 'active', start_time: new Date().toISOString() })
      .eq('id', selectedSession.id);

    if (!error) setIsPendingModalOpen(false);
  }

  async function processCheckout() {
    if (!selectedSession) return;

    const startTime = new Date(selectedSession.start_time).getTime();
    const now = new Date().getTime();
    const elapsedHrs = (now - startTime) / (1000 * 60 * 60);
    // Math ceil logic for increments? The spec didn't strictly say ceil, assuming strict floating point math or rounded to nearest minute/hour.
    // For typical operation, we pass exact decimal or Math.ceil(elapsed * 4) / 4 etc. Let's pass the raw exact float as specified.

    const billingParams: BillingInput = {
      zone: selectedSession.zone,
      timeModel: selectedSession.time_model,
      isMember: selectedSession.profiles.is_member,
      hoursStayed: elapsedHrs,
      fixedBlockHours: selectedSession.fixed_blocks?.duration_hours,
      fixedBlockPrice: selectedSession.fixed_blocks?.price,
      brownoutApplied: brownoutMode
    };

    const total = calculateTotalBilled(billingParams);

    const { error } = await supabase.from('sessions').update({
      status: 'completed',
      end_time: new Date().toISOString(),
      total_billed: total,
      brownout_applied: brownoutMode
    }).eq('id', selectedSession.id);

    if (!error) setIsCheckoutModalOpen(false);
  }

  async function handleManualClockIn() {
    if (!guestName || !guestPhone) {
      Alert.alert('Required', 'Name and phone are required for guests.');
      return;
    }

    const { data: profileError } = await supabase.from('profiles').insert({
      auth_user_id: null,
      full_name: guestName,
      contact_number: guestPhone,
      address: 'N/A', // By default for manual guests
      is_guest: true,
      is_member: false
    }).select().single();

    if (!profileError) return;

    // Insert session for guest instantly active
    await supabase.from('sessions').insert({
      profile_id: profileError.id,
      zone: guestZone,
      time_model: guestTimeModel,
      status: 'active',
      start_time: new Date().toISOString()
    });

    setIsManualClockInOpen(false);
    setGuestName('');
    setGuestPhone('');
  }

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Terminal</Text>
        <View style={styles.headerActions}>
          <Text style={styles.subtitle}>Brownout Surcharge:</Text>
          <Switch value={brownoutMode} onValueChange={setBrownoutMode} trackColor={{ true: THEME.colors.warning }} />
        </View>
      </View>

      <View style={styles.row}>
        <Button label="+ Manual Clock In" onPress={() => setIsManualClockInOpen(true)} style={{ width: 220 }} />
      </View>

      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.sessionCard} onPress={() => handleSessionTap(item)} activeOpacity={0.8}>
            <View style={[styles.trafficLight, { backgroundColor: getTrafficColor(item) }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.cardName}>{item.profiles?.full_name} {item.profiles?.is_member ? '⭐' : ''}</Text>
              <Text style={styles.cardDetail}>{item.zone.toUpperCase()} • {item.time_model.toUpperCase()}</Text>
              {item.status === 'pending' && <Text style={{ color: THEME.colors.warning, fontWeight: '700' }}>Awaiting Payment</Text>}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 40, color: THEME.colors.textMuted }}>No active or pending sessions.</Text>}
      />

      {/* PENDING CONFIRMATION MODAL */}
      <Modal visible={isPendingModalOpen} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm Payment</Text>
            <Text>Customer: {selectedSession?.profiles?.full_name}</Text>
            <Text>Zone: {selectedSession?.zone}</Text>
            <Text>Block: {selectedSession?.fixed_blocks?.duration_hours} hrs</Text>
            <Text style={styles.priceHighlight}>Amount to Collect: ₱{selectedSession?.fixed_blocks?.price}</Text>

            <Button label="Confirm & Start" onPress={authorizePending} style={{ marginTop: 20 }} />
            <Button label="Cancel" variant="outline" onPress={() => setIsPendingModalOpen(false)} />
          </View>
        </View>
      </Modal>

      {/* CHECKOUT MODAL */}
      <Modal visible={isCheckoutModalOpen} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Checkout Receipt</Text>
            <Text>Customer: {selectedSession?.profiles?.full_name}</Text>
            {brownoutMode && <Text style={{ color: THEME.colors.warning, fontWeight: 'bold' }}>⚠️ Brownout Surcharge Active (+₱10/hr)</Text>}

            <Button label="Mark as Paid & Close" onPress={processCheckout} style={{ marginTop: 20 }} />
            <Button label="Cancel" variant="outline" onPress={() => setIsCheckoutModalOpen(false)} />
          </View>
        </View>
      </Modal>

      {/* MANUAL CLOCK IN MODAL */}
      <Modal visible={isManualClockInOpen} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }}>
          <ScrollView contentContainerStyle={{ padding: THEME.spacing.xl }}>
            <Text style={styles.modalTitle}>Manual Guest Clock-In</Text>

            <Input label="Full Name" placeholder="Guest Name" value={guestName} onChangeText={setGuestName} />
            <Input label="Contact Number" placeholder="Phone" value={guestPhone} onChangeText={setGuestPhone} />

            <Text style={styles.sectionTitle}>Zone & Model</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
              <Button label="Standard" variant={guestZone === 'standard' ? 'primary' : 'outline'} onPress={() => setGuestZone('standard')} style={{ flex: 1 }} />
              <Button label="Conference" variant={guestZone === 'conference' ? 'primary' : 'outline'} onPress={() => setGuestZone('conference')} style={{ flex: 1 }} />
            </View>

            <Button label="Clock In & Start" onPress={handleManualClockIn} />
            <Button label="Cancel" variant="outline" onPress={() => setIsManualClockInOpen(false)} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  header: {
    padding: THEME.spacing.xl,
    paddingTop: THEME.spacing.xxl,
    backgroundColor: THEME.colors.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerActions: {
    alignItems: 'flex-end'
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: THEME.colors.background,
  },
  subtitle: {
    fontSize: 14,
    color: THEME.colors.accent,
  },
  row: {
    padding: THEME.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  list: {
    padding: THEME.spacing.md,
    gap: THEME.spacing.sm,
  },
  sessionCard: {
    flexDirection: 'row',
    padding: THEME.spacing.md,
    backgroundColor: '#fff',
    borderRadius: THEME.radius.sm,
    ...THEME.shadows.soft,
    alignItems: 'center',
  },
  trafficLight: {
    width: 16, height: 16, borderRadius: 8, marginRight: THEME.spacing.md,
  },
  cardName: {
    fontSize: 16, fontWeight: '700', color: THEME.colors.primary
  },
  cardDetail: {
    fontSize: 14, color: THEME.colors.textMuted, marginTop: 4,
  },
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: THEME.spacing.xl
  },
  modalContent: {
    backgroundColor: '#fff', width: '100%', borderRadius: THEME.radius.md, padding: THEME.spacing.xl,
  },
  modalTitle: {
    fontSize: 24, fontWeight: '700', color: THEME.colors.primary, marginBottom: THEME.spacing.md
  },
  sectionTitle: {
    fontSize: 18, fontWeight: '600', color: THEME.colors.primary, marginBottom: THEME.spacing.sm, marginTop: THEME.spacing.md,
  },
  priceHighlight: {
    fontSize: 18, color: THEME.colors.success, fontWeight: '700', marginTop: THEME.spacing.md, paddingVertical: 10,
  }
});
