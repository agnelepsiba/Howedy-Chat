export class ApiResponse<T = unknown> {
  constructor(
    public status: boolean,
    public message: string,
    public data: T | null = null
  ) {}
}