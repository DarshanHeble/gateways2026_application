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

export const MOCK_EVENTS: EventItem[] = [
  {
    id: "hackathon",
    title: "Hackathon",
    subtitle: "24-Hour Code Sprint",
    date: "2026-09-15",
    from_time: "9:00 AM",
    end_time: "9:00 AM",
    venue: "Central Block - Labs 3 & 4",
    type: "Technical",
    image_url: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d",
    description: "Build innovative software solutions to real-world problem statements within 24 hours.",
    rules: [
      "1. Team size: 2 to 4 members",
      "2. Participants must bring their own laptops and hardware",
      "3. Pre-built code is strictly prohibited",
      "4. Decisions by the jury will be final.",
    ],
    rules_pdf_url: "https://drive.google.com",
    eligibility: ["Open to all undergraduate and postgraduate students. Valid college ID mandatory."],
    prizes: {
      winner: "₹15,000 + Trophy",
      runner_up: "₹10,000 + Certificate",
      second_runner_up: "₹5,000 + Certificate",
    },
    event_heads: [
      { name: "Rahul Sharma", role: "Student Coordinator", phone: "9876543210", email: "rahul@gateways.in" },
      { name: "Prof. Ananya Roy", role: "Faculty Coordinator", phone: "9876543211", email: "ananya@gateways.in" },
    ],
  },
  {
    id: "ui-ux",
    title: "UI/UX Design Blitz",
    subtitle: "Design the Future",
    date: "2026-09-15",
    from_time: "10:30 AM",
    end_time: "1:30 PM",
    venue: "Computer Lab 1",
    type: "Technical",
    image_url: "https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e",
    description: "Express your creativity by designing intuitive, aesthetically pleasing UI prototypes for a given theme within 3 hours.",
    rules: [
      "1. Individual or Duo (Max 2 per team)",
      "2. Allowed tools: Figma, Adobe XD",
      "3. Assets must be created during the event",
      "4. Presentation time: 3 mins per team.",
    ],
    rules_pdf_url: "https://drive.google.com",
    eligibility: ["Open to all registered fest participants."],
    prizes: {
      winner: "₹8,000 + Trophy",
      runner_up: "₹5,000 + Certificate",
      second_runner_up: "₹2,500 + Certificate",
    },
    event_heads: [
      { name: "Gokul K", role: "Event Lead", phone: "9876543212", email: "gokul@gateways.in" },
      { name: "Meera Nair", role: "Student Head", phone: "9876543213", email: "meera@gateways.in" },
    ],
  },
  {
    id: "coding-debugging",
    title: "Coding & Debugging",
    subtitle: "Code. Debug. Conquer.",
    date: "2026-09-15",
    from_time: "2:00 PM",
    end_time: "5:00 PM",
    venue: "Main Computer Lab",
    type: "Technical",
    image_url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c",
    description: "A two-round competitive coding battle testing speed, logic optimization, and bug-fixing skills.",
    rules: [
      "1. Individual participation",
      "2. Languages: C, C++, Java, Python",
      "3. Round 1: Debugging challenge (30 mins)",
      "4. Round 2: Algorithmic problem solving (90 mins).",
    ],
    rules_pdf_url: "https://drive.google.com",
    eligibility: ["Open to all UG/PG CS & IT students."],
    prizes: {
      winner: "₹10,000 + Trophy",
      runner_up: "₹6,000 + Certificate",
      second_runner_up: "₹3,000 + Certificate",
    },
    event_heads: [
      { name: "Priya Patel", role: "Student Coordinator", phone: "9876543214", email: "priya@gateways.in" },
      { name: "Dr. Suresh V", role: "Faculty Advisor", phone: "9876543215", email: "suresh@gateways.in" },
    ],
  },
  {
    id: "it-manager",
    title: "IT Manager",
    subtitle: "The Best Manager Hunt",
    date: "2026-09-15",
    from_time: "9:30 AM",
    end_time: "4:30 PM",
    venue: "Seminar Hall B",
    type: "Non-Technical",
    image_url: "https://images.unsplash.com/photo-1507679799987-c73779587ccf",
    description: "Test your leadership, crisis management, stress tolerance, and corporate strategy in this multi-round solo event.",
    rules: [
      "1. Individual participation",
      "2. Formal dress code mandatory",
      "3. Includes stress interview, aptitude test, and pitch rounds",
      "4. Judges decision is final.",
    ],
    rules_pdf_url: "https://drive.google.com",
    eligibility: ["Open to final year UG & PG students."],
    prizes: {
      winner: "₹12,000 + Trophy",
      runner_up: "₹7,000 + Certificate",
      second_runner_up: "₹3,500 + Certificate",
    },
    event_heads: [
      { name: "David Kumar", role: "Event Lead", phone: "9876543216", email: "david@gateways.in" },
      { name: "Sarah Thomas", role: "Student Head", phone: "9876543217", email: "sarah@gateways.in" },
    ],
  },
  {
    id: "photography",
    title: "Lens & Motion",
    subtitle: "Capture the Fest Moments",
    date: "2026-09-15",
    from_time: "9:00 AM",
    end_time: "5:00 PM",
    venue: "Campus Wide",
    type: "Non-Technical",
    image_url: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32",
    description: "Capture the energy, emotions, and essence of Gateways 2026 under specified prompt categories.",
    rules: [
      "1. Individual event",
      "2. Photos must be taken within campus during fest hours",
      "3. Basic color correction allowed; heavy manipulation banned",
      "4. Submit RAW + JPEG.",
    ],
    rules_pdf_url: "https://drive.google.com",
    eligibility: ["Open to all registered students with DSLR/Mirrorless/Mobile."],
    prizes: {
      winner: "₹6,000 + Trophy",
      runner_up: "₹3,500 + Certificate",
      second_runner_up: "₹1,500 + Certificate",
    },
    event_heads: [
      { name: "Vikram Singh", role: "Media Head", phone: "9876543222", email: "vikram@gateways.in" },
      { name: "Kavya M", role: "Student Coordinator", phone: "9876543223", email: "kavya@gateways.in" },
    ],
  },
  {
    id: "it-quiz",
    title: "IT Quiz",
    subtitle: "Battle of the Brains",
    date: "2026-09-16",
    from_time: "9:30 AM",
    end_time: "12:30 PM",
    venue: "Main Auditorium",
    type: "Technical",
    image_url: "https://images.unsplash.com/photo-1606326608606-aa0b62935f2b",
    description: "Fast-paced tech quiz covering computer science history, tech news, gadgets, and trivia.",
    rules: [
      "1. Team of 2 members",
      "2. Preliminary written round followed by 6 stage finals",
      "3. No electronic devices during the quiz.",
    ],
    rules_pdf_url: "https://drive.google.com",
    eligibility: ["Open to all registered college teams."],
    prizes: {
      winner: "₹8,000 + Trophy",
      runner_up: "₹5,000 + Certificate",
      second_runner_up: "₹2,500 + Certificate",
    },
    event_heads: [
      { name: "Sneha Rao", role: "Quiz Master Lead", phone: "9876543218", email: "sneha@gateways.in" },
      { name: "Arjun Singh", role: "Student Head", phone: "9876543219", email: "arjun@gateways.in" },
    ],
  },
  {
    id: "treasure-hunt",
    title: "Treasure Hunt",
    subtitle: "Unravel the Enigma",
    date: "2026-09-16",
    from_time: "10:00 AM",
    end_time: "1:00 PM",
    venue: "Campus Ground",
    type: "Non-Technical",
    image_url: "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1",
    description: "Decode cryptic clues, solve riddles, and navigate across campus to find the hidden treasure.",
    rules: [
      "1. Team of 4 members",
      "2. Clues must be solved in sequence",
      "3. Damaging college property leads to immediate ban",
      "4. Time-based evaluation.",
    ],
    rules_pdf_url: "https://drive.google.com",
    eligibility: ["Open to all registered teams."],
    prizes: {
      winner: "₹10,000 + Trophy",
      runner_up: "₹6,000 + Certificate",
      second_runner_up: "₹3,000 + Certificate",
    },
    event_heads: [
      { name: "Sarah Khan", role: "Lead Coordinator", phone: "9876543224", email: "sarahk@gateways.in" },
      { name: "Nikhil Das", role: "Student Head", phone: "9876543225", email: "nikhil@gateways.in" },
    ],
  },
  {
    id: "gaming",
    title: "Gaming Arena",
    subtitle: "Esports Battleground",
    date: "2026-09-16",
    from_time: "10:00 AM",
    end_time: "5:00 PM",
    venue: "Gaming Lounge - Block 2",
    type: "Gaming",
    image_url: "https://images.unsplash.com/photo-1542751371-adc38448a05e",
    description: "Ultimate competitive gaming tournament featuring tactical shooter and battle royale matches.",
    rules: [
      "1. Squad size: 4 members (+1 substitute)",
      "2. Bring your own mobile/peripherals",
      "3. Emulators strictly prohibited",
      "4. Fair play rules strictly enforced.",
    ],
    rules_pdf_url: "https://drive.google.com",
    eligibility: ["Open to all registered gamers."],
    prizes: {
      winner: "₹12,000 + Trophy",
      runner_up: "₹7,000 + Certificate",
      second_runner_up: "₹3,500 + Certificate",
    },
    event_heads: [
      { name: "Rohan V", role: "Esports Lead", phone: "9876543226", email: "rohan@gateways.in" },
      { name: "Aditya Sharma", role: "Student Coordinator", phone: "9876543227", email: "aditya@gateways.in" },
    ],
  },
  {
    id: "surprise-event",
    title: "Mystery Quest",
    subtitle: "Expect the Unexpected",
    date: "2026-09-16",
    from_time: "1:30 PM",
    end_time: "4:30 PM",
    venue: "Open Amphitheatre",
    type: "Non-Technical",
    image_url: "https://images.unsplash.com/photo-1511512578047-dfb367046420",
    description: "A mystery event where rules, tasks, and challenges are revealed on the spot. Spontaneity and quick thinking required!",
    rules: [
      "1. Team of 2 members",
      "2. Instructions will be provided at the start of each round",
      "3. Disqualification for non-compliance",
      "4. Time-based evaluation.",
    ],
    rules_pdf_url: "https://drive.google.com",
    eligibility: ["Open to all participants."],
    prizes: {
      winner: "₹7,000 + Trophy",
      runner_up: "₹4,000 + Certificate",
      second_runner_up: "₹2,000 + Certificate",
    },
    event_heads: [
      { name: "Alex John", role: "Event Lead", phone: "9876543220", email: "alex@gateways.in" },
      { name: "Pooja Hegde", role: "Student Head", phone: "9876543221", email: "pooja@gateways.in" },
    ],
  },
];

