import * as React from "react";
import { cn } from "@/lib/utils";

interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
}

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("grid gap-2", className)}
        role="radiogroup"
        {...props}
      >
        {children}
      </div>
    );
  }
);
RadioGroup.displayName = "RadioGroup";

interface RadioGroupItemProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
}

const RadioGroupItem = React.forwardRef<HTMLInputElement, RadioGroupItemProps>(
  ({ className, id, value, ...props }, ref) => {
    // Get parent RadioGroup's value and onValueChange if available
    const radioGroup = React.useContext(RadioGroupContext);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked && radioGroup?.onValueChange) {
        radioGroup.onValueChange(value);
      }
      props.onChange?.(e);
    };

    const isChecked = radioGroup?.value === value;

    return (
      <span className="flex items-center space-x-2">
        <span className="relative flex h-5 w-5 items-center justify-center">
          <input
            type="radio"
            id={id || value}
            ref={ref}
            value={value}
            checked={isChecked}
            className={cn(
              "peer h-4 w-4 cursor-pointer appearance-none rounded-full border border-neutral-300 bg-white transition-colors checked:border-neutral-900 checked:bg-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-950 focus:ring-offset-1",
              className
            )}
            onChange={handleChange}
            {...props}
          />
          <span className="pointer-events-none absolute h-2 w-2 rounded-full bg-white opacity-0 transition-opacity peer-checked:opacity-100"></span>
        </span>
      </span>
    );
  }
);
RadioGroupItem.displayName = "RadioGroupItem";

// Create a context to pass RadioGroup state to RadioGroupItems
interface RadioGroupContextType {
  value?: string;
  onValueChange?: (value: string) => void;
}

const RadioGroupContext = React.createContext<
  RadioGroupContextType | undefined
>(undefined);

// Create a provider component
const RadioGroupProvider: React.FC<
  RadioGroupProps & { children: React.ReactNode }
> = ({ value, onValueChange, defaultValue, children }) => {
  // Use internal state if this is an uncontrolled component
  const [internalValue, setInternalValue] = React.useState(defaultValue || "");

  // Handle value changes whether controlled or uncontrolled
  const handleValueChange = (newValue: string) => {
    if (onValueChange) {
      onValueChange(newValue);
    } else {
      setInternalValue(newValue);
    }
  };

  // Use provided value if available, otherwise use internal state
  const contextValue = {
    value: value !== undefined ? value : internalValue,
    onValueChange: handleValueChange,
  };

  return (
    <RadioGroupContext.Provider value={contextValue}>
      {children}
    </RadioGroupContext.Provider>
  );
};

// Wrap RadioGroup with the provider
const RadioGroupWithProvider = React.forwardRef<
  HTMLDivElement,
  RadioGroupProps
>((props, ref) => {
  return (
    <RadioGroupProvider {...props}>
      <RadioGroup {...props} ref={ref} />
    </RadioGroupProvider>
  );
});
RadioGroupWithProvider.displayName = "RadioGroup";

// Export the wrapped version
export { RadioGroupWithProvider as RadioGroup, RadioGroupItem };
