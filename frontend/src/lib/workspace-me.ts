import { useQuery } from "@tanstack/react-query";
import { workspacesApi } from "./notes-api";

export function useWorkspaceMe() {
  return useQuery({
    queryKey: ["workspace", "me"],
    queryFn: workspacesApi.me,
    staleTime: 60_000,
  });
}
