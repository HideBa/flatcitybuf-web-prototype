import React, { useState } from "react";
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
  // Local state to control collapsed/expanded state.
  const [isCollapsed, setIsCollapsed] = useState(false);
  const toggleCollapse = () => setIsCollapsed((prev) => !prev);

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
    <div className="p-4 border rounded shadow bg-white">
      {/* Header with collapse/expand toggle */}
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-bold">
          {isCollapsed
            ? "Attribute Conditions (Collapsed)"
            : "Attribute Conditions"}
        </h3>
        <Button variant="ghost" onClick={toggleCollapse} className="text-sm">
          {isCollapsed ? "Expand" : "Collapse"}
        </Button>
      </div>

      {!isCollapsed && (
        <>
          <div className="space-y-4">
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
                  className="w-40"
                />
                {/* Operator Select */}
                <Select
                  value={cond.operator}
                  onValueChange={(val) =>
                    updateCondition(index, "operator", val)
                  }
                >
                  <SelectTrigger className="w-20">
                    <SelectValue placeholder="Operator" />
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
                  onChange={(e) =>
                    updateCondition(index, "value", e.target.value)
                  }
                  className="w-40"
                />
                {/* Remove Button */}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => removeCondition(index)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <Button onClick={addCondition}>Add Condition</Button>
            <Button onClick={handleFetchFcb}>Fetch FCB with conditions</Button>
          </div>
          <div className="mt-4">
            <div className="text-sm font-medium mb-1">Current Query:</div>
            <div className="p-2 bg-gray-100 rounded text-sm">{getQuery()}</div>
          </div>
        </>
      )}
    </div>
  );
};

export default AttributeConditionForm;
