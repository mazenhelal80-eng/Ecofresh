"use client";

import { useState, useMemo } from "react";
import { UserViewItem, createUser, updateUser, toggleUserStatus, resetUserPassword } from "@/actions/users";
import { UserRole } from "@prisma/client";
import { toast } from "sonner";
import {
  UserPlus,
  Edit2,
  Power,
  Shield,
  KeyRound,
  CheckCircle2,
  XCircle,
  Clock,
  Mail,
  Search,
  Calendar,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface UsersManagementTabProps {
  initialUsers: UserViewItem[];
  currentUserRole: string;
}

export function UsersManagementTab({ initialUsers, currentUserRole }: UsersManagementTabProps) {
  const [users, setUsers] = useState<UserViewItem[]>(initialUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isResetPassOpen, setIsResetPassOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserViewItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states for Add
  const [addFullName, setAddFullName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addRole, setAddRole] = useState<"OWNER" | "ACCOUNTANT">("ACCOUNTANT");
  const [addTitle, setAddTitle] = useState("");

  // Form states for Edit
  const [editFullName, setEditFullName] = useState("");
  const [editRole, setEditRole] = useState<"OWNER" | "ACCOUNTANT">("ACCOUNTANT");
  const [editTitle, setEditTitle] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);

  // Form state for Reset Password
  const [resetPassValue, setResetPassValue] = useState("");

  // Filtered users calculation
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = u.fullName.toLowerCase().includes(q);
        const matchEmail = (u.email || "").toLowerCase().includes(q);
        const matchTitle = (u.title || "").toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchTitle) return false;
      }

      if (roleFilter !== "ALL") {
        const isOwner = u.role === UserRole.OWNER || (u.role as any) === "ADMIN";
        if (roleFilter === "OWNER" && !isOwner) return false;
        if (roleFilter === "ACCOUNTANT" && isOwner) return false;
      }

      if (statusFilter !== "ALL") {
        if (statusFilter === "ACTIVE" && !u.isActive) return false;
        if (statusFilter === "INACTIVE" && u.isActive) return false;
      }

      return true;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  const activeOwnersCount = useMemo(() => {
    return users.filter(
      (u) => (u.role === UserRole.OWNER || (u.role as any) === "ADMIN") && u.isActive
    ).length;
  }, [users]);

  const handleOpenAdd = () => {
    setAddFullName("");
    setAddEmail("");
    setAddPassword("");
    setAddRole("ACCOUNTANT");
    setAddTitle("");
    setIsAddOpen(true);
  };

  const handleOpenEdit = (user: UserViewItem) => {
    setSelectedUser(user);
    setEditFullName(user.fullName);
    setEditRole(user.role === UserRole.OWNER || (user.role as any) === "ADMIN" ? "OWNER" : "ACCOUNTANT");
    setEditTitle(user.title || "");
    setEditIsActive(user.isActive);
    setIsEditOpen(true);
  };

  const handleOpenResetPass = (user: UserViewItem) => {
    setSelectedUser(user);
    setResetPassValue("");
    setIsResetPassOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFullName || !addEmail || !addPassword) {
      toast.error("يرجى ملء جميع الحقول الإلزامية");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createUser({
        fullName: addFullName,
        email: addEmail,
        password: addPassword,
        role: addRole === "OWNER" ? UserRole.OWNER : UserRole.ACCOUNTANT,
        title: addTitle || undefined,
      });

      if (res.success) {
        toast.success(res.message || "تم إنشاء المستخدم بنجاح");
        setIsAddOpen(false);
        window.location.reload();
      } else {
        toast.error(res.error || "فشل إنشاء المستخدم");
      }
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ غير متوقع");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    // RULE 11: Client pre-check for Last Active OWNER
    const isTargetOwner = selectedUser.role === UserRole.OWNER || (selectedUser.role as any) === "ADMIN";
    const willRemainActiveOwner = editRole === "OWNER" && editIsActive;

    if (isTargetOwner && !willRemainActiveOwner && activeOwnersCount <= 1) {
      toast.error(
        "قاعدة أمان: لا يمكن تعطيل أو تغيير دور آخر مسؤول (OWNER) في النظام. يجب أن يكون هناك Owner نشط واحد على الأقل."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await updateUser({
        id: selectedUser.id,
        fullName: editFullName,
        role: editRole === "OWNER" ? UserRole.OWNER : UserRole.ACCOUNTANT,
        title: editTitle || undefined,
        isActive: editIsActive,
      });

      if (res.success) {
        toast.success(res.message || "تم تحديث المستخدم بنجاح");
        setIsEditOpen(false);
        window.location.reload();
      } else {
        toast.error(res.error || "فشل تحديث المستخدم");
      }
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ غير متوقع");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: UserViewItem) => {
    const isTargetOwner = user.role === UserRole.OWNER || (user.role as any) === "ADMIN";
    if (user.isActive && isTargetOwner && activeOwnersCount <= 1) {
      toast.error(
        "قاعدة أمان: لا يمكن تعطيل أو تغيير دور آخر مسؤول (OWNER) في النظام. يجب أن يكون هناك Owner نشط واحد على الأقل."
      );
      return;
    }

    const actionText = user.isActive ? "تعطيل" : "تفعيل";
    if (!confirm(`هل أنت متأكد من رغبتك في ${actionText} حساب ${user.fullName}؟`)) {
      return;
    }

    try {
      const res = await toggleUserStatus(user.id);
      if (res.success) {
        toast.success(res.message);
        window.location.reload();
      } else {
        toast.error(res.error);
      }
    } catch (err: any) {
      toast.error(err.message || "فشل تغيير حالة المستخدم");
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (resetPassValue.length < 6) {
      toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await resetUserPassword(selectedUser.id, resetPassValue);
      if (res.success) {
        toast.success(res.message);
        setIsResetPassOpen(false);
      } else {
        toast.error(res.error);
      }
    } catch (err: any) {
      toast.error(err.message || "فشل إعادة تعيين كلمة المرور");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top action & Filter Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#012d1d]" />
            إدارة مستخدمي النظام والصلاحيات
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            إضافة وتعديل حسابات المستخدمين وتحديد أدوارهم وحالات النشاط وإعادة تعيين كلمات المرور.
          </p>
        </div>

        <Button
          onClick={handleOpenAdd}
          className="bg-[#012d1d] hover:bg-[#02472e] text-white text-xs font-bold gap-1.5 h-9 shrink-0"
        >
          <UserPlus className="h-4 w-4" />
          إضافة مستخدم جديد
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-xs">
        <div className="relative">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="بحث بالاسم أو البريد الإلكتروني..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-right text-xs h-9 pr-9 bg-gray-50/50"
          />
        </div>

        <div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-gray-50/50 px-3 py-1 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-emerald-700"
          >
            <option value="ALL">كل الأدوار (OWNER & ACCOUNTANT)</option>
            <option value="OWNER">مالك النظام (OWNER)</option>
            <option value="ACCOUNTANT">محاسب مالي (ACCOUNTANT)</option>
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-gray-50/50 px-3 py-1 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-emerald-700"
          >
            <option value="ALL">كل الحالات (نشط & معطل)</option>
            <option value="ACTIVE">نشط فقط</option>
            <option value="INACTIVE">معطل فقط</option>
          </select>
        </div>
      </div>

      {/* Users Data Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-xs">
        <table className="w-full text-right text-xs">
          <thead className="border-b border-gray-200 bg-gray-50 text-gray-700 font-bold">
            <tr>
              <th className="p-3">الاسم والبيانات</th>
              <th className="p-3">البريد الإلكتروني</th>
              <th className="p-3 text-center">الدور والصلاحية</th>
              <th className="p-3 text-center">الحالة</th>
              <th className="p-3 text-center">تاريخ الإنشاء</th>
              <th className="p-3 text-center">آخر تسجيل دخول</th>
              <th className="p-3 text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-400">
                  لا توجد نتائج مطابقة لشروط البحث
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => {
                const isOwner = u.role === UserRole.OWNER || (u.role as any) === "ADMIN";
                return (
                  <tr key={u.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-gray-900">{u.fullName}</div>
                      <div className="text-[11px] text-gray-500">{u.title || "مستخدم نظام"}</div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5 font-mono text-gray-700">
                        <Mail className="h-3.5 w-3.5 text-gray-400" />
                        {u.email || "غير متوفر"}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      {isOwner ? (
                        <Badge className="bg-emerald-900 text-white font-bold text-[11px] px-2.5 py-0.5 shadow-xs">
                          OWNER (مالك)
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50/50 font-bold text-[11px] px-2.5 py-0.5">
                          ACCOUNTANT (محاسب)
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {u.isActive ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="h-3 w-3" /> نشط
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600 font-bold text-[11px] bg-red-50 px-2 py-0.5 rounded-full">
                          <XCircle className="h-3 w-3" /> معطل
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center font-mono text-gray-500 text-[11px]">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        {new Date(u.createdAt).toLocaleDateString("ar-EG", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </td>
                    <td className="p-3 text-center font-mono text-gray-500 text-[11px]">
                      {u.lastSignInAt ? (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3 text-gray-400" />
                          {new Date(u.lastSignInAt).toLocaleDateString("ar-EG", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(u)}
                          className="h-8 w-8 p-0 text-gray-600 hover:text-[#012d1d] hover:bg-gray-100"
                          title="تعديل المستخدم وتغيير الدور"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenResetPass(u)}
                          className="h-8 w-8 p-0 text-amber-600 hover:text-amber-800 hover:bg-amber-50"
                          title="إعادة تعيين كلمة المرور"
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(u)}
                          className={`h-8 w-8 p-0 ${
                            u.isActive
                              ? "text-red-600 hover:text-red-700 hover:bg-red-50"
                              : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          }`}
                          title={u.isActive ? "تعطيل الحساب" : "تفعيل الحساب"}
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add User Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[440px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right text-[#012d1d]">إنشاء مستخدم جديد</DialogTitle>
            <DialogDescription className="text-right text-xs text-gray-500">
              قم بإدخال بيانات المستخدم وتحديد دوره وكلمة المرور المؤقتة.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-3.5 py-2">
            <div className="space-y-1 text-right">
              <Label className="text-xs font-semibold">الاسم بالكامل *</Label>
              <Input
                required
                placeholder="أحمد محمد"
                value={addFullName}
                onChange={(e) => setAddFullName(e.target.value)}
                className="text-right text-xs h-9"
              />
            </div>

            <div className="space-y-1 text-right">
              <Label className="text-xs font-semibold">البريد الإلكتروني *</Label>
              <Input
                type="email"
                required
                placeholder="user@ecofresh.com"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                className="text-right text-xs h-9 font-mono"
              />
            </div>

            <div className="space-y-1 text-right">
              <Label className="text-xs font-semibold">كلمة المرور المؤقتة *</Label>
              <Input
                type="password"
                required
                placeholder="••••••••"
                value={addPassword}
                onChange={(e) => setAddPassword(e.target.value)}
                className="text-right text-xs h-9 font-mono"
              />
              <p className="text-[10px] text-gray-500">يجب ألا تقل عن 6 أحرف.</p>
            </div>

            <div className="space-y-1 text-right">
              <Label className="text-xs font-semibold">الدور في النظام *</Label>
              <select
                value={addRole}
                onChange={(e) => setAddRole(e.target.value as "OWNER" | "ACCOUNTANT")}
                className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-emerald-700"
              >
                <option value="OWNER">OWNER (مالك النظام - كامل الصلاحيات)</option>
                <option value="ACCOUNTANT">ACCOUNTANT (محاسب مالي - ماليات وخزينة فقط)</option>
              </select>
            </div>

            <div className="space-y-1 text-right">
              <Label className="text-xs font-semibold">المسمى الوظيفي</Label>
              <Input
                placeholder="مدير حسابات / مراجع"
                value={addTitle}
                onChange={(e) => setAddTitle(e.target.value)}
                className="text-right text-xs h-9"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddOpen(false)}
                disabled={isSubmitting}
                className="text-xs h-9"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#012d1d] hover:bg-[#02472e] text-white text-xs h-9"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : null}
                حفظ المستخدم
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[440px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right text-[#012d1d]">تعديل بيانات المستخدم والدور</DialogTitle>
            <DialogDescription className="text-right text-xs text-gray-500">
              تعديل الاسم والدور وحالة النشاط.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-3.5 py-2">
            <div className="space-y-1 text-right">
              <Label className="text-xs font-semibold">الاسم بالكامل *</Label>
              <Input
                required
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                className="text-right text-xs h-9"
              />
            </div>

            <div className="space-y-1 text-right">
              <Label className="text-xs font-semibold">البريد الإلكتروني (للعرض فقط)</Label>
              <Input
                disabled
                value={selectedUser?.email || ""}
                className="text-right text-xs h-9 font-mono bg-gray-100"
              />
            </div>

            <div className="space-y-1 text-right">
              <Label className="text-xs font-semibold">الدور في النظام *</Label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as "OWNER" | "ACCOUNTANT")}
                className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-emerald-700"
              >
                <option value="OWNER">OWNER (مالك النظام - كامل الصلاحيات)</option>
                <option value="ACCOUNTANT">ACCOUNTANT (محاسب مالي - ماليات وخزينة فقط)</option>
              </select>
            </div>

            <div className="space-y-1 text-right">
              <Label className="text-xs font-semibold">المسمى الوظيفي</Label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-right text-xs h-9"
              />
            </div>

            <div className="space-y-1 text-right">
              <Label className="text-xs font-semibold">حالة الحساب</Label>
              <select
                value={editIsActive ? "active" : "inactive"}
                onChange={(e) => setEditIsActive(e.target.value === "active")}
                className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-emerald-700"
              >
                <option value="active">نشط (مسموح له بتسجيل الدخول)</option>
                <option value="inactive">معطل (محظور من تسجيل الدخول)</option>
              </select>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
                disabled={isSubmitting}
                className="text-xs h-9"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#012d1d] hover:bg-[#02472e] text-white text-xs h-9"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : null}
                حفظ التعديلات
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={isResetPassOpen} onOpenChange={setIsResetPassOpen}>
        <DialogContent className="sm:max-w-[400px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right text-[#012d1d] flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-amber-600" />
              إعادة تعيين كلمة المرور
            </DialogTitle>
            <DialogDescription className="text-right text-xs text-gray-500">
              تعيين كلمة مرور جديدة للمستخدم: <strong>{selectedUser?.fullName}</strong>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5 py-2">
            <div className="space-y-1 text-right">
              <Label className="text-xs font-semibold">كلمة المرور الجديدة *</Label>
              <Input
                type="password"
                required
                placeholder="••••••••"
                value={resetPassValue}
                onChange={(e) => setResetPassValue(e.target.value)}
                className="text-right text-xs h-9 font-mono"
              />
              <p className="text-[10px] text-gray-500">يجب ألا تقل عن 6 أحرف.</p>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsResetPassOpen(false)}
                disabled={isSubmitting}
                className="text-xs h-9"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-9"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : null}
                تعيين كلمة المرور
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
