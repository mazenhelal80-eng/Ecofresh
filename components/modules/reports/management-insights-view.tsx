"use client";

import React from "react";
import { Lightbulb, AlertTriangle, AlertCircle, Info, CheckCircle2, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ManagementInsight } from "@/lib/reports/types";

interface ManagementInsightsViewProps {
  insights: ManagementInsight[];
}

export function ManagementInsightsView({ insights }: ManagementInsightsViewProps) {
  if (insights.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-12 text-center space-y-3 shadow-sm">
        <div className="flex justify-center">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-full text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
        </div>
        <h3 className="text-base font-bold text-foreground">
          كافة المؤشرات التشغيلية والمالية ضمن النطاق الآمن
        </h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          لم ترصد الخوارزميات التحليلية أي انحرافات حادة في معدلات الهالك، أسعار الشراء، أو التحصيلات خلال هذه الفترة.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-bold text-foreground text-sm">
              رؤى وقرارات الإدارة العليا (Strategic Decision Engine)
            </h3>
            <p className="text-xs text-muted-foreground">
              تنبيهات مؤتمتة مستخلصة من مقارنة الأداء الدوري لمساعدة الإدارة في اتخاذ القرارات
            </p>
          </div>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-primary/10 text-primary">
          {insights.length} رؤى وتوصيات
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {insights.map((insight) => {
          const isAlert = insight.severity === 'ALERT';
          const isWarning = insight.severity === 'WARNING';

          return (
            <Card
              key={insight.id}
              className={`border transition-shadow hover:shadow-md ${
                isAlert
                  ? 'border-rose-300 dark:border-rose-900 bg-rose-50/30 dark:bg-rose-950/10'
                  : isWarning
                  ? 'border-amber-300 dark:border-amber-900 bg-amber-50/30 dark:bg-amber-950/10'
                  : 'border-border bg-card'
              }`}
            >
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {isAlert ? (
                      <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
                    ) : isWarning ? (
                      <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                    ) : (
                      <Info className="h-5 w-5 text-primary shrink-0" />
                    )}
                    <span className="text-xs font-bold font-mono text-muted-foreground">
                      [{insight.category}]
                    </span>
                  </div>

                  {insight.metricHighlight && (
                    <span
                      className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                        isAlert
                          ? 'bg-rose-100 dark:bg-rose-950 text-rose-700'
                          : isWarning
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-700'
                          : 'bg-primary/10 text-primary'
                      }`}
                    >
                      {insight.metricHighlight}
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="font-bold text-foreground text-sm">{insight.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {insight.description}
                  </p>
                </div>

                {insight.actionRecommendation && (
                  <div className="pt-2 border-t border-border/50 text-xs">
                    <span className="font-bold text-foreground flex items-center gap-1">
                      <ArrowRight className="h-3.5 w-3.5 text-primary rotate-180" />
                      التوصية الإدارية المقترحة:
                    </span>
                    <p className="text-muted-foreground mt-0.5">
                      {insight.actionRecommendation}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
