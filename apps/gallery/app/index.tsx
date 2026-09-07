import { ScrollView, Text, View } from 'react-native';

export default function GalleryIndex() {
  return (
    <ScrollView className="flex-1 bg-bg" contentContainerClassName="p-6 gap-4">
      <Text className="text-text text-displayL font-display">Dahab, in focus.</Text>
      <Text className="text-text-muted text-body">
        Token smoke test — blush CTA fill, ink label, cream ground.
      </Text>
      <View className="rounded-input bg-cta-fill px-5 py-3 self-start">
        <Text className="text-cta-label text-h3">Book for EGP 1,450</Text>
      </View>
      <View className="h-px bg-border" />
      <View className="rounded-card bg-surface p-4 gap-2">
        <Text className="text-text text-h2">A raised panel</Text>
        <Text className="text-text-muted text-small">metadata, in text-muted</Text>
      </View>
    </ScrollView>
  );
}
