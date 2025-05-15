import type { Condition as ConditionType } from "@/api/fcb";
import { attributeConditionsAtom } from "@/store";
import { useAtom } from "jotai";

export type Condition = ConditionType;

type Props = {
	handleFetchFcbWithAttributeConditions: (attrCond: Condition[]) => void;
};

export const useAttributeConditionForm = ({
	handleFetchFcbWithAttributeConditions,
}: Props) => {
	// Use Jotai atom instead of local state
	const [conditions, setConditions] = useAtom(attributeConditionsAtom);

	const updateCondition = (
		index: number,
		key: keyof Condition,
		value: string,
	) => {
		setConditions((prev) => {
			const newConditions = [...prev];
			if (key === "value") {
				// Try to parse as number; if not a valid number, leave it as a string.
				const num = Number.parseFloat(value);
				newConditions[index][key] = Number.isNaN(num) ? value : num;
			} else if (key === "operator") {
				// Ensure the operator is one of the valid types
				newConditions[index][key] = value as Condition["operator"];
			} else {
				// For attribute field
				newConditions[index][key] = value;
			}
			return newConditions;
		});
	};

	const addCondition = () => {
		setConditions((prev) => [
			...prev,
			{ attribute: "", operator: "Eq", value: "" },
		]);
	};

	const removeCondition = (index: number) => {
		setConditions((prev) => prev.filter((_, i) => i !== index));
	};

	// A helper to build a query string from the conditions.
	// For example: "b3_h_dak_50p > 2 AND identificatie = 'NL.IMBAG.Pand.0503100000012869'"
	const getQuery = () => {
		return conditions
			.map((c) => {
				// Convert operator token to symbol (the conversion here is inverse to our select display)
				const operatorSymbol = convertOperatorToSymbol(c.operator);
				// If value is not numeric then wrap it in quotes.
				const valueString =
					typeof c.value === "number" ? c.value : `'${c.value}'`;
				return `${c.attribute} ${operatorSymbol} ${valueString}`;
			})
			.join(" AND ");
	};

	function convertOperatorToSymbol(operator: string): string {
		// Here is the mapping:
		// "Gt" → ">"
		// "Ge" → ">="
		// "Eq" → "="
		// "Lt" → "<"
		// "Le" → "<="
		switch (operator) {
			case "Gt":
				return ">";
			case "Ge":
				return ">=";
			case "Eq":
				return "=";
			case "Lt":
				return "<";
			case "Le":
				return "<=";
			default:
				return operator;
		}
	}

	const handleFetchFcb = () => {
		handleFetchFcbWithAttributeConditions(conditions);
	};

	return {
		conditions,
		updateCondition,
		addCondition,
		removeCondition,
		getQuery,
		handleFetchFcb,
	};
};
