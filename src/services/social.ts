// Espace social partagé (nécessite Supabase). Les accès sont protégés côté serveur par des politiques RLS :
// un membre ne voit que les groupes dont il fait partie, et seulement les données que chacun choisit de partager.
import { getSupabase } from './supabase';

export interface Group {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
}

export interface LeaderboardRow {
  user_id: string;
  display_name: string;
  is_me: boolean;
  xp_week: number | null;
  xp_total: number | null;
  streak: number | null;
  days_completed: number | null;
  words_mastered: number | null;
  badges: number | null;
}

export interface GroupChallenge {
  id: string;
  group_id: string;
  title: string;
  metric: 'xp_week' | 'streak' | 'days_completed' | 'words_mastered';
  target: number;
  ends_at: string;
}

async function sb() {
  const c = await getSupabase();
  if (!c) throw new Error('Espace social non configuré.');
  return c;
}

export async function myGroups(): Promise<Group[]> {
  const c = await sb();
  const { data, error } = await c.from('groups').select('id, name, invite_code, owner_id').order('created_at');
  if (error) throw new Error(error.message);
  return (data ?? []) as Group[];
}

export async function createGroup(name: string): Promise<Group> {
  const c = await sb();
  const { data, error } = await c.rpc('create_group', { group_name: name.slice(0, 60) });
  if (error) throw new Error(error.message);
  return data as Group;
}

export async function joinGroup(code: string): Promise<Group> {
  const c = await sb();
  const { data, error } = await c.rpc('join_group', { code: code.trim().toUpperCase() });
  if (error) throw new Error(error.message.includes('invalid') ? 'Code d’invitation invalide.' : error.message);
  return data as Group;
}

export async function leaveGroup(groupId: string): Promise<void> {
  const c = await sb();
  const { error } = await c.rpc('leave_group', { gid: groupId });
  if (error) throw new Error(error.message);
}

export async function leaderboard(groupId: string): Promise<LeaderboardRow[]> {
  const c = await sb();
  const { data, error } = await c.rpc('get_group_leaderboard', { gid: groupId });
  if (error) throw new Error(error.message);
  return (data ?? []) as LeaderboardRow[];
}

export async function groupChallenges(groupId: string): Promise<GroupChallenge[]> {
  const c = await sb();
  const { data, error } = await c.from('group_challenges').select('id, group_id, title, metric, target, ends_at').eq('group_id', groupId).order('ends_at');
  if (error) throw new Error(error.message);
  return (data ?? []) as GroupChallenge[];
}

export async function createGroupChallenge(ch: Omit<GroupChallenge, 'id'>): Promise<void> {
  const c = await sb();
  const { error } = await c.from('group_challenges').insert(ch);
  if (error) throw new Error(error.message);
}
