import React from 'react';
import { FlexWidget, TextWidget, ImageWidget, SvgWidget } from 'react-native-android-widget';

interface DaySummWidgetProps {
  todayEntryCount: number;
  currentStreak: number;
  lastEntryPreview: string;
}

const flameSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#EAB308" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
</svg>
`;

const micSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#047857" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
  <path d="M19 10v1a7 7 0 0 1-14 0v-1"/>
  <line x1="12" x2="12" y1="19" y2="22"/>
</svg>
`;

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
              borderWidth: 1,
              borderColor: '#FEF08A',
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
          image={require('../../assets/owl-peek.png')}
          imageWidth={56}
          imageHeight={56}
          style={{
            width: 56,
            height: 56,
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
              fontSize: 11,
              color: '#D1FAE5',
              marginTop: 2,
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