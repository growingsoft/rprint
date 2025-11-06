import { create } from 'zustand';
import { Client, Printer, PrintJob } from '../types';

interface AppState {
  client: Client | null;
  printers: Printer[];
  printJobs: PrintJob[];
  selectedPrinter: Printer | null;
  isLoading: boolean;
  error: string | null;

  setClient: (client: Client | null) => void;
  setPrinters: (printers: Printer[]) => void;
  setPrintJobs: (jobs: PrintJob[]) => void;
  setSelectedPrinter: (printer: Printer | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addPrintJob: (job: PrintJob) => void;
  updatePrintJob: (id: string, updates: Partial<PrintJob>) => void;
  reset: () => void;
}

export const useStore = create<AppState>((set) => ({
  client: null,
  printers: [],
  printJobs: [],
  selectedPrinter: null,
  isLoading: false,
  error: null,

  setClient: (client) => set({ client }),
  setPrinters: (printers) => set({ printers }),
  setPrintJobs: (printJobs) => set({ printJobs }),
  setSelectedPrinter: (selectedPrinter) => set({ selectedPrinter }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  addPrintJob: (job) => set((state) => ({
    printJobs: [job, ...state.printJobs]
  })),

  updatePrintJob: (id, updates) => set((state) => ({
    printJobs: state.printJobs.map(job =>
      job.id === id ? { ...job, ...updates } : job
    )
  })),

  reset: () => set({
    client: null,
    printers: [],
    printJobs: [],
    selectedPrinter: null,
    isLoading: false,
    error: null
  })
}));
