import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

/**
 * Split matches the web app's shopper identity: the signed token is the
 * sensitive bit (SecureStore), everything else is a plain preference
 * (AsyncStorage). No refresh pair here — the shopper token is long-lived
 * and self-verifying (see actions/shoppers.ts), unlike a short-lived JWT.
 */
export async function loadSecureFromStorage(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (err) {
    console.error(`error loading secure key ${key} from storage`, err);
    return null;
  }
}

export async function saveSecureToStorage(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (err) {
    console.error(`error saving secure key ${key} to storage`, err);
  }
}

export async function removeSecureFromStorage(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (err) {
    console.error(`error removing secure key ${key} from storage`, err);
  }
}

export async function loadFromStorage<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (err) {
    console.error(`error loading key ${key} from storage`, err);
    return null;
  }
}

export async function saveToStorage<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`error saving key ${key} to storage`, err);
  }
}
