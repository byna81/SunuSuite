import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

type ProductBarcodeScannerScreenProps = {
  navigation: any;
};

export default function ProductBarcodeScannerScreen({
  navigation,
}: ProductBarcodeScannerScreenProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastBarcode, setLastBarcode] = useState<string | null>(null);
  const lockRef = useRef(false);

  const canScan = useMemo(() => {
    return !isProcessing && !lockRef.current;
  }, [isProcessing]);

  const handleDetected = async ({ data }: { data: string }) => {
    if (!data || !canScan) return;
    if (lastBarcode === data) return;

    try {
      lockRef.current = true;
      setIsProcessing(true);
      setLastBarcode(data);

      Alert.alert('Code-barres détecté', data, [
        {
          text: 'Scanner à nouveau',
          onPress: () => {
            setLastBarcode(null);
            lockRef.current = false;
            setIsProcessing(false);
          },
        },
        {
          text: 'Utiliser ce code',
          onPress: () => {
            navigation.navigate('ProductCreate', {
              scannedBarcode: data,
            });
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert('Erreur', error?.message ?? 'Impossible de scanner');
      setLastBarcode(null);
      lockRef.current = false;
      setIsProcessing(false);
    }
  };

  const handleScanAgain = () => {
    setLastBarcode(null);
    lockRef.current = false;
    setIsProcessing(false);
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.title}>Autorisation caméra requise</Text>
        <Text style={styles.subtitle}>
          Autorise la caméra pour scanner le code-barres du produit.
        </Text>

        <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
          <Text style={styles.primaryBtnText}>Autoriser la caméra</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.secondaryBtnText}>Retour</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Scanner le code-barres</Text>
        <Text style={styles.headerSubtitle}>
          Vise le code-barres du produit
        </Text>
      </View>

      <View style={styles.cameraWrapper}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
          }}
          onBarcodeScanned={canScan ? handleDetected : undefined}
        />

        <View pointerEvents="none" style={styles.overlay}>
          <View style={styles.scanFrame} />
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {isProcessing
            ? 'Code détecté...'
            : 'Scanne pour remplir automatiquement le champ barcode'}
        </Text>

        <View style={styles.footerButtons}>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.secondaryBtnText}>Retour</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.primaryBtn} onPress={handleScanAgain}>
            <Text style={styles.primaryBtnText}>Scanner à nouveau</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1220',
  },
  centered: {
    flex: 1,
    backgroundColor: '#f5f7fb',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#cbd5e1',
    marginTop: 4,
    fontSize: 14,
  },
  cameraWrapper: {
    flex: 1,
    margin: 16,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#111827',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: '75%',
    height: 180,
    borderWidth: 3,
    borderColor: '#22c55e',
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 8,
  },
  footerText: {
    color: '#e5e7eb',
    textAlign: 'center',
    marginBottom: 14,
    fontSize: 14,
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  secondaryBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  secondaryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#101828',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: '#667085',
    textAlign: 'center',
    marginBottom: 16,
  },
});
