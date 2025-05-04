import { useAttributeConditionForm, type Condition } from "./hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const AttributeConditionForm = ({
  handleFetchFcbWithAttributeConditions,
}: {
  handleFetchFcbWithAttributeConditions: (attrCond: Condition[]) => void;
}) => {
  const {
    conditions,
    updateCondition,
    addCondition,
    handleFetchFcb,
    removeCondition,
    getQuery,
  } = useAttributeConditionForm({ handleFetchFcbWithAttributeConditions });

  // The select options: display mathematical symbols as labels but use query tokens internally.
  const operatorOptions: { label: string; value: Condition["operator"] }[] = [
    { label: ">", value: "Gt" },
    { label: ">=", value: "Ge" },
    { label: "=", value: "Eq" },
    { label: "<", value: "Lt" },
    { label: "<=", value: "Le" },
  ];

  return (
    <div className="space-y-3 mt-2">
      <div className="space-y-2">
        {conditions.map((cond, index) => (
          <div key={index} className="flex items-center gap-2">
            {/* Attribute Input */}
            <Input
              type="text"
              value={cond.attribute}
              placeholder="Attribute"
              onChange={(e) =>
                updateCondition(index, "attribute", e.target.value)
              }
              className="w-full"
            />
            {/* Operator Select */}
            <Select
              value={cond.operator}
              onValueChange={(val) => updateCondition(index, "operator", val)}
            >
              <SelectTrigger className="w-16">
                <SelectValue placeholder="Op" />
              </SelectTrigger>
              <SelectContent>
                {operatorOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Value Input */}
            <Input
              type={typeof cond.value === "number" ? "number" : "text"}
              value={cond.value}
              placeholder="Value"
              onChange={(e) => updateCondition(index, "value", e.target.value)}
              className="w-full"
            />
            {/* Remove Button */}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => removeCondition(index)}
            >
              X
            </Button>
          </div>
        ))}
      </div>
      <div className="flex justify-between">
        <Button onClick={addCondition} size="sm" variant="outline">
          Add Condition
        </Button>
        {/* <Button onClick={handleFetchFcb} size="sm">
          Apply Conditions
        </Button> */}
      </div>
      <div className="mt-2 p-2 bg-gray-50 rounded-sm border border-neutral-200">
        <div className="text-xs font-medium text-neutral-500">
          Current Query
        </div>
        <div className="text-sm font-mono">{getQuery()}</div>
      </div>
    </div>
  );
};

export default AttributeConditionForm;
