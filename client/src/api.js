// All requests use Vite's /api proxy, so no CORS package is needed.
export async function apiRequest(path, options = {}) {
  let response;
  try {
    response = await fetch(path, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
  } catch {
    throw new Error('Cannot reach the server. Check your connection and make sure the backend is running.');
  }
  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || 'The request failed. Make sure the backend is running and try again.');
  }
  if (data === null) throw new Error('The server returned an unexpected response. Please try again.');
  return data;
}
