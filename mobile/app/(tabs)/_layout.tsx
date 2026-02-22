/**
 * Tab Layout - Floating island bottom navigation
 * iOS 26 / Telegram style: rounded pill not touching screen edges
 * Active state pill covers icon + label at 100% parent height
 */

import { Tabs } from 'expo-router';
import { useColorScheme, View, Text, StyleSheet, Platform, Pressable, Animated as RNAnimated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { colors } from '@/theme/colors';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useRef, useEffect, useMemo } from 'react';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface TabDef {
  icon: IoniconsName;
  iconFocused: IoniconsName;
  label: string;
}

const TAB_DEFS: Record<string, TabDef> = {
  index: { icon: 'home-outline', iconFocused: 'home', label: 'Главная' },
  subscription: { icon: 'diamond-outline', iconFocused: 'diamond', label: 'Подписка' },
  settings: { icon: 'person-outline', iconFocused: 'person', label: 'Настройки' },
};

const BAR_RADIUS = 28;

function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const colorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();
  const isDarkMode =
    themeMode === 'dark' || (themeMode === 'auto' && colorScheme === 'dark');

  const visibleRoutes = useMemo(
    () => state.routes.filter((r) => TAB_DEFS[r.name]),
    [state.routes],
  );
  const tabCount = visibleRoutes.length;

  // One animated value per tab for the background opacity
  const anims = useRef(visibleRoutes.map(() => new RNAnimated.Value(0))).current;

  useEffect(() => {
    visibleRoutes.forEach((route, vIdx) => {
      const globalIdx = state.routes.indexOf(route);
      const focused = state.index === globalIdx;
      RNAnimated.timing(anims[vIdx], {
        toValue: focused ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    });
  }, [state.index]);

  return (
    <View style={styles.floatingWrapper}>
      <View
        style={[
          styles.floatingBar,
          {
            backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
            shadowColor: isDarkMode ? '#000' : '#888',
          },
        ]}
      >
        {visibleRoutes.map((route, vIdx) => {
          const globalIdx = state.routes.indexOf(route);
          const focused = state.index === globalIdx;
          const def = TAB_DEFS[route.name]!;
          const isFirst = vIdx === 0;
          const isLast = vIdx === tabCount - 1;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          // All items share a single uniform border radius
          const radiusStyle = { borderRadius: BAR_RADIUS };

          const bgColor = anims[vIdx].interpolate({
            inputRange: [0, 1],
            outputRange: ['transparent', colors.accent.muted],
          });

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={styles.tabItem}
            >
              <RNAnimated.View
                style={[
                  styles.tabItemBg,
                  radiusStyle,
                  { backgroundColor: bgColor },
                ]}
              >
                <Ionicons
                  name={focused ? def.iconFocused : def.icon}
                  size={20}
                  color={focused ? colors.accent.primary : (isDarkMode ? '#808080' : '#999999')}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color: focused
                        ? colors.accent.primary
                        : isDarkMode ? '#808080' : '#999999',
                      fontWeight: focused ? '700' : '500',
                    },
                  ]}
                  numberOfLines={1}
                >
                  {def.label}
                </Text>
              </RNAnimated.View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="subscription" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  floatingWrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 28 : 16,
    left: 16,
    right: 16,
  },
  floatingBar: {
    flexDirection: 'row',
    borderRadius: BAR_RADIUS,
    height: 60,
    alignItems: 'center',
    paddingHorizontal: 0,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
  },
  tabItem: {
    flex: 1,
    height: '100%',
  },
  tabItemBg: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabLabel: {
    fontSize: 10,
    letterSpacing: 0.1,
  },
});
