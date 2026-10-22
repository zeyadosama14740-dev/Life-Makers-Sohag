import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { datasetQuery, getDataset } from "@/lib/dashboard.functions";

export function useDataset() {
  return useSuspenseQuery(datasetQuery()).data;
}

export function useRefresh() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const refresh = async () => {
    setBusy(true);
    try {
      const data = await getDataset({ data: { force: true } });
      qc.setQueryData(datasetQuery().queryKey, data);
      await Promise.all(["volunteers","volunteer","participations","quality"].map(key=>qc.invalidateQueries({queryKey:[key]})));
      toast.success("تم تحديث البيانات من Google Sheets");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر التحديث");
    } finally {
      setBusy(false);
    }
  };
  return { refresh, busy };
}
