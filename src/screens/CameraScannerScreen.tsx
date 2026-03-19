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

type ProductLookup = {
  id: string;
  tenantId: string;
  categoryId?: string | null;
  name: string;
  price: number;
  stock: number;
  barcode?: string | null;
  isActive: boolean;
};

type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  stock: number;
  barcode?: string | null;
};

type CameraScannerScreenProps = {
  navigation: any;
  route: {
    params: {
      cart?: CartItem[];
      tenantId: string;
      apiBase: string;
    };
  };
};

export default function CameraScannerScreen({
  navigation,
  route,
}: CameraScannerScreenProps) {
  const { cart = [], tenantId, apiBase } = route.params;

  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastBarcode, setLastBarcode] = useState<string | null>(null);
  const lockRef = useRef(false);

  const canScan = useMemo(() => {
    return !isProcessing && !lockRef.current;
  }, [isProcessing]);

  const fetchProductByBarcode = async (barcode: string): Promise<ProductLookup> => {
    const response = await fetch(
      `${apiBase}/commerce/products/barcode/${encodeURIComponent(barcode)}`
    );

    const data = await response.json();

    if (!response.ok || !data?.id) {
      throw new Error(data?.message ?? 'Produit non trouvé');
    }

    if (data.tenantId !== tenantId) {
      throw new Error('Produit hors de votre commerce');
    }

    return data;
  };

  const addProductToCart = (
    currentCart: CartItem[],
    product: ProductLookup
  ): CartItem[] => {
    const existing = currentCart.find((item) => item.productId === product.id);

    if (existing) {
      if (existing.quantity + 1 > existing.stock) {
        throw new Error(`Stock insuffisant. Stock dispo : ${existing.stock}`);
      }

      return currentCart.map((item) =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
    }

    if (product.stock <= 0) {
      throw new Error('Produit en rupture de stock');
    }

    return [
      ...currentCart,
      {
        productId: product.id,
        name: product.name,
        price: Number(product.price),
        quantity: 1,
        stock: Number(product.stock),
        barcode: product.barcode ?? null,
      },
    ];
  };

  const handleDetected = async ({ data }: { data: string }) => {
    if (!data || !canScan) return;

    if (lastBarcode === data) return;

    try {
      lockRef.current = true;
      setIsProcessing(true);
      setLastBarcode(data);

      const product = await fetchProductByBarcode(data);
      const updatedCart = addProductToCart(cart, product);

      navigation.replace('Cashier', {
        restoredCart: updatedCart,
      });
    } catch (error: any) {
      Alert.alert('Scan impossible', error?.message ?? 'Erreur inconnue');
      setTimeout(() => {
        setLastBarcode(null);
        lockRef.current = false;
        setIsProcessing(false);
      }, 1200);
      return;
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
          La caissière doit autoriser la caméra pour scanner les produits.
        </Text>

        <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
          <Text style={styles.primaryBtnText}>Autoriser la caméra</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.secondaryBtnText}>Retour caisse</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Scan produit</Text>
        <Text style={styles.headerSubtitle}>
          Place le code-barres dans le cadre
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
            ? 'Traitement du scan...'
            : 'Scanne un article pour l’ajouter au panier'}
        </Text>

        <View style={styles.footerButtons}>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.secondaryBtnText}>Retour caisse</Text>
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
