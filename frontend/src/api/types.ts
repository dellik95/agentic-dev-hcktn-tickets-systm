// Every backend response shares this shape (see backend Application/Common/ApiResponse.cs).
// Success responses are unwrapped by the client.ts interceptor, so callers only see the payload
// — this error shape is what's still raw on a rejected request (error.response.data).
export interface ApiErrorBody {
  code: string
  message: string
  fieldErrors?: Record<string, string[]>
}

export interface ApiErrorEnvelope {
  success: false
  data: null
  error: ApiErrorBody
}
