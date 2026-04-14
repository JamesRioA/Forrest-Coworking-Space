import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { supabase } from '../src/supabase';
import { View, ActivityIndicator } from 'react-native';
import { THEME } from '../src/utils/theme';

export default function Index() {
  return (
    <View style={{ flex: 1, backgroundColor: THEME.colors.background, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={THEME.colors.primary} />
    </View>
  );
}
