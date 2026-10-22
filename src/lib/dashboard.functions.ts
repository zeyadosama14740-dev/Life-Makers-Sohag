import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import type { Dataset } from "./sheets/types";

const CACHE_MS = 5 * 60 * 1000;

export const getDataset = createServerFn({ method: "POST" })
  .inputValidator((input: { force?: boolean } | undefined) => input ?? {})
  .handler(async ({ data }): Promise<Dataset> => {
    const { getRawSources } = await import("./sheets/fetch.server");
    const { buildDataset } = await import("./sheets/build");
    return buildDataset(await getRawSources(!!data.force));
  });

export const datasetQuery = () =>
  queryOptions({
    queryKey: ["dataset"],
    queryFn: () => getDataset({ data: {} }),
    staleTime: CACHE_MS,
    refetchInterval: CACHE_MS,
    refetchOnWindowFocus: true,
  });
