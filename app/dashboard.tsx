import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { THEME } from '../src/utils/theme';
import { supabase } from '../src/supabase';
import { Button } from '../src/components/Button';
import { Camera, CameraView, useCameraPermissions } from 'expo-camera';

export default function DashboardScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<any>(null);
  
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    checkActiveSession();

    // Subscribe to realtime changes so we auto-flip if admin authorizes or completes
     const channel = supabase.channel('customer-session')
       .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sessions' }, (payload) => {
          if (activeSession && payload.new.id === activeSession.id) {
             setActiveSession(payload.new);
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

  async function checkActiveSession() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace('/login');
      return;
    }

    const { data: profile } = await supabase.from('profiles').select('id, role').eq('auth_user_id', user.id).single();
    if (profile?.role === 'admin') {
       router.replace('/admin');
       return;
    }

    if (profile) {
      const { data: session } = await supabase
        .from('sessions')
        .select('*')
        .eq('profile_id', profile.id)
        .in('status', ['active', 'pending'])
        .single();
      setActiveSession(session);
    }
    
    setIsLoading(false);
  }

  function handleOpenScanner() {
    if (!permission?.granted) {
      requestPermission();
    }
    setIsScannerOpen(true);
  }

  function handleBarcodeScanned({ data }: { data: string }) {
    setIsScannerOpen(false);
    // In production, this would validate the actual URL, but for now we follow the pattern
    if (data.includes('/scan')) {
      router.push('/scan?scanned=true');
    } else {
      Alert.alert('Invalid QR Code', 'Please scan the code at the front desk.');
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard</Text>
      </View>

      {activeSession ? (
        <View style={styles.content}>
           <Text style={styles.subtitle}>
             {activeSession.status === 'pending' 
                ? 'Waiting for Receptionist Authorization...' 
                : 'Active Timer Running'}
           </Text>
           {/* Timer implementation to come in Phase 5 */}
        </View>
      ) : (
        <View style={styles.content}>
          <Text style={styles.subtitle}>No Active Session</Text>
          <View style={{ marginTop: THEME.spacing.lg, width: '100%' }}>
            <Button label="Scan QR to Check In" onPress={handleOpenScanner} />
          </View>
        </View>
      )}

      {/* QR Scanner Modal */}
      <Modal visible={isScannerOpen} animationType="slide">
         <View style={{ flex: 1, backgroundColor: '#000' }}>
            <SafeAreaView style={{ flex: 1 }}>
              {permission && permission.granted ? (
                 <CameraView
                  style={{ flex: 1 }}
                  facing="back"
                  onBarcodeScanned={handleBarcodeScanned}
                  barcodeScannerSettings={{
                     barcodeTypes: ["qr"]
                  }}
                 />
              ) : (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ color: '#fff', padding: 20, textAlign: 'center' }}>Camera permission is required to scan the QR code.</Text>
                  <Button label="Request Permission" onPress={requestPermission} style={{ width: 200 }} />
                </View>
              )}
              
              <View style={styles.scannerOverlay}>
                 <Button label="Cancel" variant="outline" onPress={() => setIsScannerOpen(false)} style={{ backgroundColor: THEME.colors.background }} />
              </View>
            </SafeAreaView>
         </View>
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
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: THEME.colors.background,
  },
  content: {
    flex: 1,
    padding: THEME.spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: THEME.colors.textMuted,
  },
  scannerOverlay: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
  }
});
