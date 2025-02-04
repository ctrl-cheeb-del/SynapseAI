import { supabase } from './supabase';

const API_URL = 'http://localhost:3001/api';

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Authorization': `Bearer ${session?.access_token}`,
    'Content-Type': 'application/json',
  };
}

async function handleResponse(response: Response) {
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'An error occurred');
  }
  return response.json();
}

export async function fetchModules() {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/modules`, { headers });
  return handleResponse(response);
}

export async function fetchModule(moduleId: string) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/modules/${moduleId}`, { headers });
  return handleResponse(response);
}

export async function createModule(data: { title: string; description: string }) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/modules`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

export async function createMaterial(data: any) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/materials`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

export async function updateMaterial(materialId: string, data: any) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/materials/${materialId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

export async function deleteModule(moduleId: string) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/modules/${moduleId}`, {
    method: 'DELETE',
    headers,
  });
  return handleResponse(response);
}

export async function deleteMaterial(materialId: string) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/materials/${materialId}`, {
    method: 'DELETE',
    headers,
  });
  return handleResponse(response);
} 