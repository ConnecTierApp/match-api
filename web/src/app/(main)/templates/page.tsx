"use client";

import { CreateTemplateCard } from "./_components/create-template-card";
import { TemplateCoverageCard } from "./_components/template-coverage-card";
import { TemplatesListCard } from "./_components/templates-list-card";
import { useEntityOptions } from "@/modules/entities/hooks/use-entities";
import { useTemplateMutations } from "@/modules/templates/hooks/use-template-mutations";
import { useTemplates } from "@/modules/templates/hooks/use-templates";

export default function TemplatesPage() {
  const { data: templates } = useTemplates();
  const entityOptions = useEntityOptions();
  const { createTemplate, deleteTemplate } = useTemplateMutations();

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <div className="flex flex-col gap-6">
        <CreateTemplateCard entityOptions={entityOptions} onCreate={createTemplate} />
        <TemplatesListCard templates={templates} onDelete={deleteTemplate} />
      </div>
      <TemplateCoverageCard templates={templates} entityOptions={entityOptions} />
    </div>
  );
}
