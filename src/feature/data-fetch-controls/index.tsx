import { useAtom } from "jotai";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Condition } from "../attribute/hooks";
import AttributeConditionForm from "../attribute";
import {
  fetchModeAtom,
  featureLimitAtom,
  attributeConditionsAtom,
  canFetchDataAtom,
  hasMoreDataAtom,
  lastFetchedDataAtom,
  isLoadingAtom,
  FetchMode,
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
