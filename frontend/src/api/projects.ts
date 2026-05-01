import { apiClient } from './client';

export interface Folder {
  id: string;
  name: string;
}

export interface FolderResponse {
  folders: Folder[];
}

export interface ProcessProjectRequest {
  folder_id: string;
  folder_name: string;
}

export interface JobResponse {
  job_id: string;
  status: string;
}

export interface JobStatusResponse {
  status: 'pending' | 'downloading' | 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

export const projectsApi = {
  getRootFolders: async (): Promise<FolderResponse> => {
    const { data } = await apiClient.get<FolderResponse>('/v1/projects/root-folders');
    return data;
  },

  getSubfolders: async (folderId: string): Promise<FolderResponse> => {
    const { data } = await apiClient.get<FolderResponse>(`/v1/projects/${folderId}/subfolders`);
    return data;
  },

  processProject: async (request: ProcessProjectRequest): Promise<JobResponse> => {
    const { data } = await apiClient.post<JobResponse>('/v1/projects/process', request);
    return data;
  },

  getJobStatus: async (jobId: string): Promise<JobStatusResponse> => {
    const { data } = await apiClient.get<JobStatusResponse>(`/v1/projects/jobs/${jobId}`);
    return data;
  }
};
