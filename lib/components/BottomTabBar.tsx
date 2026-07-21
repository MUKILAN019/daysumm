import { Pressable, StyleSheet, Text, View, Platform, Animated } from 'react-native';
import { PenLine, Mic, Sparkles, CalendarDays, User } from 'lucide-react-native';
import { Colors, Elevation, Typography } from '../theme/tokens';
import { useEffect, useRef } from 'react';

export type TabName = 'write' | 'voice' | 'digest' | 'history' | 'profile';

interface TabConfig {
  name: TabName;
  label: string;
  IconComponent: any;
}

const TABS: TabConfig[] = [
  { name: 'write', label: 'Write', IconComponent: PenLine },
  { name: 'voice', label: 'Voice', IconComponent: Mic },
  { name: 'digest', label: 'Digest', IconComponent: Sparkles },
  { name: 'history', label: 'History', IconComponent: CalendarDays },
  { name: 'profile', label: 'Profile', IconComponent: User },
];

interface BottomTabBarProps {
  activeTab: TabName;
  onTabPress: (tab: TabName) => void;
}

export function BottomTabBar({ activeTab, onTabPress }: BottomTabBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.bar}>
        {TABS.map((tab) => {
          const isActive = tab.name === activeTab;
          return (
            <TabItem
              key={tab.name}
              tab={tab}
              isActive={isActive}
              onPress={() => onTabPress(tab.name)}
            />
          );
        })}
      </View>
    </View>
  );
}

function TabItem({
  tab,
  isActive,
  onPress,
}: {
  tab: TabConfig;
  isActive: boolean;
  onPress: () => void;
}) {
  const Icon = tab.IconComponent;
  const animation = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animation, {
      toValue: isActive ? 1 : 0,
      duration: 200,
      useNativeDriver: false, // Color interpolation requires false
    }).start();
  }, [isActive, animation]);

  const backgroundColor = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(236,253,245,0)', Colors.PrimaryTint],
  });

  const scale = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1],
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={tab.label}
      accessibilityState={{ selected: isActive }}
      onPress={onPress}
      style={styles.tabItem}
    >
      <View style={styles.iconContainer}>
        <Animated.View style={[styles.pill, { backgroundColor, transform: [{ scale }] }]} />
        <Icon
          size={24}
          strokeWidth={1.75}
          color={isActive ? Colors.Primary : Colors.TextMuted}
        />
      </View>
      <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
        {tab.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.Background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.Border,
    ...Elevation,
    // Safe area padding for newer devices (approximate if without react-native-safe-area-context)
    paddingBottom: Platform.OS === 'android' ? 8 : 20,
  },
  bar: {
    flexDirection: 'row',
    height: 64,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  iconContainer: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  pill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 18, // half of 36x36
  },
  tabLabel: {
    fontFamily: Typography.Secondary.fontFamily,
    fontSize: 12,
    fontWeight: '500',
    color: Colors.TextMuted,
    lineHeight: 12 * 1.4,
  },
  tabLabelActive: {
    color: Colors.PrimaryDeep,
  },
});
