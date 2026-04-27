import { supabase } from './supabaseClient';

export const categoriesApi = {
  async create({ level_id, name, emoji }) {
    // Récupérer le sort_order max existant pour ce niveau
    const { data: existing } = await supabase
      .from('categories')
      .select('sort_order')
      .eq('level_id', level_id)
      .order('sort_order', { ascending: false })
      .limit(1);
    const maxOrder = existing?.[0]?.sort_order || 0;

    const { data, error } = await supabase
      .from('categories')
      .insert({ level_id, name, emoji: emoji || '🥋', sort_order: maxOrder + 1 })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { error } = await supabase.from('categories').update(updates).eq('id', id);
    if (error) throw error;
  },

  async delete(id) {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
  },

  async swap(catA, catB) {
    const { error: e1 } = await supabase
      .from('categories')
      .update({ sort_order: catB.sort_order })
      .eq('id', catA.id);
    if (e1) throw e1;
    const { error: e2 } = await supabase
      .from('categories')
      .update({ sort_order: catA.sort_order })
      .eq('id', catB.id);
    if (e2) throw e2;
  },
};

export const skillsApi = {
  async create({ category_id, name }) {
    const { data: existing } = await supabase
      .from('skills')
      .select('sort_order')
      .eq('category_id', category_id)
      .order('sort_order', { ascending: false })
      .limit(1);
    const maxOrder = existing?.[0]?.sort_order || 0;

    const { data, error } = await supabase
      .from('skills')
      .insert({ category_id, name, sort_order: maxOrder + 1 })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { error } = await supabase.from('skills').update(updates).eq('id', id);
    if (error) throw error;
  },

  async delete(id) {
    const { error } = await supabase.from('skills').delete().eq('id', id);
    if (error) throw error;
  },

  async swap(skA, skB) {
    const { error: e1 } = await supabase
      .from('skills')
      .update({ sort_order: skB.sort_order })
      .eq('id', skA.id);
    if (e1) throw e1;
    const { error: e2 } = await supabase
      .from('skills')
      .update({ sort_order: skA.sort_order })
      .eq('id', skB.id);
    if (e2) throw e2;
  },
};