import { createFileRoute } from "@tanstack/react-router";

// Serves only images that live in an admin-configured photo folder.
export const Route = createFileRoute("/api/public/drive-image/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (!/^[\w-]{10,100}$/.test(params.id)) return new Response("bad id", { status: 400 });
        try {
          const { driveFetch, configuredFolders } = await import("@/lib/drive.server");
          const folders = new Set((await configuredFolders()).map((f) => f.folder_id));
          const meta = (await (await driveFetch(`/files/${params.id}?fields=parents,mimeType&supportsAllDrives=true`)).json()) as { parents?: string[]; mimeType?: string };
          if (!meta.mimeType?.startsWith("image/") || !meta.parents?.some((p) => folders.has(p))) return new Response("not found", { status: 404 });
          const file = await driveFetch(`/files/${params.id}?alt=media&supportsAllDrives=true`);
          return new Response(file.body, { headers: { "Content-Type": meta.mimeType, "Cache-Control": "public, max-age=300" } });
        } catch {
          return new Response("unavailable", { status: 502 });
        }
      },
    },
  },
});
