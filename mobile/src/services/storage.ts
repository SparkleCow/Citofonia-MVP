import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const TOKEN_KEY = 'citofonia_token';
const USER_KEY = 'citofonia_user';
const web = Platform.OS === 'web';

async function set(key: string, value: string) {
  if (web) return AsyncStorage.setItem(key, value);
  return SecureStore.setItemAsync(key, value);
}

async function get(key: string): Promise<string | null> {
  if (web) return AsyncStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

async function del(key: string) {
  if (web) return AsyncStorage.removeItem(key);
  return SecureStore.deleteItemAsync(key);
}

export async function saveToken(token: string) {
  await set(TOKEN_KEY, token);
}
export async function getToken(): Promise<string | null> {
  return get(TOKEN_KEY);
}
export async function removeToken() {
  await del(TOKEN_KEY);
}

export async function saveUser(user: any) {
  await set(USER_KEY, JSON.stringify(user));
}
export async function getUser(): Promise<any | null> {
  const raw = await get(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
export async function removeUser() {
  await del(USER_KEY);
}

export async function clearSession() {
  await Promise.all([removeToken(), removeUser()]);
}
