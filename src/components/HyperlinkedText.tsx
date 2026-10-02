import React from 'react';
import { Text, Linking, TouchableOpacity, View, StyleSheet } from 'react-native';

const urlRegex = /(https?:\/\/[^\s]+)/g;

export function HyperlinkedText({ text, style, linkStyle, numberOfLines }: { text: string, style?: any, linkStyle?: any, numberOfLines?: number }) {
  if (!text) return null;

  const parts = text.split(urlRegex);

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((part, i) => {
        if (part.match(urlRegex)) {
          return (
            <Text
              key={i}
              style={[linkStyle, { textDecorationLine: 'underline' }]}
              onPress={() => Linking.openURL(part)}
            >
              {part}
            </Text>
          );
        }
        return <Text key={i}>{part}</Text>;
      })}
    </Text>
  );
}
