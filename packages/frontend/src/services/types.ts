export interface DataResponse<T> {
  data: T;
}

export interface ListResponse<T> {
  data: T[];
  meta: { total: number; page?: number; pageSize?: number };
}

export interface SuccessResponse {
  success: boolean;
}
