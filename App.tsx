import React, { useEffect, useRef, useState } from 'react';
import { Linking, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as QuickActions from 'expo-quick-actions';
import { useTheme, FONT_FILES } from './src/theme';
import { AppProvider, useApp, ONBOARDED_KEY } from './src/state';
import { countAttacks, endAttack, kvGet, kvSet, startAttack } from './src/db';
import { quickActionFor } from './src/rules';
import HomeScreen from './src/screens/Home';
import DetailsScreen from './src/screens/Details';
import HistoryScreen from './src/screens/History';
import CalendarScreen from './src/screens/Calendar';
import NumbersScreen from './src/screens/Numbers';
import ReportScreen from './src/screens/Report';
import MedsScreen from './src/screens/Meds';
import SettingsScreen from './src/screens/Settings';
import PaywallModal from './src/screens/Paywall';
import Welcome, { MedsStep, TrackStep, TrialSteps } from './src/screens/Welcome';
import { maybeRequestReviewOnLaunch } from './src/reviews';
import TabBar, { Tab } from './src/ui/TabBar';
import { Notice } from './src/ui/Kit';
import { startHaptic, doneHaptic } from './src/ui/motion';
import { PRIVACY_URL } from './src/links';

/** A screen over the tabs: an attack's details (or a new past one), all attacks, settings. */
type Over = { name: 'details'; attackId: number | null; day?: string } | { name: 'history' } | { name: 'settings' } | null;

/** migrainelog://start, for a Shortcut ("Open URL") or Siri: starts an attack like the big button. */
const START_URL = /^migrainelog:\/\/(start|attack\/start)\b/i;

function Shell() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { ready, isPro, paywall, showPaywall, notice, refresh, openAttack, settings, say } = useApp();
  const [tab, setTab] = useState<Tab>('log');
  const [over, setOver] = useState<Over>(null);
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  // New installs: three value screens, the track question, medications, the trial and reminder screens, then the paywall.
  const [step, setStep] = useState<'welcome' | 'track' | 'meds' | 'trial' | 'paywall'>('welcome');
  const paywallOpened = useRef(false);
  const openRef = useRef(openAttack);
  openRef.current = openAttack;

  useEffect(() => {
    if (!ready || onboarded !== null) return;
    (async () => {
      if ((await kvGet(ONBOARDED_KEY)) === '1') return setOnboarded(true);
      // Anyone who already logged something, or is Pro, has used the app: no onboarding.
      if (isPro || (await countAttacks()) > 0) {
        kvSet(ONBOARDED_KEY, '1').catch(() => {});
        return setOnboarded(true);
      }
      setOnboarded(false);
    })().catch(() => setOnboarded(true)); // fail open: never trap anyone
  }, [ready, onboarded, isPro]);

  const openOnboardingPaywall = () => {
    if (paywallOpened.current) return;
    paywallOpened.current = true;
    setStep('paywall');
    showPaywall('pro');
  };

  // When the onboarding paywall closes (purchase or the close button), onboarding is done.
  useEffect(() => {
    if (paywallOpened.current && paywall == null && onboarded === false) {
      setOnboarded(true);
      kvSet(ONBOARDED_KEY, '1').catch(() => {});
    }
  }, [paywall, onboarded]);

  /** From the quick action or the link: start one (never a second), or end the open one. */
  const fromOutside = async (what: 'start' | 'end') => {
    setOver(null);
    setTab('log');
    const open = openRef.current;
    if (what === 'start' && !open) {
      startHaptic();
      await startAttack(Date.now());
      await refresh();
      say('Saved with the time. Add details when you feel better.');
    } else if (what === 'end' && open) {
      doneHaptic();
      await endAttack(open.id, Date.now());
      await refresh();
      say('Saved. Add details when you feel better.');
    }
  };

  // The home-screen quick action (touch and hold the icon) says what one tap will do now.
  useEffect(() => {
    if (!ready) return;
    const a = quickActionFor(settings.track, openAttack != null);
    QuickActions.setItems([{ id: a.id, title: a.title, icon: a.id === 'start' ? 'symbol:waveform.path' : 'symbol:checkmark.circle' }]).catch(() => {});
  }, [ready, settings.track, openAttack]);

  useEffect(() => {
    if (!ready) return;
    const handle = (id: string | undefined) => {
      if (id === 'start' || id === 'end') fromOutside(id);
    };
    // A cold start from the quick action, when iOS hands it over before this listener exists.
    handle(QuickActions.initial?.id);
    const sub = QuickActions.addListener((action) => handle(action.id));
    const onUrl = ({ url }: { url: string }) => {
      if (START_URL.test(url)) fromOutside('start');
    };
    Linking.getInitialURL()
      .then((url) => url && onUrl({ url }))
      .catch(() => {});
    const link = Linking.addEventListener('url', onUrl);
    return () => {
      sub.remove();
      link.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  if (!ready || onboarded === null) {
    return <View style={{ flex: 1, backgroundColor: theme.bg }} />;
  }

  if (!onboarded) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}>
        <StatusBar style={theme.isDark ? 'light' : 'dark'} />
        {step === 'welcome' && <Welcome onDone={() => setStep('track')} />}
        {step === 'track' && <TrackStep onDone={() => setStep('meds')} />}
        {step === 'meds' && <MedsStep onDone={() => setStep('trial')} />}
        {(step === 'trial' || step === 'paywall') && <TrialSteps onDone={openOnboardingPaywall} />}
        <PaywallModal privacyUrl={PRIVACY_URL} onboarding />
      </View>
    );
  }

  const openDetails = (attackId: number | null, day?: string) => setOver({ name: 'details', attackId, day });

  let body: React.ReactNode;
  if (over?.name === 'details') body = <DetailsScreen key={`${over.attackId ?? 'new'}-${over.day ?? ''}`} attackId={over.attackId} day={over.day} onClose={() => setOver(null)} />;
  else if (over?.name === 'history') body = <HistoryScreen onBack={() => setOver(null)} onOpen={(id) => openDetails(id)} onAddPast={() => openDetails(null)} />;
  else if (over?.name === 'settings') body = <SettingsScreen onBack={() => setOver(null)} />;
  else if (tab === 'log')
    body = (
      <HomeScreen
        onDetails={(id) => openDetails(id)}
        onAddPast={(day) => openDetails(null, day)}
        onHistory={() => setOver({ name: 'history' })}
        onSettings={() => setOver({ name: 'settings' })}
      />
    );
  else if (tab === 'calendar') body = <CalendarScreen onOpen={(id) => openDetails(id)} onAddOn={(day) => openDetails(null, day)} />;
  else if (tab === 'numbers') body = <NumbersScreen onReport={() => setTab('report')} />;
  else if (tab === 'report') body = <ReportScreen />;
  else body = <MedsScreen />;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <LaunchReview />
      <View style={{ flex: 1 }}>{body}</View>
      {over == null ? <TabBar theme={theme} tab={tab} onTab={setTab} proTabs={isPro ? [] : ['numbers']} /> : null}
      <Notice theme={theme} text={notice} bottom={over == null ? 64 + insets.bottom : insets.bottom} />
      <PaywallModal privacyUrl={PRIVACY_URL} />
    </View>
  );
}

/** Once per launch, from the main screen: the "later calendar day" rating trigger (never during an attack). */
function LaunchReview() {
  const { openAttack } = useApp();
  useEffect(() => {
    if (!openAttack) maybeRequestReviewOnLaunch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts(FONT_FILES);
  if (!fontsLoaded && !fontError) return <View style={{ flex: 1, backgroundColor: '#1A191C' }} />;
  return (
    <SafeAreaProvider>
      <AppProvider>
        <Shell />
      </AppProvider>
    </SafeAreaProvider>
  );
}
