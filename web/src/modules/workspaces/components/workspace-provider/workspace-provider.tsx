"use client";

import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { useWorkspaces } from "@/modules/workspaces/hooks/use-workspaces";
import { Workspace } from "@/types/matching";

interface WorkspaceContextValue {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  isLoading: boolean;
  error: Error | undefined;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  refresh: () => Promise<Workspace[] | undefined>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { data: workspaces, isLoading, error, mutate } = useWorkspaces();
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);

  useEffect(() => {
    if (workspaces.length === 0) {
      setCurrentWorkspace(null);
      return;
    }

    setCurrentWorkspace((previous) => {
      if (previous && workspaces.some((workspace) => workspace.id === previous.id)) {
        return previous;
      }

      return workspaces[0];
    });
  }, [workspaces]);

  const refresh = useCallback(() => mutate(), [mutate]);

  const value = useMemo(
    () => ({
      workspaces,
      currentWorkspace,
      isLoading,
      error: error ?? undefined,
      setCurrentWorkspace,
      refresh,
    }),
    [workspaces, currentWorkspace, isLoading, error, refresh],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspaceContext() {
  const context = useContext(WorkspaceContext);

  if (!context) {
    throw new Error("useWorkspaceContext must be used within a WorkspaceProvider");
  }

  return context;
}
