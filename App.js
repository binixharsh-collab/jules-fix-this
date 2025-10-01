import React, { useState, useMemo } from "react";
import { StyleSheet, View, Button, Alert, Text } from "react-native";
import { Canvas, Path, Skia } from "@shopify/react-native-skia";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

export default function App() {
  const [paths, setPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState(null);

  const paint = useMemo(() => {
    const p = Skia.Paint();
    p.setColor(Skia.Color("black"));
    p.setStyle(1); // Stroke
    p.setStrokeWidth(4);
    p.setStrokeCap(1); // Round
    p.setStrokeJoin(1); // Round
    return p;
  }, []);

  const pan = Gesture.Pan()
    .onBegin((e) => {
      // Check if the input is from a stylus
      if (e.pointerType !== "stylus") {
        return;
      }
      const newPath = Skia.Path.Make();
      newPath.moveTo(e.x, e.y);
      setCurrentPath(newPath);
    })
    .onUpdate((e) => {
      if (e.pointerType !== "stylus" || !currentPath) {
        return;
      }
      currentPath.lineTo(e.x, e.y);
    })
    .onEnd(() => {
      if (currentPath) {
        setPaths((prevPaths) => [...prevPaths, currentPath]);
      }
      setCurrentPath(null);
    })
    .minDistance(1);

  const handleClear = () => {
    setPaths([]);
    setCurrentPath(null);
  };

  const handleSave = () => {
    if (paths.length === 0) {
      Alert.alert("Nothing to Save", "Please draw something first.");
      return;
    }
    Alert.alert("Saved", "Signature captured!");
  };

  return (
    <View style={styles.container}>
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>Pen-Only Drawing Pad</Text>
        <Text style={styles.instructionText}>
          Use your stylus to draw on the canvas below.
        </Text>
      </View>

      <GestureDetector gesture={pan}>
        <View style={styles.canvas}>
          <Canvas style={StyleSheet.absoluteFillObject}>
            {paths.map((p, i) => (
              <Path key={i} path={p} paint={paint} />
            ))}
            {currentPath && <Path path={currentPath} paint={paint} />}
          </Canvas>
        </View>
      </GestureDetector>

      <View style={styles.buttons}>
        <Button title="Clear" onPress={handleClear} />
        <Button title="Save" onPress={handleSave} />
      </View>
    </View>
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
  canvas: {
    flex: 1,
    position: "relative",
  },
  readyCanvas: {
    backgroundColor: "#e8f5e8",
  },
  notReadyCanvas: {
    backgroundColor: "#f5f5f5",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  overlayText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#666",
  },
  overlaySubtext: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    marginTop: 10,
    paddingHorizontal: 20,
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 20,
  },
});
