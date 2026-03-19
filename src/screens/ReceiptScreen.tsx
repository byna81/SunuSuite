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

type ReceiptItem = {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

type ReceiptPayment = {
  id: string;
  method: string;
  amount: number;
  status: string;
  reference?: string | null;
  phoneNumber?: string | null;
  createdAt: string;
};

type ReceiptData = {
  saleId: string;
  tenantId: string;
  createdAt: string;
  status: string;
  total: number;
  paidAmount: number;
  balance: number;
  items: ReceiptItem[];
  payments: ReceiptPayment[];
};

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
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

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

  const formatMethod = (method: string) => {
    switch (method) {
      case 'cash':
        return 'Espèces';
      case 'wave':
        return 'Wave';
      case 'orange_money':
        return 'Orange Money';
      case 'card':
        return 'Carte';
      default:
        return method;
    }
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Payé';
      case 'partial':
        return 'Partiel';
      case 'unpaid':
        return 'Non payé';
      case 'pending':
        return 'En attente';
      case 'failed':
        return 'Échoué';
      default:
        return status;
    }
  };

  const handleNewSale = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Cashier' }],
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator />
        <Text style={styles.loadingText}>Chargement du ticket...</Text>
      </SafeAreaView>
    );
  }

  if (!receipt) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorTitle}>Ticket introuvable</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={handleNewSale}>
          <Text style={styles.primaryBtnText}>Retour caisse</Text>
        </TouchableOpacity>
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
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>
              {new Date(receipt.createdAt).toLocaleString()}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Statut</Text>
            <Text style={styles.value}>{formatStatus(receipt.status)}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Total</Text>
            <Text style={styles.value}>{receipt.total} FCFA</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Montant payé</Text>
            <Text style={styles.value}>{receipt.paidAmount} FCFA</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.labelStrong}>Reste à payer</Text>
            <Text style={styles.valueStrong}>{receipt.balance} FCFA</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Articles</Text>

          {receipt.items.length === 0 ? (
            <Text style={styles.emptyText}>Aucun article</Text>
          ) : (
            receipt.items.map((item, index) => (
              <View key={`${item.productId}-${index}`} style={styles.itemRow}>
                <View style={styles.itemLeft}>
                  <Text style={styles.itemName}>{item.productName}</Text>
                  <Text style={styles.itemMeta}>
                    {item.unitPrice} FCFA × {item.quantity}
                  </Text>
                </View>
                <Text style={styles.itemTotal}>{item.lineTotal} FCFA</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Paiements</Text>

          {receipt.payments.length === 0 ? (
            <Text style={styles.emptyText}>Aucun paiement enregistré</Text>
          ) : (
            receipt.payments.map((payment) => (
              <View key={payment.id} style={styles.paymentRow}>
                <View style={styles.paymentLeft}>
                  <Text style={styles.itemName}>{formatMethod(payment.method)}</Text>
                  <Text style={styles.itemMeta}>
                    {formatStatus(payment.status)}
                    {payment.reference ? ` • ${payment.reference}` : ''}
                  </Text>
                  {payment.phoneNumber ? (
                    <Text style={styles.itemMeta}>{payment.phoneNumber}</Text>
                  ) : null}
                </View>

                <Text style={styles.itemTotal}>{payment.amount} FCFA</Text>
              </View>
            ))
          )}
        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={handleNewSale}>
          <Text style={styles.primaryBtnText}>Nouvelle vente</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fb',
  },
  content: {
    padding: 16,
    paddingBottom: 36,
  },
  centered: {
    flex: 1,
    backgroundColor: '#f5f7fb',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#667085',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#101828',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#101828',
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 16,
    color: '#667085',
    fontSize: 14,
  },
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
    gap: 12,
    marginBottom: 10,
  },
  label: {
    color: '#475467',
    fontSize: 15,
    flex: 1,
  },
  value: {
    color: '#101828',
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
  },
  labelStrong: {
    color: '#101828',
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },
  valueStrong: {
    color: '#16a34a',
    fontSize: 18,
    fontWeight: '800',
    flex: 1,
    textAlign: 'right',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  itemLeft: {
    flex: 1,
  },
  paymentLeft: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#101828',
  },
  itemMeta: {
    marginTop: 4,
    fontSize: 13,
    color: '#667085',
  },
  itemTotal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#101828',
    textAlign: 'right',
  },
  emptyText: {
    color: '#667085',
    fontSize: 14,
  },
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
