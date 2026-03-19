import React, { useMemo, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  ScrollView,
} from 'react-native';

type PaymentMethod = 'cash' | 'wave' | 'orange_money' | 'card';

type PaymentScreenProps = {
  saleId: string;
  total: number;
  alreadyPaid?: number;
  onDone?: () => void;
};

const API_BASE = 'https://sunusuite-production.up.railway.app/api/v1';

export default function PaymentScreen({
  saleId,
  total,
  alreadyPaid = 0,
  onDone,
}: PaymentScreenProps) {
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [amount, setAmount] = useState(String(Math.max(total - alreadyPaid, 0)));
  const [phoneNumber, setPhoneNumber] = useState('');
  const [reference, setReference] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastPaymentId, setLastPaymentId] = useState<string | null>(null);
  const [paidSoFar, setPaidSoFar] = useState(alreadyPaid);

  const balance = useMemo(() => {
    return Math.max(total - paidSoFar, 0);
  }, [total, paidSoFar]);

  const parsedAmount = useMemo(() => {
    const n = Number(amount);
    return Number.isFinite(n) ? n : 0;
  }, [amount]);

  const isMobileMoney = method === 'wave' || method === 'orange_money';

  const resetFieldsAfterPayment = () => {
    setReference('');
    if (!isMobileMoney) {
      setPhoneNumber('');
    }
  };

  const createCashOrCardPayment = async () => {
    const response = await fetch(`${API_BASE}/commerce/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        saleId,
        method,
        amount: parsedAmount,
        reference: reference || undefined,
        phoneNumber: phoneNumber || undefined,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.message ?? 'Paiement impossible');
    }

    return data;
  };

  const initiateMobileMoney = async () => {
    const response = await fetch(`${API_BASE}/commerce/mobile-money/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        saleId,
        provider: method,
        amount: parsedAmount,
        phoneNumber,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.message ?? 'Initiation mobile money impossible');
    }

    return data;
  };

  const confirmPendingMobileMoney = async (paymentId: string) => {
    const response = await fetch(
      `${API_BASE}/commerce/mobile-money/${paymentId}/confirm`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          providerRef: reference || `${method.toUpperCase()}-CONF-${Date.now()}`,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.message ?? 'Confirmation impossible');
    }

    return data;
  };

  const handleSubmitPayment = async () => {
    if (balance <= 0) {
      Alert.alert('Déjà soldé', 'Cette vente est déjà entièrement payée.');
      return;
    }

    if (!parsedAmount || parsedAmount <= 0) {
      Alert.alert('Montant invalide', 'Entre un montant supérieur à 0.');
      return;
    }

    if (parsedAmount > balance) {
      Alert.alert(
        'Montant trop élevé',
        `Le reste à payer est de ${balance} FCFA.`
      );
      return;
    }

    if (isMobileMoney && !phoneNumber.trim()) {
      Alert.alert('Numéro requis', 'Entre le numéro du client.');
      return;
    }

    try {
      setLoading(true);

      if (method === 'cash' || method === 'card') {
        const payment = await createCashOrCardPayment();

        setPaidSoFar((prev) => prev + Number(payment.amount));
        setLastPaymentId(payment.id ?? null);
        resetFieldsAfterPayment();
        setAmount(String(Math.max(balance - Number(payment.amount), 0)));

        Alert.alert(
          'Paiement enregistré',
          `${method === 'cash' ? 'Espèces' : 'Carte'} : ${payment.amount} FCFA`
        );

        if (balance - Number(payment.amount) <= 0 && onDone) {
          onDone();
        }

        return;
      }

      const pendingPayment = await initiateMobileMoney();

      setLastPaymentId(pendingPayment.paymentId ?? null);

      Alert.alert(
        'Paiement initié',
        `${method === 'wave' ? 'Wave' : 'Orange Money'} en attente.\nRéférence: ${pendingPayment.reference}`
      );
    } catch (error: any) {
      Alert.alert('Erreur', error?.message ?? 'Paiement impossible');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPending = async () => {
    if (!lastPaymentId) {
      Alert.alert('Aucun paiement', 'Aucun paiement pending à confirmer.');
      return;
    }

    try {
      setLoading(true);

      const confirmed = await confirmPendingMobileMoney(lastPaymentId);

      setPaidSoFar((prev) => prev + Number(confirmed.amount));
      setAmount(String(Math.max(balance - Number(confirmed.amount), 0)));
      resetFieldsAfterPayment();

      Alert.alert(
        'Paiement confirmé',
        `${confirmed.method} confirmé pour ${confirmed.amount} FCFA`
      );

      if (balance - Number(confirmed.amount) <= 0 && onDone) {
        onDone();
      }
    } catch (error: any) {
      Alert.alert('Erreur', error?.message ?? 'Confirmation impossible');
    } finally {
      setLoading(false);
    }
  };

  const MethodButton = ({
    value,
    label,
  }: {
    value: PaymentMethod;
    label: string;
  }) => {
    const selected = method === value;

    return (
      <TouchableOpacity
        style={[styles.methodBtn, selected && styles.methodBtnSelected]}
        onPress={() => setMethod(value)}
      >
        <Text
          style={[styles.methodBtnText, selected && styles.methodBtnTextSelected]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Paiement</Text>
        <Text style={styles.subtitle}>Choisis le moyen de paiement</Text>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total vente</Text>
            <Text style={styles.summaryValue}>{total} FCFA</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Déjà payé</Text>
            <Text style={styles.summaryValue}>{paidSoFar} FCFA</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabelStrong}>Reste à payer</Text>
            <Text style={styles.summaryValueStrong}>{balance} FCFA</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Moyen de paiement</Text>

        <View style={styles.methodsGrid}>
          <MethodButton value="cash" label="Espèces" />
          <MethodButton value="wave" label="Wave" />
          <MethodButton value="orange_money" label="Orange Money" />
          <MethodButton value="card" label="Carte" />
        </View>

        <Text style={styles.sectionTitle}>Montant</Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          style={styles.input}
          placeholder="Montant"
          placeholderTextColor="#7b8190"
        />

        {isMobileMoney && (
          <>
            <Text style={styles.sectionTitle}>Numéro client</Text>
            <TextInput
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              style={styles.input}
              placeholder="Ex: 770000000"
              placeholderTextColor="#7b8190"
            />
          </>
        )}

        <Text style={styles.sectionTitle}>Référence (optionnel)</Text>
        <TextInput
          value={reference}
          onChangeText={setReference}
          style={styles.input}
          placeholder="Ex: TRX-001"
          placeholderTextColor="#7b8190"
        />

        <TouchableOpacity
          style={[styles.primaryBtn, loading && styles.btnDisabled]}
          onPress={handleSubmitPayment}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>
              {isMobileMoney ? 'Initier le paiement' : 'Valider le paiement'}
            </Text>
          )}
        </TouchableOpacity>

        {isMobileMoney && (
          <TouchableOpacity
            style={[styles.secondaryBtn, loading && styles.btnDisabled]}
            onPress={handleConfirmPending}
            disabled={loading}
          >
            <Text style={styles.secondaryBtnText}>Confirmer le paiement pending</Text>
          </TouchableOpacity>
        )}

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Logique actuelle</Text>
          <Text style={styles.infoText}>
            - Cash / Carte : paiement direct{'\n'}
            - Wave / Orange Money : création en pending puis confirmation{'\n'}
            - Paiement partiel autorisé tant que le reste à payer est positif
          </Text>
        </View>
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
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#101828',
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 16,
    fontSize: 14,
    color: '#667085',
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 15,
    color: '#475467',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#101828',
  },
  summaryLabelStrong: {
    fontSize: 17,
    fontWeight: '700',
    color: '#101828',
  },
  summaryValueStrong: {
    fontSize: 20,
    fontWeight: '800',
    color: '#16a34a',
  },
  sectionTitle: {
    marginTop: 8,
    marginBottom: 8,
    fontSize: 15,
    fontWeight: '700',
    color: '#344054',
  },
  methodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  methodBtn: {
    minWidth: '47%',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d0d5dd',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  methodBtnSelected: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  methodBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#101828',
  },
  methodBtnTextSelected: {
    color: '#fff',
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: '#d0d5dd',
    borderRadius: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#101828',
    marginBottom: 8,
  },
  primaryBtn: {
    height: 54,
    borderRadius: 14,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  secondaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.7,
  },
  infoBox: {
    marginTop: 18,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#101828',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#475467',
  },
});
