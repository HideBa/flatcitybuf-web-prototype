import { useAtom } from "jotai";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type Condition } from "@/api/fcb";
import AttributeConditionForm from "../attribute";
import { useState } from "react";
import {
  fetchModeAtom,
  featureLimitAtom,
  attributeConditionsAtom,
  canFetchDataAtom,
  hasMoreDataAtom,
  lastFetchedDataAtom,
  isLoadingAtom,
  FetchMode,
  indexableColumnsAtom,
} from "@/store";

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
}

const DataFetchControls = ({
  handleFetchFcb,
  handleFetchFcbWithAttributeConditions,
  loadNextBatch,
  handleCjSeqDownload,
  hasRectangle,
}: DataFetchControlsProps) => {
  // Use Jotai atoms for state
  const [fetchMode, setFetchMode] = useAtom(fetchModeAtom);
  const [featureLimit, setFeatureLimit] = useAtom(featureLimitAtom);
  const [attributeConditions] = useAtom(attributeConditionsAtom);
  const [canFetchData] = useAtom(canFetchDataAtom);
  const [hasMoreData] = useAtom(hasMoreDataAtom);
  const [lastFetchData] = useAtom(lastFetchedDataAtom);
  const [isLoading] = useAtom(isLoadingAtom);
  const [width, setWidth] = useState(500);
  const [isResizing, setIsResizing] = useState(false);
  const [indexableColumns] = useAtom(indexableColumnsAtom);

  const handleFetchData = () => {
    if (fetchMode === "bbox") {
      handleFetchFcb(0, featureLimit);
    } else {
      // Use the actual attribute conditions instead of an empty array
      handleFetchFcbWithAttributeConditions(
        attributeConditions,
        0,
        featureLimit
      );
    }
  };

  const handleLoadNextBatch = () => {
    if (!lastFetchData) return;
    loadNextBatch(lastFetchData.currentOffset, featureLimit);
  };

  // Handle mouse events for resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = Math.max(250, Math.min(600, e.clientX));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div
      className="p-4 bg-white rounded-md shadow-sm border border-neutral-200 relative"
      style={{ width: `${width}px` }}
    >
      {/* Resize handle */}
      <div
        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-blue-200 transition-colors"
        onMouseDown={() => setIsResizing(true)}
      />

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
                  min={10}
                  max={10000}
                  value={featureLimit}
                  step={100}
                  onChange={(e) =>
                    setFeatureLimit(parseInt(e.target.value) || 100)
                  }
                />
              </div>
              <Button
                className="mb-px"
                onClick={handleLoadNextBatch}
                disabled={!hasMoreData}
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
              <>
                {indexableColumns.length === 0 && isLoading ? (
                  <div className="py-4 text-center text-gray-500">
                    Loading available attributes...
                  </div>
                ) : indexableColumns.length === 0 ? (
                  <div className="py-4 text-center text-gray-500">
                    No indexable attributes found.
                  </div>
                ) : (
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
              </>
            )}

            {/* Fetch Button */}
            <Button
              className="w-full mt-2"
              onClick={handleFetchData}
              disabled={!canFetchData}
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
