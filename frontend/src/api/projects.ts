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
  status: 'pending' | 'downloading' | 'processing' | 'saving' | 'completed' | 'failed';
  result?: any;
  error?: string;
  from_cache?: boolean;
}

// ─── Sitios Globales ─────────────────────────────────────────

export interface ChildFolderInfo {
  id: string;
  name: string;
  cached: boolean;
  processed_at?: string;
}

export interface SiteInfo {
  folder_id: string;
  folder_name: string;
  site_type: 'project' | 'site' | 'dc_load' | 'empty';
  children: ChildFolderInfo[];
  merged_cached: boolean;
  merged_processed_at?: string;
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
  },

  getSiteInfo: async (folderId: string, folderName: string): Promise<SiteInfo> => {
    const { data } = await apiClient.get<SiteInfo>(`/v1/projects/${folderId}/site-info`, {
      params: { folder_name: folderName },
    });
    return data;
  },

  listDcLoadProjects: async (): Promise<{ dc_load_projects: any[] }> => {
    const { data } = await apiClient.get<{ dc_load_projects: any[] }>('/v1/projects/dc-load/list');
    return data;
  },

  linkConsumption: async (projectId: string, dcLoadProjectId: string, locationFilter?: string): Promise<any> => {
    const { data } = await apiClient.post<any>(`/v1/projects/${projectId}/link-consumption`, {
      dc_load_project_id: dcLoadProjectId,
      location_filter: locationFilter
    });
    return data;
  },

  unlinkConsumption: async (projectId: string): Promise<any> => {
    const { data } = await apiClient.post<any>(`/v1/projects/${projectId}/unlink-consumption`, {});
    return data;
  }
};

