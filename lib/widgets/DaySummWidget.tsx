import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

interface DaySummWidgetProps {
  todayEntryCount: number;
  currentStreak: number;
  lastEntryPreview: string;
}

export function DaySummWidget({
  todayEntryCount,
  currentStreak,
  lastEntryPreview,
}: DaySummWidgetProps) {
  const truncatedPreview =
    lastEntryPreview.length > 40 ? `${lastEntryPreview.slice(0, 40)}…` : lastEntryPreview;

  return (
  <FlexWidget
    clickAction="OPEN_URI"
    clickActionData={{ uri: 'daysumm://voice-capture' }}
    style={{
      height: 'match_parent',
      width: 'match_parent',
      flexDirection: 'column',
      justifyContent: 'space-between',
      backgroundColor: '#2563EB',
      borderRadius: 16,
      padding: 12,
    }}
  >
      <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <TextWidget
          text={`${todayEntryCount} today`}
          style={{ fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' }}
        />
        <TextWidget
          text={currentStreak > 0 ? `🔥 ${currentStreak}` : '🔥 0'}
          style={{ fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' }}
        />
      </FlexWidget>

      <TextWidget
        text={truncatedPreview || 'No entries yet — tap to add one'}
        style={{ fontSize: 12, color: '#DBEAFE' }}
        maxLines={2}
      />
    </FlexWidget>
  );
}