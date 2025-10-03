import React, { useState, useMemo, useCallback, useRef } from "react";
import { StyleSheet, View, Button, Alert, Text } from "react-native";
import { Canvas, Path, Skia } from "@shopify/react-native-skia";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";

export default function App() {
  const [paths, setPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState(null);

  // Use a ref to store the path being drawn for worklet access
  const pathRef = useRef(null);

  const commitPath = useCallback((path) => {
    setPaths((prevPaths) => [...prevPaths, path]);
  }, []);

  // Wrap setState calls for use in worklets
  const updateCurrentPath = useCallback((path) => {
    setCurrentPath(path);
  }, []);

  const paint = useMemo(() => {
    const p = Skia.Paint();
    p.setColor(Skia.Color("black"));
    p.setStyle(1); // Stroke
    p.setStrokeWidth(2);
    p.setStrokeCap(1); // Round
    p.setStrokeJoin(1); // Round
    return p;
  }, []);

  const pan = Gesture.Pan()
    .onBegin((e) => {
      "worklet";
      const isPen = e.pointerType === 1;
      if (!isPen) {
        return;
      }
      const newPath = Skia.Path.Make();
      newPath.moveTo(e.x, e.y);
      pathRef.current = newPath;
      // Use runOnJS to call setState from worklet
      runOnJS(updateCurrentPath)(newPath);
    })
    .onUpdate((e) => {
      "worklet";
      const isPen = e.pointerType === 1;
      if (!isPen || !pathRef.current) {
        return;
      }
      // Update the path
      const path = pathRef.current.copy();
      path.lineTo(e.x, e.y);
      pathRef.current = path;
      // Use runOnJS to call setState from worklet
      runOnJS(updateCurrentPath)(path);
    })
    .onEnd(() => {
      "worklet";
      if (pathRef.current) {
        // Use runOnJS to call setState from worklet
        runOnJS(commitPath)(pathRef.current);
        pathRef.current = null;
        runOnJS(updateCurrentPath)(null);
      }
    })
    .minDistance(1);

  const handleClear = () => {
    setPaths([]);
    pathRef.current = null;
    setCurrentPath(null);
  };

  const handleSave = () => {
    if (paths.length === 0) {
      Alert.alert("Nothing to Save", "Draw something with your stylus first.");
      return;
    }
    Alert.alert("Saved", `${paths.length} strokes saved!`);
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>Pen-Only Drawing</Text>
        <Text style={styles.instructionText}>
          Only input from a pen will be recognized.
        </Text>
        <Text style={styles.debugText}>Strokes: {paths.length}</Text>
      </View>

      <GestureDetector gesture={pan}>
        <View style={styles.canvas}>
          <Canvas style={StyleSheet.absoluteFillObject}>
            {/* Render all completed paths */}
            {paths.map((p, i) => (
              <Path key={`path-${i}`} path={p} paint={paint} />
            ))}
            {/* Render the current path being drawn */}
            {currentPath && <Path path={currentPath} paint={paint} />}
          </Canvas>
        </View>
      </GestureDetector>

      <View style={styles.buttons}>
        <Button title="Clear" onPress={handleClear} />
        <Button title="Save" onPress={handleSave} />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  statusBar: {
    padding: 15,
    backgroundColor: "#f8f8f8",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    alignItems: "center",
  },
  statusText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  instructionText: {
    fontSize: 14,
    color: "#666",
    marginTop: 5,
    textAlign: "center",
  },
  debugText: {
    fontSize: 12,
    color: "#999",
    marginTop: 5,
  },
  canvas: {
    flex: 1,
    backgroundColor: "#f0f0f0",
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 20,
  },
});
