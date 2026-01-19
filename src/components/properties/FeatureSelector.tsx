import { useState } from "react";
import { X, Plus, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface FeatureSelectorProps {
  label?: string;
  availableFeatures: string[];
  selectedFeatures: string[];
  onSelect: (features: string[]) => void;
  onAddNew?: (feature: string) => void;
  allowAddNew?: boolean;
  placeholder?: string;
  className?: string;
}

export function FeatureSelector({
  label,
  availableFeatures,
  selectedFeatures,
  onSelect,
  onAddNew,
  allowAddNew = true,
  placeholder = "Adicionar...",
  className,
}: FeatureSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [newFeature, setNewFeature] = useState("");

  const filteredFeatures = availableFeatures.filter(
    (feature) =>
      feature.toLowerCase().includes(search.toLowerCase()) &&
      !selectedFeatures.includes(feature)
  );

  const handleSelect = (feature: string) => {
    if (selectedFeatures.includes(feature)) {
      onSelect(selectedFeatures.filter((f) => f !== feature));
    } else {
      onSelect([...selectedFeatures, feature]);
    }
  };

  const handleRemove = (feature: string) => {
    onSelect(selectedFeatures.filter((f) => f !== feature));
  };

  const handleAddNew = () => {
    if (newFeature.trim() && onAddNew) {
      onAddNew(newFeature.trim());
      onSelect([...selectedFeatures, newFeature.trim()]);
      setNewFeature("");
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label className="text-sm font-medium leading-none">{label}</label>
      )}

      {/* Selected Features */}
      <div className="flex flex-wrap gap-2 min-h-[2rem]">
        {selectedFeatures.map((feature) => (
          <Badge
            key={feature}
            variant="secondary"
            className="gap-1 pr-1"
          >
            {feature}
            <button
              type="button"
              onClick={() => handleRemove(feature)}
              className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}

        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-6 px-2 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              {placeholder}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-2 h-8"
            />

            <div className="max-h-48 overflow-y-auto space-y-1">
              {filteredFeatures.map((feature) => (
                <button
                  key={feature}
                  type="button"
                  onClick={() => {
                    handleSelect(feature);
                    setSearch("");
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md",
                    "hover:bg-muted transition-colors text-left",
                    selectedFeatures.includes(feature) && "bg-muted"
                  )}
                >
                  <Check
                    className={cn(
                      "h-4 w-4",
                      selectedFeatures.includes(feature)
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  {feature}
                </button>
              ))}

              {filteredFeatures.length === 0 && search && (
                <p className="text-sm text-muted-foreground px-2 py-1">
                  Nenhum resultado encontrado
                </p>
              )}
            </div>

            {allowAddNew && onAddNew && (
              <div className="mt-2 pt-2 border-t flex gap-2">
                <Input
                  placeholder="Nova característica"
                  value={newFeature}
                  onChange={(e) => setNewFeature(e.target.value)}
                  className="h-8 flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddNew();
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  className="h-8"
                  onClick={handleAddNew}
                  disabled={!newFeature.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
