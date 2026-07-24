import React from 'react';
import { FlexWidget, TextWidget, ImageWidget, SvgWidget } from 'react-native-android-widget';
import { flameSvg } from './widgetSvgs';

interface DaySummWidgetProps {
  todayEntryCount: number;
  currentStreak: number;
  lastEntryPreview: string;
}

export function DaySummWidget({
  todayEntryCount,
  currentStreak,
}: DaySummWidgetProps) {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'daysumm://voice-capture' }}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'center',
        backgroundGradient: {
          from: '#0F766E',
          to: '#059669',
          orientation: 'TOP_BOTTOM',
        },
        borderRadius: 24,
        padding: 14,
      }}
    >
      {/* Top: Streak badge (borderless, prominent focus) */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <SvgWidget svg={flameSvg} style={{ width: 22, height: 22 }} />
        <TextWidget
          text={currentStreak > 0 ? String(currentStreak) : '0'}
          style={{
            fontSize: 20,
            fontWeight: '900',
            color: '#FBBF24',
            marginLeft: 6,
          }}
        />
      </FlexWidget>

      {/* Main Content: Big Owl hero + tagline */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 16,
        }}
      >
        <FlexWidget
          style={{
            flex: 1,
            flexDirection: 'column',
            paddingRight: 8,
          }}
        >
          <TextWidget
            text="Tap and speak"
            style={{
              fontSize: 18,
              fontWeight: '900',
              color: '#FFFFFF',
              lineHeight: 22,
            }}
            maxLines={2}
          />
          <TextWidget
            text={todayEntryCount > 0 ? 'Keep the streak alive' : "Don't let it break!"}
            style={{
              fontSize: 11,
              fontWeight: '600',
              color: '#D1FAE5',
              marginTop: 4,
            }}
            maxLines={1}
            truncate="END"
          />
        </FlexWidget>

        <ImageWidget
          image={require('../../assets/owl-widget-cheer.png')}
          imageWidth={90}
          imageHeight={90}
          style={{ width: 90, height: 90 }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
