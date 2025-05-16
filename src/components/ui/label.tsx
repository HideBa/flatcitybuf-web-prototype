import { cn } from "@/lib/utils";
import * as React from "react";

const Label = React.forwardRef<
	HTMLLabelElement,
	React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
	// biome-ignore lint/a11y/noLabelWithoutControl: <explanation> TODO refactor this components
	<label
		ref={ref}
		className={cn(
			"text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
			className,
		)}
		{...props}
	/>
));
Label.displayName = "Label";

export { Label };
