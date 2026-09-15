import React, { createContext, useContext, useEffect, useState } from "react";
import { fetchEvents, fetchSchedule, EventItem, ScheduleResponse, MOCK_EVENTS, MOCK_SCHEDULE } from "@/services/api";

interface DataContextType {
  events: EventItem[];
  schedule: ScheduleResponse;
  eventsLoading: boolean;
  scheduleLoading: boolean;
  refreshData: () => Promise<void>;
  eventsSource: "network" | "cache" | "fallback";
  scheduleSource: "network" | "cache" | "fallback";
}

const DataContext = createContext<DataContextType>({
  events: MOCK_EVENTS,
  schedule: MOCK_SCHEDULE,
  eventsLoading: true,
  scheduleLoading: true,
  refreshData: async () => {},
  eventsSource: "fallback",
  scheduleSource: "fallback",
});

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<EventItem[]>(MOCK_EVENTS);
  const [schedule, setSchedule] = useState<ScheduleResponse>(MOCK_SCHEDULE);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [eventsSource, setEventsSource] = useState<"network" | "cache" | "fallback">("fallback");
  const [scheduleSource, setScheduleSource] = useState<"network" | "cache" | "fallback">("fallback");

  // Perform a background fetch on mount
  useEffect(() => {
    let mounted = true;
    
    const loadData = async () => {
      // We purposefully don't `await` these sequentially so they run in parallel
      const eventsPromise = fetchEvents().then((res) => {
        if (mounted) {
          setEvents(res.data);
          setEventsSource(res.source);
          setEventsLoading(false);
        }
      });

      const schedulePromise = fetchSchedule().then((res) => {
        if (mounted) {
          setSchedule(res.data);
          setScheduleSource(res.source);
          setScheduleLoading(false);
        }
      });

      await Promise.all([eventsPromise, schedulePromise]);
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  const refreshData = async () => {
    setEventsLoading(true);
    setScheduleLoading(true);
    
    const [evRes, schRes] = await Promise.all([fetchEvents(), fetchSchedule()]);
    
    setEvents(evRes.data);
    setEventsSource(evRes.source);
    setEventsLoading(false);

    setSchedule(schRes.data);
    setScheduleSource(schRes.source);
    setScheduleLoading(false);
  };

  return (
    <DataContext.Provider value={{ events, schedule, eventsLoading, scheduleLoading, refreshData, eventsSource, scheduleSource }}>
      {children}
    </DataContext.Provider>
  );
}

export const useAppData = () => useContext(DataContext);
