import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Keyboard,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';

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

type CashierScreenProps = {
  navigation: any;
};

const API_BASE = 'https://sunusuite-production.up.railway.app/api/v1';
const TENANT_ID = 'b1a2c3d4-e5f6-7890-abcd-123456789000';

export default function CashierScreen({ navigation }: CashierScreenProps) {
  const [barcode, setBarcode] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loadingScan, setLoadingScan] = useState(false);
  const [loadingCheckout, setLoadingCheckout] = useState(false);

  const total = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  const totalItems = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const fetchProductByBarcode = async (value: string): Promise<ProductLookup> => {
    const response = await fetch(
      `${API_BASE}/commerce/products/barcode/${encodeURIComponent(value.trim())}`
    );

    const data = await response.json();

    if (!response.ok || !data?.id) {
      throw new Error(data?.message ?? 'Produit non trouvé');
    }

    if (data.tenantId !== TENANT_ID) {
      throw new Error('Produit hors de votre commerce');
    }

    return data;
  };

  const addProductToCart = (product: ProductLookup) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);

      if (existing) {
        if (existing.quantity + 1 > existing.stock) {
          Alert.alert('Stock insuffisant', `Stock disponible : ${existing.stock}`);
          return prev;
        }

        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      if (product.stock <= 0) {
        Alert.alert('Rupture', 'Ce produit est en rupture de stock');
        return prev;
      }

      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: Number(product.price),
          quantity: 1,
          stock: Number(product.stock),
          barcode: product.barcode ?? null,
        },
      ];
    });
  };

  const handleScanSubmit = async () => {
    const value = barcode.trim();

    if (!value) return;

    try {
      setLoadingScan(true);
      Keyboard.dismiss();

      const product = await fetchProductByBarcode(value);
      addProductToCart(product);
      setBarcode('');
    } catch (error: any) {
      Alert.alert('Scan impossible', error?.message ?? 'Produit non trouvé');
    } finally {
      setLoadingScan(false);
    }
  };

  const increaseQty = (productId: string) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) return item;

        if (item.quantity + 1 > item.stock) {
          Alert.alert('Stock insuffisant', `Stock disponible : ${item.stock}`);
          return item;
        }

        return { ...item, quantity: item.quantity + 1 };
      })
    );
  };

  const decreaseQty = (productId: string) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.productId === productId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const clearCart = () => {
    if (cart.length === 0) return;

    Alert.alert('Vider le panier', 'Supprimer tous les articles ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Vider', style: 'destructive', onPress: () => setCart([]) },
    ]);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      Alert.alert('Panier vide', 'Ajoute au moins un produit');
      return;
    }

    try {
      setLoadingCheckout(true);

      const payload = {
        tenantId: TENANT_ID,
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      };

      const response = await fetch(`${API_BASE}/commerce/sales`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message ?? 'Erreur lors de la vente');
      }

      setCart([]);

      navigation.navigate('Payment', {
        saleId: data.id,
        total: Number(data.total),
        alreadyPaid: 0,
      });
    } catch (error: any) {
      Alert.alert('Encaissement impossible', error?.message ?? 'Erreur inconnue');
    } finally {
      setLoadingCheckout(false);
    }
  };

  const renderItem = ({ item }: { item: CartItem }) => {
    const lineTotal = item.price * item.quantity;

    return (
      <View style={styles.cartItem}>
        <View style={styles.cartMain}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemMeta}>
            {item.price} FCFA × {item.quantity}
          </Text>
          <Text style={styles.itemStock}>Stock: {item.stock}</Text>
        </View>

        <View style={styles.cartSide}>
          <Text style={styles.lineTotal}>{lineTotal} FCFA</Text>

          <View style={styles.qtyRow}>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => decreaseQty(item.productId)}
            >
              <Text style={styles.qtyBtnText}>−</Text>
            </TouchableOpacity>

            <Text style={styles.qtyValue}>{item.quantity}</Text>

            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => increaseQty(item.productId)}
            >
              <Text style={styles.qtyBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.removeBtn}
            onPress={() => removeItem(item.productId)}
          >
            <Text style={styles.removeBtnText}>Supprimer</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Caisse</Text>
        <Text style={styles.subtitle}>
          {totalItems} article(s) • {total} FCFA
        </Text>
      </View>

      <View style={styles.scanBox}>
        <Text style={styles.label}>Scanner ou saisir le code-barres</Text>

        <View style={styles.scanRow}>
          <TextInput
            value={barcode}
            onChangeText={setBarcode}
            placeholder="Ex: 6151234567890"
            placeholderTextColor="#7b8190"
            style={styles.input}
            keyboardType="number-pad"
            returnKeyType="done"
            onSubmitEditing={handleScanSubmit}
          />

          <TouchableOpacity
            style={styles.scanBtn}
            onPress={handleScanSubmit}
            disabled={loadingScan}
          >
            {loadingScan ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.scanBtnText}>Ajouter</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.sectionTitle}>Panier</Text>
        <TouchableOpacity onPress={clearCart}>
          <Text style={styles.clearText}>Vider</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={cart}
        keyExtractor={(item) => item.productId}
        renderItem={renderItem}
        contentContainerStyle={
          cart.length === 0 ? styles.emptyListContainer : styles.listContent
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Aucun article</Text>
            <Text style={styles.emptyText}>
              Scanne un produit pour l’ajouter au panier.
            </Text>
          </View>
        }
      />

      <View style={styles.footer}>
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{total} FCFA</Text>
        </View>

        <TouchableOpacity
          style={[styles.checkoutBtn, loadingCheckout && styles.checkoutBtnDisabled]}
          onPress={handleCheckout}
          disabled={loadingCheckout}
        >
          {loadingCheckout ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.checkoutBtnText}>Encaisser</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fb',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#101828',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#667085',
  },
  scanBox: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#344054',
    marginBottom: 10,
  },
  scanRow: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    flex: 1,
    height: 52,
    borderWidth: 1,
    borderColor: '#d0d5dd',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#101828',
    backgroundColor: '#fff',
  },
  scanBtn: {
    minWidth: 110,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  scanBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  listHeader: {
    marginTop: 14,
    marginBottom: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#101828',
  },
  clearText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#b42318',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
    gap: 10,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  emptyBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#101828',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: '#667085',
    textAlign: 'center',
  },
  cartItem: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  cartMain: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#101828',
  },
  itemMeta: {
    marginTop: 6,
    fontSize: 14,
    color: '#475467',
  },
  itemStock: {
    marginTop: 4,
    fontSize: 12,
    color: '#667085',
  },
  cartSide: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  lineTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#101828',
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 8,
  },
  qtyBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#eaecf0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#101828',
    lineHeight: 22,
  },
  qtyValue: {
    minWidth: 18,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#101828',
  },
  removeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#fef3f2',
  },
  removeBtnText: {
    color: '#b42318',
    fontWeight: '600',
    fontSize: 12,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eaecf0',
  },
  totalBox: {
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475467',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#101828',
  },
  checkoutBtn: {
    height: 54,
    borderRadius: 14,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutBtnDisabled: {
    opacity: 0.7,
  },
  checkoutBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
});
