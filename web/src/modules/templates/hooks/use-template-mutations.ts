"use client";

import { useSWRConfig } from "swr";

import { TEMPLATES_KEY } from "@/modules/templates/hooks/use-templates";
import {
  createTemplateApi,
  deleteTemplateApi,
  updateTemplateApi,
} from "@/modules/templates/lib/api";
import { Template, TemplateInput, TemplateUpdate } from "@/types/matching";

export function useTemplateMutations() {
  const { mutate } = useSWRConfig();

  const createTemplate = async (input: TemplateInput) => {
    await mutate(
      TEMPLATES_KEY,
      async (currentTemplates: Template[] | undefined) => {
        const created = await createTemplateApi(input);
        if (!currentTemplates) {
          return [created];
        }
        return [created, ...currentTemplates];
      },
      false,
    );
  };

  const updateTemplate = async (id: string, input: TemplateUpdate) => {
    await mutate(
      TEMPLATES_KEY,
      async (currentTemplates: Template[] | undefined) => {
        const updated = await updateTemplateApi(id, input);
        if (!currentTemplates) {
          return [updated];
        }

        return currentTemplates.map((template) => (template.id === id ? updated : template));
      },
      false,
    );
  };

  const deleteTemplate = async (id: string) => {
    await mutate(
      TEMPLATES_KEY,
      async (currentTemplates: Template[] | undefined) => {
        await deleteTemplateApi(id);
        if (!currentTemplates) {
          return [];
        }

        return currentTemplates.filter((template) => template.id !== id);
      },
      false,
    );
  };

  return {
    createTemplate,
    updateTemplate,
    deleteTemplate,
  } as const;
}
