/**
 * Subterranean API Client
 * Minimal wrapper for backend function calls
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string
const PROJECT_UUID = import.meta.env.VITE_PROJECT_UUID as string

let _userToken: string | null = null

/**
 * Set the authenticated user's access token.
 * Called by auth.ts after login/refresh — api.ts has no auth dependency.
 */
export function setUserToken(token: string | null) {
  _userToken = token
}

/**
 * Get the current user token (for external use if needed).
 */
export function getUserToken(): string | null {
  return _userToken
}

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Project-UUID': PROJECT_UUID,
  }
  const token = import.meta.env.VITE_API_KEY
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  if (_userToken) {
    headers['X-User-Token'] = _userToken
  }
  return headers
}

interface ApiResult {
  success: boolean
  data?: unknown
  count?: number
  error?: string
  message?: string
}

interface SortOption {
  column: string
  direction?: 'asc' | 'desc'
}

interface GetRowsOptions {
  limit?: number
  offset?: number
  filters?: Array<{ column: string; operator: '=' | '!=' | 'contains' | '>' | '<' | '>=' | '<=' | 'is_null' | 'is_not_null'; value?: unknown }>
  sort?: SortOption[]
  select?: string[]
  count?: boolean
}

/**
 * Call a backend function
 */
export async function callFunction(functionId: string, input: Record<string, unknown> = {}): Promise<ApiResult> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/function/${functionId}`, {
      method: 'POST',
      mode: 'cors',
      headers: getHeaders(),
      body: JSON.stringify({ input: JSON.stringify(input) }),
    })

    const result = await response.json()

    if (!response.ok || result.success === false) {
      return {
        success: false,
        error: result.message || result.error || `Request failed (${response.status})`,
      }
    }

    return result
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Network error' }
  }
}

/**
 * Table operations helper
 */
export function table(tableId: string) {
  return {
    async getRows(options: GetRowsOptions = {}) {
      // Examples:
      //   getRows({ filters: [{ column: 'status', operator: '=', value: 'active' }] })
      //   getRows({ sort: [{ column: 'created_at', direction: 'desc' }], limit: 5 })
      //   getRows({ select: ['name', 'email'], filters: [{ column: 'role', operator: '!=', value: 'admin' }] })
      //   getRows({ count: true, filters: [{ column: 'created_at', operator: '>=', value: '2024-01-01' }] })
      return callFunction(`table_${tableId}_get_rows`, options as Record<string, unknown>)
    },
    async getRow(rowId: string | number) {
      return callFunction(`table_${tableId}_get_row`, { row_id: rowId })
    },
    async insertRow(data: Record<string, unknown>) {
      return callFunction(`table_${tableId}_insert_row`, data)
    },
    async updateRow(rowId: string | number, data: Record<string, unknown>) {
      return callFunction(`table_${tableId}_update_row`, { row_id: rowId, ...data })
    },
    async deleteRow(rowId: string | number) {
      return callFunction(`table_${tableId}_delete_row`, { row_id: rowId })
    },
    async generateRow(prompt: string) {
      return callFunction(`table_${tableId}_generate_row`, { prompt })
    },
  }
}

/**
 * AI text generation
 */
export async function generateText(input: string, instructions: string = ''): Promise<ApiResult> {
  return callFunction('generate_text', { input, instructions })
}