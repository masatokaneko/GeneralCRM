import * as React from "react";
import { Label } from "@/components/atoms/Label";
import { Input, type InputProps } from "@/components/atoms/Input";
import { cn } from "@/lib/utils";

export interface FormFieldProps extends InputProps {
  label: string;
  error?: string;
  description?: string;
}

const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, description, className, id, ...props }, ref) => {
    const inputId = id || React.useId();
    return (
      <div className={cn("space-y-2", className)}>
        <Label htmlFor={inputId}>{label}</Label>
        <Input
          id={inputId}
          ref={ref}
          className={cn(error && "border-destructive")}
          {...props}
        />
        {description && !error && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  },
);
FormField.displayName = "FormField";

export { FormField };
