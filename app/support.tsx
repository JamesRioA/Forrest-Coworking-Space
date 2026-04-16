import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Linking, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { THEME } from '../src/utils/theme';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

interface FAQItemProps {
  question: string;
  answer: string;
}

const FAQItem = ({ question, answer }: FAQItemProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={styles.faqCard}>
      <TouchableOpacity style={styles.faqHeader} onPress={() => setIsOpen(!isOpen)} activeOpacity={0.7}>
        <Text style={styles.faqQuestion}>{question}</Text>
        <Feather name={isOpen ? "chevron-up" : "chevron-down"} size={20} color={THEME.colors.textMuted} />
      </TouchableOpacity>
      {isOpen && (
        <View style={styles.faqAnswerContainer}>
          <Text style={styles.faqAnswer}>{answer}</Text>
        </View>
      )}
    </View>
  );
};

export default function SupportScreen() {
  const router = useRouter();
  const [modalType, setModalType] = useState<'privacy' | 'terms' | null>(null);

  const faqs = [
    {
      category: "Membership & Access",
      items: [
        { question: "How do I check in?", answer: "Simple! Just open the app, tap the Camera icon in the bottom menu, and scan the QR code at the reception desk." },
        { question: "What are the operating hours?", answer: "We are open Monday to Friday from 8:00 AM to 8:00 PM, and Saturday from 9:00 AM to 5:00 PM." },
      ]
    },
    {
      category: "Billing",
      items: [
        { question: "How is the duration calculated?", answer: "Billing starts exactly when you scan the check-in QR and stops when you scan the checkout QR. We bill in 30-minute increments." },
        { question: "What payment methods do you accept?", answer: "We currently accept GCash, Maya, and major credit cards via our secure payment gateway at the front desk." },
      ]
    }
  ];

  const handleEmailSupport = () => {
    Linking.openURL('mailto:support@forrest.ph?subject=App Support Request');
  };

  const handleWhatsAppSupport = () => {
    Linking.openURL('https://wa.me/639171234567');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Feather name="chevron-left" size={28} color={THEME.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* HERO SECTION */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>How can we help you today?</Text>
          <Text style={styles.heroSubtitle}>Find answers to common questions or reach out to our team.</Text>
        </View>

        {/* FAQ SECTION */}
        {faqs.map((section, idx) => (
          <View key={idx} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.category}</Text>
            {section.items.map((faq, fIdx) => (
              <FAQItem key={fIdx} question={faq.question} answer={faq.answer} />
            ))}
          </View>
        ))}

        {/* CONTACT SECTION */}
        <View style={styles.contactSection}>
          <Text style={styles.sectionTitle}>Still Need Help?</Text>
          <View style={styles.contactRow}>
            <TouchableOpacity style={styles.contactCard} onPress={handleEmailSupport}>
              <View style={[styles.contactIcon, { backgroundColor: '#E3F2FD' }]}>
                <Feather name="mail" size={24} color="#1E88E5" />
              </View>
              <Text style={styles.contactLabel}>Email Us</Text>
              <Text style={styles.contactValue}>Response in 24h</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.contactCard} onPress={handleWhatsAppSupport}>
              <View style={[styles.contactIcon, { backgroundColor: '#E8F5E9' }]}>
                <MaterialCommunityIcons name="whatsapp" size={24} color="#2E7D32" />
              </View>
              <Text style={styles.contactLabel}>WhatsApp</Text>
              <Text style={styles.contactValue}>Live Chat</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* LEGAL SECTION */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Version 1.0.4 (Build 22)</Text>
          <View style={styles.legalLinks}>
            <TouchableOpacity onPress={() => setModalType('privacy')}>
              <Text style={styles.legalLinkText}>Privacy Policy</Text>
            </TouchableOpacity>
            <View style={styles.legalDivider} />
            <TouchableOpacity onPress={() => setModalType('terms')}>
              <Text style={styles.legalLinkText}>Terms of Service</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* LEGAL MODAL */}
      <Modal
        visible={!!modalType}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalType(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modalType === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
              </Text>
              <TouchableOpacity onPress={() => setModalType(null)}>
                <Feather name="x" size={24} color={THEME.colors.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {modalType === 'privacy' ? (
                <View>
                  <Text style={styles.policyHeading}>1. Data We Collect</Text>
                  <Text style={styles.policyBody}>We collect information relative to your identity (name, contact number) and your visits to our workspace (check-in/out times, zone usage). This data is strictly used to manage your sessions and billing.</Text>
                  <Text style={styles.policyHeading}>2. How We Use Data</Text>
                  <Text style={styles.policyBody}>Your data helps us provide a personalized experience, manage memberships, and ensure the security of our co-working community.</Text>
                  <Text style={styles.policyHeading}>3. Data Security</Text>
                  <Text style={styles.policyBody}>We employ industry-standard encryption and security measures via Supabase to protect your personal information from unauthorized access.</Text>
                </View>
              ) : (
                <View>
                  <Text style={styles.policyHeading}>1. Acceptance of Terms</Text>
                  <Text style={styles.policyBody}>By using the Forrest app and our workspace, you agree to comply with all safety regulations and community guidelines established by the management.</Text>
                  <Text style={styles.policyHeading}>2. Usage Rules</Text>
                  <Text style={styles.policyBody}>Users must check in and out accurately. Shared facilities must be used with respect for other members. The workspace is a professional environment; please maintain appropriate noise levels.</Text>
                  <Text style={styles.policyHeading}>3. Liability</Text>
                  <Text style={styles.policyBody}>Forrest is not responsible for any lost or damaged personal items. Members are responsible for their own belongings at all times.</Text>
                </View>
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
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
  scrollContent: {
    paddingBottom: 40,
  },
  hero: {
    padding: THEME.spacing.xl,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: THEME.colors.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 15,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    paddingHorizontal: THEME.spacing.lg,
    marginBottom: THEME.spacing.xl,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
    marginLeft: 4,
  },
  faqCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F3F1EC',
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.colors.text,
    flex: 1,
    paddingRight: 10,
  },
  faqAnswerContainer: {
    paddingHorizontal: 18,
    paddingBottom: 18,
    backgroundColor: '#FAFAFA',
  },
  faqAnswer: {
    fontSize: 14,
    color: THEME.colors.textMuted,
    lineHeight: 20,
  },
  contactSection: {
    paddingHorizontal: THEME.spacing.lg,
    marginBottom: 40,
  },
  contactRow: {
    flexDirection: 'row',
    gap: 12,
  },
  contactCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    ...THEME.shadows.soft,
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.primary,
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginBottom: 12,
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  legalLinkText: {
    fontSize: 13,
    color: '#8CA095',
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  legalDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#EBEBEB',
  },
  
  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: '85%',
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F1EC',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  modalBody: {
    flex: 1,
  },
  policyHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.primary,
    marginTop: 20,
    marginBottom: 10,
  },
  policyBody: {
    fontSize: 15,
    color: THEME.colors.text,
    lineHeight: 24,
    marginBottom: 10,
  },
});
