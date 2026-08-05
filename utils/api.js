import { Platform } from 'react-native';
import Constants from 'expo-constants';

const REMOTE_API_BASE_URL = 'https://streamcircleserver-ys5j.onrender.com';

function normalizeBaseUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

function getExpoHost() {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.expoGoConfig?.debuggerHost ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    Constants.manifest?.debuggerHost ||
    '';

  return String(hostUri || '').split(':')[0] || null;
}

export function getApiBaseCandidates() {
  const candidates = [];
  const envBaseUrl = normalizeBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL);
  const expoHost = getExpoHost();

  if (envBaseUrl) {
    candidates.push(envBaseUrl);
  }

  if (__DEV__ && expoHost) {
    candidates.push(normalizeBaseUrl(`http://${expoHost}:3000`));
  }

  if (__DEV__ && Platform.OS === 'android') {
    candidates.push('http://10.0.2.2:3000');
  }

  if (__DEV__) {
    candidates.push('http://localhost:3000');
  }

  candidates.push(REMOTE_API_BASE_URL);

  return Array.from(new Set(candidates.filter(Boolean)));
}

export const API_BASE_URL = getApiBaseCandidates()[0];

export function buildApiUrl(path, params = {}, baseUrl = API_BASE_URL) {
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');

  return `${baseUrl}${path}${query ? `?${query}` : ''}`;
}

function isRetriableStatus(status) {
  return status === 404 || status >= 500;
}

function isLocalBaseUrl(baseUrl) {
  return /localhost|127\.0\.0\.1|10\.0\.2\.2|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\./.test(baseUrl);
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

let workingApiBaseUrl = null;

export async function fetchJson(path, params = {}) {
  const candidates = workingApiBaseUrl
    ? [workingApiBaseUrl, ...getApiBaseCandidates().filter((baseUrl) => baseUrl !== workingApiBaseUrl)]
    : getApiBaseCandidates();
  let lastError = null;

  for (const baseUrl of candidates) {
    try {
      const response = await fetchWithTimeout(
        buildApiUrl(path, params, baseUrl),
        isLocalBaseUrl(baseUrl) ? 1600 : 8000
      );

      if (!response.ok) {
        if (isRetriableStatus(response.status)) {
          lastError = new Error(`Request failed with status ${response.status}`);
          continue;
        }

        throw new Error(`Request failed with status ${response.status}`);
      }

      workingApiBaseUrl = baseUrl;
      return response.json();
    } catch (error) {
      lastError = error;

      if (baseUrl === workingApiBaseUrl) {
        workingApiBaseUrl = null;
      }
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error('Request failed');
}
