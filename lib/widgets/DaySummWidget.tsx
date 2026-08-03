import React from 'react';
import { FlexWidget, TextWidget, ImageWidget, SvgWidget } from 'react-native-android-widget';
import { flameSvg } from './widgetSvgs';

import type { WidgetInfo } from 'react-native-android-widget';

interface DaySummWidgetProps {
  todayEntryCount: number;
  currentStreak: number;
  lastEntryPreview: string;
  widgetInfo?: WidgetInfo;
}

export function DaySummWidget({
  todayEntryCount,
  currentStreak,
  widgetInfo,
}: DaySummWidgetProps) {
  const width = widgetInfo?.width || 200;
  const height = widgetInfo?.height || 100;

  const isWide = width > height * 1.2;
  const isTall = height > width * 1.2;
  const isMicro = width < 120 && height < 120;

  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'daysumm://voice-capture' }}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: isWide ? 'row' : 'column',
        justifyContent: isWide ? 'space-between' : 'space-evenly',
        alignItems: 'center',
        backgroundGradient: {
          from: '#6C5CE7',
          to: '#4F3FD6',
          orientation: 'TOP_BOTTOM',
        },
        borderRadius: 24,
        padding: 16,
      }}
    >
      <FlexWidget
        style={{
          flexDirection: 'column',
          alignItems: isWide ? 'flex-start' : 'center',
          justifyContent: 'center',
          flex: isWide ? 1 : undefined,
        }}
      >
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: isMicro ? 0 : 4,
          }}
        >
          <SvgWidget svg={flameSvg} style={{ width: isMicro ? 18 : 24, height: isMicro ? 18 : 24 }} />
          <TextWidget
            text={currentStreak > 0 ? String(currentStreak) : '0'}
            style={{
              fontSize: isMicro ? 18 : 24,
              fontWeight: '900',
              color: '#FF7A9C',
              marginLeft: 4,
            }}
          />
        </FlexWidget>

        {!isMicro && !isTall && (
          <TextWidget
            text="Tap and speak"
            style={{
              fontSize: 16,
              fontWeight: '800',
              color: '#FFFFFF',
              marginTop: 4,
            }}
          />
        )}
      </FlexWidget>

      {!isMicro && (
        <ImageWidget
          image={require('../../assets/cat-widget-cheer.png')}
          imageWidth={isWide ? 70 : 80}
          imageHeight={isWide ? 70 : 80}
          style={{
            width: isWide ? 70 : 80,
            height: isWide ? 70 : 80,
            marginTop: isWide ? 0 : 8,
          }}
        />
      )}
    </FlexWidget>
  );
}
