export interface Video {
  id: string;
  title: string;
  filename: string;
  size: number;
  mimeType: string;
  createdAt: string;
}

export interface VideoDetail extends Video {
  url: string;
}

export interface UploadResponse {
  id: string;
  title: string;
}

export interface ApiError {
  error: string;
}
