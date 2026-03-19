import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const API_BASE = 'https://sunusuite-production.up.railway.app/api/v1';

type ReceiptScreenProps = {
  route: {
    params: {
      saleId: string;
    };
  };
  navigation: any;
};

export default function ReceiptScreen({
  route,
  navigation,
}: ReceiptScreenProps) {
  const { saleId } = route.params;
  const [loading, setLoading] = useState(true);
  const [receipt, setReceipt] = useState<any>(null);

  const loadReceipt = async () => {
    try {
      setLoading(true);

      const response = await fetch(`${API_BASE}/commerce/receipts/${saleId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message ?? 'Impossible de charger le ticket');
      }

      setReceipt(data);
    } catch (error: any) {
      Alert.alert('Erreur', error?.message ?? 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReceipt();
  }, [saleId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (!receipt) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text>Ticket introuvable</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Ticket</Text>
        <Text style={styles.subtitle}>Vente #{receipt.saleId}</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Résumé</Text>

          <View style={styles.row}>
            <Text style={styles.label}>Statut</Text>
            <Text style={styles.value}>{receipt.status}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Total</Text>
            <Text style={styles.value}>{receipt.total} FCFA</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Payé</Text>
            <Text style={styles.value}>{receipt.paidAmount} FCFA</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.labelStrong}>Reste</Text>
            <Text style={styles.valueStrong}>{receipt.balance} FCFA</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Articles</Text>

          {receipt.items.map((item: any) => (
            <View key={`${item.productId}-${item.productName}`} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.productName}</Text>
                <Text style={styles.itemMeta}>
                  {item.unitPrice} FCFA × {item.quantity}
                </Text>
              </View>
              <Text style={styles.itemTotal}>{item.lineTotal} FCFA</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Paiements</Text>

          {receipt.payments.length === 0 ? (
            <Text style={styles.emptyText}>Aucun paiement enregistré</Text>
          ) : (
            receipt.payments.map((payment: any) => (
              <View key={payment.id} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{payment.method}</Text>
                  <Text style={styles.itemMeta}>
                    {payment.status}
                    {payment.reference ? ` • ${payment.reference}` : ''}
                  </Text>
                </View>
                <Text style={styles.itemTotal}>{payment.amount} FCFA</Text>
              </View>
            ))
          )}
        </View>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() =>
            navigation.reset({
              index: 0,
              routes: [{ name: 'Cashier' }],
            })
          }
        >
          <Text style={styles.primaryBtnText}>Nouvelle vente</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fb' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 36 },
  title: { fontSize: 28, fontWeight: '800', color: '#101828' },
  subtitle: { marginTop: 4, marginBottom: 16, color: '#667085' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#101828',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  label: { color: '#475467', fontSize: 15 },
  value: { color: '#101828', fontSize: 15, fontWeight: '700' },
  labelStrong: { color: '#101828', fontSize: 16, fontWeight: '800' },
  valueStrong: { color: '#16a34a', fontSize: 18, fontWeight: '800' },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  itemName: { fontSize: 15, fontWeight: '700', color: '#101828' },
  itemMeta: { marginTop: 4, fontSize: 13, color: '#667085' },
  itemTotal: { fontSize: 15, fontWeight: '800', color: '#101828' },
  emptyText: { color: '#667085' },
  primaryBtn: {
    height: 54,
    borderRadius: 14,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});
