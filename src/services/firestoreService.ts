// src/services/firestoreService.ts
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
// Collection references
const productsCollection = collection(db, 'products');
const salesCollection = collection(db, 'sales');
const uploadsCollection = collection(db, 'uploads');

interface ProductData {
  id?: string;
  'Item Name': string;
  'Category': string;
  'Price': number;
  'Quantity': number;
  'Supplier': string;
  'Last Updated': string;
  userId: string;
}

interface SaleData {
  id?: string;
  Date: string;
  item: string;
  price: number;
  qty: number;
  'sold to'?: string;
  'total price': number;
  userId: string;
}

interface UploadData {
  id?: string;
  file_name: string;
  upload_date: string;
  processed: boolean;
  total_rows: number;
  userId: string;
}

// --- Products CRUD ---
export const addProduct = async (productData: Omit<ProductData, 'id'>, userId: string) => {
  try {
    const docRef = await addDoc(productsCollection, { ...productData, userId });
    return docRef.id;
  } catch (error) {
    console.error('Error adding product: ', error);
    throw error;
  }
};

export const getProducts = async (userId: string): Promise<ProductData[]> => {
  try {
    const q = query(productsCollection, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const products = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as ProductData));
    return products;
  } catch (error) {
    console.error('Error getting products: ', error);
    throw error;
  }
};

export const updateProduct = async (id: string, productData: Partial<ProductData>) => {
  try {
    const productDoc = doc(db, 'products', id);
    await updateDoc(productDoc, productData);
  } catch (error) {
    console.error('Error updating product: ', error);
    throw error;
  }
};

export const deleteProduct = async (id: string) => {
  try {
    const productDoc = doc(db, 'products', id);
    await deleteDoc(productDoc);
  } catch (error) {
    console.error('Error deleting product: ', error);
    throw error;
  }
};

export const onInventoryChange = (userId: string, callback: (products: ProductData[]) => void, onError: (error: Error) => void) => {
  const q = query(productsCollection, where('userId', '==', userId));
  return onSnapshot(q, (querySnapshot) => {
    const products = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as ProductData));
    callback(products);
  }, (error) => {
    console.error('Error getting real-time products: ', error);
    onError(error);
  });
};

// --- Sales CRUD ---
export const addSale = async (saleData: Omit<SaleData, 'id'>, userId: string) => {
  try {
    const docRef = await addDoc(salesCollection, { ...saleData, userId });
    return docRef.id;
  } catch (error) {
    console.error('Error adding sale: ', error);
    throw error;
  }
};

export const getSales = async (userId: string): Promise<SaleData[]> => {
  try {
    const q = query(salesCollection, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const sales = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as SaleData));
    return sales;
  } catch (error) {
    console.error('Error getting sales: ', error);
    throw error;
  }
};

export const updateSale = async (id: string, saleData: Partial<SaleData>) => {
  try {
    const saleDoc = doc(db, 'sales', id);
    await updateDoc(saleDoc, saleData);
  } catch (error) {
    console.error('Error updating sale: ', error);
    throw error;
  }
};

export const deleteSale = async (id: string) => {
  try {
    const saleDoc = doc(db, 'sales', id);
    await deleteDoc(saleDoc);
  } catch (error) {
    console.error('Error deleting sale: ', error);
    throw error;
  }
};

export const getMonthlySales = async (userId: string): Promise<SaleData[]> => {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

    const q = query(salesCollection, where('Date', '>=', startOfMonth), where('Date', '<=', endOfMonth), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const sales = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as SaleData));
    return sales;
  } catch (error) {
    console.error('Error getting monthly sales: ', error);
    throw error;
  }
};

// --- Uploads CRUD ---
export const addUpload = async (uploadData: Omit<UploadData, 'id'>, userId: string) => {
  try {
    const docRef = await addDoc(uploadsCollection, { ...uploadData, userId });
    return docRef.id;
  } catch (error) {
    console.error('Error adding upload: ', error);
    throw error;
  }
};

export const getUploads = async (userId: string): Promise<UploadData[]> => {
  try {
    const q = query(uploadsCollection, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const uploads = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as UploadData));
    return uploads;
  } catch (error) {
    console.error('Error getting uploads: ', error);
    throw error;
  }
};

export const updateUpload = async (id: string, uploadData: Partial<UploadData>) => {
  try {
    const uploadDoc = doc(db, 'uploads', id);
    await updateDoc(uploadDoc, uploadData);
  } catch (error) {
    console.error('Error updating upload: ', error);
    throw error;
  }
};

export const deleteUpload = async (id: string) => {
  try {
    const uploadDoc = doc(db, 'uploads', id);
    await deleteDoc(uploadDoc);
  } catch (error) {
    console.error('Error deleting upload: ', error);
    throw error;
  }
};
