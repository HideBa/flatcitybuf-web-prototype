import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Condition } from "../attribute/hooks";
import AttributeConditionForm from "../attribute";

type FetchMode = "bbox" | "attribute";

interface DataFetchControlsProps {
  handleFetchFcb: (offset?: number, limit?: number) => void;
  handleFetchFcbWithAttributeConditions: (
    attrCond: Condition[],
    offset?: number,
    limit?: number
  ) => void;
  loadNextBatch: (offset: number, limit: number) => void;
  handleCjSeqDownload: () => void;
  hasRectangle: boolean;
  isLoading: boolean;
  lastFetchData?: {
    totalFeatures: number;
    currentOffset: number;
  } | null;
}

const DataFetchControls = ({
  handleFetchFcb,
  handleFetchFcbWithAttributeConditions,
  loadNextBatch,
  handleCjSeqDownload,
  hasRectangle,
  isLoading,
  lastFetchData,
}: DataFetchControlsProps) => {
  const [fetchMode, setFetchMode] = useState<FetchMode>("bbox");
  const [featureLimit, setFeatureLimit] = useState(10);

  // Control the enabled state of the "Load Next Batch" button
  const hasMoreData =
    lastFetchData && lastFetchData.currentOffset < lastFetchData.totalFeatures;

  const canLoadMore = Boolean(lastFetchData) && hasMoreData && !isLoading;

  const handleFetchData = () => {
    if (fetchMode === "bbox") {
      handleFetchFcb(0, featureLimit);
    } else {
      handleFetchFcbWithAttributeConditions([], 0, featureLimit);
    }
  };

  const handleLoadNextBatch = () => {
    if (!lastFetchData) return;
    loadNextBatch(lastFetchData.currentOffset, featureLimit);
  };

  return (
    <div className="p-4 bg-white rounded-md shadow-sm border border-neutral-200">
      {/* Main container with sections */}
      <div className="space-y-4">
        {/* Data Fetch Controls Section */}
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Data Fetch Controls</h3>

          <div className="space-y-2">
            {/* Fetch Mode Selection */}
            <div className="space-y-2">
              <Label>Fetch Mode</Label>
              <RadioGroup
                defaultValue="bbox"
                value={fetchMode}
                onValueChange={(value: string) =>
                  setFetchMode(value as FetchMode)
                }
                className="flex flex-row gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="bbox" id="bbox" />
                  <Label htmlFor="bbox">BBox</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="attribute" id="attribute" />
                  <Label htmlFor="attribute">Attribute Condition</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Feature Limit Control */}
            <div className="grid grid-cols-2 gap-2 items-end">
              <div className="space-y-2">
                <Label htmlFor="featureLimit">Features per Batch</Label>
                <Input
                  id="featureLimit"
                  type="number"
                  min={1}
                  max={1000}
                  value={featureLimit}
                  onChange={(e) =>
                    setFeatureLimit(parseInt(e.target.value) || 10)
                  }
                />
              </div>
              <Button
                className="mb-px"
                onClick={handleLoadNextBatch}
                disabled={!canLoadMore}
              >
                Load Next Batch
                {lastFetchData && (
                  <span className="text-xs ml-1">
                    ({lastFetchData.currentOffset}/{lastFetchData.totalFeatures}
                    )
                  </span>
                )}
              </Button>
            </div>

            {/* Attribute Conditions Form */}
            {fetchMode === "attribute" && (
              <AttributeConditionForm
                handleFetchFcbWithAttributeConditions={(conditions) => {
                  handleFetchFcbWithAttributeConditions(
                    conditions,
                    0,
                    featureLimit
                  );
                }}
              />
            )}

            {/* Fetch Button */}
            <Button
              className="w-full mt-2"
              onClick={handleFetchData}
              disabled={(fetchMode === "bbox" && !hasRectangle) || isLoading}
            >
              {isLoading ? "Loading..." : "Fetch FCB"}
            </Button>
          </div>
        </div>

        {/* Export Section */}
        <div className="pt-2 border-t border-neutral-200">
          <h3 className="text-lg font-medium mb-2">Export Options</h3>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleCjSeqDownload}
            disabled={!hasRectangle || isLoading}
          >
            Download CJSeq
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DataFetchControls;
