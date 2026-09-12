"use client";

import { useState } from "react";
import { AuthUser } from "@/lib/auth";
import { changeOwnPassword } from "@/actions/users";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { User, Mail, Shield, KeyRound, CheckCircle2, Lock, Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface MyAccountTabProps {
  user: AuthUser;
}

export function MyAccountTab({ user }: MyAccountTabProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isOwner = user.role === "OWNER" || (user.role as any) === "ADMIN";

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      toast.error("يرجى إدخال كلمة المرور الجديدة وتأكيدها");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("كلمة المرور الجديدة وتأكيدها غير متطابقين");
      return;
    }

    if (currentPassword && currentPassword === newPassword) {
      toast.error("كلمة المرور الجديدة يجب أن تكون مختلفة عن كلمة المرور الحالية");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await changeOwnPassword({
        currentPassword: currentPassword || undefined,
        newPassword,
        confirmPassword,
      });

      if (res.success) {
        toast.success(res.message || "تم تغيير كلمة المرور بنجاح");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast.error(res.error || "فشل تغيير كلمة المرور");
      }
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء تغيير كلمة المرور");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    if (!confirm("هل أنت متأكد من رغبتك في تسجيل الخروج؟")) return;

    setIsLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      toast.success("تم تسجيل الخروج بنجاح");
      window.location.href = "/login";
    } catch (err: any) {
      toast.error("حدث خطأ أثناء تسجيل الخروج");
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {/* Profile Details & Session Control */}
      <div className="space-y-4 md:col-span-1">
        <Card className="border-gray-200 shadow-xs bg-white">
          <CardHeader className="pb-3 border-b border-gray-100">
            <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <User className="h-4 w-4 text-[#012d1d]" />
              الملف الشخصي
            </CardTitle>
            <CardDescription className="text-xs text-gray-500">
              معلومات الحساب والصلاحيات المسندة لك
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-[#012d1d] text-white flex items-center justify-center font-bold text-base border-2 border-emerald-600 shadow-xs">
                {user.fullName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="font-bold text-sm text-gray-900">{user.fullName}</div>
                <div className="text-gray-500">{user.title || "مستخدم نظام"}</div>
              </div>
            </div>

            <div className="space-y-2.5 pt-2 border-t border-gray-100">
              <div>
                <span className="text-gray-400 block mb-0.5">البريد الإلكتروني</span>
                <div className="flex items-center gap-1.5 font-mono font-medium text-gray-800">
                  <Mail className="h-3.5 w-3.5 text-gray-400" />
                  {user.email || "غير متوفر"}
                </div>
              </div>

              <div>
                <span className="text-gray-400 block mb-0.5">الدور في النظام</span>
                <div>
                  {isOwner ? (
                    <Badge className="bg-emerald-900 text-white font-bold text-[11px] px-2.5 py-0.5">
                      OWNER (مالك النظام)
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50 font-bold text-[11px] px-2.5 py-0.5">
                      ACCOUNTANT (محاسب مالي)
                    </Badge>
                  )}
                </div>
              </div>

              <div>
                <span className="text-gray-400 block mb-0.5">حالة الحساب</span>
                <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="h-3 w-3" /> نشط ومعتمد
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logout Card */}
        <Card className="border-red-100 bg-red-50/30 shadow-xs">
          <CardContent className="p-4 flex flex-col gap-2.5">
            <div className="flex items-center gap-2 text-red-900 font-bold text-xs">
              <LogOut className="h-4 w-4 text-red-600" />
              إنهاء الجلسة وتسجيل الخروج
            </div>
            <p className="text-[11px] text-gray-500">
              تسجيل الخروج من النظام وإغلاق الجلسة الحالية على هذا الجهاز.
            </p>
            <Button
              variant="outline"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full border-red-200 text-red-700 hover:bg-red-600 hover:text-white text-xs font-bold h-9 mt-1 gap-2 transition-colors"
            >
              {isLoggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              تسجيل الخروج الآن
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Change Password Card */}
      <Card className="border-gray-200 shadow-xs md:col-span-2 bg-white h-fit">
        <CardHeader className="pb-3 border-b border-gray-100">
          <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-[#012d1d]" />
            تغيير كلمة المرور
          </CardTitle>
          <CardDescription className="text-xs text-gray-500">
            تحديث كلمة المرور الخاصة بحسابك لحماية وأمان بيانات المنشأة.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div className="space-y-1.5 text-right">
              <Label className="text-xs font-semibold text-gray-700">كلمة المرور الحالية (اختياري)</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="text-right text-xs h-9 font-mono"
              />
            </div>

            <div className="space-y-1.5 text-right">
              <Label className="text-xs font-semibold text-gray-700">كلمة المرور الجديدة *</Label>
              <Input
                type="password"
                required
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="text-right text-xs h-9 font-mono"
              />
              <p className="text-[10px] text-gray-400">يجب ألا تقل عن 6 خانات وتكون مختلفة عن الحالية.</p>
            </div>

            <div className="space-y-1.5 text-right">
              <Label className="text-xs font-semibold text-gray-700">تأكيد كلمة المرور الجديدة *</Label>
              <Input
                type="password"
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="text-right text-xs h-9 font-mono"
              />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#012d1d] hover:bg-[#02472e] text-white text-xs font-bold h-9 px-4 gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin ml-1" />
                    جاري التحديث...
                  </>
                ) : (
                  <>
                    <Lock className="h-3.5 w-3.5" />
                    تحديث كلمة المرور
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