export const MOCK_SCHEDULE: ScheduleResponse = {
  days: [
    {
      day_number: 1,
      date: "2026-09-15",
      display_date: "Day 1 - Sep 15",
      timeline: [
        {
          id: "inauguration",
          title: "Inauguration Ceremony",
          subtitle: "Gateways 2026 Grand Opening",
          date: "2026-09-15",
          from_time: "8:30 AM",
          end_time: "9:30 AM",
          venue: "Main Auditorium",
          category: "General",
          is_competition: false,
        },
        {
          id: "hackathon",
          title: "Hackathon",
          subtitle: "24-Hour Code Sprint",
          date: "2026-09-15",
          from_time: "9:00 AM",
          end_time: "9:00 AM",
          venue: "Central Block - Labs 3 & 4",
          category: "Technical",
          is_competition: true,
        },
        {
          id: "photography",
          title: "Lens & Motion",
          subtitle: "Capture the Fest Moments",
          date: "2026-09-15",
          from_time: "9:00 AM",
          end_time: "5:00 PM",
          venue: "Campus Wide",
          category: "Non-Technical",
          is_competition: true,
        },
        {
          id: "it-manager",
          title: "IT Manager",
          subtitle: "The Best Manager Hunt",
          date: "2026-09-15",
          from_time: "9:30 AM",
          end_time: "4:30 PM",
          venue: "Seminar Hall B",
          category: "Non-Technical",
          is_competition: true,
        },
        {
          id: "ui-ux",
          title: "UI/UX Design Blitz",
          subtitle: "Design the Future",
          date: "2026-09-15",
          from_time: "10:30 AM",
          end_time: "1:30 PM",
          venue: "Computer Lab 1",
          category: "Technical",
          is_competition: true,
        },
        {
          id: "lunch-day1",
          title: "Lunch Break",
          subtitle: "Food Stalls Open",
          date: "2026-09-15",
          from_time: "1:00 PM",
          end_time: "2:00 PM",
          venue: "Campus Mess / Food Stalls",
          category: "Break",
          is_competition: false,
        },
        {
          id: "coding-debugging",
          title: "Coding & Debugging",
          subtitle: "Code. Debug. Conquer.",
          date: "2026-09-15",
          from_time: "2:00 PM",
          end_time: "5:00 PM",
          venue: "Main Computer Lab",
          category: "Technical",
          is_competition: true,
        },
        {
          id: "cultural-night",
          title: "Cultural Performance & DJ Night",
          subtitle: "Fest Evening Celebration",
          date: "2026-09-15",
          from_time: "5:30 PM",
          end_time: "8:30 PM",
          venue: "Open Ground",
          category: "Entertainment",
          is_competition: false,
        },
      ],
    },
    {
      day_number: 2,
      date: "2026-09-16",
      display_date: "Day 2 - Sep 16",
      timeline: [
        {
          id: "it-quiz",
          title: "IT Quiz",
          subtitle: "Battle of the Brains",
          date: "2026-09-16",
          from_time: "9:30 AM",
          end_time: "12:30 PM",
          venue: "Main Auditorium",
          category: "Technical",
          is_competition: true,
        },
        {
          id: "treasure-hunt",
          title: "Treasure Hunt",
          subtitle: "Unravel the Enigma",
          date: "2026-09-16",
          from_time: "10:00 AM",
          end_time: "1:00 PM",
          venue: "Campus Ground",
          category: "Non-Technical",
          is_competition: true,
        },
        {
          id: "gaming",
          title: "Gaming Arena",
          subtitle: "Esports Battleground",
          date: "2026-09-16",
          from_time: "10:00 AM",
          end_time: "5:00 PM",
          venue: "Gaming Lounge - Block 2",
          category: "Gaming",
          is_competition: true,
        },
        {
          id: "lunch-day2",
          title: "Lunch Break",
          subtitle: "Food Stalls Open",
          date: "2026-09-16",
          from_time: "1:00 PM",
          end_time: "2:00 PM",
          venue: "Campus Mess / Food Stalls",
          category: "Break",
          is_competition: false,
        },
        {
          id: "surprise-event",
          title: "Mystery Quest",
          subtitle: "Expect the Unexpected",
          date: "2026-09-16",
          from_time: "1:30 PM",
          end_time: "4:30 PM",
          venue: "Open Amphitheatre",
          category: "Non-Technical",
          is_competition: true,
        },
        {
          id: "valedictory",
          title: "Valedictory & Prize Distribution",
          subtitle: "Closing Ceremony",
          date: "2026-09-16",
          from_time: "4:30 PM",
          end_time: "6:30 PM",
          venue: "Main Auditorium",
          category: "General",
          is_competition: false,
        },
      ],
    },
  ],
};

export async function fetchEvents(): Promise<EventItem[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 sec timeout
    const response = await fetch(`${API_BASE_URL}/events`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) {
      throw new Error(`Failed to fetch events: ${response.statusText}`);
    }
    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
    return MOCK_EVENTS;
  } catch (error) {
    console.warn('Backend fetch failed, using fallback mock events data');
    return MOCK_EVENTS;
  }
}

export async function fetchSchedule(): Promise<ScheduleResponse> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 sec timeout
    const response = await fetch(`${API_BASE_URL}/schedule`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) {
      throw new Error(`Failed to fetch schedule: ${response.statusText}`);
    }
    const data = await response.json();
    if (data && Array.isArray(data.days) && data.days.length > 0) {
      return data;
    }
    return MOCK_SCHEDULE;
  } catch (error) {
    console.warn('Backend fetch failed, using fallback mock schedule data');
    return MOCK_SCHEDULE;
  }
}
