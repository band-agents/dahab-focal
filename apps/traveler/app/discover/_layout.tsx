import { Stack } from 'expo-router';

/**
 * The Discover tab's own stack: search → results, plus the sheets and
 * sub-screens Board 04 draws as separate frames (filter, sort, a category
 * hub, a dive-site sheet, Ask Bahri). Headers are custom per screen — the
 * design system has no native-header component styled to its tokens.
 */
export default function DiscoverLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="category/[slug]" />
      <Stack.Screen name="site/[slug]" />
      <Stack.Screen name="filters" options={{ presentation: 'modal' }} />
      <Stack.Screen name="sort" options={{ presentation: 'modal' }} />
      <Stack.Screen name="ask" />
    </Stack>
  );
}
