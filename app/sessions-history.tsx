import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { THEME } from '../src/utils/theme';
import { supabase } from '../src/supabase';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
interface Session {
  id: string;
  start_time: string;
  end_time: string;
  zone: string;
  total_billed: number;
  time_model: string;
}

export default function SessionsHistoryScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    fetchSessionHistory();
  }, []);

  async function fetchSessionHistory() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }

      // First get profile_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (profile) {
        const { data, error } = await supabase
          .from('sessions')
          .select('*')
          .eq('profile_id', profile.id)
          .eq('status', 'completed')
          .order('start_time', { ascending: false });

        if (error) throw error;
        setSessions(data || []);
      }
    } catch (error: any) {
      console.error('Error fetching sessions:', error.message);
    } finally {
      setIsLoading(false);
    }
  }

  function formatDate(date: Date, formatStr: string) {
    if (formatStr === 'MMM dd, yyyy') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[date.getMonth()]} ${date.getDate().toString().padStart(2, '0')}, ${date.getFullYear()}`;
    }
    if (formatStr === 'h:mm a') {
      let hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; 
      return `${hours}:${minutes} ${ampm}`;
    }
    return date.toLocaleDateString();
  }

  function formatDuration(start: string, end: string) {
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const durationMs = endTime - startTime;
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  const renderSessionItem = ({ item }: { item: Session }) => {
    const startDate = new Date(item.start_time);
    
    return (
      <View style={styles.sessionCard}>
        <View style={styles.cardHeader}>
          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>{formatDate(startDate, 'MMM dd, yyyy')}</Text>
            <Text style={styles.timeRangeText}>
              {formatDate(startDate, 'h:mm a')} - {formatDate(new Date(item.end_time), 'h:mm a')}
            </Text>
          </View>
          <View style={[styles.zoneBadge, { backgroundColor: item.zone === 'conference' ? '#E8F5E9' : '#FFF3E0' }]}>
            <Text style={[styles.zoneText, { color: item.zone === 'conference' ? '#2E7D32' : '#E65100' }]}>
              {item.zone.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardFooter}>
          <View style={styles.statDetail}>
            <Feather name="clock" size={14} color={THEME.colors.textMuted} />
            <Text style={styles.statText}>{formatDuration(item.start_time, item.end_time)}</Text>
          </View>
          
          <View style={styles.amountContainer}>
            <Text style={styles.amountLabel}>Total Billed</Text>
            <Text style={styles.amountValue}>₱{Number(item.total_billed || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Feather name="chevron-left" size={28} color={THEME.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Sessions</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={sessions}
          renderItem={renderSessionItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="history" size={64} color={THEME.colors.border} />
              <Text style={styles.emptyTitle}>No sessions yet</Text>
              <Text style={styles.emptySubtitle}>Your completed co-working sessions will appear here.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.md,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.colors.primary,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', web: 'Georgia, serif' }),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: THEME.spacing.lg,
    paddingBottom: THEME.spacing.xxl,
  },
  sessionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: THEME.radius.lg,
    padding: THEME.spacing.lg,
    marginBottom: THEME.spacing.md,
    ...THEME.shadows.soft,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dateContainer: {
    flex: 1,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.text,
    marginBottom: 4,
  },
  timeRangeText: {
    fontSize: 13,
    color: THEME.colors.textMuted,
  },
  zoneBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  zoneText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardDivider: {
    height: 1,
    backgroundColor: THEME.colors.border + '40', // Very light border
    marginVertical: THEME.spacing.md,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
    color: THEME.colors.text,
    fontWeight: '500',
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amountLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: THEME.colors.textMuted,
    textAlign: 'center',
  },
});
