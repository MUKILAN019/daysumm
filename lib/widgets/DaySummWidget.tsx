import React from 'react';
import { FlexWidget, TextWidget, ImageWidget, SvgWidget } from 'react-native-android-widget';
import { flameSvg, micSvg } from './widgetSvgs';

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
    lastEntryPreview.length > 50 ? `${lastEntryPreview.slice(0, 50)}…` : lastEntryPreview;

  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'daysumm://voice-capture' }}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundGradient: {
          from: '#10B981',
          to: '#059669',
          orientation: 'TL_BR',
        },
        borderRadius: 24,
        padding: 16,
      }}
    >
      {/* Top Brand & Streak Row */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <TextWidget
          text="DaySumm"
          style={{
            fontSize: 13,
            fontWeight: '900',
            color: '#ECFDF5',
            letterSpacing: 0.8,
            marginRight: 8,
          }}
        />

        {/* Streak Badge matching the App UI/UX */}
        {currentStreak > 0 ? (
          <FlexWidget
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 3,
              paddingHorizontal: 8,
              borderRadius: 12,
              backgroundColor: '#FEF9C3',
            }}
          >
            <SvgWidget
              svg={flameSvg}
              style={{
                width: 12,
                height: 12,
              }}
            />
            <TextWidget
              text={String(currentStreak)}
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: '#A16207',
                marginLeft: 4,
              }}
            />
          </FlexWidget>
        ) : (
          <FlexWidget
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 3,
              paddingHorizontal: 8,
              borderRadius: 12,
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
            }}
          >
            <TextWidget
              text="No Streak"
              style={{
                fontSize: 10,
                fontWeight: '700',
                color: '#ECFDF5',
              }}
            />
          </FlexWidget>
        )}
      </FlexWidget>

      {/* Middle Content Row: Image + Text Stats */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginVertical: 10,
        }}
      >
        {/* Character Image from assets (Duolingo feel) */}
        <ImageWidget
          image={require('../../assets/owl-professor-thinking.png')}
          imageWidth={64}
          imageHeight={64}
          style={{
            width: 64,
            height: 64,
          }}
        />

        {/* Dynamic today's entries counter */}
        <FlexWidget
          style={{
            flex: 1,
            marginLeft: 12,
            flexDirection: 'column',
          }}
        >
          <TextWidget
            text={`${todayEntryCount} ${todayEntryCount === 1 ? 'entry' : 'entries'} today`}
            style={{
              fontSize: 15,
              fontWeight: 'bold',
              color: '#FFFFFF',
            }}
          />
          <TextWidget
            text={
              todayEntryCount > 0
                ? (truncatedPreview || 'Captured thoughts')
                : 'Start your daily summary'
            }
            style={{
              fontSize: 12,
              color: '#D1FAE5',
              marginTop: 4,
            }}
            maxLines={1}
            truncate="END"
          />
        </FlexWidget>
      </FlexWidget>

      {/* Bottom High-Contrast Interactive Highlight Capture Button */}
      <FlexWidget
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          paddingVertical: 8,
          paddingHorizontal: 12,
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <SvgWidget
          svg={micSvg}
          style={{
            width: 14,
            height: 14,
          }}
        />
        <TextWidget
          text={todayEntryCount === 0 ? 'TAP TO CAPTURE DAY' : 'ADD NEW ENTRY'}
          style={{
            fontSize: 11,
            fontWeight: '900',
            color: '#047857',
            letterSpacing: 0.8,
            marginLeft: 6,
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}