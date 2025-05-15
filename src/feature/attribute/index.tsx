import type { Condition } from "@/api/fcb/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { attributeConditionsAtom, indexableColumnsAtom } from "@/store";
import { useAtom } from "jotai";
import { useAttributeConditionForm } from "./hooks";

const AttributeConditionForm = ({
	handleFetchFcbWithAttributeConditions,
}: {
	handleFetchFcbWithAttributeConditions: (attrCond: Condition[]) => void;
}) => {
	// Get conditions from Jotai atom
	const [conditions] = useAtom(attributeConditionsAtom);
	// Get indexable columns from the derived atom
	const [indexableColumns] = useAtom(indexableColumnsAtom);

	const { updateCondition, addCondition, removeCondition, getQuery } =
		useAttributeConditionForm({ handleFetchFcbWithAttributeConditions });

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
					<div
						key={`${cond.attribute}-${cond.operator}-${cond.value}`}
						className="flex items-center gap-2"
					>
						{/* Attribute Select - replaces the Input */}
						<Select
							value={cond.attribute}
							onValueChange={(val) => updateCondition(index, "attribute", val)}
						>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Select attribute" />
							</SelectTrigger>
							<SelectContent>
								{indexableColumns.map((column) => (
									<SelectItem key={column.name} value={column.name}>
										{column.title || column.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
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
