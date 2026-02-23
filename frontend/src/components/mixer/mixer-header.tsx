import { Download } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type MixerHeaderProps = {
  projectName: string;
  sampleRate: number | null;
  armedCount: number;
  onExport: () => void;
  exportDisabled: boolean;
  exporting: boolean;
};

export function MixerHeader({
  projectName,
  sampleRate,
  armedCount,
  onExport,
  exportDisabled,
  exporting,
}: MixerHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{projectName}</h1>
          <Badge variant="outline">
            {sampleRate ? `${sampleRate} Hz` : "Sample Rate"}
          </Badge>
          <Badge variant="secondary">{armedCount} armed</Badge>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={onExport}
          disabled={exportDisabled}
        >
          <Download className="mr-2 h-4 w-4" />
          {exporting ? "Exporting..." : "Export MP4"}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Live-style mixing for takes, overdubs, and quick balance passes.
      </p>
    </div>
  );
}
