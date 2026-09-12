"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Snowflake } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { loginAction } from "../actions";

const loginSchema = z.object({
  email: z.string().email("البريد الإلكتروني غير صحيح"),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginValues) {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("email", values.email);
      formData.append("password", values.password);

      const res = await loginAction(null, formData);
      if (res?.error) {
        toast.error(res.error);
        setIsLoading(false);
      }
    } catch (err: any) {
      toast.error("حدث خطأ أثناء الاتصال بالخادم");
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md border-0 shadow-lg">
      <CardHeader className="space-y-3 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#012d1d] text-white">
          <Snowflake className="h-8 w-8 text-cyan-400" />
        </div>
        <CardTitle className="text-2xl font-bold text-[#012d1d]">
          EcoFresh
        </CardTitle>
        <CardDescription className="text-sm text-gray-600">
          إيكو فريش — نظام إدارة المحطات وتصدير الحاصلات الزراعية
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} method="POST" className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">البريد الإلكتروني</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="admin@ecofresh.com"
                      className="text-right"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">كلمة المرور</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      className="text-right"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#012d1d] hover:bg-[#02472e] text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري تسجيل الدخول...
                </>
              ) : (
                "تسجيل الدخول"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
