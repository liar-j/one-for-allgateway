// ============================================================
// Contacts Provider Factory
//
// DEFAULT: Supabase contacts (self-hosted)
// ============================================================

import { IContactsProvider } from './interface.js';

import { SupabaseContactsProvider } from './supabase_contacts_provider'

export function createContactsProvider(req: any): IContactsProvider {
  // CONTACTS_PROVIDER_START — do not remove this comment

  // ✅ Active: Self-hosted Supabase contacts
  return new SupabaseContactsProvider(req.supabase, req.user.corp_id);

  // CONTACTS_PROVIDER_END — do not remove this comment
}

export type { IContactsProvider, Employee, Department, DepartmentNode, DepartmentTreeResult, DeptSearchItem, DeptSearchResult, SearchResult } from './interface.js';
