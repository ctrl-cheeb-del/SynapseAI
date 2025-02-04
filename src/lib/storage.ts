import { supabase } from './supabase';

export async function uploadFile(file: File, path: string) {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${path}/${fileName}`;

    let { data, error } = await supabase.storage
      .from('materials')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (error) throw error;

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('materials')
      .getPublicUrl(filePath);

    return {
      path: filePath,
      url: publicUrl,
      type: file.type,
      name: file.name,
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

export async function getFileUrl(path: string) {
  try {
    const { data: { publicUrl } } = supabase.storage
      .from('materials')
      .getPublicUrl(path);

    return publicUrl;
  } catch (error) {
    console.error('Error getting file URL:', error);
    throw error;
  }
}

export async function deleteFile(path: string) {
  try {
    const { error } = await supabase.storage
      .from('materials')
      .remove([path]);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
} 