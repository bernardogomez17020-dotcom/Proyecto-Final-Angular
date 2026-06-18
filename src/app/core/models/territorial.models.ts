export interface PaginatedResponse<T> {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  items: T[];
}

export interface Department {
  id_department: number;
  name: string;
  dane_code: string;
}

export interface City {
  id_city: number;
  id_department: number;
  name: string;
  dane_code: string;
}

export interface Commune {
  id_commune: number;
  id_city: number;
  name: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface Neighborhood {
  id_neighborhood: number;
  id_commune: number;
  name: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface Entity {
  id_entity: number;
  name: string;
  description?: string;
  entity_type?: string;
  nit?: string;
  phone?: string;
  email?: string;
  address?: string;
  logo_url?: string;
  status: string;
}

export interface Official {
  id_official: number;
  id_entity: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
  last_latitude?: number;
  last_longitude?: number;
  last_gps_update?: string;
  gps_active?: boolean;
}

export interface Citizen {
  id_citizen: number;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  status: string;
}

export interface Category {
  id_category: number;
  id_parent_category?: number | null;
  name: string;
  description?: string;
  image_url?: string;
  status: string;
}

export interface Annotation {
  id_annotation: number;
  id_neighborhood?: number | null;
  id_citizen: number;
  description: string;
  latitude: number;
  longitude: number;
  status: string;
  registration_date?: string;
}

export interface Point {
  id_point: number;
  id_neighborhood?: number | null;
  id_annotation?: number | null;
  latitude: number;
  longitude: number;
  order: number;
  point_type: string;
}

export interface Vote {
  id_vote: number;
  id_citizen: number;
  id_annotation: number;
  stars: number;
  comment?: string;
  vote_date?: string;
}

export interface AnnotationCategory {
  id_annotation_category: number;
  id_category: number;
  id_annotation: number;
}

export interface InterestedParty {
  id_interested_party: number;
  id_entity: number;
  id_annotation: number;
  association_date?: string;
}

export interface Evidence {
  id_evidence: number;
  id_annotation: number;
  file_url: string;
  file_type: string;
  file_size: number;
  upload_date?: string;
}

export type UserRole = 'administrador' | 'funcionario' | 'ciudadano';

export interface AuthUser {
  name: string;
  email: string;
  role: UserRole;
  provider: 'google' | 'microsoft' | 'github';
  token?: string;
  entityId?: number | null;
  citizenId?: number | null;
  officialId?: number | null;
}

export interface GoogleAuthConfig {
  clientId: string;
  redirectUri: string;
  scope: string;
  authUrl: string;
}

export interface AuthSessionResponse {
  token: string;
  user: AuthUser;
}

export interface NeedsProfileResponse {
  needsProfile: true;
  email: string;
  name: string;
  profileToken: string;
}

export interface TrackingPayload {
  officials: Array<{
    id_official: number;
    latitude: number;
    longitude: number;
    last_gps_update: string;
  }>;
}

export interface TrackingStartResponse {
  started_ids: number[];
  officials: TrackingPayload['officials'];
  ignored: {
    missing: number[];
    inactive: number[];
    missing_coords: number[];
    invalid: unknown[];
  };
}
