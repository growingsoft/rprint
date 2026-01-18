import { create } from 'zustand';
import { PrintJob } from '../types';
import { api } from '../services/api';

export interface RecentJobWithPreview {
  job: PrintJob;
  thumbnailUrl: string | null;
  fileBlob: Blob | null;
  mimeType: string;
}

interface RecentJobsState {
  recentJobs: RecentJobWithPreview[];
  maxJobs: number;
  thumbnailCache: Map<string, string>;

  addRecentJob: (job: PrintJob, file: File | null) => void;
  syncWithServerJobs: (jobs: PrintJob[]) => Promise<void>;
  updateJobStatus: (jobId: string, updates: Partial<PrintJob>) => void;
  clearRecentJobs: () => void;
}

const MAX_RECENT_JOBS = 20;

export const useRecentJobs = create<RecentJobsState>((set, get) => ({
  recentJobs: [],
  maxJobs: MAX_RECENT_JOBS,
  thumbnailCache: new Map(),

  addRecentJob: (job: PrintJob, file: File | null) => {
    const { recentJobs, thumbnailCache } = get();

    // Revoke old blob URLs to free memory
    if (recentJobs.length >= MAX_RECENT_JOBS) {
      const oldestJob = recentJobs[recentJobs.length - 1];
      if (oldestJob.thumbnailUrl && !thumbnailCache.has(oldestJob.job.id)) {
        URL.revokeObjectURL(oldestJob.thumbnailUrl);
      }
    }

    let thumbnailUrl: string | null = null;
    let fileBlob: Blob | null = null;
    const mimeType = file?.type || job.mimeType;

    if (file) {
      fileBlob = file;
      // Generate thumbnail for images locally (faster than server)
      if (mimeType.startsWith('image/')) {
        thumbnailUrl = URL.createObjectURL(file);
      }
    }

    // Check if job has server-side thumbnail
    if (!thumbnailUrl && job.thumbnailPath) {
      // Fetch thumbnail from server asynchronously
      api.getJobThumbnail(job.id).then((url) => {
        if (url) {
          const { recentJobs, thumbnailCache } = get();
          thumbnailCache.set(job.id, url);
          set({
            thumbnailCache,
            recentJobs: recentJobs.map((item) =>
              item.job.id === job.id
                ? { ...item, thumbnailUrl: url }
                : item
            )
          });
        }
      });
    }

    const newRecentJob: RecentJobWithPreview = {
      job,
      thumbnailUrl,
      fileBlob,
      mimeType
    };

    // Remove existing job with same ID (if any) and add new one
    const filteredJobs = recentJobs.filter((item) => item.job.id !== job.id);
    const updatedJobs = [newRecentJob, ...filteredJobs].slice(0, MAX_RECENT_JOBS);

    set({ recentJobs: updatedJobs });
  },

  syncWithServerJobs: async (jobs: PrintJob[]) => {
    const { recentJobs, thumbnailCache } = get();

    // Create a map of existing recent jobs by ID
    const existingJobsMap = new Map(
      recentJobs.map((item) => [item.job.id, item])
    );

    // Process server jobs
    const newRecentJobs: RecentJobWithPreview[] = [];

    for (const job of jobs.slice(0, MAX_RECENT_JOBS)) {
      const existing = existingJobsMap.get(job.id);

      if (existing) {
        // Update existing job with server data
        newRecentJobs.push({
          ...existing,
          job: { ...existing.job, ...job }
        });
      } else {
        // Add new job from server
        let thumbnailUrl: string | null = null;

        // Check cache first
        if (thumbnailCache.has(job.id)) {
          thumbnailUrl = thumbnailCache.get(job.id) || null;
        } else if (job.thumbnailPath) {
          // Fetch thumbnail from server
          thumbnailUrl = await api.getJobThumbnail(job.id);
          if (thumbnailUrl) {
            thumbnailCache.set(job.id, thumbnailUrl);
          }
        }

        newRecentJobs.push({
          job,
          thumbnailUrl,
          fileBlob: null,
          mimeType: job.mimeType
        });
      }
    }

    set({ recentJobs: newRecentJobs, thumbnailCache });
  },

  updateJobStatus: (jobId: string, updates: Partial<PrintJob>) => {
    set((state) => ({
      recentJobs: state.recentJobs.map((item) =>
        item.job.id === jobId
          ? { ...item, job: { ...item.job, ...updates } }
          : item
      )
    }));
  },

  clearRecentJobs: () => {
    const { recentJobs, thumbnailCache } = get();
    // Clean up blob URLs (except cached ones)
    recentJobs.forEach((item) => {
      if (item.thumbnailUrl && !thumbnailCache.has(item.job.id)) {
        URL.revokeObjectURL(item.thumbnailUrl);
      }
    });
    // Clean up cached thumbnails
    thumbnailCache.forEach((url) => URL.revokeObjectURL(url));
    set({ recentJobs: [], thumbnailCache: new Map() });
  }
}));
