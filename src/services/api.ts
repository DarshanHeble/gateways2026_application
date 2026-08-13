import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Determine the local machine's IP address automatically for Expo Go / Emulator:
// - Android Emulator uses 10.0.2.2 instead of localhost
// - Physical device uses the Expo packager host IP (e.g. 10.150.159.192)
// - iOS Simulator and Web use localhost
const getApiBaseUrl = () => {
  if (Platform.OS === 'android') {
    const rawHost = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoGo?.debuggerHost || '';
    // If running via Expo Tunnel (e.g. *.exp.direct), stripping hostUri gives an unroutable tunnel domain for port 4000.
    // In that case, fall back to local LAN IP or 10.0.2.2 emulator loopback.
    if (rawHost && !rawHost.includes('exp.direct')) {
      const ip = rawHost.split(':')[0];
      return `http://${ip}:4000/api`;
    }
    // Default local network IP fallback for dev physical device / Android emulator
    return 'http://10.0.2.2:4000/api';
  }
  return 'http://localhost:4000/api';
};

const API_BASE_URL = getApiBaseUrl();

export interface EventHead {
  name: string;
  role: string;
  phone: string;
  email: string;
}

export interface EventItem {
  id: string;
  title: string;
  subtitle?: string;
  date: string;
  from_time: string;
  end_time: string;
  venue: string;
  type: string;
  image_url?: string;
  description: string;
  rules: string[];
  rules_pdf_url?: string;
  eligibility: string[];
  prizes: {
    winner?: string;
    runner_up?: string;
    second_runner_up?: string;
  };
  event_heads: EventHead[];
}

export interface ScheduleItem {
  id: string;
  title: string;
  subtitle?: string;
  date: string;
  from_time: string;
  end_time: string;
  venue: string;
  category: string;
  is_competition: boolean;
}

export interface ScheduleDay {
  day_number: number;
  date: string;
  display_date: string;
  timeline: ScheduleItem[];
}

export interface ScheduleResponse {
  days: ScheduleDay[];
}

export async function fetchEvents(): Promise<EventItem[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/events`);
    if (!response.ok) {
      throw new Error(`Failed to fetch events: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching events from backend:', error);
    throw error;
  }
}

export async function fetchSchedule(): Promise<ScheduleResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/schedule`);
    if (!response.ok) {
      throw new Error(`Failed to fetch schedule: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching schedule from backend:', error);
    throw error;
  }
}
