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

  const isVertical = height > width + 20;
  const isCompact = width < 160;
  const isMicro = width < 120 || height < 120;
  const mascotSize = isMicro ? 50 : isCompact ? 70 : 90;
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
          from: '#6C5CE7',
          to: '#4F3FD6',
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
            color: '#FF7A9C',
            marginLeft: 6,
          }}
        />
      </FlexWidget>

      {/* Main Content: Big Cat hero + tagline */}
      <FlexWidget
        style={{
          flexDirection: isVertical ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: isVertical ? 'center' : 'space-between',
          marginTop: isVertical ? 8 : 16,
          flex: 1,
        }}
      >
        <FlexWidget
          style={{
            flex: isVertical ? undefined : 1,
            flexDirection: 'column',
            paddingRight: isVertical ? 0 : 8,
            alignItems: isVertical ? 'center' : 'flex-start',
            marginBottom: isVertical ? 8 : 0,
          }}
        >
          {!isMicro && (
            <TextWidget
              text="Tap and speak"
              style={{
                fontSize: isCompact ? 14 : 18,
                fontWeight: '900',
                color: '#FFFFFF',
                lineHeight: isCompact ? 18 : 22,
                textAlign: isVertical ? 'center' : 'left',
              }}
              maxLines={2}
            />
          )}
          <TextWidget
            text={todayEntryCount > 0 ? 'Keep the streak alive' : "Don't let it break!"}
            style={{
              fontSize: isMicro ? 10 : 11,
              fontWeight: '600',
              color: '#EFECFE',
              marginTop: 4,
              textAlign: isVertical ? 'center' : 'left',
            }}
            maxLines={1}
            truncate="END"
          />
        </FlexWidget>

        <ImageWidget
          image={require('../../assets/cat-widget-cheer.png')}
          imageWidth={mascotSize}
          imageHeight={mascotSize}
          style={{ width: mascotSize, height: mascotSize }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
