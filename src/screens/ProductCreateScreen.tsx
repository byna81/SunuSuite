import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type Category = {
  id: string;
  tenantId: string;
  name: string;
  createdAt: string;
};

type ProductCreateScreenProps = {
  navigation: any;
  route?: {
    params?: {
      scannedBarcode?: string;
    };
  };
};

const API_BASE = 'https://sunusuite-production.up.railway.app/api/v1';
const TENANT_ID = 'b1a2c3d4-e5f6-7890-abcd-123456789000';

export default function ProductCreateScreen({
  navigation,
  route,
}: ProductCreateScreenProps) {
  const scannedBarcode = route?.params?.scannedBarcode ?? '';

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [barcode, setBarcode] = useState(scannedBarcode);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<string>('');
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (scannedBarcode) {
      setBarcode(scannedBarcode);
    }
  }, [scannedBarcode]);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);

      const response = await fetch(
        `${API_BASE}/commerce/categories?tenantId=${TENANT_ID}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message ?? 'Impossible de charger les catégories');
      }

      setCategories(Array.isArray(data) ? data : []);

      if (Array.isArray(data) && data.length > 0 && !categoryId) {
        setCategoryId(data[0].id);
      }
    } catch (error: any) {
      Alert.alert(
        'Erreur',
        error?.message ?? 'Impossible de charger les catégories'
      );
    } finally {
      setLoadingCategories(false);
    }
  };

  const validate = () => {
    if (!name.trim()) {
      Alert.alert('Champ requis', 'Le nom du produit est obligatoire');
      return false;
    }

    if (!price.trim() || Number(price) <= 0) {
      Alert.alert('Champ invalide', 'Le prix doit être supérieur à 0');
      return false;
    }

    if (!stock.trim() || Number(stock) < 0) {
      Alert.alert('Champ invalide', 'Le stock doit être 0 ou plus');
      return false;
    }

    if (!categoryId) {
      Alert.alert('Champ requis', 'Choisis une catégorie');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;

    try {
      setSaving(true);

      const payload = {
        tenantId: TENANT_ID,
        categoryId,
        name: name.trim(),
        price: Number(price),
        stock: Number(stock),
        barcode: barcode.trim() || undefined,
      };

      const response = await fetch(`${API_BASE}/commerce/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message ?? 'Impossible de créer le produit');
      }

      Alert.alert('Produit créé', `${data.name} a été enregistré`, [
        {
          text: 'Nouveau produit',
          onPress: () => {
            setName('');
            setPrice('');
            setStock('');
            setBarcode('');
          },
        },
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      Alert.alert(
        'Erreur',
        error?.message ?? 'Impossible de créer le produit'
      );
    } finally {
      setSaving(false);
    }
  };

  const selectedCategory = categories.find((cat) => cat.id === categoryId);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Nouveau produit</Text>
        <Text style={styles.subtitle}>
          Crée un produit et associe-lui un code-barres
        </Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Informations produit</Text>

          <Text style={styles.label}>Nom du produit</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ex: Coca Cola 50cl"
            placeholderTextColor="#7b8190"
            style={styles.input}
          />

          <Text style={styles.label}>Prix</Text>
          <TextInput
            value={price}
            onChangeText={setPrice}
            placeholder="Ex: 500"
            placeholderTextColor="#7b8190"
            style={styles.input}
            keyboardType="numeric"
          />

          <Text style={styles.label}>Stock initial</Text>
          <TextInput
            value={stock}
            onChangeText={setStock}
            placeholder="Ex: 24"
            placeholderTextColor="#7b8190"
            style={styles.input}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Catégorie</Text>

          {loadingCategories ? (
            <ActivityIndicator />
          ) : categories.length === 0 ? (
            <Text style={styles.emptyText}>
              Aucune catégorie trouvée. Crée d’abord une catégorie.
            </Text>
          ) : (
            <View style={styles.categoryList}>
              {categories.map((category) => {
                const selected = category.id === categoryId;

                return (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryChip,
                      selected && styles.categoryChipSelected,
                    ]}
                    onPress={() => setCategoryId(category.id)}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        selected && styles.categoryChipTextSelected,
                      ]}
                    >
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {selectedCategory ? (
            <Text style={styles.selectedText}>
              Catégorie choisie : {selectedCategory.name}
            </Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Code-barres</Text>

          <Text style={styles.label}>Barcode</Text>
          <TextInput
            value={barcode}
            onChangeText={setBarcode}
            placeholder="Ex: 6151234567890"
            placeholderTextColor="#7b8190"
            style={styles.input}
            keyboardType="number-pad"
          />

          <TouchableOpacity
            style={styles.scanBtn}
            onPress={() => navigation.navigate('ProductBarcodeScanner')}
          >
            <Text style={styles.scanBtnText}>Scanner le code-barres</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => setBarcode('')}
          >
            <Text style={styles.secondaryBtnText}>Effacer le code-barres</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.btnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Enregistrer le produit</Text>
          )}
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
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#344054',
    marginBottom: 8,
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
    marginBottom: 12,
  },
  categoryList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#f2f4f7',
  },
  categoryChipSelected: {
    backgroundColor: '#111827',
  },
  categoryChipText: {
    color: '#101828',
    fontWeight: '700',
    fontSize: 14,
  },
  categoryChipTextSelected: {
    color: '#fff',
  },
  selectedText: {
    marginTop: 12,
    fontSize: 13,
    color: '#667085',
  },
  scanBtn: {
    height: 50,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  scanBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  secondaryBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: '#3730a3',
    fontWeight: '700',
    fontSize: 14,
  },
  saveBtn: {
    height: 54,
    borderRadius: 14,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  btnDisabled: {
    opacity: 0.7,
  },
  emptyText: {
    color: '#667085',
    fontSize: 14,
  },
});
