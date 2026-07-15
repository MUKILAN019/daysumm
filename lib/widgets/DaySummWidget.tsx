import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export function DaySummWidget() {
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2563EB',
        borderRadius: 16,
      }}
    >
      <TextWidget
        text="DaySumm"
        style={{ fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' }}
      />
    </FlexWidget>
  );
}