import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Dimensions,
  TouchableOpacity,
  Platform,
  Animated,
} from 'react-native';
import { CameraView, Camera, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, QrCode, Zap } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

interface ScanResult {
  data: string;
  location: Location.LocationObject | null;
  timestamp: number;
}

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [lastScan, setLastScan] = useState<ScanResult | null>(null);
  const [scanCount, setScanCount] = useState<number>(0);
  const [notificationOpacity] = useState(new Animated.Value(0));

  useEffect(() => {
    getLocationPermission();
    getCurrentLocation();
  }, []);

  const getLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
      
      if (status !== 'granted') {
        Alert.alert(
          'Permisos de Ubicación',
          'Se necesitan permisos de ubicación para registrar dónde fueron escaneados los códigos QR.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
    }
  };

  const getCurrentLocation = async () => {
    try {
      if (locationPermission) {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation(loc);
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const showNotification = (message: string) => {
    Animated.sequence([
      Animated.timing(notificationOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(notificationOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    try {
      // Actualizar ubicación antes de guardar
      let currentLocation = location;
      if (locationPermission) {
        currentLocation = await Location.getCurrentPositionAsync({});
        setLocation(currentLocation);
      }

      const scanResult: ScanResult = {
        data,
        location: currentLocation,
        timestamp: Date.now(),
      };

      setLastScan(scanResult);
      setScanCount(prev => prev + 1);

      // Guardar en la base de datos
      await saveScanToDatabase(scanResult);
      
      showNotification('Código QR escaneado correctamente');
      
    } catch (error) {
      console.error('Error handling scan:', error);
      Alert.alert('Error', 'No se pudo procesar el código QR');
    }
  };

  const saveScanToDatabase = async (scanResult: ScanResult) => {
    try {
      const requestBody = {
        qr_data: scanResult.data,
        latitude: scanResult.location?.coords.latitude || null,
        longitude: scanResult.location?.coords.longitude || null,
        altitude: scanResult.location?.coords.altitude || null,
        accuracy: scanResult.location?.coords.accuracy || null,
        timestamp: scanResult.timestamp,
      };

      const response = await fetch('/scans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to save scan');
      }

      const result = await response.json();
      console.log('Scan saved successfully:', result);
    } catch (error) {
      console.error('Error saving scan:', error);
    }
  };

  if (!permission) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Solicitando permisos de cámara...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <View style={styles.permissionContent}>
          <QrCode size={80} color="#007AFF" />
          <Text style={styles.permissionTitle}>Acceso a la Cámara</Text>
          <Text style={styles.permissionMessage}>
            Necesitamos acceso a tu cámara para escanear códigos QR
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Conceder Permisos</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Notification Banner */}
      <Animated.View style={[styles.notification, { opacity: notificationOpacity }]}>
        <Zap size={16} color="white" />
        <Text style={styles.notificationText}>Código QR escaneado correctamente</Text>
      </Animated.View>

      {/* GPS Info */}
      {location && (
        <View style={styles.gpsInfo}>
          <MapPin size={12} color="#666" />
          <Text style={styles.gpsText}>
            GPS: {location.coords.latitude.toFixed(4)}, {location.coords.longitude.toFixed(4)}
          </Text>
        </View>
      )}

      {/* Camera View */}
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
        >
          {/* Scanner Overlay */}
          <View style={styles.overlay}>
            <View style={styles.scanArea}>
              <View style={styles.corner} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
          </View>
        </CameraView>
      </View>

      {/* Bottom Info Panel */}
      <View style={styles.bottomPanel}>
        <Text style={styles.instructionText}>
          Apunta la cámara hacia un código QR para escanearlo
        </Text>
        
        {scanCount > 0 && (
          <View style={styles.statsContainer}>
            <Text style={styles.statsText}>Códigos escaneados: {scanCount}</Text>
          </View>
        )}

        {lastScan && (
          <View style={styles.lastScanContainer}>
            <Text style={styles.lastScanTitle}>Último escaneo:</Text>
            <Text style={styles.lastScanData} numberOfLines={2}>
              {lastScan.data}
            </Text>
            {lastScan.location && (
              <Text style={styles.lastScanLocation}>
                📍 {lastScan.location.coords.latitude.toFixed(4)}, {lastScan.location.coords.longitude.toFixed(4)}
              </Text>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionContent: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1c1c1e',
    marginTop: 24,
    marginBottom: 12,
  },
  permissionMessage: {
    fontSize: 16,
    color: '#8e8e93',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  permissionText: {
    fontSize: 16,
    color: '#666',
  },
  notification: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    zIndex: 1000,
  },
  notificationText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  gpsInfo: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    zIndex: 100,
  },
  gpsText: {
    color: 'white',
    fontSize: 12,
    marginLeft: 4,
  },
  cameraContainer: {
    flex: 1,
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderLeftWidth: 4,
    borderTopWidth: 4,
    borderColor: '#007AFF',
    top: 0,
    left: 0,
  },
  topRight: {
    borderLeftWidth: 0,
    borderRightWidth: 4,
    top: 0,
    right: 0,
  },
  bottomLeft: {
    borderTopWidth: 0,
    borderBottomWidth: 4,
    bottom: 0,
    left: 0,
  },
  bottomRight: {
    borderLeftWidth: 0,
    borderRightWidth: 4,
    borderTopWidth: 0,
    borderBottomWidth: 4,
    bottom: 0,
    right: 0,
  },
  bottomPanel: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  instructionText: {
    fontSize: 16,
    color: '#1c1c1e',
    textAlign: 'center',
    fontWeight: '500',
  },
  statsContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  statsText: {
    fontSize: 14,
    color: '#34C759',
    fontWeight: '600',
  },
  lastScanContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  lastScanTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1c1c1e',
    marginBottom: 4,
  },
  lastScanData: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  lastScanLocation: {
    fontSize: 12,
    color: '#007AFF',
  },
});