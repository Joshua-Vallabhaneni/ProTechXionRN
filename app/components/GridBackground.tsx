/**
 * GridBackground.tsx
 * A component that renders a grid pattern background
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';

interface GridBackgroundProps {
  color?: string;
  gridSize?: number;
  lineWidth?: number;
  opacity?: number;
}

const GridBackground: React.FC<GridBackgroundProps> = ({
  color = '#FF9999',
  gridSize = 20,
  lineWidth = 1,
  opacity = 0.1,
}) => {
  // Generate horizontal lines
  const horizontalLines = [];
  const numHLines = Math.ceil(500 / gridSize); // Generate enough lines for a large screen

  for (let i = 0; i < numHLines; i++) {
    horizontalLines.push(
      <View
        key={`h-${i}`}
        style={[
          styles.horizontalLine,
          {
            top: i * gridSize,
            borderColor: color,
            height: lineWidth,
            opacity: opacity,
          },
        ]}
      />
    );
  }

  // Generate vertical lines
  const verticalLines = [];
  const numVLines = Math.ceil(500 / gridSize); // Generate enough lines for a large screen

  for (let i = 0; i < numVLines; i++) {
    verticalLines.push(
      <View
        key={`v-${i}`}
        style={[
          styles.verticalLine,
          {
            left: i * gridSize,
            borderColor: color,
            width: lineWidth,
            opacity: opacity,
          },
        ]}
      />
    );
  }

  return (
    <View style={styles.container}>
      {horizontalLines}
      {verticalLines}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFE6E6', // Light pink background
  },
  horizontalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderBottomWidth: 1,
  },
  verticalLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRightWidth: 1,
  },
});

export default GridBackground; 