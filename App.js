import React, { useState, useMemo, useRef } from "react";
import { StyleSheet, View, Button, Alert, Text } from "react-native";
import { Canvas, Path, Skia } from "@shopify/react-native-skia";

export default function App() {
  // Helper: Detect stylus/pen input from native event
  const isStylus = (nativeEvent) => {
    // Android: toolType === 2, iOS: touchType === 'stylus'
    return nativeEvent.toolType === 2 || nativeEvent.touchType === "stylus";
  };
  const [paths, setPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState(null);
  const [, forceUpdate] = useState(0);
  const [penReady, setPenReady] = useState(false);
  const [lastHoverTime, setLastHoverTime] = useState(0);

  const hoverTimer = useRef(null);
  const penActivationTimer = useRef(null);

  const paint = useMemo(() => {
    const p = Skia.Paint();
    p.setColor(Skia.Color("black"));
    p.setStyle(1);
    p.setStrokeWidth(2);
    p.setStrokeCap(1);
    p.setStrokeJoin(1);
    return p;
  }, []);

  // Detect pen hover (stylus hovers before touching, fingers don't)
  const handleMouseEnter = () => {
    console.log("🖊️ HOVER DETECTED - Pen approaching");
    setLastHoverTime(Date.now());
    setPenReady(true);

    // Clear any existing timer
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
    }

    // Keep pen ready for 2 seconds after hover
    hoverTimer.current = setTimeout(() => {
      setPenReady(false);
      console.log("⏰ Hover timeout - Pen no longer ready");
    }, 2000);
  };

  const handleMouseLeave = () => {
    console.log("🖊️ HOVER ENDED - Pen moved away");
    // Don't immediately disable, give some time for touch
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
    }

    hoverTimer.current = setTimeout(() => {
      setPenReady(false);
    }, 500); // 500ms grace period
  };

  // Alternative: Long press activation
  const handleLongPress = () => {
    console.log("🖊️ LONG PRESS - Activating pen mode");
    setPenReady(true);

    Alert.alert("Pen Mode Activated", "You can now draw for 10 seconds", [
      { text: "OK", onPress: () => {} },
    ]);

    // Auto-deactivate after 10 seconds
    if (penActivationTimer.current) {
      clearTimeout(penActivationTimer.current);
    }

    penActivationTimer.current = setTimeout(() => {
      setPenReady(false);
      Alert.alert("Pen Mode Expired", "Long press again to reactivate");
    }, 10000);
  };

  const handleTouchStart = (evt) => {
    // Debug: Log nativeEvent properties for diagnosis
    console.log("nativeEvent:", evt.nativeEvent);
    // Only allow stylus/pen input if detectable
    if (!isStylus(evt.nativeEvent)) {
      // If toolType/touchType is missing, fallback to penReady
      if (
        evt.nativeEvent.toolType === undefined &&
        evt.nativeEvent.touchType === undefined
      ) {
        console.log("Stylus detection not available, falling back to penReady");
      } else {
        Alert.alert("Pen Required", "Please use a stylus to draw.");
        return;
      }
    }
    // ...existing code...
    const currentTime = Date.now();
    const timeSinceHover = currentTime - lastHoverTime;
    console.log("🟢 TOUCH START");
    console.log("Pen Ready:", penReady);
    console.log("Time since hover:", timeSinceHover + "ms");
    if (!penReady) {
      console.log("🚫 REJECTED: Pen not ready (no hover detected)");
      Alert.alert(
        "Pen Required",
        "Hover with your pen first, or long press to activate pen mode"
      );
      return;
    }
    if (timeSinceHover < 3000) {
      console.log("✅ PEN: Recent hover detected, allowing touch");
    } else {
      console.log("✅ PEN: Long press activated, allowing touch");
    }
    const { locationX, locationY } = evt.nativeEvent;
    const newPath = Skia.Path.Make();
    newPath.moveTo(locationX, locationY);
    setCurrentPath(newPath);
  };

  const handleTouchMove = (evt) => {
    if (!penReady || !currentPath) return;
    if (!isStylus(evt.nativeEvent)) return;
    const { locationX, locationY } = evt.nativeEvent;
    currentPath.lineTo(locationX, locationY);
    forceUpdate((prev) => prev + 1);
  };

  const handleTouchEnd = (evt) => {
    if (!penReady || !currentPath) return;
    if (!isStylus(evt.nativeEvent)) return;
    console.log("🎨 Drawing completed");
    setPaths((prev) => [...prev, currentPath]);
    setCurrentPath(null);
  };

  const handleClear = () => {
    setPaths([]);
    setPenReady(false);
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    if (penActivationTimer.current) clearTimeout(penActivationTimer.current);
  };

  const handleSave = () => Alert.alert("Saved", "Signature captured!");

  const manualPenActivation = () => {
    setPenReady(!penReady);
    if (!penReady) {
      // Activating
      Alert.alert("Pen Activated", "You can now draw with your pen");
      if (penActivationTimer.current) {
        clearTimeout(penActivationTimer.current);
      }
      penActivationTimer.current = setTimeout(() => {
        setPenReady(false);
      }, 15000); // 15 seconds
    } else {
      // Deactivating
      if (penActivationTimer.current) {
        clearTimeout(penActivationTimer.current);
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          Pen Status: {penReady ? "🟢 READY" : "🔴 NOT READY"}
        </Text>
        <Text style={styles.instructionText}>
          {penReady
            ? "Draw now with your Lenovo pen!"
            : 'Hover with pen, long press, or tap "Activate Pen"'}
        </Text>
      </View>

      <View
        style={[
          styles.canvas,
          penReady ? styles.readyCanvas : styles.notReadyCanvas,
        ]}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onLongPress={handleLongPress}
      >
        <Canvas style={StyleSheet.absoluteFillObject}>
          {paths.map((p, i) => (
            <Path key={i} path={p} paint={paint} />
          ))}
          {currentPath && <Path path={currentPath} paint={paint} />}
        </Canvas>

        {!penReady && (
          <View style={styles.overlay}>
            <Text style={styles.overlayText}>PEN NOT READY</Text>
            <Text style={styles.overlaySubtext}>
              Hover with pen, long press, or use button below
            </Text>
          </View>
        )}
      </View>

      <View style={styles.buttons}>
        <Button title="Clear" onPress={handleClear} />
        <Button
          title={penReady ? "Deactivate Pen" : "Activate Pen"}
          onPress={manualPenActivation}
          color={penReady ? "#FF3B30" : "#007AFF"}
        />
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
