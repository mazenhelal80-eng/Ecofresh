import { UserRole } from '@prisma/client';

export type PermissionAction =
  // User & System Management
  | 'users.view'
  | 'users.create'
  | 'users.edit'
  | 'users.disable'
  | 'roles.view'
  | 'roles.edit'
  | 'settings.view'
  | 'settings.edit'
  // Financial & Treasury
  | 'finance.view'
  | 'finance.create'
  | 'finance.edit'
  | 'finance.cancel'
  | 'treasury.view'
  | 'treasury.create'
  | 'treasury.edit'
  | 'payables.view'
  | 'payables.create'
  | 'receivables.view'
  | 'receivables.create'
  | 'reports.finance.view'
  // Operational & Master Data
  | 'inventory.view'
  | 'inventory.create'
  | 'inventory.transfer'
  | 'inventory.adjust'
  | 'operations.view'
  | 'operations.create'
  | 'operations.edit'
  | 'operations.cancel'
  | 'stations.view'
  | 'stations.create'
  | 'stations.edit'
  | 'agreements.view'
  | 'agreements.create'
  | 'agreements.edit'
  | 'contractors.view'
  | 'contractors.create'
  | 'contractors.edit'
  | 'employees.view'
  | 'employees.manage'
  | 'products.view'
  | 'products.manage'
  | 'supplies.view'
  | 'supplies.manage'
  | 'shipments.view'
  | 'shipments.create'
  | 'shipments.cancel'
  | 'reports.general.view'
  // Legacy Permission Mappings (backward compatibility)
  | 'MANAGE_FINANCIALS'
  | 'CREATE_COLLECTION'
  | 'CREATE_PAYMENT'
  | 'CREATE_EXPENSE'
  | 'TRANSFER_FUNDS'
  | 'CANCEL_TRANSACTION'
  | 'VIEW_REPORTS'
  | 'CREATE_OPERATION'
  | 'DISPATCH_SHIPMENT'
  | 'DELETE_OPERATION'
  | 'MANAGE_MASTER_DATA';

const ACCOUNTANT_ALLOWED_ACTIONS: Set<string> = new Set([
  // Financial Core
  'finance.view',
  'finance.create',
  'finance.edit',
  'finance.cancel',
  'treasury.view',
  'treasury.create',
  'treasury.edit',
  'payables.view',
  'payables.create',
  'receivables.view',
  'receivables.create',
  'reports.finance.view',
  // Financial views of entities
  'suppliers.financial_view',
  'customers.financial_view',
  'purchases.financial_view',
  'shipments.financial_view',
  'employees.view',
  // Legacy actions
  'MANAGE_FINANCIALS',
  'CREATE_COLLECTION',
  'CREATE_PAYMENT',
  'CREATE_EXPENSE',
  'TRANSFER_FUNDS',
  'CANCEL_TRANSACTION',
  'VIEW_REPORTS',
]);

/**
 * Check if a given UserRole has permission to execute an action
 */
export function can(role: UserRole | string | undefined | null, action: PermissionAction | string): boolean {
  if (!role) return false;

  // OWNER (and legacy ADMIN) has full access to all system capabilities
  if (role === UserRole.OWNER || role === UserRole.ADMIN || role === 'OWNER' || role === 'ADMIN' || role === 'owner' || role === 'admin') {
    return true;
  }

  // ACCOUNTANT: Financial domain only, strictly forbidden from operations, inventory movements, user admin, etc.
  if (role === UserRole.ACCOUNTANT || role === 'ACCOUNTANT' || role === 'accountant') {
    return ACCOUNTANT_ALLOWED_ACTIONS.has(action);
  }

  // Legacy fallback for other potential enum roles during transition
  if (role === UserRole.SUPERVISOR) {
    if (action === 'DELETE_OPERATION' || action === 'CANCEL_TRANSACTION' || action.startsWith('users.') || action.startsWith('roles.')) {
      return false;
    }
    return true;
  }

  if (role === UserRole.OPERATOR) {
    return action === 'CREATE_OPERATION' || action === 'operations.create';
  }

  if (role === UserRole.STOREKEEPER) {
    return (
      action === 'CREATE_OPERATION' ||
      action === 'operations.create' ||
      action === 'DISPATCH_SHIPMENT' ||
      action === 'shipments.create' ||
      action === 'inventory.view'
    );
  }

  if (role === UserRole.VIEWER) {
    return action === 'VIEW_REPORTS' || action === 'reports.finance.view' || action === 'reports.general.view';
  }

  return false;
}
