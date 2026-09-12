import {
  LayoutDashboard,
  Users,
  UserCheck,
  Truck,
  Building2,
  HardHat,
  Package,
  Boxes,
  Scale,
  ShoppingBag,
  CheckSquare,
  ClipboardList,
  Factory,
  Ship,
  Warehouse,
  ArrowRightLeft,
  Trash2,
  Receipt,
  Wallet,
  Landmark,
  BarChart3,
  FileText,
  Settings,
  LucideIcon,
} from 'lucide-react';
import { PermissionAction } from '@/lib/permissions';

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  permission?: PermissionAction | string;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    title: 'الرئيسية واللوحات',
    items: [
      { title: 'لوحة التحكم التنفيذية', href: '/dashboard', icon: LayoutDashboard },
      { title: 'لوحة قيادة المخزون', href: '/inventory', icon: Warehouse, permission: 'inventory.view' },
    ],
  },
  {
    title: 'البيانات الأساسية',
    items: [
      { title: 'دليل عملاء التصدير', href: '/customers', icon: Users, permission: 'customers.financial_view' },
      { title: 'دليل الموردين', href: '/suppliers', icon: Truck, permission: 'suppliers.financial_view' },
      { title: 'المحطات والمخازن', href: '/stations', icon: Building2, permission: 'stations.view' },
      { title: 'مقاولو العمالة', href: '/contractors', icon: HardHat, permission: 'contractors.view' },
      { title: 'إدارة الموظفين', href: '/employees', icon: UserCheck, permission: 'employees.view' },
      { title: 'كتالوج المنتجات', href: '/products', icon: Package, permission: 'products.view' },
      { title: 'المستلزمات والكراتين', href: '/supplies', icon: Boxes, permission: 'supplies.view' },
    ],
  },
  {
    title: 'العمليات والتشغيل',
    items: [
      { title: 'وارد المواد الخام', href: '/raw-purchases', icon: Scale, permission: 'purchases.financial_view' },
      { title: 'مشتريات المستلزمات', href: '/packaging-purchases', icon: ShoppingBag, permission: 'purchases.financial_view' },
      { title: 'صفقات بضاعة جاهزة', href: '/finished-purchases', icon: CheckSquare, permission: 'purchases.financial_view' },
      { title: 'طلبيات التصدير', href: '/client-orders', icon: ClipboardList, permission: 'agreements.view' },
      { title: 'عمليات التدوير والإنتاج', href: '/processing-operations', icon: Factory, permission: 'operations.view' },
      { title: 'الشحنات والتصدير', href: '/shipments', icon: Ship, permission: 'shipments.financial_view' },
    ],
  },
  {
    title: 'المخزون والمحطات',
    items: [
      { title: 'مخزن المنتج الجاهز', href: '/inventory', icon: Package, permission: 'inventory.view' },
      { title: 'مخزن المواد الخام', href: '/inventory/raw', icon: Boxes, permission: 'inventory.view' },
      { title: 'التحويل بين المحطات', href: '/inventory/transfers', icon: ArrowRightLeft, permission: 'inventory.transfer' },
      { title: 'مراقبة وتكاليف الهالك', href: '/inventory/waste', icon: Trash2, permission: 'inventory.view' },
    ],
  },
  {
    title: 'الماليات والتحصيلات',
    items: [
      { title: 'كشوف الحسابات (الدفتر)', href: '/financials/statements', icon: FileText, permission: 'finance.view' },
      { title: 'دفتر الأستاذ العام', href: '/financials', icon: Receipt, permission: 'finance.view' },
      { title: 'سندات الدفع والتحصيل', href: '/financials/transactions', icon: Wallet, permission: 'finance.view' },
      { title: 'الخزينة والحسابات البنكية', href: '/financials/treasury', icon: Landmark, permission: 'treasury.view' },
    ],
  },
  {
    title: 'التقارير والتحليلات',
    items: [
      { title: 'مركز التقارير الموحد', href: '/reports', icon: BarChart3, permission: 'reports.finance.view' },
      { title: 'ربحية الشحنات', href: '/reports/profitability', icon: BarChart3, permission: 'reports.finance.view' },
      { title: 'مراقبة كفاءة المحطات', href: '/reports/stations', icon: Building2, permission: 'reports.general.view' },
    ],
  },
  {
    title: 'النظام والإعدادات',
    items: [
      { title: 'إعدادات النظام والمستخدمين', href: '/settings', icon: Settings, permission: 'settings.view' },
    ],
  },
];

export const pageTitleMap: Record<string, string> = {
  '/dashboard': 'لوحة التحكم التنفيذية',
  '/dashboard/inventory': 'لوحة قيادة المخزون',
  '/customers': 'دليل عملاء التصدير',
  '/suppliers': 'دليل الموردين',
  '/stations': 'المحطات والمخازن',
  '/contractors': 'مقاولو العمالة والتشغيل',
  '/employees': 'إدارة الموظفين والرواتب',
  '/products': 'كتالوج المنتجات التصديرية',
  '/supplies': 'المستلزمات والكراتين',
  '/raw-purchases': 'وارد المواد الخام',
  '/packaging-purchases': 'مشتريات المستلزمات',
  '/finished-purchases': 'صفقات بضاعة جاهزة',
  '/client-orders': 'طلبيات التصدير للعملاء',
  '/processing-operations': 'عمليات التدوير والإنتاج',
  '/shipments': 'الشحنات والتصدير',
  '/inventory': 'مخزن المنتج الجاهز',
  '/inventory/raw': 'مخزن المواد الخام',
  '/inventory/transfers': 'التحويل بين المحطات',
  '/inventory/waste': 'مراقبة وتكاليف الهالك',
  '/financials/statements': 'كشوف الحسابات (الدفتر)',
  '/financials': 'دفتر الأستاذ العام',
  '/financials/transactions': 'سندات الدفع والتحصيل',
  '/financials/treasury': 'الخزينة والحسابات البنكية',
  '/reports': 'مركز التقارير الموحد',
  '/reports/profitability': 'ربحية الشحنات',
  '/reports/stations': 'مراقبة كفاءة المحطات',
  '/settings': 'إعدادات النظام والمستخدمين',
};
